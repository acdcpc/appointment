/**
 * Supabase-backed data layer (PRIMARY backend).
 *
 * Mirrors every exported function signature from ./legacy.ts so the tRPC
 * routers, schedulers, and OAuth flow work unchanged. Uses the service-role
 * client, which bypasses RLS by design: the server remains the authorization
 * gate (RLS protects direct/anonymous access paths and guardian sessions).
 *
 * Dates: Supabase returns ISO strings; the legacy layer returns Date objects,
 * so every row is normalized with dateFields() before returning.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { ENV } from "../_core/env";
import { isClinicAdministratorEmail, isSuperAdminEmail } from "../clinic-authority";

export const MAX_REFERRAL_EMAIL_RESENDS = 3;
export const MAX_STAFF_INVITATION_RESENDS = 3;
export const UNRESOLVED_REFERRAL_ALERT_HOURS = 24;
export const MAX_AUDIT_RETENTION_DAYS = 36500;
export const GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT = 5;
export const GUARDIAN_RECORD_ACCESS_CHALLENGE_HOURS = 24;
export const GUARDIAN_RECORD_ACCESS_SESSION_HOURS = 8;

export const defaultCapacityAlertVisibility = {
  dailyDashboardSummaryEnabled: true,
  receptionistVisible: false,
  nurseVisible: false,
  clinicianVisible: true,
};

/**
 * No raw Drizzle handle exists on the Supabase backend — all SQL access is
 * encapsulated in RPC functions. Kept for signature parity with the legacy
 * layer (callers treat a null handle as "database not available").
 */
export async function getDb(): Promise<null> {
  return null;
}

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
let _client: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (!_client) {
    if (!url || !serviceKey) {
      throw new Error("Supabase backend is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    }
    _client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

function dateFields<T extends Record<string, unknown>>(row: T | null | undefined, fields: string[]): T | null {
  if (!row) return row ?? null;
  const out: Record<string, unknown> = { ...row };
  for (const key of fields) {
    const value = out[key];
    if (typeof value === "string" && value) out[key] = new Date(value);
    else if (value === null || value === undefined) out[key] = null;
  }
  return out as T;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashRecordAccessSecret = (value: string) => createHash("sha256").update(value).digest("hex");

const APP_DATES = ["createdAt", "updatedAt", "lastSignedIn"];
const GOVERNANCE_DATES = ["lastAccessReviewAt", "maintenanceChangedAt", "maintenanceEstimatedCompletionAt", "updatedAt"];
const CLINIC_SETTING_DATES = ["updatedAt"];
const OVERRIDE_DATES = ["updatedAt"];
const AUDIT_EVENT_DATES = ["occurredAt"];
const REFERRAL_DATES = ["occurredAt", "alertSentAt", "archivedAt", "createdAt"];
const MONITOR_DATES = ["lastRunAt", "createdAt", "updatedAt"];
const POLICY_DATES = ["lastArchiveRunAt", "lastMonthlySummaryAt", "lastQuarterlyReviewAt", "createdAt", "updatedAt"];
const RUN_DATES = ["executedAt"];
const CHANGE_DATES = ["changedAt"];
const GUARDIAN_DATES = ["confirmedAt", "createdAt", "updatedAt"];
const SHARE_DATES = ["createdAt", "acknowledgedAt"];
const WAITLIST_DATES = ["requestedAt", "offeredAt", "offerExpiresAt", "respondedAt", "clinicianAcknowledgedAt", "convertedAt", "assignedAt", "createdAt", "updatedAt"];
const EVENT_LOG_DATES = ["occurredAt", "createdAt"];
const SNAPSHOT_DATES = ["effectiveAt", "createdAt"];
const PRINT_AUDIT_DATES = ["initiatedAt", "createdAt"];
const ALERT_DATES = ["changedAt", "acknowledgedAt", "createdAt"];
const PRESET_DATES = ["createdAt", "updatedAt"];
const STAFF_DATES = ["invitedAt", "expiresAt", "resendPreparedAt", "activatedAt", "revokedAt", "updatedAt"];
const ACTIVITY_DATES = ["occurredAt", "createdAt"];
const APP_DATES_FULL = ["createdAt", "guardianConfirmedAt", "rescheduledAt", "rescheduleAcknowledgedAt", "appointmentChangeReminderDraftedAt", "updatedAt"];
const CHALLENGE_DATES = ["issuedAt", "expiresAt", "verifiedAt", "accessExpiresAt", "revokedAt"];
const NOTIFICATION_REQUEST_DATES = ["maintenanceChangedAt", "requestedAt", "updatedAt"];
const SUGGESTION_DATES = ["requestedAt", "reviewedAt", "updatedAt"];
const FEEDBACK_DATES = ["submittedAt", "reviewedAt", "updatedAt"];
const SETTINGS_ROW_DATES = ["updatedAt"];

const DEFAULT_GOVERNANCE = {
  exportRetentionDays: 30,
  accessReviewIntervalDays: 90,
  updatedBy: "Initial governance setup",
  lastAccessReviewAt: null as Date | null,
  lastAccessReviewBy: null as string | null,
  maintenanceModeEnabled: false,
  maintenanceNotice: "A scheduled clinic service update is in progress. Please return shortly.",
  maintenanceEstimatedCompletion: null as string | null,
  maintenanceEstimatedCompletionAt: null as Date | null,
  maintenanceChangedAt: null as Date | null,
  maintenanceChangedBy: null as string | null,
  updatedAt: new Date(),
};

const defaultClinicPublicSettings = {
  clinicName: "Rainbow Child Development Clinic",
  address: "Gokul Awas Rd, Karyabinayak 44700",
  mapUrl: "https://www.google.com.au/search?client=safari&hs=ORpV&sca_esv=79a7fd24df7232ff&hl=en-au&kgmid=/g/11zhz76ycx&q=Rainbow+Child+Development+Clinic&shem=epsd1,ltae,rimspwouoe&shndl=30&source=sh/x/loc/act/m1/3&kgs=21ca31c1d4d885a7&utm_source=epsd1,ltae,rimspwouoe,sh/x/loc/act/m1/3",
  clinicEmail: "rainbowclinic25@gmail.com",
  whatsappNumber: "9779765002862",
  whatsappResponseNotice: "Messages are reviewed during clinic hours; please allow a response on the next working day.",
  guardianReverificationDays: 180,
  isProvisional: false,
  updatedBy: "Initial clinic setup",
};

// ============================= USERS =============================

export async function upsertUser(user: { openId: string; name?: string | null; email?: string | null; loginMethod?: string | null; role?: "user" | "admin" | null; lastSignedIn?: Date }) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const values: Record<string, unknown> = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields: Array<"name" | "email" | "loginMethod"> = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn.toISOString();
    updateSet.lastSignedIn = user.lastSignedIn.toISOString();
  }
  if (user.role !== undefined && user.role !== null) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (values.lastSignedIn === undefined) {
    values.lastSignedIn = new Date().toISOString();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  const { error } = await sb().from("users").upsert(values, { onConflict: "openId" });
  if (error) throw error;
}

export async function getUserByOpenId(openId: string) {
  const { data, error } = await sb().from("users").select("*").eq("openId", openId).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, APP_DATES);
}

export async function getSuperAdminDashboardData() {
  const [usersRes, apptRes, staffRes, auditRes] = await Promise.all([
    sb().from("users").select("id, name, email, role, lastSignedIn, createdAt").order("lastSignedIn", { ascending: false }).limit(100),
    sb().from("clinic_appointments").select("id", { count: "exact", head: true }),
    sb().from("clinic_staff_accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb().from("super_admin_audit_events").select("*").order("occurredAt", { ascending: false }).limit(50),
  ]);
  if (usersRes.error) throw usersRes.error;
  if (apptRes.error) throw apptRes.error;
  if (staffRes.error) throw staffRes.error;
  if (auditRes.error) throw auditRes.error;
  return {
    databaseAvailable: true,
    users: (usersRes.data ?? []).map((row) => dateFields(row, APP_DATES) as Record<string, unknown>),
    appointmentCount: apptRes.count ?? 0,
    activeStaffCount: staffRes.count ?? 0,
    auditEvents: (auditRes.data ?? []).map((row) => dateFields(row, AUDIT_EVENT_DATES) as Record<string, unknown>),
  };
}

export async function listAllClinicStaffAccountsForSuperAdmin() {
  const { data, error } = await sb().from("clinic_staff_accounts")
    .select("staffAccountId, invitedEmail, displayName, staffRole, status, activatedAt, revokedAt")
    .order("invitedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, ["activatedAt", "revokedAt"]));
}

export async function updateApplicationUserAccess(input: { actorEmail: string; targetUserId: number; nextAccess: "user" | "admin" }) {
  const target = await sb().from("users").select("*").eq("id", input.targetUserId).limit(1);
  if (target.error) throw target.error;
  const userRow = target.data?.[0] as Record<string, unknown> | undefined;
  if (!userRow) throw new Error("The selected user account no longer exists.");
  if (isSuperAdminEmail(userRow.email as string | null)) {
    throw new Error("The designated super-admin access cannot be changed through the application.");
  }
  await sb().from("users").update({ role: input.nextAccess }).eq("id", input.targetUserId);
  await sb().from("super_admin_audit_events").insert({
    eventId: `access-${Date.now()}-${input.targetUserId}`,
    eventType: "user-access-updated",
    actorEmail: input.actorEmail,
    targetUserId: input.targetUserId,
    targetEmail: userRow.email ?? null,
    previousAccess: userRow.role ?? null,
    nextAccess: input.nextAccess,
    recordCount: 0,
    summary: "Super-admin updated the application-level user access flag. This does not grant database, server, deployment, or source-control access.",
  });
}

export async function deactivateFormerStaffAccount(input: { actorEmail: string; staffAccountId: string }) {
  const account = await sb().from("clinic_staff_accounts").select("*").eq("staffAccountId", input.staffAccountId).limit(1);
  if (account.error) throw account.error;
  const row = account.data?.[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("The selected staff account no longer exists.");
  if (row.status === "revoked") throw new Error("This staff account is already revoked.");
  const now = new Date();
  await sb().from("clinic_staff_accounts").update({ status: "revoked", revokedAt: now.toISOString() }).eq("id", row.id as number);
  await recordStaffAccountActivity(row.clinicianUserId as number, { staffAccountId: row.staffAccountId as string, eventType: "revoked", actorName: input.actorEmail, summary: "Super-admin revoked this former staff account's authenticated operational access.", occurredAt: now });
  return { staffAccountId: row.staffAccountId, status: "revoked" as const };
}

export async function reactivateReturningStaffAccount(input: { actorEmail: string; staffAccountId: string }) {
  const account = await sb().from("clinic_staff_accounts").select("*").eq("staffAccountId", input.staffAccountId).limit(1);
  if (account.error) throw account.error;
  const row = account.data?.[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("The selected staff account no longer exists.");
  if (row.status !== "revoked") throw new Error("Only a currently revoked former staff account can be reactivated.");
  const now = new Date();
  await sb().from("clinic_staff_accounts").update({ status: "active", activatedAt: now.toISOString(), revokedAt: null }).eq("id", row.id as number);
  await recordStaffAccountActivity(row.clinicianUserId as number, { staffAccountId: row.staffAccountId as string, eventType: "activated", actorName: input.actorEmail, summary: "Super-admin reactivated this returning staff account's existing operational access.", occurredAt: now });
  return { staffAccountId: row.staffAccountId, status: "active" as const };
}

// ============================= GOVERNANCE / MAINTENANCE =============================

async function getGovernanceRow(): Promise<Record<string, unknown> | null> {
  const { data, error } = await sb().from("super_admin_governance_settings").select("*").order("id", { ascending: true }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getSuperAdminGovernanceSettings() {
  const row = await getGovernanceRow();
  if (!row) return { ...DEFAULT_GOVERNANCE, id: 0 };
  return dateFields(row, GOVERNANCE_DATES) as Record<string, unknown>;
}

export async function saveSuperAdminGovernanceSettings(input: { exportRetentionDays: number; accessReviewIntervalDays: number; updatedBy: string }) {
  const existing = await getGovernanceRow();
  if (existing) {
    const { error } = await sb().from("super_admin_governance_settings").update(input).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await sb().from("super_admin_governance_settings").insert(input);
    if (error) throw error;
  }
  return getSuperAdminGovernanceSettings();
}

export async function completeSuperAdminAccessReview(actorEmail: string) {
  const [admins, activeStaff, revokedStaff, pendingInvitations] = await Promise.all([
    sb().from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
    sb().from("clinic_staff_accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb().from("clinic_staff_accounts").select("id", { count: "exact", head: true }).eq("status", "revoked"),
    sb().from("clinic_staff_accounts").select("id", { count: "exact", head: true }).eq("status", "invited"),
  ]);
  const now = new Date();
  const review = {
    reviewId: `access-review-${Date.now()}`,
    actorEmail,
    applicationAdminCount: admins.count ?? 0,
    activeStaffCount: activeStaff.count ?? 0,
    revokedStaffCount: revokedStaff.count ?? 0,
    pendingInvitationCount: pendingInvitations.count ?? 0,
    reviewedAt: now.toISOString(),
  };
  const { error: insertError } = await sb().from("super_admin_access_reviews").insert(review);
  if (insertError) throw insertError;
  const existing = await getGovernanceRow();
  if (existing) {
    await sb().from("super_admin_governance_settings").update({ lastAccessReviewAt: now.toISOString(), lastAccessReviewBy: actorEmail }).eq("id", existing.id);
  } else {
    await sb().from("super_admin_governance_settings").insert({
      ...DEFAULT_GOVERNANCE, updatedBy: actorEmail, lastAccessReviewAt: now.toISOString(), lastAccessReviewBy: actorEmail, updatedAt: now.toISOString(),
    } as unknown as Record<string, unknown>);
  }
  return { ...review, reviewedAt: now };
}

export async function setMaintenanceMode(input: { enabled: boolean; notice: string; estimatedCompletion?: string | null; estimatedCompletionAt?: Date | null; actorEmail: string }) {
  const now = new Date();
  const existing = await getGovernanceRow();
  const update = {
    maintenanceModeEnabled: input.enabled,
    maintenanceNotice: input.notice,
    maintenanceEstimatedCompletion: input.estimatedCompletion ?? null,
    maintenanceEstimatedCompletionAt: input.estimatedCompletionAt ? input.estimatedCompletionAt.toISOString() : null,
    maintenanceChangedAt: now.toISOString(),
    maintenanceChangedBy: input.actorEmail,
    updatedBy: input.actorEmail,
  };
  if (existing) await sb().from("super_admin_governance_settings").update(update).eq("id", existing.id as number);
  else await sb().from("super_admin_governance_settings").insert({ ...DEFAULT_GOVERNANCE, ...update });
  await sb().from("super_admin_maintenance_events").insert({
    eventId: `maintenance-${Date.now()}`,
    actorEmail: input.actorEmail,
    enabled: input.enabled,
    noticeSummary: input.notice,
    estimatedCompletion: input.estimatedCompletion ?? null,
    estimatedCompletionAt: input.estimatedCompletionAt ? input.estimatedCompletionAt.toISOString() : null,
    occurredAt: now.toISOString(),
  });
  return getSuperAdminGovernanceSettings();
}

export async function getMaintenanceModeStatus() {
  const settings = (await getSuperAdminGovernanceSettings()) as Record<string, unknown>;
  return {
    enabled: Boolean(settings.maintenanceModeEnabled),
    notice: settings.maintenanceNotice ?? "",
    estimatedCompletion: settings.maintenanceEstimatedCompletion ?? null,
    estimatedCompletionAt: settings.maintenanceEstimatedCompletionAt ?? null,
    changedAt: settings.maintenanceChangedAt ?? null,
    changedBy: settings.maintenanceChangedBy ?? null,
  };
}

export async function requestMaintenanceNotificationPreference(email: string) {
  const status = await getMaintenanceModeStatus();
  if (!status.enabled || !status.changedAt) throw new Error("Maintenance mode is not currently active.");
  const normalized = normalizeEmail(email);
  const changedAt = (status.changedAt as Date).toISOString();
  const existing = await sb().from("maintenance_notification_requests").select("*").eq("maintenanceChangedAt", changedAt).eq("email", normalized).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) {
    await sb().from("maintenance_notification_requests").update({ status: "requested" }).eq("id", existing.data[0].id);
    return { alreadyRecorded: true };
  }
  await sb().from("maintenance_notification_requests").insert({
    requestId: `maintenance-notification-${Date.now()}-${randomInt(1000, 9999)}`,
    maintenanceChangedAt: changedAt,
    email: normalized,
    status: "requested",
  });
  return { alreadyRecorded: false };
}

export async function submitServiceSuggestion(input: { suggestedService: string; notificationEmail?: string | null; notificationConsented: boolean }) {
  const normalized = input.suggestedService.trim().replace(/\s+/g, " ");
  const notificationEmail = input.notificationEmail?.trim().toLowerCase() || null;
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dup = await sb().from("service_suggestion_requests").select("id").eq("suggestedService", normalized).gte("requestedAt", recentCutoff).limit(1);
  if (dup.error) throw dup.error;
  if (dup.data?.[0]) {
    if (notificationEmail && input.notificationConsented) {
      await sb().from("service_suggestion_requests").update({ notificationEmail, notificationConsented: true }).eq("id", dup.data[0].id);
    }
    return { alreadySubmitted: true };
  }
  await sb().from("service_suggestion_requests").insert({
    suggestionId: `service-suggestion-${Date.now()}-${randomInt(1000, 9999)}`,
    suggestedService: normalized,
    notificationEmail,
    notificationConsented: Boolean(notificationEmail && input.notificationConsented),
    status: "submitted",
  });
  return { alreadySubmitted: false };
}

export type ServiceSuggestionFilter = { status?: "all" | "submitted" | "approved" | "dismissed"; serviceQuery?: string };
export async function listServiceSuggestions(filter: ServiceSuggestionFilter = {}) {
  const fields = "suggestionId, suggestedService, notificationEmail, notificationConsented, status, requestedAt, reviewedAt, reviewedBy, updatedAt";
  let query = sb().from("service_suggestion_requests").select(fields);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  const serviceQuery = filter.serviceQuery?.trim().toLowerCase();
  if (serviceQuery) query = query.ilike("suggestedService", `%${serviceQuery}%`);
  const { data, error } = await query.order("requestedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, SUGGESTION_DATES));
}

export async function reviewServiceSuggestion(input: { suggestionId: string; status: "approved" | "dismissed"; reviewedBy: string }) {
  const found = await sb().from("service_suggestion_requests").select("id").eq("suggestionId", input.suggestionId).limit(1);
  if (found.error) throw found.error;
  if (!found.data?.[0]) throw new Error("This service suggestion is no longer available.");
  await sb().from("service_suggestion_requests").update({ status: input.status, reviewedAt: new Date().toISOString(), reviewedBy: input.reviewedBy }).eq("id", found.data[0].id);
  return { updated: true };
}

export type MaintenanceNotificationPreferenceFilter = { status?: "all" | "requested" | "withdrawn"; emailQuery?: string };
export async function listMaintenanceNotificationPreferences(filter: MaintenanceNotificationPreferenceFilter = {}) {
  const fields = "requestId, email, status, maintenanceChangedAt, requestedAt, updatedAt";
  let query = sb().from("maintenance_notification_requests").select(fields);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  const emailQuery = filter.emailQuery?.trim().toLowerCase();
  if (emailQuery) query = query.ilike("email", `%${emailQuery}%`);
  const { data, error } = await query.order("requestedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, NOTIFICATION_REQUEST_DATES));
}

export async function setMaintenanceNotificationPreferenceStatus(input: { requestId: string; status: "requested" | "withdrawn" }) {
  const found = await sb().from("maintenance_notification_requests").select("requestId").eq("requestId", input.requestId).limit(1);
  if (found.error) throw found.error;
  if (!found.data?.[0]) throw new Error("This notification preference is no longer available.");
  await sb().from("maintenance_notification_requests").update({ status: input.status }).eq("requestId", input.requestId);
  return { requestId: input.requestId, status: input.status };
}

export async function setBulkMaintenanceNotificationPreferenceStatus(input: { requestIds: string[]; status: "requested" | "withdrawn" }) {
  const requestIds = [...new Set(input.requestIds)];
  if (requestIds.length < 1 || requestIds.length > 100) throw new Error("Select between one and one hundred notification preferences.");
  const rows = await sb().from("maintenance_notification_requests").select("requestId").in("requestId", requestIds);
  if (rows.error) throw rows.error;
  if ((rows.data ?? []).length !== requestIds.length) throw new Error("One or more selected notification preferences are no longer available.");
  await sb().from("maintenance_notification_requests").update({ status: input.status }).in("requestId", requestIds);
  return { updatedCount: requestIds.length, status: input.status };
}

export async function prepareMaintenanceNotificationPreferenceExport(input: MaintenanceNotificationPreferenceFilter & { actorEmail: string }) {
  const rows = await listMaintenanceNotificationPreferences(input);
  await sb().from("maintenance_notification_preference_exports").insert({
    exportId: `maintenance-preference-export-${Date.now()}-${randomInt(1000, 9999)}`,
    actorEmail: input.actorEmail,
    statusFilter: input.status ?? "all",
    emailQuery: input.emailQuery?.trim().toLowerCase() || null,
    recordCount: rows.length,
  });
  return rows;
}

export async function submitPostDeploymentFeedback(input: { submittedBy: string; category: string; title: string; description: string; screenshotStorageKey?: string; screenshotContentType?: string; screenshotBytes?: number }) {
  const feedbackId = `deployment-feedback-${Date.now()}-${randomInt(1000, 9999)}`;
  const { error } = await sb().from("post_deployment_feedback").insert({ feedbackId, ...input, status: "open" });
  if (error) throw error;
  return feedbackId;
}

export async function listPostDeploymentFeedback() {
  const { data, error } = await sb().from("post_deployment_feedback").select("*").order("submittedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, FEEDBACK_DATES));
}

export async function getPostDeploymentFeedbackAttachment(feedbackId: string) {
  const { data, error } = await sb().from("post_deployment_feedback").select("screenshotStorageKey, screenshotContentType, screenshotBytes").eq("feedbackId", feedbackId).limit(1);
  if (error) throw error;
  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  return row?.screenshotStorageKey ? row : null;
}

export async function updatePostDeploymentFeedbackStatus(input: { feedbackId: string; status: "reviewed" | "resolved"; reviewedBy: string }) {
  const found = await sb().from("post_deployment_feedback").select("feedbackId").eq("feedbackId", input.feedbackId).limit(1);
  if (found.error) throw found.error;
  if (!found.data?.[0]) throw new Error("The feedback record no longer exists.");
  const now = new Date();
  await sb().from("post_deployment_feedback").update({ status: input.status, reviewedBy: input.reviewedBy, reviewedAt: now.toISOString() }).eq("feedbackId", input.feedbackId);
  return { feedbackId: input.feedbackId, status: input.status, reviewedAt: now };
}

// ============================= CLINIC SETTINGS & DAY OVERRIDES =============================

async function getClinicSettingsRow(): Promise<Record<string, unknown> | null> {
  const { data, error } = await sb().from("clinic_public_settings").select("*").order("id", { ascending: true }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getClinicPublicSettings() {
  const row = await getClinicSettingsRow();
  if (!row) return { ...defaultClinicPublicSettings, id: 0, updatedAt: new Date() };
  return dateFields(row, CLINIC_SETTING_DATES) as Record<string, unknown>;
}

export async function saveClinicPublicSettings(input: { address: string; mapUrl: string; clinicEmail: string; whatsappNumber: string; whatsappResponseNotice: string; updatedBy: string }) {
  const existing = await getClinicSettingsRow();
  const values = { ...defaultClinicPublicSettings, ...input, clinicName: "Rainbow Child Development Clinic", isProvisional: false };
  if (existing) await sb().from("clinic_public_settings").update(values).eq("id", existing.id as number);
  else await sb().from("clinic_public_settings").insert(values);
  return getClinicPublicSettings();
}

export async function saveGuardianReverificationDays(guardianReverificationDays: number, updatedBy: string) {
  const existing = await getClinicSettingsRow();
  if (existing) await sb().from("clinic_public_settings").update({ guardianReverificationDays, updatedBy }).eq("id", existing.id as number);
  else await sb().from("clinic_public_settings").insert({ ...defaultClinicPublicSettings, guardianReverificationDays, updatedBy });
  return getClinicPublicSettings();
}

export type ClinicDayHourOverrideInput = { overrideId: string; appointmentDate: string; isOpen: boolean; startTime?: string; endTime?: string; familyNotice: string; updatedBy: string };

export async function listClinicDayHourOverrides(clinicianUserId: number) {
  const { data, error } = await sb().from("clinic_day_hour_overrides").select("*").eq("clinicianUserId", clinicianUserId).order("appointmentDate", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, OVERRIDE_DATES));
}

export async function saveClinicDayHourOverride(clinicianUserId: number, input: ClinicDayHourOverrideInput) {
  const existing = await sb().from("clinic_day_hour_overrides").select("id").eq("clinicianUserId", clinicianUserId).eq("appointmentDate", input.appointmentDate).limit(1);
  if (existing.error) throw existing.error;
  const values = {
    clinicianUserId,
    overrideId: input.overrideId,
    appointmentDate: input.appointmentDate,
    isOpen: input.isOpen,
    startTime: input.isOpen ? input.startTime ?? null : null,
    endTime: input.isOpen ? input.endTime ?? null : null,
    familyNotice: input.familyNotice,
    updatedBy: input.updatedBy,
  };
  if (existing.data?.[0]) await sb().from("clinic_day_hour_overrides").update(values).eq("id", existing.data[0].id);
  else await sb().from("clinic_day_hour_overrides").insert(values);
  return listClinicDayHourOverrides(clinicianUserId);
}

export async function removeClinicDayHourOverride(clinicianUserId: number, appointmentDate: string) {
  const { error } = await sb().from("clinic_day_hour_overrides").delete().eq("clinicianUserId", clinicianUserId).eq("appointmentDate", appointmentDate);
  if (error) throw error;
}

export async function listPublicClinicDayHourOverrides() {
  const { data, error } = await sb().from("clinic_day_hour_overrides")
    .select("appointmentDate, isOpen, startTime, endTime, familyNotice, updatedAt")
    .order("appointmentDate", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, OVERRIDE_DATES));
}

// ============================= SUPER-ADMIN APPOINTMENT EXPORT =============================

export async function prepareSuperAdminAppointmentExport(input: { actorEmail: string; startDate: string; endDate: string }) {
  const { data, error } = await sb().from("clinic_appointments")
    .select("*")
    .gte("appointmentDate", input.startDate)
    .lte("appointmentDate", input.endDate)
    .order("appointmentDate", { ascending: true })
    .order("appointmentTime", { ascending: true });
  if (error) throw error;
  const governance = (await getSuperAdminGovernanceSettings()) as Record<string, unknown>;
  const retentionExpiresAt = new Date(Date.now() + (governance.exportRetentionDays as number) * 86400000);
  await sb().from("super_admin_audit_events").insert({
    eventId: `appointment-export-${Date.now()}`,
    eventType: "appointment-csv-prepared",
    actorEmail: input.actorEmail,
    startDate: input.startDate,
    endDate: input.endDate,
    recordCount: (data ?? []).length,
    summary: `Super-admin prepared a confidential appointment-record CSV with a ${governance.exportRetentionDays}-day clinic policy. Preparation does not prove download, delivery, secure storage, or disposal.`,
  });
  return { rows: (data ?? []).map((row) => dateFields(row, APP_DATES_FULL)), retentionDays: governance.exportRetentionDays, retentionExpiresAt };
}

export async function searchSuperAdminAppointmentExportRegister(input: { startDate?: string; endDate?: string; actorQuery?: string } = {}) {
  let query = sb().from("super_admin_audit_events")
    .select("eventId, actorEmail, startDate, endDate, recordCount, summary, occurredAt")
    .eq("eventType", "appointment-csv-prepared");
  if (input.startDate) query = query.gte("occurredAt", new Date(`${input.startDate}T00:00:00.000Z`).toISOString());
  if (input.endDate) query = query.lte("occurredAt", new Date(`${input.endDate}T23:59:59.999Z`).toISOString());
  const actorQuery = input.actorQuery?.trim().toLowerCase();
  if (actorQuery) query = query.ilike("actorEmail", `%${actorQuery}%`);
  const { data, error } = await query.order("occurredAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, AUDIT_EVENT_DATES));
}

// ============================= REFERRAL AUDIT & DELIVERY MONITOR =============================

export type ReferralAuditInput = {
  clientEventId: string;
  childId: string;
  type: "appointment-change" | "referral-letter" | "email-share" | "patient-communication";
  occurredAt: Date;
  actorName: string;
  summary: string;
  message?: string;
  deliveryStatus?: "draft-opened" | "sent" | "saved" | "cancelled" | "unavailable";
  isResend?: boolean;
  retryLimit?: number;
  retryAttempts?: number;
};

export async function persistReferralAuditEvent(clinicianUserId: number, input: ReferralAuditInput): Promise<void> {
  const { error } = await sb().from("referral_audit_events").upsert(
    {
      clinicianUserId,
      clientEventId: input.clientEventId,
      childId: input.childId,
      type: input.type,
      occurredAt: input.occurredAt.toISOString(),
      actorRole: "clinician",
      actorName: input.actorName,
      summary: input.summary,
      message: input.message ?? null,
      deliveryStatus: input.deliveryStatus ?? null,
      isResend: input.isResend ?? false,
      retryLimit: input.retryLimit ?? MAX_REFERRAL_EMAIL_RESENDS,
      retryAttempts: input.retryAttempts ?? 0,
    },
    { onConflict: "clinicianUserId,clientEventId" }
  );
  if (error) throw error;
}

export async function listReferralAuditEvents(clinicianUserId: number) {
  const { data, error } = await sb().from("referral_audit_events").select("*").eq("clinicianUserId", clinicianUserId).order("occurredAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, REFERRAL_DATES));
}

export async function reserveReferralEmailRetry(clinicianUserId: number, childId: string, recipientEmail: string) {
  const { data, error } = await sb().rpc("reserve_referral_email_retry", {
    p_clinician_user_id: clinicianUserId,
    p_child_id: childId,
    p_recipient_email: recipientEmail,
    p_max_resends: MAX_REFERRAL_EMAIL_RESENDS,
  });
  if (error) throw error;
  const result = (data ?? null) as { allowed: boolean; attemptsUsed: number; limit: number; attemptedAt: string } | null;
  return (
    result ?? {
      allowed: false,
      attemptsUsed: MAX_REFERRAL_EMAIL_RESENDS,
      limit: MAX_REFERRAL_EMAIL_RESENDS,
      attemptedAt: new Date().toISOString(),
    }
  );
}

export async function getReferralDeliveryMonitorConfig() {
  const { data, error } = await sb().from("referral_delivery_monitor").select("*").limit(1);
  if (error) throw error;
  if (data?.[0]) return dateFields(data[0], MONITOR_DATES);
  await sb().from("referral_delivery_monitor").insert({ thresholdHours: UNRESOLVED_REFERRAL_ALERT_HOURS });
  const { data: created, error: createdError } = await sb().from("referral_delivery_monitor").select("*").limit(1);
  if (createdError) throw createdError;
  if (!created?.[0]) throw new Error("Database not available for referral delivery monitoring");
  return dateFields(created[0], MONITOR_DATES);
}

export async function saveReferralDeliveryMonitorSchedule(taskUid: string) {
  const config = (await getReferralDeliveryMonitorConfig()) as Record<string, unknown>;
  const { error } = await sb().from("referral_delivery_monitor")
    .update({ scheduleCronTaskUid: taskUid, scheduleEnabled: true })
    .eq("id", config.id as number);
  if (error) throw error;
}

export async function setReferralDeliveryMonitorEnabled(enabled: boolean) {
  const config = (await getReferralDeliveryMonitorConfig()) as Record<string, unknown>;
  await sb().from("referral_delivery_monitor").update({ scheduleEnabled: enabled }).eq("id", config.id as number);
  return { ...config, scheduleEnabled: enabled };
}

export async function getReferralDeliveryMonitorByTaskUid(taskUid: string) {
  const { data, error } = await sb().from("referral_delivery_monitor").select("*").eq("scheduleCronTaskUid", taskUid).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, MONITOR_DATES);
}

export async function findAndMarkOverdueReferralDeliveryFailures() {
  const config = (await getReferralDeliveryMonitorConfig()) as Record<string, unknown>;
  const { data, error } = await sb().rpc("claim_overdue_referral_deliveries", { p_threshold_hours: config.thresholdHours as number });
  if (error) throw error;
  const alerted = (data ?? []) as Array<Record<string, unknown>>;
  await sb().from("referral_delivery_monitor").update({ lastRunAt: new Date().toISOString() }).eq("id", config.id as number);
  return {
    thresholdHours: config.thresholdHours,
    alerted: alerted.map((row) => dateFields(row, ["occurredAt"])),
  };
}

export async function releaseReferralDeliveryFailureAlert(eventId: number) {
  const { error } = await sb().from("referral_audit_events").update({ alertSentAt: null }).eq("id", eventId);
  if (error) throw error;
}

// ============================= AUDIT RETENTION & ARCHIVING =============================

export async function getAuditRetentionPolicy(clinicianUserId: number) {
  const { data, error } = await sb().from("audit_retention_policies").select("*").eq("clinicianUserId", clinicianUserId).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, POLICY_DATES);
}

export async function saveAuditRetentionPolicy(clinicianUserId: number, retentionDays: number, updatedBy: string) {
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  const { error } = await sb().from("audit_retention_policies")
    .upsert({ clinicianUserId, retentionDays, updatedBy }, { onConflict: "clinicianUserId" });
  if (error) throw error;
  if (existing && existing.retentionDays !== retentionDays) {
    await sb().from("audit_retention_policy_changes").insert({
      clinicianUserId,
      setting: "retention-days",
      previousValue: `${existing.retentionDays} days`,
      nextValue: `${retentionDays} days`,
      changedBy: updatedBy,
    });
  }
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function saveAuditArchiveSchedule(clinicianUserId: number, taskUid: string, changedBy = "Associate Professor Dr. Anil Ojha") {
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  const { error } = await sb().from("audit_retention_policies")
    .update({ archiveScheduleCronTaskUid: taskUid, automaticArchiveEnabled: true })
    .eq("clinicianUserId", clinicianUserId);
  if (error) throw error;
  if (!existing?.automaticArchiveEnabled) {
    await sb().from("audit_retention_policy_changes").insert({
      clinicianUserId, setting: "automatic-archive", previousValue: "Paused", nextValue: "Enabled", changedBy,
    });
  }
}

export async function setAuditArchiveScheduleEnabled(clinicianUserId: number, enabled: boolean, changedBy = "Associate Professor Dr. Anil Ojha") {
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  await sb().from("audit_retention_policies").update({ automaticArchiveEnabled: enabled }).eq("clinicianUserId", clinicianUserId);
  if (existing && existing.automaticArchiveEnabled !== enabled) {
    await sb().from("audit_retention_policy_changes").insert({
      clinicianUserId, setting: "automatic-archive",
      previousValue: existing.automaticArchiveEnabled ? "Enabled" : "Paused",
      nextValue: enabled ? "Enabled" : "Paused",
      changedBy,
    });
  }
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function getAuditRetentionPolicyByTaskUid(taskUid: string) {
  const { data, error } = await sb().from("audit_retention_policies").select("*").eq("archiveScheduleCronTaskUid", taskUid).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, POLICY_DATES);
}

export async function saveMonthlyArchiveSummarySchedule(clinicianUserId: number, taskUid: string) {
  const { error } = await sb().from("audit_retention_policies")
    .update({ monthlySummaryCronTaskUid: taskUid, monthlySummaryEnabled: true })
    .eq("clinicianUserId", clinicianUserId);
  if (error) throw error;
}

export async function setMonthlyArchiveSummaryEnabled(clinicianUserId: number, enabled: boolean) {
  await sb().from("audit_retention_policies").update({ monthlySummaryEnabled: enabled }).eq("clinicianUserId", clinicianUserId);
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function setMonthlyArchiveSummaryDeliveryMinute(clinicianUserId: number, deliveryMinute: number) {
  await sb().from("audit_retention_policies").update({ monthlySummaryDeliveryMinute: deliveryMinute }).eq("clinicianUserId", clinicianUserId);
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function getAuditRetentionPolicyByMonthlySummaryTaskUid(taskUid: string) {
  const { data, error } = await sb().from("audit_retention_policies").select("*").eq("monthlySummaryCronTaskUid", taskUid).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, POLICY_DATES);
}

export async function saveQuarterlyRetentionReviewSchedule(clinicianUserId: number, taskUid: string) {
  const { error } = await sb().from("audit_retention_policies")
    .update({ quarterlyReviewCronTaskUid: taskUid, quarterlyReviewEnabled: true })
    .eq("clinicianUserId", clinicianUserId);
  if (error) throw error;
}

export async function setQuarterlyRetentionReviewEnabled(clinicianUserId: number, enabled: boolean) {
  await sb().from("audit_retention_policies").update({ quarterlyReviewEnabled: enabled }).eq("clinicianUserId", clinicianUserId);
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function getAuditRetentionPolicyByQuarterlyReviewTaskUid(taskUid: string) {
  const { data, error } = await sb().from("audit_retention_policies").select("*").eq("quarterlyReviewCronTaskUid", taskUid).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? null, POLICY_DATES);
}

export async function getAuditArchivePreview(clinicianUserId: number, retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const { count, error } = await sb().from("referral_audit_events")
    .select("id", { count: "exact", head: true })
    .eq("clinicianUserId", clinicianUserId)
    .is("archivedAt", null)
    .lt("occurredAt", cutoff.toISOString());
  if (error) throw error;
  return { retentionDays, cutoff: cutoff.toISOString(), eligibleCount: count ?? 0 };
}

export async function archiveExpiredAuditEvents(clinicianUserId: number, retentionDays: number, archivedBy: string, archiveReason: string, executionType: "manual" | "scheduled" = "manual") {
  const { data, error } = await sb().rpc("archive_expired_audit_events", {
    p_clinician_user_id: clinicianUserId,
    p_retention_days: retentionDays,
    p_archived_by: archivedBy,
    p_archive_reason: archiveReason,
    p_execution_type: executionType,
  });
  if (error) throw error;
  const result = (data ?? {}) as { archivedCount?: number; cutoff?: string };
  return { archivedCount: result.archivedCount ?? 0, cutoff: result.cutoff ?? new Date().toISOString() };
}

export async function runScheduledAuditArchive(taskUid: string) {
  const policy = (await getAuditRetentionPolicyByTaskUid(taskUid)) as Record<string, unknown> | null;
  if (!policy || policy.automaticArchiveEnabled !== true) return { skipped: "disabled-or-orphan", archivedCount: 0 };
  const result = await archiveExpiredAuditEvents(
    policy.clinicianUserId as number,
    policy.retentionDays as number,
    "Automated retention schedule",
    `Scheduled non-destructive archive after ${policy.retentionDays} days.`,
    "scheduled"
  );
  await sb().from("audit_retention_policies")
    .update({ lastArchiveRunAt: new Date().toISOString(), lastArchiveCount: result.archivedCount })
    .eq("id", policy.id as number);
  return { ...result, skipped: null };
}

export async function getAuditArchiveRuns(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  let query = sb().from("audit_archive_runs").select("*").eq("clinicianUserId", clinicianUserId);
  if (range.start) query = query.gte("executedAt", range.start.toISOString());
  if (range.end) query = query.lte("executedAt", range.end.toISOString());
  const { data, error } = await query.order("executedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, RUN_DATES));
}

export async function getAuditRetentionDashboard(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  const [summaryRes, recentRuns, policyChanges, archiveTrend] = await Promise.all([
    sb().rpc("audit_retention_summary", { p_clinician_user_id: clinicianUserId }),
    getAuditArchiveRuns(clinicianUserId, range),
    sb().from("audit_retention_policy_changes").select("*").eq("clinicianUserId", clinicianUserId).order("changedAt", { ascending: false }).limit(8),
    getArchiveVolumeTrend(clinicianUserId, range),
  ]);
  if (summaryRes.error) throw summaryRes.error;
  if (policyChanges.error) throw policyChanges.error;
  const summary = (summaryRes.data ?? { total: 0, archived: 0, storageBytes: 0 }) as { total: number; archived: number; storageBytes: number };
  const total = summary.total ?? 0;
  return {
    totalRecords: total,
    activeRecords: total - (summary.archived ?? 0),
    archivedRecords: summary.archived ?? 0,
    storageBytes: summary.storageBytes ?? 0,
    recentRuns,
    policyChanges: (policyChanges.data ?? []).map((row) => dateFields(row, CHANGE_DATES)),
    archiveTrend,
  };
}

export async function getArchiveVolumeTrend(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  const now = new Date();
  const end = range.end ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const start = range.start ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const startMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const length = Math.min(24, Math.max(1, (endMonth.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 + endMonth.getUTCMonth() - startMonth.getUTCMonth() + 1));
  const rows = await getAuditArchiveRuns(clinicianUserId, { start, end });
  const buckets = Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      archivedRecords: 0,
      archiveRuns: 0,
    };
  });
  for (const row of rows) {
    const executedAt = row.executedAt as unknown as Date;
    if (!(executedAt instanceof Date)) continue;
    const key = `${executedAt.getUTCFullYear()}-${String(executedAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) {
      bucket.archivedRecords += (row.archivedCount as number) ?? 0;
      bucket.archiveRuns += 1;
    }
  }
  return buckets;
}

export async function getOnDemandArchiveSummary(clinicianUserId: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [runs, dashboard] = await Promise.all([
    getAuditArchiveRuns(clinicianUserId, { start }),
    getAuditRetentionDashboard(clinicianUserId),
  ]);
  return {
    period: `${start.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" })} to date`,
    archiveRuns: runs.length,
    archivedRecords: runs.reduce((total, run) => total + (run.archivedCount as number), 0),
    activeRecords: dashboard.activeRecords,
    archivedRecordsTotal: dashboard.archivedRecords,
    storageBytes: dashboard.storageBytes,
  };
}

export async function getMonthlyArchiveSummaryForTask(taskUid: string) {
  const policy = (await getAuditRetentionPolicyByMonthlySummaryTaskUid(taskUid)) as Record<string, unknown> | null;
  if (!policy || policy.monthlySummaryEnabled !== true) return { skipped: "disabled-or-orphan" as const };
  const now = new Date();
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const period = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;
  if (policy.lastMonthlySummaryPeriod === period) return { skipped: "already-sent" as const, period };
  const [runs, dashboard] = await Promise.all([
    getAuditArchiveRuns(policy.clinicianUserId as number, { start: periodStart, end: new Date(periodEnd.getTime() - 1) }),
    getAuditRetentionDashboard(policy.clinicianUserId as number),
  ]);
  return {
    skipped: null, policy, period,
    archiveRuns: runs.length,
    archivedRecords: runs.reduce((total, run) => total + (run.archivedCount as number), 0),
    activeRecords: dashboard.activeRecords,
    storageBytes: dashboard.storageBytes,
  };
}

export async function markMonthlyArchiveSummarySent(policyId: number, period: string) {
  const { error } = await sb().from("audit_retention_policies")
    .update({ lastMonthlySummaryPeriod: period, lastMonthlySummaryAt: new Date().toISOString() })
    .eq("id", policyId);
  if (error) throw error;
}

export async function getQuarterlyRetentionReviewForTask(taskUid: string) {
  const policy = (await getAuditRetentionPolicyByQuarterlyReviewTaskUid(taskUid)) as Record<string, unknown> | null;
  if (!policy || policy.quarterlyReviewEnabled !== true) return { skipped: "disabled-or-orphan" as const };
  const now = new Date();
  const period = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  if (policy.lastQuarterlyReviewPeriod === period) return { skipped: "already-sent" as const, period };
  const dashboard = await getAuditRetentionDashboard(policy.clinicianUserId as number);
  return {
    skipped: null, policy, period,
    activeRecords: dashboard.activeRecords,
    archivedRecords: dashboard.archivedRecords,
    storageBytes: dashboard.storageBytes,
  };
}

export async function markQuarterlyRetentionReviewSent(policyId: number, period: string) {
  const { error } = await sb().from("audit_retention_policies")
    .update({ lastQuarterlyReviewPeriod: period, lastQuarterlyReviewAt: new Date().toISOString() })
    .eq("id", policyId);
  if (error) throw error;
}

// ============================= GUARDIAN CONTACTS & REPORT SHARES =============================

export async function listGuardianContacts(clinicianUserId: number, childId?: string) {
  let query = sb().from("guardian_contacts").select("*").eq("clinicianUserId", clinicianUserId);
  if (childId) query = query.eq("childId", childId);
  const { data, error } = await query.order("status", { ascending: true }).order("fullName", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, GUARDIAN_DATES));
}

export async function createGuardianContact(clinicianUserId: number, input: { childId: string; fullName: string; relationship: string; email: string }) {
  const email = normalizeEmail(input.email);
  const { data: existing, error: existingError } = await sb().from("guardian_contacts")
    .select("*")
    .eq("clinicianUserId", clinicianUserId)
    .eq("childId", input.childId)
    .eq("email", email)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.[0]) return dateFields(existing[0], GUARDIAN_DATES);
  const { data, error } = await sb().from("guardian_contacts").insert({
    clinicianUserId,
    childId: input.childId,
    fullName: input.fullName.trim(),
    relationship: input.relationship.trim(),
    email,
    status: "pending",
  }).select("*").single();
  if (error) throw error;
  return dateFields(data, GUARDIAN_DATES);
}

export async function confirmGuardianContact(clinicianUserId: number, contactId: number, confirmedBy: string) {
  const { data, error } = await sb().from("guardian_contacts")
    .update({ status: "confirmed", confirmedBy, confirmedAt: new Date().toISOString() })
    .eq("id", contactId)
    .eq("clinicianUserId", clinicianUserId)
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Guardian contact not found");
  return dateFields(data, GUARDIAN_DATES);
}

export async function createPatientReportShare(clinicianUserId: number, input: { childId: string; guardianContactId: number; scope: "record-pdf" | "timeline-report" }) {
  const guardian = await sb().from("guardian_contacts")
    .select("id")
    .eq("id", input.guardianContactId)
    .eq("clinicianUserId", clinicianUserId)
    .eq("childId", input.childId)
    .eq("status", "confirmed")
    .limit(1);
  if (guardian.error) throw guardian.error;
  if (!guardian.data?.[0]) throw new Error("Select a confirmed guardian contact before sharing a report");
  const acknowledgementToken = randomUUID().replaceAll("-", "");
  const { data, error } = await sb().from("patient_report_shares").insert({
    clinicianUserId,
    childId: input.childId,
    guardianContactId: input.guardianContactId,
    scope: input.scope,
    acknowledgementToken,
    deliveryStatus: "draft-opened",
  }).select("*").single();
  if (error) throw error;
  return dateFields(data, SHARE_DATES);
}

export async function updatePatientReportShareStatus(clinicianUserId: number, shareId: number, deliveryStatus: "draft-opened" | "sent" | "saved" | "cancelled" | "unavailable") {
  const { error } = await sb().from("patient_report_shares")
    .update({ deliveryStatus })
    .eq("id", shareId)
    .eq("clinicianUserId", clinicianUserId);
  if (error) throw error;
}

export async function listPatientReportShares(clinicianUserId: number, childId: string) {
  const { data, error } = await sb().from("patient_report_shares")
    .select("id, childId, scope, acknowledgementToken, deliveryStatus, createdAt, acknowledgedAt, acknowledgementText, guardian_contacts(fullName, email)")
    .eq("clinicianUserId", clinicianUserId)
    .eq("childId", childId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const guardian = (row.guardian_contacts ?? {}) as { fullName?: string | null; email?: string | null };
    const { guardian_contacts: _ignored, ...rest } = row;
    void _ignored;
    return dateFields({ ...rest, guardianName: guardian.fullName ?? null, guardianEmail: guardian.email ?? null }, SHARE_DATES);
  });
}

export async function getReportAcknowledgement(token: string) {
  const { data, error } = await sb().from("patient_report_shares")
    .select("scope, createdAt, acknowledgedAt")
    .eq("acknowledgementToken", token)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  return row ? dateFields(row, SHARE_DATES) : undefined;
}

export async function acknowledgeReport(token: string, acknowledgementText: string) {
  const { data, error } = await sb().rpc("acknowledge_report", {
    p_token: token,
    p_acknowledgement_text: acknowledgementText,
  });
  if (error) throw error;
  return Boolean(data);
}

// ============================= WAITLIST & CAPACITY =============================

export type DurableWaitlistRequestInput = {
  requestId: string;
  appointmentId: string;
  childId: string;
  requestedAt: Date;
  status: "pending" | "reviewed" | "declined" | "withdrawn" | "offered" | "responded" | "expired" | "converted";
  note?: string;
  offerDate?: string;
  offerTime?: string;
  offeredAt?: Date;
  offerExpiresAt?: Date;
  parentResponse?: "accepted" | "declined";
  respondedAt?: Date;
  clinicianAcknowledgedAt?: Date;
  convertedAt?: Date;
  convertedBy?: string;
  assignedStaffId?: string;
  assignedAt?: Date;
};

export type DurableWaitlistEventInput = {
  eventId: string;
  requestId: string;
  eventType: "requested" | "reviewed" | "withdrawn" | "offer-created" | "parent-response" | "expired" | "converted" | "assignment-changed" | "response-acknowledged";
  actor: "clinician" | "guardian" | "system";
  occurredAt: Date;
  status: DurableWaitlistRequestInput["status"];
};

export async function getDurableWaitlistState(clinicianUserId: number) {
  const [requests, capacitySnapshots, printAudits] = await Promise.all([
    sb().from("waitlist_requests").select("*").eq("clinicianUserId", clinicianUserId),
    sb().from("staff_capacity_snapshots").select("*").eq("clinicianUserId", clinicianUserId),
    sb().from("internal_follow_up_print_audits").select("*").eq("clinicianUserId", clinicianUserId),
  ]);
  if (requests.error) throw requests.error;
  if (capacitySnapshots.error) throw capacitySnapshots.error;
  if (printAudits.error) throw printAudits.error;
  return {
    requests: (requests.data ?? []).map((row) => dateFields(row, WAITLIST_DATES)),
    capacitySnapshots: (capacitySnapshots.data ?? []).map((row) => dateFields(row, SNAPSHOT_DATES)),
    printAudits: (printAudits.data ?? []).map((row) => dateFields(row, PRINT_AUDIT_DATES)),
  };
}

export async function saveDurableWaitlistState(
  clinicianUserId: number,
  requests: DurableWaitlistRequestInput[],
  events: DurableWaitlistEventInput[],
  snapshots: Array<{ snapshotId: string; staffId: string; staffName: string; triageCapacity: number; effectiveAt: Date }>
) {
  for (const request of requests) {
    const { error } = await sb().from("waitlist_requests").upsert(
      {
        clinicianUserId,
        requestId: request.requestId,
        appointmentId: request.appointmentId,
        childId: request.childId,
        requestedAt: request.requestedAt.toISOString(),
        status: request.status,
        note: request.note ?? null,
        offerDate: request.offerDate ?? null,
        offerTime: request.offerTime ?? null,
        offeredAt: request.offeredAt?.toISOString() ?? null,
        offerExpiresAt: request.offerExpiresAt?.toISOString() ?? null,
        parentResponse: request.parentResponse ?? null,
        respondedAt: request.respondedAt?.toISOString() ?? null,
        clinicianAcknowledgedAt: request.clinicianAcknowledgedAt?.toISOString() ?? null,
        convertedAt: request.convertedAt?.toISOString() ?? null,
        convertedBy: request.convertedBy ?? null,
        assignedStaffId: request.assignedStaffId ?? null,
        assignedAt: request.assignedAt?.toISOString() ?? null,
      },
      { onConflict: "clinicianUserId,requestId" }
    );
    if (error) throw error;
  }
  for (const event of events) {
    const { error } = await sb().from("waitlist_event_log").upsert(
      { clinicianUserId, ...event, occurredAt: event.occurredAt.toISOString() },
      { onConflict: "clinicianUserId,eventId" }
    );
    if (error) throw error;
  }
  for (const snapshot of snapshots) {
    const { error } = await sb().from("staff_capacity_snapshots").upsert(
      { clinicianUserId, ...snapshot, effectiveAt: snapshot.effectiveAt.toISOString() },
      { onConflict: "clinicianUserId,snapshotId" }
    );
    if (error) throw error;
  }
  return getDurableWaitlistState(clinicianUserId);
}

export async function recordInternalFollowUpPrintAudit(clinicianUserId: number, input: { auditId: string; itemCount: number; actorName: string; initiatedAt: Date }) {
  const { error } = await sb().from("internal_follow_up_print_audits").upsert(
    { clinicianUserId, ...input, initiatedAt: input.initiatedAt.toISOString(), documentScope: "appointment-change-follow-up" },
    { onConflict: "clinicianUserId,auditId" }
  );
  if (error) throw error;
  return getDurableWaitlistState(clinicianUserId);
}

export async function listInternalFollowUpPrintAudits(clinicianUserId: number, filters: { start?: Date; end?: Date; actorName?: string } = {}) {
  let query = sb().from("internal_follow_up_print_audits").select("*").eq("clinicianUserId", clinicianUserId);
  if (filters.start) query = query.gte("initiatedAt", filters.start.toISOString());
  if (filters.end) query = query.lte("initiatedAt", filters.end.toISOString());
  if (filters.actorName) query = query.eq("actorName", filters.actorName);
  const { data, error } = await query.order("initiatedAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, PRINT_AUDIT_DATES));
}

export async function recordCapacityTargetChangeAlert(clinicianUserId: number, input: { alertId: string; staffId: string; staffName: string; previousTarget: number; newTarget: number; changedBy: string; changedAt: Date }) {
  const { error } = await sb().from("capacity_target_change_alerts").upsert(
    { clinicianUserId, ...input, changedAt: input.changedAt.toISOString() },
    { onConflict: "clinicianUserId,alertId" }
  );
  if (error) throw error;
  return listCapacityTargetChangeAlerts(clinicianUserId);
}

export async function listCapacityTargetChangeAlerts(clinicianUserId: number) {
  const { data, error } = await sb().from("capacity_target_change_alerts").select("*").eq("clinicianUserId", clinicianUserId).order("changedAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, ALERT_DATES));
}

export async function acknowledgeCapacityTargetChangeAlert(clinicianUserId: number, alertId: string, acknowledgedBy: string) {
  const { error } = await sb().from("capacity_target_change_alerts")
    .update({ acknowledgedAt: new Date().toISOString(), acknowledgedBy })
    .eq("clinicianUserId", clinicianUserId)
    .eq("alertId", alertId);
  if (error) throw error;
  return listCapacityTargetChangeAlerts(clinicianUserId);
}

// ============================= PRESETS & VISIBILITY =============================

export type PrintAuditFilterPresetInput = { presetId: string; name: string; startDate: string; endDate: string; actorName?: string; displayOrder?: number };

export async function listPrintAuditFilterPresets(clinicianUserId: number) {
  const { data, error } = await sb().from("print_audit_filter_presets").select("*").eq("clinicianUserId", clinicianUserId).order("displayOrder", { ascending: true }).order("updatedAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, PRESET_DATES));
}

export async function savePrintAuditFilterPreset(clinicianUserId: number, input: PrintAuditFilterPresetInput) {
  const existing = await sb().from("print_audit_filter_presets").select("displayOrder").eq("clinicianUserId", clinicianUserId).eq("presetId", input.presetId).limit(1);
  if (existing.error) throw existing.error;
  const current = (await listPrintAuditFilterPresets(clinicianUserId)) as Array<{ displayOrder: number }>;
  const nextOrder = input.displayOrder ?? existing.data?.[0]?.displayOrder ?? current.length;
  const { error } = await sb().from("print_audit_filter_presets").upsert(
    { clinicianUserId, presetId: input.presetId, name: input.name, startDate: input.startDate, endDate: input.endDate, actorName: input.actorName ?? null, displayOrder: nextOrder },
    { onConflict: "clinicianUserId,presetId" }
  );
  if (error) throw error;
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function deletePrintAuditFilterPreset(clinicianUserId: number, presetId: string) {
  const { error } = await sb().from("print_audit_filter_presets").delete().eq("clinicianUserId", clinicianUserId).eq("presetId", presetId);
  if (error) throw error;
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function reorderPrintAuditFilterPresets(clinicianUserId: number, presetIds: string[]) {
  const existing = await listPrintAuditFilterPresets(clinicianUserId);
  const ownedIds = new Set(existing.map((preset) => preset.presetId));
  if (presetIds.length !== ownedIds.size || presetIds.some((presetId) => !ownedIds.has(presetId))) {
    throw new Error("Preset order must include each clinician-owned preset exactly once.");
  }
  await Promise.all(presetIds.map((presetId, displayOrder) =>
    sb().from("print_audit_filter_presets").update({ displayOrder }).eq("clinicianUserId", clinicianUserId).eq("presetId", presetId)
  ));
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function getCapacityAlertVisibilitySettings(clinicianUserId: number) {
  const { data, error } = await sb().from("capacity_alert_visibility_settings").select("*").eq("clinicianUserId", clinicianUserId).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? { clinicianUserId, ...defaultCapacityAlertVisibility, updatedBy: null, updatedAt: null }, SETTINGS_ROW_DATES);
}

export async function saveCapacityAlertVisibilitySettings(clinicianUserId: number, settings: typeof defaultCapacityAlertVisibility, updatedBy: string) {
  const { error } = await sb().from("capacity_alert_visibility_settings").upsert(
    { clinicianUserId, ...settings, updatedBy },
    { onConflict: "clinicianUserId" }
  );
  if (error) throw error;
  return getCapacityAlertVisibilitySettings(clinicianUserId);
}

type ClinicStaffRole = "receptionist" | "nurse" | "clinician";
type InvitationSearchStatus = "all" | "invited" | "active" | "expired" | "revoked";

export async function listInvitationSearchPresets(clinicianUserId: number) {
  const { data, error } = await sb().from("invitation_search_presets").select("*").eq("clinicianUserId", clinicianUserId).order("displayOrder", { ascending: true }).order("updatedAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, PRESET_DATES));
}

export async function saveInvitationSearchPreset(clinicianUserId: number, input: { presetId: string; name: string; searchText: string; statusFilter: InvitationSearchStatus; displayOrder?: number }) {
  const existing = await listInvitationSearchPresets(clinicianUserId);
  const saved = existing.find((preset) => preset.presetId === input.presetId);
  const displayOrder = input.displayOrder ?? saved?.displayOrder ?? (existing.length ? Math.max(...existing.map((preset) => preset.displayOrder)) + 1 : 0);
  const { error } = await sb().from("invitation_search_presets").upsert(
    { clinicianUserId, presetId: input.presetId, name: input.name, searchText: input.searchText, statusFilter: input.statusFilter, displayOrder },
    { onConflict: "clinicianUserId,presetId" }
  );
  if (error) throw error;
  return listInvitationSearchPresets(clinicianUserId);
}

export async function deleteInvitationSearchPreset(clinicianUserId: number, presetId: string) {
  const { error } = await sb().from("invitation_search_presets").delete().eq("clinicianUserId", clinicianUserId).eq("presetId", presetId);
  if (error) throw error;
  return listInvitationSearchPresets(clinicianUserId);
}

export async function reorderInvitationSearchPresets(clinicianUserId: number, presetIds: string[]) {
  const current = await listInvitationSearchPresets(clinicianUserId);
  if (new Set(presetIds).size !== presetIds.length || presetIds.length !== current.length || presetIds.some((presetId) => !current.some((preset) => preset.presetId === presetId))) {
    throw new Error("Invitation preset order must contain every clinician-owned preset once.");
  }
  await Promise.all(presetIds.map((presetId, displayOrder) =>
    sb().from("invitation_search_presets").update({ displayOrder }).eq("clinicianUserId", clinicianUserId).eq("presetId", presetId)
  ));
  return listInvitationSearchPresets(clinicianUserId);
}

// ============================= STAFF, INVITATIONS & ACTIVITY =============================

async function recordStaffAccountActivity(clinicianUserId: number, input: { staffAccountId: string; eventType: string; actorName: string; summary: string; occurredAt?: Date }) {
  const occurredAt = input.occurredAt ?? new Date();
  const { error } = await sb().from("staff_account_activity").upsert(
    {
      clinicianUserId,
      activityId: `staff-activity-${input.staffAccountId}-${occurredAt.getTime()}-${input.eventType}`,
      staffAccountId: input.staffAccountId,
      eventType: input.eventType,
      actorName: input.actorName,
      summary: input.summary,
      occurredAt: occurredAt.toISOString(),
    },
    { onConflict: "clinicianUserId,activityId" }
  );
  if (error) throw error;
}

async function expireDueStaffInvitations(clinicianUserId: number) {
  const now = new Date();
  const { data: due, error } = await sb().from("clinic_staff_accounts")
    .select("*")
    .eq("clinicianUserId", clinicianUserId)
    .eq("status", "invited")
    .or(`expiresAt.is.null,expiresAt.lt.${now.toISOString()}`);
  if (error) throw error;
  for (const account of due ?? []) {
    await sb().from("clinic_staff_accounts").update({ status: "expired" }).eq("id", account.id);
    await recordStaffAccountActivity(clinicianUserId, {
      staffAccountId: account.staffAccountId,
      eventType: "expired",
      actorName: "System",
      summary: "Pending staff invitation expired before authenticated activation.",
      occurredAt: now,
    });
  }
}

export async function createClinicStaffInvitation(clinicianUserId: number, input: { staffAccountId: string; email: string; staffRole: ClinicStaffRole; invitedBy: string }) {
  const invitedEmail = normalizeEmail(input.email);
  const settings = (await getStaffInvitationSettings(clinicianUserId)) as { expiryDays: number };
  const expiresAt = new Date(Date.now() + settings.expiryDays * 86400000);
  const byId = await sb().from("clinic_staff_accounts").select("*").eq("clinicianUserId", clinicianUserId).eq("staffAccountId", input.staffAccountId).limit(1);
  if (byId.error) throw byId.error;
  const byEmail = byId.data?.[0]
    ? null
    : await sb().from("clinic_staff_accounts").select("*").eq("clinicianUserId", clinicianUserId).eq("invitedEmail", invitedEmail).limit(1);
  const existing = byId.data?.[0] ?? byEmail?.data?.[0] ?? null;
  const values = {
    clinicianUserId,
    staffAccountId: input.staffAccountId,
    invitedEmail,
    staffRole: input.staffRole,
    status: "invited" as const,
    invitedBy: input.invitedBy,
    expiresAt: expiresAt.toISOString(),
    staffUserId: null,
    displayName: null,
    resendPreparedAt: null,
    resendCount: 0,
    activatedAt: null,
    revokedAt: null,
  };
  if (existing) await sb().from("clinic_staff_accounts").update(values).eq("id", existing.id);
  else await sb().from("clinic_staff_accounts").insert(values);
  await recordStaffAccountActivity(clinicianUserId, {
    staffAccountId: input.staffAccountId,
    eventType: "invitation-created",
    actorName: input.invitedBy,
    summary: `Staff invitation prepared with a ${settings.expiryDays}-day activation window.`,
  });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function listClinicStaffAccounts(clinicianUserId: number) {
  await expireDueStaffInvitations(clinicianUserId);
  const { data, error } = await sb().from("clinic_staff_accounts").select("*").eq("clinicianUserId", clinicianUserId).order("invitedAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, STAFF_DATES));
}

export async function revokeClinicStaffAccount(clinicianUserId: number, staffAccountId: string, actorName: string) {
  await sb().from("clinic_staff_accounts").update({ status: "revoked", revokedAt: new Date().toISOString() }).eq("clinicianUserId", clinicianUserId).eq("staffAccountId", staffAccountId);
  await recordStaffAccountActivity(clinicianUserId, { staffAccountId, eventType: "revoked", actorName, summary: "Clinician revoked this staff account's clinic access." });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function prepareStaffInvitationResend(clinicianUserId: number, staffAccountId: string, actorName: string) {
  await expireDueStaffInvitations(clinicianUserId);
  const found = await sb().from("clinic_staff_accounts").select("*").eq("clinicianUserId", clinicianUserId).eq("staffAccountId", staffAccountId).limit(1);
  if (found.error) throw found.error;
  const account = found.data?.[0] as Record<string, unknown> | undefined;
  if (!account || !["invited", "expired"].includes(String(account.status))) throw new Error("Only pending or expired staff invitations can be prepared again.");
  if ((account.resendCount as number) >= MAX_STAFF_INVITATION_RESENDS) throw new Error(`This invitation has reached the ${MAX_STAFF_INVITATION_RESENDS}-preparation limit.`);
  const settings = (await getStaffInvitationSettings(clinicianUserId)) as { expiryDays: number };
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.expiryDays * 86400000);
  await sb().from("clinic_staff_accounts")
    .update({ status: "invited", expiresAt: expiresAt.toISOString(), resendPreparedAt: now.toISOString(), resendCount: (account.resendCount as number) + 1 })
    .eq("id", account.id as number);
  await recordStaffAccountActivity(clinicianUserId, { staffAccountId, eventType: "resend-prepared", actorName, summary: `Clinician prepared a refreshed ${settings.expiryDays}-day invitation window; no email was sent automatically.`, occurredAt: now });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function listStaffAccountActivity(clinicianUserId: number, input?: { startDate?: string; endDate?: string }) {
  let query = sb().from("staff_account_activity").select("*").eq("clinicianUserId", clinicianUserId);
  if (input?.startDate) query = query.gte("occurredAt", new Date(`${input.startDate}T00:00:00.000Z`).toISOString());
  if (input?.endDate) query = query.lte("occurredAt", new Date(`${input.endDate}T23:59:59.999Z`).toISOString());
  const { data, error } = await query.order("occurredAt", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, ACTIVITY_DATES));
}

export async function getMonthlyStaffAccountActivitySummary(clinicianUserId: number, months = 6) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  const activity = (await listStaffAccountActivity(clinicianUserId, {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`,
    endDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  })) as Array<{ eventType: string; occurredAt: Date }>;
  const buckets = new Map<string, { month: string; total: number; invitationCreated: number; resendPrepared: number; activated: number; expired: number; revoked: number }>();
  for (let index = 0; index < months; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - months + 1 + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(month, { month, total: 0, invitationCreated: 0, resendPrepared: 0, activated: 0, expired: 0, revoked: 0 });
  }
  for (const item of activity) {
    const bucket = buckets.get(`${item.occurredAt.getFullYear()}-${String(item.occurredAt.getMonth() + 1).padStart(2, "0")}`);
    if (!bucket) continue;
    bucket.total += 1;
    if (item.eventType === "invitation-created") bucket.invitationCreated += 1;
    if (item.eventType === "resend-prepared") bucket.resendPrepared += 1;
    if (item.eventType === "activated") bucket.activated += 1;
    if (item.eventType === "expired") bucket.expired += 1;
    if (item.eventType === "revoked") bucket.revoked += 1;
  }
  return [...buckets.values()];
}

export async function getStaffInvitationSettings(clinicianUserId: number) {
  const { data, error } = await sb().from("staff_invitation_settings").select("*").eq("clinicianUserId", clinicianUserId).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? { clinicianUserId, expiryDays: 7, updatedBy: null, updatedAt: null }, SETTINGS_ROW_DATES);
}

export async function saveStaffInvitationSettings(clinicianUserId: number, expiryDays: number, updatedBy: string) {
  const existing = await sb().from("staff_invitation_settings").select("id").eq("clinicianUserId", clinicianUserId).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) await sb().from("staff_invitation_settings").update({ expiryDays, updatedBy }).eq("id", existing.data[0].id);
  else await sb().from("staff_invitation_settings").insert({ clinicianUserId, expiryDays, updatedBy });
  return getStaffInvitationSettings(clinicianUserId);
}

export async function getAuthenticatedStaffAccess(user: { id: number; email: string | null; name: string | null; role: "user" | "admin" }) {
  if (user.role === "admin" || isClinicAdministratorEmail(user.email)) {
    return { allowed: true, isOwner: true, clinicianUserId: user.id, staffRole: "clinician" as ClinicStaffRole };
  }
  const email = user.email ? normalizeEmail(user.email) : "";
  if (!email) return { allowed: false as const, reason: "This authenticated account has no verified email to match a clinic invitation." };
  const pending = await sb().from("clinic_staff_accounts").select("*").eq("invitedEmail", email).eq("status", "invited").limit(1);
  if (pending.error) throw pending.error;
  if (pending.data?.[0]) {
    const p = pending.data[0] as Record<string, unknown>;
    if (!p.expiresAt || new Date(String(p.expiresAt)) < new Date()) {
      await sb().from("clinic_staff_accounts").update({ status: "expired" }).eq("id", p.id as number);
      await recordStaffAccountActivity(p.clinicianUserId as number, { staffAccountId: p.staffAccountId as string, eventType: "expired", actorName: "System", summary: "Pending staff invitation expired before authenticated activation." });
    }
  }
  let rows = await sb().from("clinic_staff_accounts").select("*").eq("staffUserId", user.id).eq("status", "active").limit(1);
  if (rows.error) throw rows.error;
  if (!rows.data?.[0] && email) {
    const invitation = await sb().from("clinic_staff_accounts").select("*").eq("invitedEmail", email).eq("status", "invited").limit(1);
    if (invitation.error) throw invitation.error;
    if (invitation.data?.[0]) {
      const activatedAt = new Date();
      const invitationRow = invitation.data[0] as Record<string, unknown>;
      await sb().from("clinic_staff_accounts")
        .update({ staffUserId: user.id, displayName: user.name ?? email, status: "active", activatedAt: activatedAt.toISOString() })
        .eq("id", invitationRow.id as number);
      await recordStaffAccountActivity(invitationRow.clinicianUserId as number, {
        staffAccountId: invitationRow.staffAccountId as string,
        eventType: "activated",
        actorName: user.name ?? email,
        summary: "Authenticated staff account linked to the clinician-approved invitation.",
        occurredAt: activatedAt,
      });
      rows = await sb().from("clinic_staff_accounts").select("*").eq("id", invitationRow.id as number).limit(1);
      if (rows.error) throw rows.error;
    }
  }
  const account = rows.data?.[0] as Record<string, unknown> | undefined;
  if (!account) return { allowed: false as const, reason: "This account is not linked to an active clinic staff invitation." };
  return {
    allowed: true as const,
    isOwner: false,
    clinicianUserId: account.clinicianUserId as number,
    staffRole: account.staffRole as ClinicStaffRole,
    staffAccountId: account.staffAccountId as string,
  };
}

export async function getCapacityAlertAccessForUser(user: { id: number; email: string | null; name: string | null; role: "user" | "admin" }) {
  const access = await getAuthenticatedStaffAccess(user);
  if (!access.allowed || typeof access.clinicianUserId !== "number") return access;
  if (access.isOwner || access.staffRole === "clinician") return access;
  const settings = (await getCapacityAlertVisibilitySettings(access.clinicianUserId)) as { nurseVisible: boolean; receptionistVisible: boolean };
  const visible = access.staffRole === "nurse" ? settings.nurseVisible : settings.receptionistVisible;
  return visible ? access : { allowed: false as const, reason: "The clinic administrator has not enabled capacity-alert visibility for this staff role." };
}

// ============================= WEEKLY CAPACITY SUMMARY =============================

export async function getWeeklyCapacityReportReferenceSettings(clinicianUserId: number) {
  const { data, error } = await sb().from("weekly_capacity_report_reference_settings").select("*").eq("clinicianUserId", clinicianUserId).limit(1);
  if (error) throw error;
  return dateFields(data?.[0] ?? { clinicianUserId, expiryDays: 30, updatedBy: null, updatedAt: null }, SETTINGS_ROW_DATES);
}

export async function saveWeeklyCapacityReportReferenceSettings(clinicianUserId: number, expiryDays: number, updatedBy: string) {
  const existing = await sb().from("weekly_capacity_report_reference_settings").select("id").eq("clinicianUserId", clinicianUserId).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) await sb().from("weekly_capacity_report_reference_settings").update({ expiryDays, updatedBy }).eq("id", existing.data[0].id);
  else await sb().from("weekly_capacity_report_reference_settings").insert({ clinicianUserId, expiryDays, updatedBy });
  return getWeeklyCapacityReportReferenceSettings(clinicianUserId);
}

export async function getWeeklyCapacitySummary(clinicianUserId: number, weekStartDate: string, weekEndDate: string) {
  const endInstant = new Date(`${weekEndDate}T23:59:59.999Z`).toISOString();
  const startInstant = new Date(`${weekStartDate}T00:00:00.000Z`).toISOString();
  const [snapshotsRes, requestsRes, alertsRes] = await Promise.all([
    sb().from("staff_capacity_snapshots").select("*").eq("clinicianUserId", clinicianUserId).lte("effectiveAt", endInstant).order("effectiveAt", { ascending: false }).limit(500),
    sb().from("waitlist_requests").select("assignedStaffId").eq("clinicianUserId", clinicianUserId).gte("assignedAt", startInstant).lte("assignedAt", endInstant),
    sb().from("capacity_target_change_alerts").select("id").eq("clinicianUserId", clinicianUserId).is("acknowledgedAt", null),
  ]);
  if (snapshotsRes.error) throw snapshotsRes.error;
  if (requestsRes.error) throw requestsRes.error;
  if (alertsRes.error) throw alertsRes.error;
  const latestByStaff = new Map<string, Record<string, unknown>>();
  for (const snapshot of snapshotsRes.data ?? []) {
    const current = latestByStaff.get(snapshot.staffId as string);
    if (!current || new Date(snapshot.effectiveAt as string) > new Date(current.effectiveAt as string)) {
      latestByStaff.set(snapshot.staffId as string, snapshot);
    }
  }
  const assignedCounts = new Map<string, number>();
  for (const request of requestsRes.data ?? []) {
    const staffId = request.assignedStaffId as string | null;
    if (staffId) assignedCounts.set(staffId, (assignedCounts.get(staffId) ?? 0) + 1);
  }
  return {
    rows: [...latestByStaff.values()].map((snapshot) => ({
      staffId: snapshot.staffId as string,
      staffName: snapshot.staffName as string,
      triageCapacity: snapshot.triageCapacity as number,
      assignmentCount: assignedCounts.get(snapshot.staffId as string) ?? 0,
      targetEffectiveAt: new Date(snapshot.effectiveAt as string),
    })),
    unacknowledgedAlertCount: (alertsRes.data ?? []).length,
  };
}

export async function recordWeeklyCapacitySummaryExport(clinicianUserId: number, input: { exportId: string; internalReportId?: string; exportFormat: "csv" | "pdf"; weekStartDate: string; weekEndDate: string; reviewedBy: string; reviewedAt: Date }) {
  const summary = await getWeeklyCapacitySummary(clinicianUserId, input.weekStartDate, input.weekEndDate);
  const settings = (await getWeeklyCapacityReportReferenceSettings(clinicianUserId)) as unknown as { expiryDays: number };
  const referenceExpiresAt = input.exportFormat === "pdf" && input.internalReportId
    ? new Date(input.reviewedAt.getTime() + settings.expiryDays * 86400000)
    : null;
  const { error } = await sb().from("weekly_capacity_summary_exports").upsert(
    {
      clinicianUserId,
      exportId: input.exportId,
      internalReportId: input.internalReportId ?? null,
      exportFormat: input.exportFormat,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      reviewedBy: input.reviewedBy,
      reviewedAt: input.reviewedAt.toISOString(),
      referenceExpiresAt: referenceExpiresAt?.toISOString() ?? null,
      staffCount: summary.rows.length,
      unacknowledgedAlertCount: summary.unacknowledgedAlertCount,
    },
    { onConflict: "clinicianUserId,exportId" }
  );
  if (error) throw error;
  return summary;
}

export async function getWeeklyCapacitySummaryReportReference(clinicianUserId: number, internalReportId: string) {
  const { data, error } = await sb().from("weekly_capacity_summary_exports").select("*").eq("clinicianUserId", clinicianUserId).eq("internalReportId", internalReportId).limit(1);
  if (error) throw error;
  const report = data?.[0] as Record<string, unknown> | undefined;
  if (!report || !report.referenceExpiresAt || new Date(String(report.referenceExpiresAt)) <= new Date()) return null;
  return dateFields(report, ["referenceExpiresAt", "reviewedAt", "createdAt"]);
}

export async function listWeeklyCapacityReportReferenceExpiryReminders(clinicianUserId: number, daysAhead = 7) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 86400000);
  const { data, error } = await sb().from("weekly_capacity_summary_exports")
    .select("internalReportId, weekStartDate, weekEndDate, referenceExpiresAt")
    .eq("clinicianUserId", clinicianUserId)
    .eq("exportFormat", "pdf")
    .gte("referenceExpiresAt", now.toISOString())
    .lte("referenceExpiresAt", cutoff.toISOString())
    .order("referenceExpiresAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, ["referenceExpiresAt"]));
}

// ============================= APPOINTMENTS =============================

export type DurableClinicAppointmentInput = {
  appointmentId: string;
  childId: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  reason: string;
  status: "confirmed" | "needs-intake" | "completed" | "cancelled";
  changeMessage?: string;
  guardianConfirmedAt?: Date;
  rescheduledAt?: Date;
  rescheduleAcknowledgedAt?: Date;
  appointmentChangeReminderDraftedAt?: Date;
};

export async function listClinicAppointments(clinicianUserId: number) {
  const { data, error } = await sb().from("clinic_appointments")
    .select("*")
    .eq("clinicianUserId", clinicianUserId)
    .order("appointmentDate", { ascending: true })
    .order("appointmentTime", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => dateFields(row, APP_DATES_FULL));
}

export async function saveClinicAppointments(clinicianUserId: number, appointments: DurableClinicAppointmentInput[]) {
  for (const appointment of appointments) {
    const payload = {
      appointmentId: appointment.appointmentId,
      childId: appointment.childId,
      service: appointment.service,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      durationMinutes: appointment.durationMinutes,
      reason: appointment.reason,
      status: appointment.status,
      changeMessage: appointment.changeMessage ?? null,
      guardianConfirmedAt: appointment.guardianConfirmedAt?.toISOString() ?? null,
      rescheduledAt: appointment.rescheduledAt?.toISOString() ?? null,
      rescheduleAcknowledgedAt: appointment.rescheduleAcknowledgedAt?.toISOString() ?? null,
      appointmentChangeReminderDraftedAt: appointment.appointmentChangeReminderDraftedAt?.toISOString() ?? null,
    };
    const { error } = await sb().rpc("clinic_upsert_appointment", {
      p_clinician_user_id: clinicianUserId,
      p_appointment: payload,
    });
    if (error) throw error;
  }
  return listClinicAppointments(clinicianUserId);
}

// ============================= GUARDIAN RECORD-ACCESS CHALLENGES =============================

export async function issueGuardianRecordAccessChallenge(clinicianUserId: number, input: { childId: string; issuedBy: string }) {
  const { data, error } = await sb().rpc("issue_guardian_record_access_challenge", {
    p_clinician_user_id: clinicianUserId,
    p_child_id: input.childId,
    p_issued_by: input.issuedBy,
    p_expiry_hours: GUARDIAN_RECORD_ACCESS_CHALLENGE_HOURS,
    p_attempt_limit: GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT,
  });
  if (error) throw error;
  const result = (data ?? {}) as { reference?: string; verificationCode?: string; expiresAt?: string; attemptLimit?: number };
  return {
    reference: result.reference ?? "",
    verificationCode: result.verificationCode ?? "",
    expiresAt: result.expiresAt ? new Date(result.expiresAt) : new Date(),
    attemptLimit: result.attemptLimit ?? GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT,
  };
}

export async function verifyGuardianRecordAccess(input: { reference: string; verificationCode: string }) {
  const { data, error } = await sb().rpc("verify_guardian_record_access", {
    p_reference: input.reference,
    p_verification_code: input.verificationCode,
    p_attempt_limit: GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT,
    p_access_hours: GUARDIAN_RECORD_ACCESS_SESSION_HOURS,
  });
  if (error) throw error;
  if (!data) return null;
  const result = data as { accessToken?: string; childId?: string; accessExpiresAt?: string };
  if (!result.accessToken || !result.childId || !result.accessExpiresAt) return null;
  return { accessToken: result.accessToken, childId: result.childId, accessExpiresAt: new Date(result.accessExpiresAt) };
}

export async function validateGuardianRecordAccess(accessToken: string) {
  if (!accessToken) return null;
  const { data, error } = await sb().from("guardian_record_access_challenges")
    .select("childId, accessExpiresAt")
    .eq("accessTokenHash", hashRecordAccessSecret(accessToken))
    .limit(1);
  if (error) throw error;
  const row = data?.[0] as Record<string, unknown> | undefined;
  if (!row || !row.accessExpiresAt) return null;
  const expiresAt = new Date(String(row.accessExpiresAt));
  return expiresAt > new Date() ? { childId: String(row.childId), accessExpiresAt: expiresAt } : null;
}

// ---------- Server-scoped child records (clinic_children) ----------

export type ClinicChildRecord = {
  id: string;
  name: string;
  dateOfBirth: string;
  sex: string;
  allergies: string;
  parentName: string;
};

function normalizeClinicChildRow(row: Record<string, unknown>): ClinicChildRecord {
  return {
    id: String(row.childId ?? ""),
    name: String(row.name ?? ""),
    dateOfBirth: String(row.dateOfBirth ?? ""),
    sex: String(row.sex ?? ""),
    allergies: String(row.allergies ?? ""),
    parentName: String(row.parentName ?? ""),
  };
}

export async function listClinicChildren(_clinicianUserId: number) {
  const { data, error } = await sb().from("clinic_children").select("*").order("id");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeClinicChildRow(row as Record<string, unknown>));
}

export async function upsertClinicChild(_clinicianUserId: number, child: ClinicChildRecord & { createdBy?: number }) {
  const payload = {
    childId: child.id,
    name: child.name,
    dateOfBirth: child.dateOfBirth || null,
    sex: child.sex === "male" || child.sex === "female" ? child.sex : null,
    allergies: child.allergies || "",
    parentName: child.parentName || null,
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await sb().from("clinic_children").upsert(payload, { onConflict: "childId" }).select("*");
  if (error) throw error;
  return normalizeClinicChildRow((data ?? [])[0] as Record<string, unknown>);
}

export async function linkGuardianToChild(_clinicianUserId: number, input: { authUserId: string; childId: string; fullName?: string; relationship?: string }) {
  const payload = {
    auth_user_id: input.authUserId,
    child_id: input.childId,
    full_name: input.fullName ?? null,
    relationship: input.relationship ?? "Parent",
    verified_at: new Date().toISOString(),
  };
  const { error } = await sb().from("guardians").upsert(payload, { onConflict: "auth_user_id,child_id" });
  if (error) throw error;
  return { ok: true };
}

export async function listGuardianLinks(_clinicianUserId: number) {
  const { data, error } = await sb().rpc("list_guardian_links");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    linkId: Number(row.link_id),
    authUserId: String(row.auth_user_id),
    email: String(row.email ?? ""),
    childId: String(row.child_id),
    fullName: String(row.full_name ?? ""),
    relationship: String(row.relationship ?? ""),
    verified: Boolean(row.verified),
    verifiedAt: row.verified_at ? new Date(String(row.verified_at)) : null,
  }));
}

export async function unlinkGuardianLink(_clinicianUserId: number, linkId: number) {
  const { error } = await sb().from("guardians").delete().eq("id", linkId);
  if (error) throw error;
  return { ok: true };
}

export async function findAuthUserIdByEmail(email: string) {
  const { data, error } = await sb().rpc("find_auth_user_by_email", { p_email: email });
  if (error) throw error;
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  return row ? { id: String(row.id), email: String(row.email) } : null;
}

export async function listGuardianDeletions(_clinicianUserId: number) {
  const { data, error } = await sb().from("guardian_account_deletions").select("*").order("deletedAt", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    deletionId: Number((row as Record<string, unknown>).id),
    email: String((row as Record<string, unknown>).email ?? ""),
    childIds: (row as Record<string, unknown>).child_ids ?? [],
    snapshot: (row as Record<string, unknown>).snapshot ?? {},
    deletedAt: new Date(String((row as Record<string, unknown>).deleted_at)),
  }));
}
