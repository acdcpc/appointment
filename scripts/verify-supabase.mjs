/**
 * Live Supabase integration verification.
 * Run: node scripts/verify-supabase.mjs   (from repo root; reads .env)
 * Proves: public read, RLS gating, trusted-admin visibility via real JWT
 * sign-in, service-role bypass, and the private storage bucket.
 */
import "dotenv/config";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clinicAdminEmail = "anilrajojha@pahs.edu.np";
const superAdminEmail = "thisispratha@gmail.com";

const pass = [];
const fail = [];
const check = (name, ok, detail = "") =>
  (ok ? pass : fail).push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);

const j = (r) => r.json().catch(() => null);
const hdr = (key, extra = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  ...extra,
});

if (!url || !anon || !service) {
  console.error("Missing Supabase env vars. Run from repo root with .env present.");
  process.exit(1);
}

// 1. Anonymous read of public clinic settings (allowed)
const pub = await fetch(`${url}/rest/v1/clinic_public_settings?select=id&limit=1`, { headers: hdr(anon) });
const pubRows = await j(pub);
check("anon read clinic_public_settings (public)", pub.status === 200 && Array.isArray(pubRows) && pubRows.length === 1, `status=${pub.status}, rows=${Array.isArray(pubRows) ? pubRows.length : "n/a"}`);

// 2. Anonymous write to clinic_public_settings (denied by RLS)
const pubWrite = await fetch(`${url}/rest/v1/clinic_public_settings`, { method: "POST", headers: hdr(anon), body: JSON.stringify({ clinicName: "x" }) });
check("anon write clinic_public_settings denied", pubWrite.status >= 400 && pubWrite.status < 500, `status=${pubWrite.status}`);

// 3. Anonymous read of governance settings (RLS hides the seeded row)
const govAnon = await fetch(`${url}/rest/v1/super_admin_governance_settings?select=id&limit=5`, { headers: hdr(anon) });
const govAnonRows = await j(govAnon);
check("anon denied governance settings (no privilege)", govAnon.status >= 400, `status=${govAnon.status}`);

// 4. Real sign-in for the clinic administrator + protected read
async function signIn(email, passwordEnv) {
  const pw = process.env[passwordEnv];
  if (!pw) return null;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  return { res, data: await j(res) };
}

const clinicAuth = await signIn(clinicAdminEmail, "CLINIC_ADMIN_PASSWORD");
if (clinicAuth && clinicAuth.res.status === 200 && clinicAuth.data?.access_token) {
  check("clinic admin JWT sign-in", true, clinicAdminEmail);
  const adminJwt = clinicAuth.data.access_token;
  const govAdmin = await fetch(`${url}/rest/v1/super_admin_governance_settings?select=id,exportRetentionDays&limit=5`, { headers: hdr(anon, { Authorization: `Bearer ${adminJwt}` }) });
  const govAdminRows = await j(govAdmin);
  check("clinic admin sees governance settings (RLS trusted)", govAdmin.status === 200 && Array.isArray(govAdminRows) && govAdminRows.length === 1, `status=${govAdmin.status}, rows=${Array.isArray(govAdminRows) ? govAdminRows.length : "n/a"}`);
} else {
  check("clinic admin JWT sign-in", false, `status=${clinicAuth ? clinicAuth.res.status : "no password in .env"}`);
}

const superAuth = await signIn(superAdminEmail, "SUPER_ADMIN_PASSWORD");
check("super-admin JWT sign-in", Boolean(superAuth && superAuth.res.status === 200 && superAuth.data?.access_token), `status=${superAuth ? superAuth.res.status : "no password in .env"}`);

// 5. Service-role bypass sees both provisioned admin rows
const users = await fetch(`${url}/rest/v1/users?select=email,role&order=id`, { headers: hdr(service) });
const userRows = await j(users);
check("service role lists provisioned users", users.status === 200 && Array.isArray(userRows) && userRows.length >= 2, `status=${users.status}, rows=${Array.isArray(userRows) ? userRows.length : "n/a"}`);

// 6. Storage bucket is private (anon denied, service ok)
const bucketAnon = await fetch(`${url}/storage/v1/bucket/patient-documents`, { headers: hdr(anon) });
const bucketSrv = await fetch(`${url}/storage/v1/bucket/patient-documents`, { headers: hdr(service) });
check("patient-documents bucket private to anon", bucketAnon.status >= 400, `anon status=${bucketAnon.status}`);
check("patient-documents bucket reachable by service", bucketSrv.status === 200, `service status=${bucketSrv.status}`);


// 7. RLS proof with a real non-admin authenticated JWT
const testEmail = `rsltest-${Date.now()}@gmail.com`;
const createUser = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: hdr(service),
  body: JSON.stringify({ email: testEmail, password: "test-verify-123456", email_confirm: true }),
});
const created = await j(createUser);
if (createUser.status === 200 && created?.id) {
  const signInRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "test-verify-123456" }),
  });
  const signInData = await j(signInRes);
  if (signInRes.status === 200 && signInData?.access_token) {
    const patientJwt = signInData.access_token;
    const govPatient = await fetch(`${url}/rest/v1/super_admin_governance_settings?select=id&limit=5`, { headers: hdr(anon, { Authorization: `Bearer ${patientJwt}` }) });
    const govPatientRows = await j(govPatient);
    check("non-admin authed user blocked by RLS (0 rows)", govPatient.status === 200 && Array.isArray(govPatientRows) && govPatientRows.length === 0, `status=${govPatient.status}, rows=${Array.isArray(govPatientRows) ? govPatientRows.length : "n/a"}`);
  } else {
    check("non-admin authed user blocked by RLS (0 rows)", false, `sign-in status=${signInRes.status}`);
  }
  await fetch(`${url}/auth/v1/admin/users/${created.id}`, { method: "DELETE", headers: hdr(service) });
} else {
  check("non-admin authed user blocked by RLS (0 rows)", false, `admin create status=${createUser.status}`);
}
// 11. Guardians table exists and is reachable by service role (RLS bypass)
const guardians = await fetch(`${url}/rest/v1/guardians?select=id&limit=1`, { headers: hdr(service) });
check("guardians table reachable (service role)", guardians.status === 200, `status=${guardians.status}`);

// 12. Guardian record-access challenge RPC round trip (issue -> verify -> token)
const challengeRes = await fetch(`${url}/rest/v1/rpc/issue_guardian_record_access_challenge`, {
  method: "POST",
  headers: hdr(service),
  body: JSON.stringify({ p_clinician_user_id: 1, p_child_id: "verify-script-child", p_issued_by: "verify-script", p_expiry_hours: 24, p_attempt_limit: 5 }),
});
const challenge = await j(challengeRes);
const verifyRes = await fetch(`${url}/rest/v1/rpc/verify_guardian_record_access`, {
  method: "POST",
  headers: hdr(service),
  body: JSON.stringify({ p_reference: challenge?.reference, p_verification_code: challenge?.verificationCode, p_attempt_limit: 5, p_access_hours: 8 }),
});
const verified = await j(verifyRes);
check(
  "guardian challenge RPC round trip",
  challengeRes.status === 200 && verifyRes.status === 200 && typeof verified?.accessToken === "string" && verified.accessToken.length > 0,
  `issue=${challengeRes.status}, verify=${verifyRes.status}`
);
console.log("\n" + [...pass, ...fail].join("\n"));
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
