import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { InsertUser, users } from "../drizzle/schema";
import { auditArchiveRuns, auditRetentionPolicies, auditRetentionPolicyChanges, capacityAlertVisibilitySettings, capacityTargetChangeAlerts, clinicAppointments, clinicDayHourOverrides, clinicPublicSettings, clinicStaffAccounts, guardianContacts, guardianRecordAccessChallenges, internalFollowUpPrintAudits, invitationSearchPresets, maintenanceNotificationPreferenceExports, maintenanceNotificationRequests, patientReportShares, postDeploymentFeedback, printAuditFilterPresets, referralAuditEvents, referralDeliveryMonitor, referralRetryCounters, staffAccountActivity, staffCapacitySnapshots, staffInvitationSettings, superAdminAccessReviews, superAdminAuditEvents, superAdminGovernanceSettings, superAdminMaintenanceEvents, waitlistEventLog, waitlistRequests, weeklyCapacityReportReferenceSettings, weeklyCapacitySummaryExports } from "../drizzle/schema";
import { and, asc, eq, gte, inArray, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";
import { isClinicAdministratorEmail, isSuperAdminEmail } from "./clinic-authority";

export const MAX_REFERRAL_EMAIL_RESENDS = 3;
export const MAX_STAFF_INVITATION_RESENDS = 3;
export const UNRESOLVED_REFERRAL_ALERT_HOURS = 24;
export const MAX_AUDIT_RETENTION_DAYS = 36500;
export const GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT = 5;
export const GUARDIAN_RECORD_ACCESS_CHALLENGE_HOURS = 24;
export const GUARDIAN_RECORD_ACCESS_SESSION_HOURS = 8;
const defaultClinicPublicSettings = { clinicName: "Rainbow Child Development Clinic", address: "Gokul Awas Rd, Karyabinayak 44700", mapUrl: "https://www.google.com.au/search?client=safari&hs=ORpV&sca_esv=79a7fd24df7232ff&hl=en-au&kgmid=/g/11zhz76ycx&q=Rainbow+Child+Development+Clinic&shem=epsd1,ltae,rimspwouoe&shndl=30&source=sh/x/loc/act/m1/3&kgs=21ca31c1d4d885a7&utm_source=epsd1,ltae,rimspwouoe,sh/x/loc/act/m1/3", clinicEmail: "rainbowclinic25@gmail.com", whatsappNumber: "9779765002862", whatsappResponseNotice: "Messages are reviewed during clinic hours; please allow a response on the next working day.", guardianReverificationDays: 180, isProvisional: false, updatedBy: "Initial clinic setup" };
type ReferralAuditInput = {
  clientEventId: string; childId: string; type: "appointment-change" | "referral-letter" | "email-share" | "patient-communication"; occurredAt: Date; actorName: string; summary: string; message?: string; deliveryStatus?: "draft-opened" | "sent" | "saved" | "cancelled" | "unavailable"; isResend?: boolean; retryLimit?: number; retryAttempts?: number;
};

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getSuperAdminDashboardData() {
  const db = await getDb();
  if (!db) return { databaseAvailable: false, users: [], appointmentCount: 0, activeStaffCount: 0, auditEvents: [] as Array<typeof superAdminAuditEvents.$inferSelect> };
  const [userRows, appointmentRows, activeStaffRows, auditEvents] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users).orderBy(sql`${users.lastSignedIn} desc`).limit(100),
    db.select({ id: clinicAppointments.id }).from(clinicAppointments),
    db.select({ id: clinicStaffAccounts.id }).from(clinicStaffAccounts).where(eq(clinicStaffAccounts.status, "active")),
    db.select().from(superAdminAuditEvents).orderBy(sql`${superAdminAuditEvents.occurredAt} desc`).limit(50),
  ]);
  return { databaseAvailable: true, users: userRows, appointmentCount: appointmentRows.length, activeStaffCount: activeStaffRows.length, auditEvents };
}

export async function listAllClinicStaffAccountsForSuperAdmin() {
  const db = await getDb(); if (!db) return [];
  return db.select({ staffAccountId: clinicStaffAccounts.staffAccountId, invitedEmail: clinicStaffAccounts.invitedEmail, displayName: clinicStaffAccounts.displayName, staffRole: clinicStaffAccounts.staffRole, status: clinicStaffAccounts.status, activatedAt: clinicStaffAccounts.activatedAt, revokedAt: clinicStaffAccounts.revokedAt }).from(clinicStaffAccounts).orderBy(sql`${clinicStaffAccounts.invitedAt} desc`).limit(100);
}

export async function updateApplicationUserAccess(input: { actorEmail: string; targetUserId: number; nextAccess: "user" | "admin" }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for application access management");
  const target = (await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1))[0]; if (!target) throw new Error("The selected user account no longer exists.");
  if (isSuperAdminEmail(target.email)) throw new Error("The designated super-admin access cannot be changed through the application.");
  await db.update(users).set({ role: input.nextAccess }).where(eq(users.id, target.id));
  await db.insert(superAdminAuditEvents).values({ eventId: `access-${Date.now()}-${target.id}`, eventType: "user-access-updated", actorEmail: input.actorEmail, targetUserId: target.id, targetEmail: target.email, previousAccess: target.role, nextAccess: input.nextAccess, recordCount: 0, summary: "Super-admin updated the application-level user access flag. This does not grant database, server, deployment, or source-control access." });
}

export async function deactivateFormerStaffAccount(input: { actorEmail: string; staffAccountId: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff account deactivation");
  const account = (await db.select().from(clinicStaffAccounts).where(eq(clinicStaffAccounts.staffAccountId, input.staffAccountId)).limit(1))[0];
  if (!account) throw new Error("The selected staff account no longer exists.");
  if (account.status === "revoked") throw new Error("This staff account is already revoked.");
  const now = new Date();
  await db.update(clinicStaffAccounts).set({ status: "revoked", revokedAt: now }).where(eq(clinicStaffAccounts.id, account.id));
  await recordStaffAccountActivity(account.clinicianUserId, { staffAccountId: account.staffAccountId, eventType: "revoked", actorName: input.actorEmail, summary: "Super-admin revoked this former staff account’s authenticated operational access.", occurredAt: now });
  return { staffAccountId: account.staffAccountId, status: "revoked" as const };
}

export async function reactivateReturningStaffAccount(input: { actorEmail: string; staffAccountId: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff account reactivation");
  const account = (await db.select().from(clinicStaffAccounts).where(eq(clinicStaffAccounts.staffAccountId, input.staffAccountId)).limit(1))[0];
  if (!account) throw new Error("The selected staff account no longer exists.");
  if (account.status !== "revoked") throw new Error("Only a currently revoked former staff account can be reactivated.");
  const now = new Date();
  await db.update(clinicStaffAccounts).set({ status: "active", activatedAt: now, revokedAt: null }).where(eq(clinicStaffAccounts.id, account.id));
  await recordStaffAccountActivity(account.clinicianUserId, { staffAccountId: account.staffAccountId, eventType: "activated", actorName: input.actorEmail, summary: "Super-admin reactivated this returning staff account’s existing operational access.", occurredAt: now });
  return { staffAccountId: account.staffAccountId, status: "active" as const };
}

const defaultSuperAdminGovernanceSettings = { exportRetentionDays: 30, accessReviewIntervalDays: 90, maintenanceModeEnabled: false, maintenanceNotice: "A scheduled clinic service update is in progress. Please return shortly.", maintenanceEstimatedCompletion: null as string | null, maintenanceEstimatedCompletionAt: null as Date | null, maintenanceChangedAt: null as Date | null, maintenanceChangedBy: null as string | null, updatedBy: "Initial governance setup", lastAccessReviewAt: null as Date | null, lastAccessReviewBy: null as string | null, updatedAt: new Date() };
export async function getSuperAdminGovernanceSettings() { const db = await getDb(); if (!db) return { ...defaultSuperAdminGovernanceSettings, id: 0 }; const rows = await db.select().from(superAdminGovernanceSettings).orderBy(asc(superAdminGovernanceSettings.id)).limit(1); return rows[0] ?? { ...defaultSuperAdminGovernanceSettings, id: 0 }; }
export async function saveSuperAdminGovernanceSettings(input: { exportRetentionDays: number; accessReviewIntervalDays: number; updatedBy: string }) { const db = await getDb(); if (!db) throw new Error("Database not available for super-admin governance settings"); const existing = await db.select().from(superAdminGovernanceSettings).orderBy(asc(superAdminGovernanceSettings.id)).limit(1); if (existing[0]) await db.update(superAdminGovernanceSettings).set(input).where(eq(superAdminGovernanceSettings.id, existing[0].id)); else await db.insert(superAdminGovernanceSettings).values(input); return getSuperAdminGovernanceSettings(); }
export async function completeSuperAdminAccessReview(actorEmail: string) { const db = await getDb(); if (!db) throw new Error("Database not available for access review"); const [admins, activeStaff, revokedStaff, pendingInvitations] = await Promise.all([db.select({ id: users.id }).from(users).where(eq(users.role, "admin")), db.select({ id: clinicStaffAccounts.id }).from(clinicStaffAccounts).where(eq(clinicStaffAccounts.status, "active")), db.select({ id: clinicStaffAccounts.id }).from(clinicStaffAccounts).where(eq(clinicStaffAccounts.status, "revoked")), db.select({ id: clinicStaffAccounts.id }).from(clinicStaffAccounts).where(eq(clinicStaffAccounts.status, "invited"))]); const now = new Date(); const review = { reviewId: `access-review-${Date.now()}`, actorEmail, applicationAdminCount: admins.length, activeStaffCount: activeStaff.length, revokedStaffCount: revokedStaff.length, pendingInvitationCount: pendingInvitations.length, reviewedAt: now }; await db.insert(superAdminAccessReviews).values(review); const settings = await getSuperAdminGovernanceSettings(); if (settings.id) await db.update(superAdminGovernanceSettings).set({ lastAccessReviewAt: now, lastAccessReviewBy: actorEmail }).where(eq(superAdminGovernanceSettings.id, settings.id)); else await db.insert(superAdminGovernanceSettings).values({ ...defaultSuperAdminGovernanceSettings, updatedBy: actorEmail, lastAccessReviewAt: now, lastAccessReviewBy: actorEmail }); return review; }

export async function prepareSuperAdminAppointmentExport(input: { actorEmail: string; startDate: string; endDate: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for confidential appointment export");
  const rows = await db.select().from(clinicAppointments).where(and(gte(clinicAppointments.appointmentDate, input.startDate), lte(clinicAppointments.appointmentDate, input.endDate))).orderBy(asc(clinicAppointments.appointmentDate), asc(clinicAppointments.appointmentTime));
  const governance = await getSuperAdminGovernanceSettings(); const retentionExpiresAt = new Date(Date.now() + governance.exportRetentionDays * 86400000);
  await db.insert(superAdminAuditEvents).values({ eventId: `appointment-export-${Date.now()}`, eventType: "appointment-csv-prepared", actorEmail: input.actorEmail, startDate: input.startDate, endDate: input.endDate, recordCount: rows.length, summary: `Super-admin prepared a confidential appointment-record CSV with a ${governance.exportRetentionDays}-day clinic policy. Preparation does not prove download, delivery, secure storage, or disposal.` });
  return { rows, retentionDays: governance.exportRetentionDays, retentionExpiresAt };
}

export async function searchSuperAdminAppointmentExportRegister(input: { startDate?: string; endDate?: string; actorQuery?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(superAdminAuditEvents.eventType, "appointment-csv-prepared")];
  if (input.startDate) conditions.push(gte(superAdminAuditEvents.occurredAt, new Date(`${input.startDate}T00:00:00.000Z`)));
  if (input.endDate) conditions.push(lte(superAdminAuditEvents.occurredAt, new Date(`${input.endDate}T23:59:59.999Z`)));
  const actorQuery = input.actorQuery?.trim().toLowerCase(); if (actorQuery) conditions.push(like(superAdminAuditEvents.actorEmail, `%${actorQuery.replace(/[\\%_]/g, "\\$&")}%`));
  return db.select({ eventId: superAdminAuditEvents.eventId, actorEmail: superAdminAuditEvents.actorEmail, startDate: superAdminAuditEvents.startDate, endDate: superAdminAuditEvents.endDate, recordCount: superAdminAuditEvents.recordCount, summary: superAdminAuditEvents.summary, occurredAt: superAdminAuditEvents.occurredAt }).from(superAdminAuditEvents).where(and(...conditions)).orderBy(sql`${superAdminAuditEvents.occurredAt} desc`).limit(100);
}

export async function setMaintenanceMode(input: { enabled: boolean; notice: string; estimatedCompletion?: string | null; estimatedCompletionAt?: Date | null; actorEmail: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for maintenance mode"); const now = new Date(); const settings = await getSuperAdminGovernanceSettings(); const update = { maintenanceModeEnabled: input.enabled, maintenanceNotice: input.notice, maintenanceEstimatedCompletion: input.estimatedCompletion ?? null, maintenanceEstimatedCompletionAt: input.estimatedCompletionAt ?? null, maintenanceChangedAt: now, maintenanceChangedBy: input.actorEmail, updatedBy: input.actorEmail };
  if (settings.id) await db.update(superAdminGovernanceSettings).set(update).where(eq(superAdminGovernanceSettings.id, settings.id)); else await db.insert(superAdminGovernanceSettings).values({ ...defaultSuperAdminGovernanceSettings, ...update });
  await db.insert(superAdminMaintenanceEvents).values({ eventId: `maintenance-${Date.now()}`, actorEmail: input.actorEmail, enabled: input.enabled, noticeSummary: input.notice, estimatedCompletion: input.estimatedCompletion ?? null, estimatedCompletionAt: input.estimatedCompletionAt ?? null, occurredAt: now }); return getSuperAdminGovernanceSettings();
}

export async function getMaintenanceModeStatus() { const settings = await getSuperAdminGovernanceSettings(); return { enabled: settings.maintenanceModeEnabled, notice: settings.maintenanceNotice, estimatedCompletion: settings.maintenanceEstimatedCompletion, estimatedCompletionAt: settings.maintenanceEstimatedCompletionAt, changedAt: settings.maintenanceChangedAt, changedBy: settings.maintenanceChangedBy }; }

export async function requestMaintenanceNotificationPreference(email: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for maintenance notification preferences");
  const status = await getMaintenanceModeStatus(); if (!status.enabled || !status.changedAt) throw new Error("Maintenance mode is not currently active.");
  const normalizedEmail = email.trim().toLowerCase();
  const existing = (await db.select().from(maintenanceNotificationRequests).where(and(eq(maintenanceNotificationRequests.maintenanceChangedAt, status.changedAt), eq(maintenanceNotificationRequests.email, normalizedEmail))).limit(1))[0];
  if (existing) { await db.update(maintenanceNotificationRequests).set({ status: "requested" }).where(eq(maintenanceNotificationRequests.id, existing.id)); return { alreadyRecorded: true }; }
  await db.insert(maintenanceNotificationRequests).values({ requestId: `maintenance-notification-${Date.now()}-${randomInt(1000, 9999)}`, maintenanceChangedAt: status.changedAt, email: normalizedEmail, status: "requested" });
  return { alreadyRecorded: false };
}

export type MaintenanceNotificationPreferenceFilter = { status?: "all" | "requested" | "withdrawn"; emailQuery?: string };
export async function listMaintenanceNotificationPreferences(filter: MaintenanceNotificationPreferenceFilter = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filter.status && filter.status !== "all") conditions.push(eq(maintenanceNotificationRequests.status, filter.status));
  const emailQuery = filter.emailQuery?.trim().toLowerCase(); if (emailQuery) conditions.push(like(maintenanceNotificationRequests.email, `%${emailQuery.replace(/[\\%_]/g, "\\$&")}%`));
  const base = db.select({ requestId: maintenanceNotificationRequests.requestId, email: maintenanceNotificationRequests.email, status: maintenanceNotificationRequests.status, maintenanceChangedAt: maintenanceNotificationRequests.maintenanceChangedAt, requestedAt: maintenanceNotificationRequests.requestedAt, updatedAt: maintenanceNotificationRequests.updatedAt }).from(maintenanceNotificationRequests);
  return conditions.length ? base.where(and(...conditions)).orderBy(sql`${maintenanceNotificationRequests.requestedAt} desc`).limit(100) : base.orderBy(sql`${maintenanceNotificationRequests.requestedAt} desc`).limit(100);
}

export async function setMaintenanceNotificationPreferenceStatus(input: { requestId: string; status: "requested" | "withdrawn" }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for maintenance notification preferences");
  const preference = (await db.select().from(maintenanceNotificationRequests).where(eq(maintenanceNotificationRequests.requestId, input.requestId)).limit(1))[0]; if (!preference) throw new Error("This notification preference is no longer available.");
  await db.update(maintenanceNotificationRequests).set({ status: input.status }).where(eq(maintenanceNotificationRequests.id, preference.id));
  return { requestId: preference.requestId, status: input.status };
}

export async function setBulkMaintenanceNotificationPreferenceStatus(input: { requestIds: string[]; status: "requested" | "withdrawn" }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for maintenance notification preferences");
  const requestIds = [...new Set(input.requestIds)]; if (requestIds.length < 1 || requestIds.length > 100) throw new Error("Select between one and one hundred notification preferences.");
  const rows = await db.select({ requestId: maintenanceNotificationRequests.requestId }).from(maintenanceNotificationRequests).where(inArray(maintenanceNotificationRequests.requestId, requestIds));
  if (rows.length !== requestIds.length) throw new Error("One or more selected notification preferences are no longer available.");
  await db.update(maintenanceNotificationRequests).set({ status: input.status }).where(inArray(maintenanceNotificationRequests.requestId, requestIds));
  return { updatedCount: rows.length, status: input.status };
}

export async function prepareMaintenanceNotificationPreferenceExport(input: MaintenanceNotificationPreferenceFilter & { actorEmail: string }) {
  const rows = await listMaintenanceNotificationPreferences(input); const db = await getDb(); if (!db) throw new Error("Database not available for maintenance notification preference export");
  await db.insert(maintenanceNotificationPreferenceExports).values({ exportId: `maintenance-preference-export-${Date.now()}-${randomInt(1000, 9999)}`, actorEmail: input.actorEmail, statusFilter: input.status ?? "all", emailQuery: input.emailQuery?.trim().toLowerCase() || null, recordCount: rows.length });
  return rows;
}

export async function submitPostDeploymentFeedback(input: { submittedBy: string; category: "login" | "scheduling" | "records" | "display" | "other"; title: string; description: string; screenshotStorageKey?: string; screenshotContentType?: string; screenshotBytes?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for deployment feedback"); const feedbackId = `deployment-feedback-${Date.now()}-${randomInt(1000, 9999)}`; await db.insert(postDeploymentFeedback).values({ feedbackId, ...input }); return feedbackId;
}

export async function listPostDeploymentFeedback() { const db = await getDb(); if (!db) return []; return db.select().from(postDeploymentFeedback).orderBy(sql`${postDeploymentFeedback.submittedAt} desc`).limit(100); }

export async function getPostDeploymentFeedbackAttachment(feedbackId: string) { const db = await getDb(); if (!db) return null; const feedback = (await db.select({ screenshotStorageKey: postDeploymentFeedback.screenshotStorageKey, screenshotContentType: postDeploymentFeedback.screenshotContentType, screenshotBytes: postDeploymentFeedback.screenshotBytes }).from(postDeploymentFeedback).where(eq(postDeploymentFeedback.feedbackId, feedbackId)).limit(1))[0]; return feedback?.screenshotStorageKey ? feedback : null; }

export async function updatePostDeploymentFeedbackStatus(input: { feedbackId: string; status: "reviewed" | "resolved"; reviewedBy: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for deployment feedback"); const feedback = (await db.select().from(postDeploymentFeedback).where(eq(postDeploymentFeedback.feedbackId, input.feedbackId)).limit(1))[0]; if (!feedback) throw new Error("The feedback record no longer exists."); const now = new Date(); await db.update(postDeploymentFeedback).set({ status: input.status, reviewedBy: input.reviewedBy, reviewedAt: now }).where(eq(postDeploymentFeedback.id, feedback.id)); return { feedbackId: feedback.feedbackId, status: input.status, reviewedAt: now };
}

export async function getClinicPublicSettings() {
  const db = await getDb();
  if (!db) return { ...defaultClinicPublicSettings, id: 0, updatedAt: new Date() };
  const rows = await db.select().from(clinicPublicSettings).orderBy(sql`${clinicPublicSettings.id} asc`).limit(1);
  return rows[0] ?? { ...defaultClinicPublicSettings, id: 0, updatedAt: new Date() };
}

export async function saveClinicPublicSettings(input: { address: string; mapUrl: string; clinicEmail: string; whatsappNumber: string; whatsappResponseNotice: string; updatedBy: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for clinic public settings");
  const existing = await db.select().from(clinicPublicSettings).orderBy(sql`${clinicPublicSettings.id} asc`).limit(1);
  const values = { ...defaultClinicPublicSettings, ...input, clinicName: "Rainbow Child Development Clinic", isProvisional: false };
  if (existing[0]) await db.update(clinicPublicSettings).set(values).where(eq(clinicPublicSettings.id, existing[0].id));
  else await db.insert(clinicPublicSettings).values(values);
  return getClinicPublicSettings();
}

export type ClinicDayHourOverrideInput = { overrideId: string; appointmentDate: string; isOpen: boolean; startTime?: string; endTime?: string; familyNotice: string; updatedBy: string };
export async function listClinicDayHourOverrides(clinicianUserId: number) { const db = await getDb(); if (!db) return []; return db.select().from(clinicDayHourOverrides).where(eq(clinicDayHourOverrides.clinicianUserId, clinicianUserId)).orderBy(asc(clinicDayHourOverrides.appointmentDate)); }
export async function saveClinicDayHourOverride(clinicianUserId: number, input: ClinicDayHourOverrideInput) { const db = await getDb(); if (!db) throw new Error("Database not available for individual-day clinic hours"); await db.insert(clinicDayHourOverrides).values({ clinicianUserId, ...input, startTime: input.isOpen ? input.startTime ?? null : null, endTime: input.isOpen ? input.endTime ?? null : null }).onDuplicateKeyUpdate({ set: { overrideId: input.overrideId, isOpen: input.isOpen, startTime: input.isOpen ? input.startTime ?? null : null, endTime: input.isOpen ? input.endTime ?? null : null, familyNotice: input.familyNotice, updatedBy: input.updatedBy, updatedAt: new Date() } }); return listClinicDayHourOverrides(clinicianUserId); }
export async function removeClinicDayHourOverride(clinicianUserId: number, appointmentDate: string) { const db = await getDb(); if (!db) throw new Error("Database not available for individual-day clinic hours"); await db.delete(clinicDayHourOverrides).where(and(eq(clinicDayHourOverrides.clinicianUserId, clinicianUserId), eq(clinicDayHourOverrides.appointmentDate, appointmentDate))); }
export async function listPublicClinicDayHourOverrides() { const db = await getDb(); if (!db) return []; return db.select({ appointmentDate: clinicDayHourOverrides.appointmentDate, isOpen: clinicDayHourOverrides.isOpen, startTime: clinicDayHourOverrides.startTime, endTime: clinicDayHourOverrides.endTime, familyNotice: clinicDayHourOverrides.familyNotice, updatedAt: clinicDayHourOverrides.updatedAt }).from(clinicDayHourOverrides).orderBy(asc(clinicDayHourOverrides.appointmentDate)); }

export async function saveGuardianReverificationDays(guardianReverificationDays: number, updatedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for guardian verification settings");
  const existing = await db.select().from(clinicPublicSettings).orderBy(sql`${clinicPublicSettings.id} asc`).limit(1);
  if (existing[0]) await db.update(clinicPublicSettings).set({ guardianReverificationDays, updatedBy }).where(eq(clinicPublicSettings.id, existing[0].id));
  else await db.insert(clinicPublicSettings).values({ ...defaultClinicPublicSettings, guardianReverificationDays, updatedBy });
  return getClinicPublicSettings();
}

export async function listGuardianContacts(clinicianUserId: number, childId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for guardian contacts");
  const where = childId ? and(eq(guardianContacts.clinicianUserId, clinicianUserId), eq(guardianContacts.childId, childId)) : eq(guardianContacts.clinicianUserId, clinicianUserId);
  return db.select().from(guardianContacts).where(where).orderBy(sql`${guardianContacts.status} asc`, sql`${guardianContacts.fullName} asc`);
}

export async function createGuardianContact(clinicianUserId: number, input: { childId: string; fullName: string; relationship: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for guardian contacts");
  const email = input.email.trim().toLowerCase();
  const existing = await db.select().from(guardianContacts).where(and(eq(guardianContacts.clinicianUserId, clinicianUserId), eq(guardianContacts.childId, input.childId), eq(guardianContacts.email, email))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(guardianContacts).values({ clinicianUserId, childId: input.childId, fullName: input.fullName.trim(), relationship: input.relationship.trim(), email });
  const rows = await db.select().from(guardianContacts).where(eq(guardianContacts.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function confirmGuardianContact(clinicianUserId: number, contactId: number, confirmedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for guardian contacts");
  await db.update(guardianContacts).set({ status: "confirmed", confirmedBy, confirmedAt: new Date() }).where(and(eq(guardianContacts.id, contactId), eq(guardianContacts.clinicianUserId, clinicianUserId)));
  const rows = await db.select().from(guardianContacts).where(and(eq(guardianContacts.id, contactId), eq(guardianContacts.clinicianUserId, clinicianUserId))).limit(1);
  if (!rows[0]) throw new Error("Guardian contact not found");
  return rows[0];
}

export async function createPatientReportShare(clinicianUserId: number, input: { childId: string; guardianContactId: number; scope: "record-pdf" | "timeline-report" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for report acknowledgements");
  const guardian = await db.select().from(guardianContacts).where(and(eq(guardianContacts.id, input.guardianContactId), eq(guardianContacts.clinicianUserId, clinicianUserId), eq(guardianContacts.childId, input.childId), eq(guardianContacts.status, "confirmed"))).limit(1);
  if (!guardian[0]) throw new Error("Select a confirmed guardian contact before sharing a report");
  const acknowledgementToken = crypto.randomUUID().replaceAll("-", "");
  const result = await db.insert(patientReportShares).values({ clinicianUserId, ...input, acknowledgementToken });
  const rows = await db.select().from(patientReportShares).where(eq(patientReportShares.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updatePatientReportShareStatus(clinicianUserId: number, shareId: number, deliveryStatus: "draft-opened" | "sent" | "saved" | "cancelled" | "unavailable") {
  const db = await getDb();
  if (!db) throw new Error("Database not available for report acknowledgement");
  await db.update(patientReportShares).set({ deliveryStatus }).where(and(eq(patientReportShares.id, shareId), eq(patientReportShares.clinicianUserId, clinicianUserId)));
}

export async function listPatientReportShares(clinicianUserId: number, childId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for report acknowledgements");
  return db.select({ id: patientReportShares.id, childId: patientReportShares.childId, scope: patientReportShares.scope, acknowledgementToken: patientReportShares.acknowledgementToken, deliveryStatus: patientReportShares.deliveryStatus, createdAt: patientReportShares.createdAt, acknowledgedAt: patientReportShares.acknowledgedAt, acknowledgementText: patientReportShares.acknowledgementText, guardianName: guardianContacts.fullName, guardianEmail: guardianContacts.email }).from(patientReportShares).innerJoin(guardianContacts, eq(patientReportShares.guardianContactId, guardianContacts.id)).where(and(eq(patientReportShares.clinicianUserId, clinicianUserId), eq(patientReportShares.childId, childId))).orderBy(sql`${patientReportShares.createdAt} desc`);
}

export async function getReportAcknowledgement(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for report acknowledgement");
  const rows = await db.select({ scope: patientReportShares.scope, createdAt: patientReportShares.createdAt, acknowledgedAt: patientReportShares.acknowledgedAt }).from(patientReportShares).where(eq(patientReportShares.acknowledgementToken, token)).limit(1);
  return rows[0];
}

export async function acknowledgeReport(token: string, acknowledgementText: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for report acknowledgement");
  const result = await db.update(patientReportShares).set({ acknowledgedAt: new Date(), acknowledgementText: acknowledgementText.trim() || "Guardian confirmed receipt." }).where(and(eq(patientReportShares.acknowledgementToken, token), isNull(patientReportShares.acknowledgedAt)));
  return Number(result[0]?.affectedRows ?? 0) > 0;
}

export async function persistReferralAuditEvent(clinicianUserId: number, input: ReferralAuditInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral audit persistence");
  await db.insert(referralAuditEvents).values({ clinicianUserId, ...input, actorRole: "clinician", isResend: input.isResend ?? false, retryLimit: input.retryLimit ?? MAX_REFERRAL_EMAIL_RESENDS, retryAttempts: input.retryAttempts ?? 0 }).onDuplicateKeyUpdate({ set: { clientEventId: sql`${referralAuditEvents.clientEventId}` } });
}

export async function listReferralAuditEvents(clinicianUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral audit retrieval");
  return db.select().from(referralAuditEvents).where(eq(referralAuditEvents.clinicianUserId, clinicianUserId)).orderBy(sql`${referralAuditEvents.occurredAt} desc`);
}

export async function reserveReferralEmailRetry(clinicianUserId: number, childId: string, recipientEmail: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral retry policy");
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(referralRetryCounters).where(and(eq(referralRetryCounters.clinicianUserId, clinicianUserId), eq(referralRetryCounters.childId, childId), eq(referralRetryCounters.recipientEmail, normalizedEmail))).limit(1);
    const current = existing[0];
    if (current && current.attemptsUsed >= MAX_REFERRAL_EMAIL_RESENDS) return { allowed: false, attemptsUsed: current.attemptsUsed, limit: MAX_REFERRAL_EMAIL_RESENDS, attemptedAt: new Date().toISOString() };
    const attemptsUsed = (current?.attemptsUsed ?? 0) + 1;
    if (current) await tx.update(referralRetryCounters).set({ attemptsUsed }).where(eq(referralRetryCounters.id, current.id));
    else await tx.insert(referralRetryCounters).values({ clinicianUserId, childId, recipientEmail: normalizedEmail, attemptsUsed });
    return { allowed: true, attemptsUsed, limit: MAX_REFERRAL_EMAIL_RESENDS, attemptedAt: new Date().toISOString() };
  });
}

export async function getReferralDeliveryMonitorConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  const existing = await db.select().from(referralDeliveryMonitor).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(referralDeliveryMonitor).values({ thresholdHours: UNRESOLVED_REFERRAL_ALERT_HOURS });
  return (await db.select().from(referralDeliveryMonitor).limit(1))[0];
}

export async function saveReferralDeliveryMonitorSchedule(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  const config = await getReferralDeliveryMonitorConfig();
  await db.update(referralDeliveryMonitor).set({ scheduleCronTaskUid: taskUid, scheduleEnabled: true }).where(eq(referralDeliveryMonitor.id, config.id));
}

export async function setReferralDeliveryMonitorEnabled(enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  const config = await getReferralDeliveryMonitorConfig();
  await db.update(referralDeliveryMonitor).set({ scheduleEnabled: enabled }).where(eq(referralDeliveryMonitor.id, config.id));
  return { ...config, scheduleEnabled: enabled };
}

export async function getReferralDeliveryMonitorByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  const rows = await db.select().from(referralDeliveryMonitor).where(eq(referralDeliveryMonitor.scheduleCronTaskUid, taskUid)).limit(1);
  return rows[0];
}

export async function findAndMarkOverdueReferralDeliveryFailures() {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  const config = await getReferralDeliveryMonitorConfig();
  const cutoff = new Date(Date.now() - config.thresholdHours * 60 * 60 * 1000);
  const candidates = await db.select().from(referralAuditEvents).where(and(eq(referralAuditEvents.type, "email-share"), or(eq(referralAuditEvents.deliveryStatus, "cancelled"), eq(referralAuditEvents.deliveryStatus, "unavailable")), isNull(referralAuditEvents.alertSentAt), lt(referralAuditEvents.occurredAt, cutoff)));
  const alerted = [] as typeof candidates;
  for (const event of candidates) {
    const update = await db.update(referralAuditEvents).set({ alertSentAt: new Date() }).where(and(eq(referralAuditEvents.id, event.id), isNull(referralAuditEvents.alertSentAt)));
    if (update[0]?.affectedRows) alerted.push(event);
  }
  await db.update(referralDeliveryMonitor).set({ lastRunAt: new Date() }).where(eq(referralDeliveryMonitor.id, config.id));
  return { thresholdHours: config.thresholdHours, alerted };
}

export async function releaseReferralDeliveryFailureAlert(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral delivery monitoring");
  await db.update(referralAuditEvents).set({ alertSentAt: null }).where(eq(referralAuditEvents.id, eventId));
}

export async function getAuditRetentionPolicy(clinicianUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit retention settings");
  const rows = await db.select().from(auditRetentionPolicies).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId)).limit(1);
  return rows[0] ?? null;
}

export async function saveAuditRetentionPolicy(clinicianUserId: number, retentionDays: number, updatedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit retention settings");
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  await db.insert(auditRetentionPolicies).values({ clinicianUserId, retentionDays, updatedBy }).onDuplicateKeyUpdate({ set: { retentionDays, updatedBy } });
  if (existing?.retentionDays !== retentionDays) await db.insert(auditRetentionPolicyChanges).values({ clinicianUserId, setting: "retention-days", previousValue: existing ? `${existing.retentionDays} days` : "Not configured", nextValue: `${retentionDays} days`, changedBy: updatedBy });
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function saveAuditArchiveSchedule(clinicianUserId: number, taskUid: string, changedBy = "Associate Professor Dr. Anil Ojha") {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archival scheduling");
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  await db.update(auditRetentionPolicies).set({ archiveScheduleCronTaskUid: taskUid, automaticArchiveEnabled: true }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
  if (!existing?.automaticArchiveEnabled) await db.insert(auditRetentionPolicyChanges).values({ clinicianUserId, setting: "automatic-archive", previousValue: "Paused", nextValue: "Enabled", changedBy });
}

export async function setAuditArchiveScheduleEnabled(clinicianUserId: number, enabled: boolean, changedBy = "Associate Professor Dr. Anil Ojha") {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archival scheduling");
  const existing = await getAuditRetentionPolicy(clinicianUserId);
  await db.update(auditRetentionPolicies).set({ automaticArchiveEnabled: enabled }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
  if (existing?.automaticArchiveEnabled !== enabled) await db.insert(auditRetentionPolicyChanges).values({ clinicianUserId, setting: "automatic-archive", previousValue: existing?.automaticArchiveEnabled ? "Enabled" : "Paused", nextValue: enabled ? "Enabled" : "Paused", changedBy });
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function getAuditRetentionPolicyByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archival scheduling");
  const rows = await db.select().from(auditRetentionPolicies).where(eq(auditRetentionPolicies.archiveScheduleCronTaskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function saveMonthlyArchiveSummarySchedule(clinicianUserId: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for monthly archive summaries");
  await db.update(auditRetentionPolicies).set({ monthlySummaryCronTaskUid: taskUid, monthlySummaryEnabled: true }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
}

export async function setMonthlyArchiveSummaryEnabled(clinicianUserId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for monthly archive summaries");
  await db.update(auditRetentionPolicies).set({ monthlySummaryEnabled: enabled }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function setMonthlyArchiveSummaryDeliveryMinute(clinicianUserId: number, deliveryMinute: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for monthly archive summaries");
  await db.update(auditRetentionPolicies).set({ monthlySummaryDeliveryMinute: deliveryMinute }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
  return getAuditRetentionPolicy(clinicianUserId);
}

export async function getAuditRetentionPolicyByMonthlySummaryTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for monthly archive summaries");
  const rows = await db.select().from(auditRetentionPolicies).where(eq(auditRetentionPolicies.monthlySummaryCronTaskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function saveQuarterlyRetentionReviewSchedule(clinicianUserId: number, taskUid: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for quarterly retention reviews");
  await db.update(auditRetentionPolicies).set({ quarterlyReviewCronTaskUid: taskUid, quarterlyReviewEnabled: true }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId));
}
export async function setQuarterlyRetentionReviewEnabled(clinicianUserId: number, enabled: boolean) {
  const db = await getDb(); if (!db) throw new Error("Database not available for quarterly retention reviews");
  await db.update(auditRetentionPolicies).set({ quarterlyReviewEnabled: enabled }).where(eq(auditRetentionPolicies.clinicianUserId, clinicianUserId)); return getAuditRetentionPolicy(clinicianUserId);
}
export async function getAuditRetentionPolicyByQuarterlyReviewTaskUid(taskUid: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for quarterly retention reviews");
  const rows = await db.select().from(auditRetentionPolicies).where(eq(auditRetentionPolicies.quarterlyReviewCronTaskUid, taskUid)).limit(1); return rows[0] ?? null;
}

export async function getAuditArchivePreview(clinicianUserId: number, retentionDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archival");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.select({ count: sql<number>`count(*)` }).from(referralAuditEvents).where(and(eq(referralAuditEvents.clinicianUserId, clinicianUserId), isNull(referralAuditEvents.archivedAt), lt(referralAuditEvents.occurredAt, cutoff)));
  return { retentionDays, cutoff: cutoff.toISOString(), eligibleCount: Number(result[0]?.count ?? 0) };
}

export async function archiveExpiredAuditEvents(clinicianUserId: number, retentionDays: number, archivedBy: string, archiveReason: string, executionType: "manual" | "scheduled" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archival");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.update(referralAuditEvents).set({ archivedAt: new Date(), archivedBy, archiveReason }).where(and(eq(referralAuditEvents.clinicianUserId, clinicianUserId), isNull(referralAuditEvents.archivedAt), lt(referralAuditEvents.occurredAt, cutoff)));
  const archivedCount = Number(result[0]?.affectedRows ?? 0);
  await db.insert(auditArchiveRuns).values({ clinicianUserId, retentionDays, archivedCount, executionType, executedBy: archivedBy, reason: archiveReason });
  return { archivedCount, cutoff: cutoff.toISOString() };
}

export async function runScheduledAuditArchive(taskUid: string) {
  const policy = await getAuditRetentionPolicyByTaskUid(taskUid);
  if (!policy || !policy.automaticArchiveEnabled) return { skipped: "disabled-or-orphan", archivedCount: 0 };
  const result = await archiveExpiredAuditEvents(policy.clinicianUserId, policy.retentionDays, "Automated retention schedule", `Scheduled non-destructive archive after ${policy.retentionDays} days.`, "scheduled");
  const db = await getDb();
  if (db) await db.update(auditRetentionPolicies).set({ lastArchiveRunAt: new Date(), lastArchiveCount: result.archivedCount }).where(eq(auditRetentionPolicies.id, policy.id));
  return { ...result, skipped: null };
}

export async function getAuditArchiveRuns(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit archive reporting");
  const conditions = [eq(auditArchiveRuns.clinicianUserId, clinicianUserId)];
  if (range.start) conditions.push(gte(auditArchiveRuns.executedAt, range.start));
  if (range.end) conditions.push(lte(auditArchiveRuns.executedAt, range.end));
  return db.select().from(auditArchiveRuns).where(and(...conditions)).orderBy(sql`${auditArchiveRuns.executedAt} desc`).limit(100);
}

export async function getAuditRetentionDashboard(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit retention reporting");
  const counts = await db.select({ total: sql<number>`count(*)`, archived: sql<number>`sum(case when ${referralAuditEvents.archivedAt} is not null then 1 else 0 end)`, storageBytes: sql<number>`coalesce(sum(length(${referralAuditEvents.summary}) + coalesce(length(${referralAuditEvents.message}), 0) + coalesce(length(${referralAuditEvents.archiveReason}), 0)), 0)` }).from(referralAuditEvents).where(eq(referralAuditEvents.clinicianUserId, clinicianUserId));
  const recentRuns = await getAuditArchiveRuns(clinicianUserId, range);
  const policyChanges = await db.select().from(auditRetentionPolicyChanges).where(eq(auditRetentionPolicyChanges.clinicianUserId, clinicianUserId)).orderBy(sql`${auditRetentionPolicyChanges.changedAt} desc`).limit(8);
  const total = Number(counts[0]?.total ?? 0); const archived = Number(counts[0]?.archived ?? 0);
  const archiveTrend = await getArchiveVolumeTrend(clinicianUserId, range);
  return { totalRecords: total, activeRecords: total - archived, archivedRecords: archived, storageBytes: Number(counts[0]?.storageBytes ?? 0), recentRuns, policyChanges, archiveTrend };
}

export async function getArchiveVolumeTrend(clinicianUserId: number, range: { start?: Date; end?: Date } = {}) {
  const now = new Date(); const end = range.end ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)); const start = range.start ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)); const startMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)); const length = Math.min(24, Math.max(1, (endMonth.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 + endMonth.getUTCMonth() - startMonth.getUTCMonth() + 1)); const rows = await getAuditArchiveRuns(clinicianUserId, { start, end });
  const buckets = Array.from({ length }, (_, index) => { const date = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + index, 1)); return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }), archivedRecords: 0, archiveRuns: 0 }; });
  for (const row of rows) { const key = `${row.executedAt.getUTCFullYear()}-${String(row.executedAt.getUTCMonth() + 1).padStart(2, "0")}`; const bucket = buckets.find((item) => item.key === key); if (bucket) { bucket.archivedRecords += row.archivedCount; bucket.archiveRuns += 1; } }
  return buckets;
}

export async function getOnDemandArchiveSummary(clinicianUserId: number) {
  const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); const [runs, dashboard] = await Promise.all([getAuditArchiveRuns(clinicianUserId, { start }), getAuditRetentionDashboard(clinicianUserId)]);
  return { period: `${start.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" })} to date`, archiveRuns: runs.length, archivedRecords: runs.reduce((total, run) => total + run.archivedCount, 0), activeRecords: dashboard.activeRecords, archivedRecordsTotal: dashboard.archivedRecords, storageBytes: dashboard.storageBytes };
}

export async function getMonthlyArchiveSummaryForTask(taskUid: string) {
  const policy = await getAuditRetentionPolicyByMonthlySummaryTaskUid(taskUid);
  if (!policy || !policy.monthlySummaryEnabled) return { skipped: "disabled-or-orphan" as const };
  const now = new Date(); const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)); const period = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;
  if (policy.lastMonthlySummaryPeriod === period) return { skipped: "already-sent" as const, period };
  const [runs, dashboard] = await Promise.all([getAuditArchiveRuns(policy.clinicianUserId, { start: periodStart, end: new Date(periodEnd.getTime() - 1) }), getAuditRetentionDashboard(policy.clinicianUserId)]);
  return { skipped: null, policy, period, archiveRuns: runs.length, archivedRecords: runs.reduce((total, run) => total + run.archivedCount, 0), activeRecords: dashboard.activeRecords, storageBytes: dashboard.storageBytes };
}

export async function markMonthlyArchiveSummarySent(policyId: number, period: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for monthly archive summaries");
  await db.update(auditRetentionPolicies).set({ lastMonthlySummaryPeriod: period, lastMonthlySummaryAt: new Date() }).where(eq(auditRetentionPolicies.id, policyId));
}

export async function getQuarterlyRetentionReviewForTask(taskUid: string) {
  const policy = await getAuditRetentionPolicyByQuarterlyReviewTaskUid(taskUid); if (!policy || !policy.quarterlyReviewEnabled) return { skipped: "disabled-or-orphan" as const };
  const now = new Date(); const period = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`; if (policy.lastQuarterlyReviewPeriod === period) return { skipped: "already-sent" as const, period };
  const dashboard = await getAuditRetentionDashboard(policy.clinicianUserId); return { skipped: null, policy, period, activeRecords: dashboard.activeRecords, archivedRecords: dashboard.archivedRecords, storageBytes: dashboard.storageBytes };
}
export async function markQuarterlyRetentionReviewSent(policyId: number, period: string) { const db = await getDb(); if (!db) throw new Error("Database not available for quarterly retention reviews"); await db.update(auditRetentionPolicies).set({ lastQuarterlyReviewPeriod: period, lastQuarterlyReviewAt: new Date() }).where(eq(auditRetentionPolicies.id, policyId)); }

export type DurableWaitlistRequestInput = { requestId: string; appointmentId: string; childId: string; requestedAt: Date; status: "pending" | "reviewed" | "declined" | "withdrawn" | "offered" | "responded" | "expired" | "converted"; note?: string; offerDate?: string; offerTime?: string; offeredAt?: Date; offerExpiresAt?: Date; parentResponse?: "accepted" | "declined"; respondedAt?: Date; clinicianAcknowledgedAt?: Date; convertedAt?: Date; convertedBy?: string; assignedStaffId?: string; assignedAt?: Date };
export type DurableWaitlistEventInput = { eventId: string; requestId: string; eventType: "requested" | "reviewed" | "withdrawn" | "offer-created" | "parent-response" | "expired" | "converted" | "assignment-changed" | "response-acknowledged"; actor: "clinician" | "guardian" | "system"; occurredAt: Date; status: DurableWaitlistRequestInput["status"] };

export async function getDurableWaitlistState(clinicianUserId: number) {
  const db = await getDb(); if (!db) return { requests: [], capacitySnapshots: [], printAudits: [] };
  const [requests, capacitySnapshots, printAudits] = await Promise.all([db.select().from(waitlistRequests).where(eq(waitlistRequests.clinicianUserId, clinicianUserId)), db.select().from(staffCapacitySnapshots).where(eq(staffCapacitySnapshots.clinicianUserId, clinicianUserId)), db.select().from(internalFollowUpPrintAudits).where(eq(internalFollowUpPrintAudits.clinicianUserId, clinicianUserId))]);
  return { requests, capacitySnapshots, printAudits };
}

export async function saveDurableWaitlistState(clinicianUserId: number, requests: DurableWaitlistRequestInput[], events: DurableWaitlistEventInput[], snapshots: Array<{ snapshotId: string; staffId: string; staffName: string; triageCapacity: number; effectiveAt: Date }>) {
  const db = await getDb(); if (!db) throw new Error("Database not available for waitlist persistence");
  for (const request of requests) await db.insert(waitlistRequests).values({ clinicianUserId, ...request, note: request.note ?? null, offerDate: request.offerDate ?? null, offerTime: request.offerTime ?? null, offeredAt: request.offeredAt ?? null, offerExpiresAt: request.offerExpiresAt ?? null, parentResponse: request.parentResponse ?? null, respondedAt: request.respondedAt ?? null, clinicianAcknowledgedAt: request.clinicianAcknowledgedAt ?? null, convertedAt: request.convertedAt ?? null, convertedBy: request.convertedBy ?? null, assignedStaffId: request.assignedStaffId ?? null, assignedAt: request.assignedAt ?? null }).onDuplicateKeyUpdate({ set: { appointmentId: request.appointmentId, childId: request.childId, requestedAt: request.requestedAt, status: request.status, note: request.note ?? null, offerDate: request.offerDate ?? null, offerTime: request.offerTime ?? null, offeredAt: request.offeredAt ?? null, offerExpiresAt: request.offerExpiresAt ?? null, parentResponse: request.parentResponse ?? null, respondedAt: request.respondedAt ?? null, clinicianAcknowledgedAt: request.clinicianAcknowledgedAt ?? null, convertedAt: request.convertedAt ?? null, convertedBy: request.convertedBy ?? null, assignedStaffId: request.assignedStaffId ?? null, assignedAt: request.assignedAt ?? null } });
  for (const event of events) await db.insert(waitlistEventLog).values({ clinicianUserId, ...event }).onDuplicateKeyUpdate({ set: { eventId: event.eventId } });
  for (const snapshot of snapshots) await db.insert(staffCapacitySnapshots).values({ clinicianUserId, ...snapshot }).onDuplicateKeyUpdate({ set: { snapshotId: snapshot.snapshotId } });
  return getDurableWaitlistState(clinicianUserId);
}

export async function recordInternalFollowUpPrintAudit(clinicianUserId: number, input: { auditId: string; itemCount: number; actorName: string; initiatedAt: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for print auditing");
  await db.insert(internalFollowUpPrintAudits).values({ clinicianUserId, ...input, documentScope: "appointment-change-follow-up" }).onDuplicateKeyUpdate({ set: { auditId: input.auditId } });
  return getDurableWaitlistState(clinicianUserId);
}

export async function listInternalFollowUpPrintAudits(clinicianUserId: number, filters: { start?: Date; end?: Date; actorName?: string } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(internalFollowUpPrintAudits.clinicianUserId, clinicianUserId)];
  if (filters.start) conditions.push(gte(internalFollowUpPrintAudits.initiatedAt, filters.start));
  if (filters.end) conditions.push(lte(internalFollowUpPrintAudits.initiatedAt, filters.end));
  if (filters.actorName) conditions.push(eq(internalFollowUpPrintAudits.actorName, filters.actorName));
  return db.select().from(internalFollowUpPrintAudits).where(and(...conditions));
}

export async function recordCapacityTargetChangeAlert(clinicianUserId: number, input: { alertId: string; staffId: string; staffName: string; previousTarget: number; newTarget: number; changedBy: string; changedAt: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for capacity alerts");
  await db.insert(capacityTargetChangeAlerts).values({ clinicianUserId, ...input }).onDuplicateKeyUpdate({ set: { alertId: input.alertId } });
  return listCapacityTargetChangeAlerts(clinicianUserId);
}

export async function listCapacityTargetChangeAlerts(clinicianUserId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(capacityTargetChangeAlerts).where(eq(capacityTargetChangeAlerts.clinicianUserId, clinicianUserId));
}

export async function acknowledgeCapacityTargetChangeAlert(clinicianUserId: number, alertId: string, acknowledgedBy: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for capacity alerts");
  await db.update(capacityTargetChangeAlerts).set({ acknowledgedAt: new Date(), acknowledgedBy }).where(and(eq(capacityTargetChangeAlerts.clinicianUserId, clinicianUserId), eq(capacityTargetChangeAlerts.alertId, alertId)));
  return listCapacityTargetChangeAlerts(clinicianUserId);
}

export type PrintAuditFilterPresetInput = { presetId: string; name: string; startDate: string; endDate: string; actorName?: string; displayOrder?: number };
export const defaultCapacityAlertVisibility = { dailyDashboardSummaryEnabled: true, receptionistVisible: false, nurseVisible: false, clinicianVisible: true };

export async function listPrintAuditFilterPresets(clinicianUserId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(printAuditFilterPresets).where(eq(printAuditFilterPresets.clinicianUserId, clinicianUserId)).orderBy(printAuditFilterPresets.displayOrder, printAuditFilterPresets.updatedAt);
}

export async function savePrintAuditFilterPreset(clinicianUserId: number, input: PrintAuditFilterPresetInput) {
  const db = await getDb(); if (!db) throw new Error("Database not available for print-audit presets");
  const existing = await db.select({ displayOrder: printAuditFilterPresets.displayOrder }).from(printAuditFilterPresets).where(and(eq(printAuditFilterPresets.clinicianUserId, clinicianUserId), eq(printAuditFilterPresets.presetId, input.presetId))).limit(1);
  const nextOrder = input.displayOrder ?? existing[0]?.displayOrder ?? (await listPrintAuditFilterPresets(clinicianUserId)).length;
  await db.insert(printAuditFilterPresets).values({ clinicianUserId, ...input, displayOrder: nextOrder, actorName: input.actorName ?? null }).onDuplicateKeyUpdate({ set: { name: input.name, startDate: input.startDate, endDate: input.endDate, actorName: input.actorName ?? null, displayOrder: nextOrder } });
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function deletePrintAuditFilterPreset(clinicianUserId: number, presetId: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for print-audit presets");
  await db.delete(printAuditFilterPresets).where(and(eq(printAuditFilterPresets.clinicianUserId, clinicianUserId), eq(printAuditFilterPresets.presetId, presetId)));
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function reorderPrintAuditFilterPresets(clinicianUserId: number, presetIds: string[]) {
  const db = await getDb(); if (!db) throw new Error("Database not available for print-audit presets");
  const existing = await listPrintAuditFilterPresets(clinicianUserId); const ownedIds = new Set(existing.map((preset) => preset.presetId));
  if (presetIds.length !== ownedIds.size || presetIds.some((presetId) => !ownedIds.has(presetId))) throw new Error("Preset order must include each clinician-owned preset exactly once.");
  await Promise.all(presetIds.map((presetId, displayOrder) => db.update(printAuditFilterPresets).set({ displayOrder }).where(and(eq(printAuditFilterPresets.clinicianUserId, clinicianUserId), eq(printAuditFilterPresets.presetId, presetId)))));
  return listPrintAuditFilterPresets(clinicianUserId);
}

export async function getCapacityAlertVisibilitySettings(clinicianUserId: number) {
  const db = await getDb(); if (!db) return defaultCapacityAlertVisibility;
  const rows = await db.select().from(capacityAlertVisibilitySettings).where(eq(capacityAlertVisibilitySettings.clinicianUserId, clinicianUserId)).limit(1);
  return rows[0] ?? defaultCapacityAlertVisibility;
}

export async function saveCapacityAlertVisibilitySettings(clinicianUserId: number, settings: typeof defaultCapacityAlertVisibility, updatedBy: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for capacity-alert visibility settings");
  await db.insert(capacityAlertVisibilitySettings).values({ clinicianUserId, ...settings, updatedBy }).onDuplicateKeyUpdate({ set: { ...settings, updatedBy } });
  return getCapacityAlertVisibilitySettings(clinicianUserId);
}

type ClinicStaffRole = "receptionist" | "nurse" | "clinician";
type InvitationSearchStatus = "all" | "invited" | "active" | "expired" | "revoked";
const normalizedEmail = (email: string) => email.trim().toLowerCase();

export async function listInvitationSearchPresets(clinicianUserId: number) {
  const db = await getDb(); if (!db) return []; return db.select().from(invitationSearchPresets).where(eq(invitationSearchPresets.clinicianUserId, clinicianUserId)).orderBy(asc(invitationSearchPresets.displayOrder), asc(invitationSearchPresets.updatedAt));
}

export async function saveInvitationSearchPreset(clinicianUserId: number, input: { presetId: string; name: string; searchText: string; statusFilter: InvitationSearchStatus; displayOrder?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for invitation search presets"); const existing = await listInvitationSearchPresets(clinicianUserId); const saved = existing.find((preset) => preset.presetId === input.presetId); const displayOrder = input.displayOrder ?? saved?.displayOrder ?? (existing.length ? Math.max(...existing.map((preset) => preset.displayOrder)) + 1 : 0); await db.insert(invitationSearchPresets).values({ clinicianUserId, ...input, displayOrder }).onDuplicateKeyUpdate({ set: { name: input.name, searchText: input.searchText, statusFilter: input.statusFilter, displayOrder } }); return listInvitationSearchPresets(clinicianUserId);
}

export async function deleteInvitationSearchPreset(clinicianUserId: number, presetId: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for invitation search presets"); await db.delete(invitationSearchPresets).where(and(eq(invitationSearchPresets.clinicianUserId, clinicianUserId), eq(invitationSearchPresets.presetId, presetId))); return listInvitationSearchPresets(clinicianUserId);
}

export async function reorderInvitationSearchPresets(clinicianUserId: number, presetIds: string[]) {
  const db = await getDb(); if (!db) throw new Error("Database not available for invitation search presets"); const current = await listInvitationSearchPresets(clinicianUserId); if (new Set(presetIds).size !== presetIds.length || presetIds.length !== current.length || presetIds.some((presetId) => !current.some((preset) => preset.presetId === presetId))) throw new Error("Invitation preset order must contain every clinician-owned preset once."); await Promise.all(presetIds.map((presetId, displayOrder) => db.update(invitationSearchPresets).set({ displayOrder }).where(and(eq(invitationSearchPresets.clinicianUserId, clinicianUserId), eq(invitationSearchPresets.presetId, presetId))))); return listInvitationSearchPresets(clinicianUserId);
}

export async function getWeeklyCapacityReportReferenceSettings(clinicianUserId: number) {
  const db = await getDb(); if (!db) return { expiryDays: 30, updatedBy: null, updatedAt: null }; const rows = await db.select().from(weeklyCapacityReportReferenceSettings).where(eq(weeklyCapacityReportReferenceSettings.clinicianUserId, clinicianUserId)).limit(1); return rows[0] ?? { expiryDays: 30, updatedBy: null, updatedAt: null };
}

export async function saveWeeklyCapacityReportReferenceSettings(clinicianUserId: number, expiryDays: number, updatedBy: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for report-reference settings"); await db.insert(weeklyCapacityReportReferenceSettings).values({ clinicianUserId, expiryDays, updatedBy }).onDuplicateKeyUpdate({ set: { expiryDays, updatedBy } }); return getWeeklyCapacityReportReferenceSettings(clinicianUserId);
}

export async function getStaffInvitationSettings(clinicianUserId: number) {
  const db = await getDb(); if (!db) return { expiryDays: 7, updatedBy: null, updatedAt: null };
  const rows = await db.select().from(staffInvitationSettings).where(eq(staffInvitationSettings.clinicianUserId, clinicianUserId)).limit(1);
  return rows[0] ?? { expiryDays: 7, updatedBy: null, updatedAt: null };
}

export async function saveStaffInvitationSettings(clinicianUserId: number, expiryDays: number, updatedBy: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff invitation settings");
  await db.insert(staffInvitationSettings).values({ clinicianUserId, expiryDays, updatedBy }).onDuplicateKeyUpdate({ set: { expiryDays, updatedBy } });
  return getStaffInvitationSettings(clinicianUserId);
}

async function recordStaffAccountActivity(clinicianUserId: number, input: { staffAccountId: string; eventType: "invitation-created" | "resend-prepared" | "activated" | "expired" | "role-changed" | "revoked"; actorName: string; summary: string; occurredAt?: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff activity auditing"); const occurredAt = input.occurredAt ?? new Date();
  await db.insert(staffAccountActivity).values({ clinicianUserId, activityId: `staff-activity-${input.staffAccountId}-${occurredAt.getTime()}-${input.eventType}`, ...input, occurredAt });
}

async function expireDueStaffInvitations(clinicianUserId: number) {
  const db = await getDb(); if (!db) return; const now = new Date();
  const due = await db.select().from(clinicStaffAccounts).where(and(eq(clinicStaffAccounts.clinicianUserId, clinicianUserId), eq(clinicStaffAccounts.status, "invited"), or(isNull(clinicStaffAccounts.expiresAt), lt(clinicStaffAccounts.expiresAt, now))));
  for (const account of due) { await db.update(clinicStaffAccounts).set({ status: "expired" }).where(eq(clinicStaffAccounts.id, account.id)); await recordStaffAccountActivity(clinicianUserId, { staffAccountId: account.staffAccountId, eventType: "expired", actorName: "System", summary: "Pending staff invitation expired before authenticated activation.", occurredAt: now }); }
}

export async function createClinicStaffInvitation(clinicianUserId: number, input: { staffAccountId: string; email: string; staffRole: ClinicStaffRole; invitedBy: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff accounts");
  const invitedEmail = normalizedEmail(input.email); const settings = await getStaffInvitationSettings(clinicianUserId); const expiresAt = new Date(Date.now() + settings.expiryDays * 86400000);
  await db.insert(clinicStaffAccounts).values({ clinicianUserId, staffAccountId: input.staffAccountId, invitedEmail, staffRole: input.staffRole, status: "invited", invitedBy: input.invitedBy, expiresAt }).onDuplicateKeyUpdate({ set: { staffRole: input.staffRole, status: "invited", invitedBy: input.invitedBy, staffUserId: null, displayName: null, expiresAt, resendPreparedAt: null, resendCount: 0, activatedAt: null, revokedAt: null } });
  await recordStaffAccountActivity(clinicianUserId, { staffAccountId: input.staffAccountId, eventType: "invitation-created", actorName: input.invitedBy, summary: `Staff invitation prepared with a ${settings.expiryDays}-day activation window.` });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function listClinicStaffAccounts(clinicianUserId: number) {
  await expireDueStaffInvitations(clinicianUserId); const db = await getDb(); if (!db) return [];
  return db.select().from(clinicStaffAccounts).where(eq(clinicStaffAccounts.clinicianUserId, clinicianUserId)).orderBy(clinicStaffAccounts.invitedAt);
}

export async function revokeClinicStaffAccount(clinicianUserId: number, staffAccountId: string, actorName: string) {
  const db = await getDb(); if (!db) throw new Error("Database not available for staff accounts");
  await db.update(clinicStaffAccounts).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(clinicStaffAccounts.clinicianUserId, clinicianUserId), eq(clinicStaffAccounts.staffAccountId, staffAccountId)));
  await recordStaffAccountActivity(clinicianUserId, { staffAccountId, eventType: "revoked", actorName, summary: "Clinician revoked this staff account’s clinic access." });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function prepareStaffInvitationResend(clinicianUserId: number, staffAccountId: string, actorName: string) {
  await expireDueStaffInvitations(clinicianUserId); const db = await getDb(); if (!db) throw new Error("Database not available for staff accounts");
  const accounts = await db.select().from(clinicStaffAccounts).where(and(eq(clinicStaffAccounts.clinicianUserId, clinicianUserId), eq(clinicStaffAccounts.staffAccountId, staffAccountId))).limit(1); const account = accounts[0];
  if (!account || !["invited", "expired"].includes(account.status)) throw new Error("Only pending or expired staff invitations can be prepared again.");
  if (account.resendCount >= MAX_STAFF_INVITATION_RESENDS) throw new Error(`This invitation has reached the ${MAX_STAFF_INVITATION_RESENDS}-preparation limit.`);
  const settings = await getStaffInvitationSettings(clinicianUserId); const now = new Date(); const expiresAt = new Date(now.getTime() + settings.expiryDays * 86400000);
  await db.update(clinicStaffAccounts).set({ status: "invited", expiresAt, resendPreparedAt: now, resendCount: account.resendCount + 1 }).where(eq(clinicStaffAccounts.id, account.id));
  await recordStaffAccountActivity(clinicianUserId, { staffAccountId, eventType: "resend-prepared", actorName, summary: `Clinician prepared a refreshed ${settings.expiryDays}-day invitation window; no email was sent automatically.`, occurredAt: now });
  return listClinicStaffAccounts(clinicianUserId);
}

export async function listStaffAccountActivity(clinicianUserId: number, input?: { startDate?: string; endDate?: string }) {
  const db = await getDb(); if (!db) return [];
  const filters = [eq(staffAccountActivity.clinicianUserId, clinicianUserId)]; if (input?.startDate) filters.push(gte(staffAccountActivity.occurredAt, new Date(`${input.startDate}T00:00:00.000Z`))); if (input?.endDate) filters.push(lte(staffAccountActivity.occurredAt, new Date(`${input.endDate}T23:59:59.999Z`)));
  return db.select().from(staffAccountActivity).where(and(...filters)).orderBy(sql`${staffAccountActivity.occurredAt} desc`);
}

export async function getMonthlyStaffAccountActivitySummary(clinicianUserId: number, months = 6) {
  const today = new Date(); const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1); const activity = await listStaffAccountActivity(clinicianUserId, { startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`, endDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` }); const buckets = new Map<string, { month: string; total: number; invitationCreated: number; resendPrepared: number; activated: number; expired: number; revoked: number }>();
  for (let index = 0; index < months; index += 1) { const date = new Date(today.getFullYear(), today.getMonth() - months + 1 + index, 1); const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; buckets.set(month, { month, total: 0, invitationCreated: 0, resendPrepared: 0, activated: 0, expired: 0, revoked: 0 }); }
  activity.forEach((item) => { const bucket = buckets.get(`${item.occurredAt.getFullYear()}-${String(item.occurredAt.getMonth() + 1).padStart(2, "0")}`); if (!bucket) return; bucket.total += 1; if (item.eventType === "invitation-created") bucket.invitationCreated += 1; if (item.eventType === "resend-prepared") bucket.resendPrepared += 1; if (item.eventType === "activated") bucket.activated += 1; if (item.eventType === "expired") bucket.expired += 1; if (item.eventType === "revoked") bucket.revoked += 1; });
  return [...buckets.values()];
}

export async function getAuthenticatedStaffAccess(user: { id: number; email: string | null; name: string | null; role: "user" | "admin" }) {
  if (user.role === "admin" || isClinicAdministratorEmail(user.email)) return { allowed: true, isOwner: true, clinicianUserId: user.id, staffRole: "clinician" as ClinicStaffRole };
  const email = user.email ? normalizedEmail(user.email) : "";
  if (!email) return { allowed: false, reason: "This authenticated account has no verified email to match a clinic invitation." as const };
  const db = await getDb(); if (!db) return { allowed: false, reason: "Clinic staff access is unavailable while the database is offline." as const };
  const pending = await db.select().from(clinicStaffAccounts).where(and(eq(clinicStaffAccounts.invitedEmail, email), eq(clinicStaffAccounts.status, "invited"))).limit(1); if (pending[0] && (!pending[0].expiresAt || pending[0].expiresAt < new Date())) { await db.update(clinicStaffAccounts).set({ status: "expired" }).where(eq(clinicStaffAccounts.id, pending[0].id)); await recordStaffAccountActivity(pending[0].clinicianUserId, { staffAccountId: pending[0].staffAccountId, eventType: "expired", actorName: "System", summary: "Pending staff invitation expired before authenticated activation." }); }
  let rows = await db.select().from(clinicStaffAccounts).where(and(eq(clinicStaffAccounts.staffUserId, user.id), eq(clinicStaffAccounts.status, "active"))).limit(1);
  if (!rows[0]) {
    const invitation = await db.select().from(clinicStaffAccounts).where(and(eq(clinicStaffAccounts.invitedEmail, email), eq(clinicStaffAccounts.status, "invited"))).limit(1);
    if (invitation[0]) { const activatedAt = new Date(); await db.update(clinicStaffAccounts).set({ staffUserId: user.id, displayName: user.name ?? email, status: "active", activatedAt }).where(eq(clinicStaffAccounts.id, invitation[0].id)); await recordStaffAccountActivity(invitation[0].clinicianUserId, { staffAccountId: invitation[0].staffAccountId, eventType: "activated", actorName: user.name ?? email, summary: "Authenticated staff account linked to the clinician-approved invitation.", occurredAt: activatedAt }); rows = await db.select().from(clinicStaffAccounts).where(eq(clinicStaffAccounts.id, invitation[0].id)).limit(1); }
  }
  const account = rows[0];
  return account ? { allowed: true, isOwner: false, clinicianUserId: account.clinicianUserId, staffRole: account.staffRole as ClinicStaffRole, staffAccountId: account.staffAccountId } : { allowed: false, reason: "This account is not linked to an active clinic staff invitation." as const };
}

export async function getCapacityAlertAccessForUser(user: { id: number; email: string | null; name: string | null; role: "user" | "admin" }) {
  const access = await getAuthenticatedStaffAccess(user); if (!access.allowed || typeof access.clinicianUserId !== "number") return access;
  if (access.isOwner || access.staffRole === "clinician") return access;
  const settings = await getCapacityAlertVisibilitySettings(access.clinicianUserId); const visible = access.staffRole === "nurse" ? settings.nurseVisible : settings.receptionistVisible;
  return visible ? access : { allowed: false, reason: "The clinic administrator has not enabled capacity-alert visibility for this staff role." as const };
}

export async function getWeeklyCapacitySummary(clinicianUserId: number, weekStartDate: string, weekEndDate: string) {
  const db = await getDb(); if (!db) return { rows: [], unacknowledgedAlertCount: 0 };
  const endInstant = new Date(`${weekEndDate}T23:59:59.999Z`); const startInstant = new Date(`${weekStartDate}T00:00:00.000Z`);
  const snapshots = await db.select().from(staffCapacitySnapshots).where(and(eq(staffCapacitySnapshots.clinicianUserId, clinicianUserId), lte(staffCapacitySnapshots.effectiveAt, endInstant)));
  const latestByStaff = new Map<string, typeof snapshots[number]>(); snapshots.forEach((snapshot) => { const current = latestByStaff.get(snapshot.staffId); if (!current || snapshot.effectiveAt > current.effectiveAt) latestByStaff.set(snapshot.staffId, snapshot); });
  const requests = await db.select().from(waitlistRequests).where(and(eq(waitlistRequests.clinicianUserId, clinicianUserId), gte(waitlistRequests.assignedAt, startInstant), lte(waitlistRequests.assignedAt, endInstant)));
  const assignedCounts = new Map<string, number>(); requests.forEach((request) => { if (request.assignedStaffId) assignedCounts.set(request.assignedStaffId, (assignedCounts.get(request.assignedStaffId) ?? 0) + 1); });
  const alerts = await db.select({ id: capacityTargetChangeAlerts.id }).from(capacityTargetChangeAlerts).where(and(eq(capacityTargetChangeAlerts.clinicianUserId, clinicianUserId), isNull(capacityTargetChangeAlerts.acknowledgedAt)));
  return { rows: [...latestByStaff.values()].map((snapshot) => ({ staffId: snapshot.staffId, staffName: snapshot.staffName, triageCapacity: snapshot.triageCapacity, assignmentCount: assignedCounts.get(snapshot.staffId) ?? 0, targetEffectiveAt: snapshot.effectiveAt })), unacknowledgedAlertCount: alerts.length };
}

export async function recordWeeklyCapacitySummaryExport(clinicianUserId: number, input: { exportId: string; internalReportId?: string; exportFormat: "csv" | "pdf"; weekStartDate: string; weekEndDate: string; reviewedBy: string; reviewedAt: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database not available for capacity summary export"); const summary = await getWeeklyCapacitySummary(clinicianUserId, input.weekStartDate, input.weekEndDate); const settings = await getWeeklyCapacityReportReferenceSettings(clinicianUserId); const referenceExpiresAt = input.exportFormat === "pdf" && input.internalReportId ? new Date(input.reviewedAt.getTime() + settings.expiryDays * 86400000) : null;
  await db.insert(weeklyCapacitySummaryExports).values({ clinicianUserId, ...input, referenceExpiresAt, staffCount: summary.rows.length, unacknowledgedAlertCount: summary.unacknowledgedAlertCount }).onDuplicateKeyUpdate({ set: { exportId: input.exportId } });
  return summary;
}

export async function getWeeklyCapacitySummaryReportReference(clinicianUserId: number, internalReportId: string) {
  const db = await getDb(); if (!db) return null; const rows = await db.select().from(weeklyCapacitySummaryExports).where(and(eq(weeklyCapacitySummaryExports.clinicianUserId, clinicianUserId), eq(weeklyCapacitySummaryExports.internalReportId, internalReportId))).limit(1); const report = rows[0]; return !report || !report.referenceExpiresAt || report.referenceExpiresAt <= new Date() ? null : report;
}

export async function listWeeklyCapacityReportReferenceExpiryReminders(clinicianUserId: number, daysAhead = 7) {
  const db = await getDb(); if (!db) return []; const now = new Date(); const cutoff = new Date(now.getTime() + daysAhead * 86400000); return db.select({ internalReportId: weeklyCapacitySummaryExports.internalReportId, weekStartDate: weeklyCapacitySummaryExports.weekStartDate, weekEndDate: weeklyCapacitySummaryExports.weekEndDate, referenceExpiresAt: weeklyCapacitySummaryExports.referenceExpiresAt }).from(weeklyCapacitySummaryExports).where(and(eq(weeklyCapacitySummaryExports.clinicianUserId, clinicianUserId), eq(weeklyCapacitySummaryExports.exportFormat, "pdf"), gte(weeklyCapacitySummaryExports.referenceExpiresAt, now), lte(weeklyCapacitySummaryExports.referenceExpiresAt, cutoff))).orderBy(asc(weeklyCapacitySummaryExports.referenceExpiresAt));
}

export type DurableClinicAppointmentInput = {
  appointmentId: string; childId: string; service: string; appointmentDate: string; appointmentTime: string; durationMinutes: number; reason: string; status: "confirmed" | "needs-intake" | "completed" | "cancelled"; changeMessage?: string; guardianConfirmedAt?: Date; rescheduledAt?: Date; rescheduleAcknowledgedAt?: Date; appointmentChangeReminderDraftedAt?: Date;
};

export async function listClinicAppointments(clinicianUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clinicAppointments).where(eq(clinicAppointments.clinicianUserId, clinicianUserId)).orderBy(asc(clinicAppointments.appointmentDate), asc(clinicAppointments.appointmentTime));
}

export async function saveClinicAppointments(clinicianUserId: number, appointments: DurableClinicAppointmentInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for clinic appointments");
  for (const appointment of appointments) {
    await db.insert(clinicAppointments).values({ clinicianUserId, ...appointment }).onDuplicateKeyUpdate({
      set: {
        childId: appointment.childId,
        service: appointment.service,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        durationMinutes: appointment.durationMinutes,
        reason: appointment.reason,
        status: appointment.status,
        changeMessage: appointment.changeMessage ?? null,
        guardianConfirmedAt: appointment.guardianConfirmedAt ?? null,
        rescheduledAt: appointment.rescheduledAt ?? null,
        rescheduleAcknowledgedAt: appointment.rescheduleAcknowledgedAt ?? null,
        appointmentChangeReminderDraftedAt: appointment.appointmentChangeReminderDraftedAt ?? null,
      },
    });
  }
  return listClinicAppointments(clinicianUserId);
}

const hashRecordAccessSecret = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueGuardianRecordAccessChallenge(clinicianUserId: number, input: { childId: string; issuedBy: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for guardian record access");
  const reference = randomBytes(6).toString("hex").toUpperCase();
  const verificationCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date(); const expiresAt = new Date(now.getTime() + GUARDIAN_RECORD_ACCESS_CHALLENGE_HOURS * 3600000);
  await db.insert(guardianRecordAccessChallenges).values({ clinicianUserId, challengeId: `guardian-record-${now.getTime()}-${reference}`, childId: input.childId, referenceHash: hashRecordAccessSecret(reference), verificationCodeHash: hashRecordAccessSecret(verificationCode), issuedBy: input.issuedBy, issuedAt: now, expiresAt });
  return { reference, verificationCode, expiresAt };
}

export async function verifyGuardianRecordAccess(input: { reference: string; verificationCode: string }) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(guardianRecordAccessChallenges).where(eq(guardianRecordAccessChallenges.referenceHash, hashRecordAccessSecret(input.reference.trim().toUpperCase()))).limit(1);
  const challenge = rows[0]; const now = new Date();
  if (!challenge || challenge.revokedAt || challenge.verifiedAt || challenge.expiresAt <= now || challenge.attemptCount >= GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT) return null;
  if (challenge.verificationCodeHash !== hashRecordAccessSecret(input.verificationCode.trim())) {
    const attempts = challenge.attemptCount + 1;
    await db.update(guardianRecordAccessChallenges).set({ attemptCount: attempts, revokedAt: attempts >= GUARDIAN_RECORD_ACCESS_ATTEMPT_LIMIT ? now : null }).where(eq(guardianRecordAccessChallenges.id, challenge.id));
    return null;
  }
  const accessToken = randomBytes(32).toString("base64url"); const accessExpiresAt = new Date(now.getTime() + GUARDIAN_RECORD_ACCESS_SESSION_HOURS * 3600000);
  await db.update(guardianRecordAccessChallenges).set({ verifiedAt: now, accessTokenHash: hashRecordAccessSecret(accessToken), accessExpiresAt }).where(eq(guardianRecordAccessChallenges.id, challenge.id));
  return { accessToken, childId: challenge.childId, accessExpiresAt };
}

export async function validateGuardianRecordAccess(accessToken: string) {
  const db = await getDb();
  if (!db || !accessToken) return null;
  const rows = await db.select().from(guardianRecordAccessChallenges).where(eq(guardianRecordAccessChallenges.accessTokenHash, hashRecordAccessSecret(accessToken))).limit(1);
  const challenge = rows[0];
  return challenge && challenge.verifiedAt && !challenge.revokedAt && challenge.accessExpiresAt && challenge.accessExpiresAt > new Date() ? { childId: challenge.childId, accessExpiresAt: challenge.accessExpiresAt } : null;
}
