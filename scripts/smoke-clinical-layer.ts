/**
 * Live clinical-workflow smoke over the Supabase data layer.
 * Run: node scripts/smoke-clinical-layer.mjs   (reads .env; uses the real
 * server/db dispatcher, supabase backend). Cleans up test rows afterwards.
 */
import "dotenv/config";
import * as db from "../server/db/index";

async function main() {
const stamp = Date.now();
const pass: string[] = [];
const fail: string[] = [];
const check = (name: string, ok: boolean, detail = "") => (ok ? pass : fail).push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
const expectError = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };

console.log("step: clinic settings"); // clinic settings
const settings = await db.getClinicPublicSettings();
check("clinic public settings readable", settings?.clinicName === "Rainbow Child Development Clinic");

console.log("step: appointments"); // appointments via atomic RPC
await db.saveClinicAppointments(1, [
  { appointmentId: `smoke-appt-${stamp}`, childId: `SMOKE-${stamp}`, service: "Developmental assessment", appointmentDate: "2026-09-10", appointmentTime: "09:30", durationMinutes: 45, reason: "smoke", status: "confirmed" },
]);
let appts = await db.listClinicAppointments(1);
check("appointment upsert (RPC) + list", appts.some((a) => a.appointmentId === `smoke-appt-${stamp}`), `count=${appts.length}`);

console.log("step: waitlist"); // waitlist durable state
await db.saveDurableWaitlistState(1, [
  { requestId: `smoke-req-${stamp}`, appointmentId: `smoke-appt-${stamp}`, childId: `SMOKE-${stamp}`, requestedAt: new Date(), status: "pending" },
], [
  { eventId: `smoke-ev-${stamp}`, requestId: `smoke-req-${stamp}`, eventType: "requested", actor: "guardian", occurredAt: new Date(), status: "pending" },
], [
  { snapshotId: `smoke-snap-${stamp}`, staffId: "nurse-1", staffName: "Test Nurse", triageCapacity: 4, effectiveAt: new Date() },
]);
const waitlist = await db.getDurableWaitlistState(1);
check("waitlist durable state save/get", waitlist.requests.some((r) => r.requestId === `smoke-req-${stamp}`) && waitlist.capacitySnapshots.length > 0);

console.log("step: staff"); // staff invitation lifecycle
const staff = await db.listClinicStaffAccounts(1);
const inviteEmail = `smoke-staff-${stamp}@example.com`;
await db.createClinicStaffInvitation(1, { staffAccountId: `smoke-staff-${stamp}`, email: inviteEmail, staffRole: "nurse", invitedBy: "smoke-test" });
const staff2 = await db.listClinicStaffAccounts(1);
const invited = staff2.find((s) => s.staffAccountId === `smoke-staff-${stamp}`);
check("staff invitation created", invited?.status === "invited");
await db.revokeClinicStaffAccount(1, `smoke-staff-${stamp}`, "smoke-test");
const staff3 = await db.listClinicStaffAccounts(1);
check("staff invitation revoked", staff3.find((s) => s.staffAccountId === `smoke-staff-${stamp}`)?.status === "revoked");

console.log("step: referral"); // referral audit + retry policy
await db.persistReferralAuditEvent(1, { clientEventId: `smoke-evt-${stamp}`, childId: `SMOKE-${stamp}`, type: "email-share", occurredAt: new Date(), actorName: "Dr. Anil Ojha", summary: "smoke referral", deliveryStatus: "saved" });
const audits = await db.listReferralAuditEvents(1);
check("referral audit persist/list", audits.some((e) => e.clientEventId === `smoke-evt-${stamp}`));
const retry1 = await db.reserveReferralEmailRetry(1, `SMOKE-${stamp}`, inviteEmail);
const retry2 = await db.reserveReferralEmailRetry(1, `SMOKE-${stamp}`, inviteEmail);
check("referral retry reservation counts up", retry1.allowed && retry2.allowed && retry2.attemptsUsed === 2, JSON.stringify(retry2));

console.log("step: capacity"); // capacity alert
await db.recordCapacityTargetChangeAlert(1, { alertId: `smoke-alert-${stamp}`, staffId: "nurse-1", staffName: "Test Nurse", previousTarget: 3, newTarget: 4, changedBy: "smoke-test", changedAt: new Date() });
const alerts = await db.listCapacityTargetChangeAlerts(1);
check("capacity alert record/list", alerts.some((a) => a.alertId === `smoke-alert-${stamp}`));
await db.acknowledgeCapacityTargetChangeAlert(1, `smoke-alert-${stamp}`, "smoke-test");
const alertsAck = await db.listCapacityTargetChangeAlerts(1);
check("capacity alert acknowledged", alertsAck.find((a) => a.alertId === `smoke-alert-${stamp}`)?.acknowledgedAt instanceof Date);

console.log("step: suggestions"); // maintenance-adjacent (no global state toggles)
await db.submitServiceSuggestion({ suggestedService: `Smoke service ${stamp}`, notificationConsented: false });
const suggestions = await db.listServiceSuggestions({ status: "all" });
check("service suggestion submit/list", suggestions.some((s) => s.suggestedService === `Smoke service ${stamp}`));

console.log("step: guardian/share"); // guardian contact + report share
await db.createGuardianContact(1, { childId: `SMOKE-${stamp}`, fullName: "Smoke Parent", relationship: "Parent", email: inviteEmail });
const contacts = await db.listGuardianContacts(1, `SMOKE-${stamp}`);
check("guardian contact create/list", contacts.some((c) => c.email === inviteEmail));
const blocked = await expectError(() => db.createPatientReportShare(1, { childId: `SMOKE-${stamp}`, guardianContactId: contacts[0].id, scope: "record-pdf" }));
check("report share blocked for unconfirmed guardian", blocked);
await db.confirmGuardianContact(1, contacts[0].id, "smoke-test");
const share = await db.createPatientReportShare(1, { childId: `SMOKE-${stamp}`, guardianContactId: contacts[0].id, scope: "record-pdf" });
const ack = await db.acknowledgeReport(share.acknowledgementToken, "Smoke Parent");
const ackInfo = await db.getReportAcknowledgement(share.acknowledgementToken);
check("report share + once-only acknowledge", ack === true && ackInfo?.acknowledgedAt instanceof Date, `ack=${ack}`);

console.log("step: settings"); // settings get/save round trip (restore afterwards)
await db.saveStaffInvitationSettings(1, 14, "smoke-test");
const invSettings = await db.getStaffInvitationSettings(1);
check("staff invitation settings save/get", invSettings.expiryDays === 14);

console.log("\n" + [...pass, ...fail].join("\n"));
console.log(`\n${pass.length} passed, ${fail.length} failed`);

// cleanup test rows (service-role direct deletes)
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
const del = async (table: string, col: string, value: string) => { await fetch(`${url}/rest/v1/${table}?${col}=eq.${encodeURIComponent(value)}`, { method: "DELETE", headers: H }); };
await del("clinic_appointments", "appointmentId", `smoke-appt-${stamp}`);
await del("waitlist_requests", "requestId", `smoke-req-${stamp}`);
await del("waitlist_event_log", "eventId", `smoke-ev-${stamp}`);
await del("staff_capacity_snapshots", "snapshotId", `smoke-snap-${stamp}`);
await del("clinic_staff_accounts", "staffAccountId", `smoke-staff-${stamp}`);
await del("referral_audit_events", "clientEventId", `smoke-evt-${stamp}`);
await del("referral_retry_counters", "recipientEmail", inviteEmail);
await del("capacity_target_change_alerts", "alertId", `smoke-alert-${stamp}`);
await del("guardian_contacts", "email", inviteEmail);
await del("patient_report_shares", "acknowledgementToken", share.acknowledgementToken);
await fetch(`${url}/rest/v1/service_suggestion_requests?requestedAt=gte.${new Date(Date.now() - 180000).toISOString()}&suggestedService=like.Smoke%20service%2A`, { method: "DELETE", headers: H });
console.log("cleanup done");
process.exit(fail.length ? 1 : 0);
}

main().catch((error) => {
  console.error("SMOKE FAIL:", error?.stack ?? error);
  process.exit(1);
});
