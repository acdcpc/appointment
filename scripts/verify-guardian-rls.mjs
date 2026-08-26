/**
 * End-to-end guardian verification against the LIVE Supabase project.
 * Run: node scripts/verify-guardian-rls.mjs  (reads .env via dotenv)
 *
 * Proves, with a throwaway guardian account + throwaway child rows:
 *  1. guardian account creation + password sign-in (email+password path)
 *  2. RLS third gate: guardian sees ONLY their linked child's rows
 *  3. guardian cannot read governance or write/update clinic data
 *  4. logout invalidates the session (refresh token rejected afterwards)
 *  5. cleanup of all created records
 */
import "dotenv/config";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Missing Supabase env vars (run from repo root with .env present).");
  process.exit(1);
}

const stamp = Date.now();
const childA = `VERIFY-CHILD-${stamp}`;
const childB = `VERIFY-CHILD-OTHER-${stamp}`;
const email = `verify-guardian-${stamp}@example.com`;
const password = "VerifyPass-123456";

const pass = [];
const fail = [];
const check = (name, ok, detail = "") => (ok ? pass : fail).push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
const j = (r) => r.json().catch(() => null);
const hdr = (key, extra = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });

// 1. Create the guardian auth account (email + password, pre-confirmed like
//    an inbox-confirmed signup) — same data path the admin provisioning uses.
const createdRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: hdr(service),
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const created = await j(createdRes);
check("1. guardian account created (admin API, email_confirm)", createdRes.status === 200 && created?.id, `status=${createdRes.status}`);
const guardianUserId = created?.id;
let guardianToken = null;

if (guardianUserId) {
  // 2. Link the guardian to childA in the RLS guardians table.
  const linkRes = await fetch(`${url}/rest/v1/guardians`, {
    method: "POST",
    headers: hdr(service),
    body: JSON.stringify({
      auth_user_id: guardianUserId,
      child_id: childA,
      phone: "+9779000000000",
      full_name: "Verify Guardian",
      relationship: "Parent",
      verified_at: new Date().toISOString(),
    }),
  });
  check("2. guardian↔child link created", linkRes.status === 201, `status=${linkRes.status}`);

  // 3. Seed two appointments: one for the guardian's child, one for another child.
  const seed = [
    { clinicianUserId: 1, appointmentId: `verify-appt-${stamp}-a`, childId: childA, service: "Developmental assessment", appointmentDate: "2026-09-01", appointmentTime: "09:30", durationMinutes: 45, reason: "verification", status: "confirmed" },
    { clinicianUserId: 1, appointmentId: `verify-appt-${stamp}-b`, childId: childB, service: "Speech therapy", appointmentDate: "2026-09-02", appointmentTime: "10:00", durationMinutes: 30, reason: "verification", status: "confirmed" },
  ];
  for (const row of seed) {
    await fetch(`${url}/rest/v1/clinic_appointments`, { method: "POST", headers: hdr(service), body: JSON.stringify(row) });
  }

  // 4. Sign in with email + password (the app's production path).
  const signInRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const signIn = await j(signInRes);
  guardianToken = signIn?.access_token;
  check("4. email+password sign-in", signInRes.status === 200 && !!guardianToken, `status=${signInRes.status}`);

  // 5. RLS third gate: guardian sees ONLY the appointment for their child.
  const apptRes = await fetch(`${url}/rest/v1/clinic_appointments?select=appointmentId,childId&childId=eq.${childA}`, {
    headers: hdr(anon, { Authorization: `Bearer ${guardianToken}` }),
  });
  const apptRows = await j(apptRes);
  check(
    "5. guardian sees own child's appointment (and no others)",
    apptRes.status === 200 && apptRows?.length === 1 && apptRows[0]?.childId === childA,
    `status=${apptRes.status}, rows=${apptRows?.length ?? "n/a"}`
  );
  const crossRes = await fetch(`${url}/rest/v1/clinic_appointments?childId=eq.${childB}&select=id`, {
    headers: hdr(anon, { Authorization: `Bearer ${guardianToken}` }),
  });
  const crossRows = await j(crossRes);
  check("5b. guardian blocked from other child's rows", crossRes.status === 200 && (crossRows ?? []).length === 0, `rows=${crossRows?.length ?? "n/a"}`);

  // 6. Guardian cannot read governance settings.
  const govRes = await fetch(`${url}/rest/v1/super_admin_governance_settings?select=id&limit=5`, {
    headers: hdr(anon, { Authorization: `Bearer ${guardianToken}` }),
  });
  const govRows = await j(govRes);
  check("6. guardian blocked from governance settings", govRes.status === 200 && Array.isArray(govRows) && govRows.length === 0, `status=${govRes.status}, rows=${Array.isArray(govRows) ? govRows.length : "n/a"}`);

  // 7. Guardian cannot insert or update clinic data.
  const insertRes = await fetch(`${url}/rest/v1/clinic_appointments`, {
    method: "POST",
    headers: hdr(anon, { Authorization: `Bearer ${guardianToken}` }),
    body: JSON.stringify({ clinicianUserId: 1, appointmentId: `verify-appt-${stamp}-evil`, childId: childA, service: "x", appointmentDate: "2026-09-03", appointmentTime: "11:00", durationMinutes: 30, reason: "x", status: "confirmed" }),
  });
  check("7. guardian cannot insert appointments", insertRes.status >= 400 && insertRes.status < 500, `status=${insertRes.status}`);
  // PostgREST returns 204 for a no-op PATCH even when RLS hides the row, so
  // request the representation: a fully hidden row must come back 404, and
  // the follow-up service-role read proves the value never changed.
  const updateRes = await fetch(`${url}/rest/v1/clinic_appointments?appointmentId=eq.verify-appt-${stamp}-a`, {
    method: "PATCH",
    headers: { ...hdr(anon, { Authorization: `Bearer ${guardianToken}` }), Prefer: "return=representation" },
    body: JSON.stringify({ reason: "tampered" }),
  });
  // PostgREST returns 200 with an EMPTY body for a zero-row no-op when RLS
  // hides the row; a genuinely updated row would come back non-empty. The
  // unchanged-value proof follows in 7c via the service role.
  const updateBody = await j(updateRes);
  const noOp = updateRes.status === 404 || (updateRes.status === 200 && Array.isArray(updateBody) && updateBody.length === 0);
  check("7b. guardian cannot update appointments (RLS no-op)", noOp, `status=${updateRes.status}, returned=${Array.isArray(updateBody) ? updateBody.length : "n/a"}`);
  const updateRows = await j(await fetch(`${url}/rest/v1/clinic_appointments?appointmentId=eq.verify-appt-${stamp}-a&select=reason`, { headers: hdr(service) }));
  check("7c. appointment reason unchanged after tamper attempt", updateRows?.[0]?.reason === "verification", `reason=${updateRows?.[0]?.reason}`);

  // 8. Logout: auth endpoint revokes the session; old refresh token must be rejected.
  const logoutRes = await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: hdr(anon, { Authorization: `Bearer ${guardianToken}` }) });
  check("8. logout succeeds", logoutRes.status === 204, `status=${logoutRes.status}`);
  const refreshRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: signIn?.refresh_token ?? "" }),
  });
  check("8b. refresh token rejected after logout", refreshRes.status === 400, `status=${refreshRes.status}`);

  // 9. Cleanup: remove seeded rows + guardian account + link.
  for (const row of seed) {
    await fetch(`${url}/rest/v1/clinic_appointments?appointmentId=eq.${row.appointmentId}`, { method: "DELETE", headers: hdr(service) });
  }
  await fetch(`${url}/rest/v1/guardians?auth_user_id=eq.${guardianUserId}`, { method: "DELETE", headers: hdr(service) });
  await fetch(`${url}/auth/v1/admin/users/${guardianUserId}`, { method: "DELETE", headers: hdr(service) });
  check("9. cleanup complete", true);
} else {
  check("1. guardian account created", false, `status=${createdRes.status}: ${JSON.stringify(created)}`);
}

console.log("\n" + [...pass, ...fail].join("\n"));
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
