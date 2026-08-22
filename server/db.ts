import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { auditArchiveRuns, auditRetentionPolicies, auditRetentionPolicyChanges, clinicPublicSettings, guardianContacts, internalFollowUpPrintAudits, patientReportShares, referralAuditEvents, referralDeliveryMonitor, referralRetryCounters, staffCapacitySnapshots, waitlistEventLog, waitlistRequests } from "../drizzle/schema";
import { and, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

export const MAX_REFERRAL_EMAIL_RESENDS = 3;
export const UNRESOLVED_REFERRAL_ALERT_HOURS = 24;
export const MAX_AUDIT_RETENTION_DAYS = 36500;
const defaultClinicPublicSettings = { clinicName: "Rainbow Child Development Clinic", address: "Patan Hospital, Lagankhel, Lalitpur", mapUrl: "https://www.google.com/maps/search/?api=1&query=Patan%20Hospital%2C%20Lagankhel%2C%20Lalitpur", whatsappNumber: "9779765002862", whatsappResponseNotice: "Messages are reviewed during clinic hours; please allow a response on the next working day.", guardianReverificationDays: 180, isProvisional: true, updatedBy: "Initial clinic setup" };
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

export async function getClinicPublicSettings() {
  const db = await getDb();
  if (!db) return { ...defaultClinicPublicSettings, id: 0, updatedAt: new Date() };
  const rows = await db.select().from(clinicPublicSettings).orderBy(sql`${clinicPublicSettings.id} asc`).limit(1);
  return rows[0] ?? { ...defaultClinicPublicSettings, id: 0, updatedAt: new Date() };
}

export async function saveClinicPublicSettings(input: { address: string; mapUrl: string; whatsappNumber: string; whatsappResponseNotice: string; updatedBy: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for clinic public settings");
  const existing = await db.select().from(clinicPublicSettings).orderBy(sql`${clinicPublicSettings.id} asc`).limit(1);
  const values = { ...defaultClinicPublicSettings, ...input, clinicName: "Rainbow Child Development Clinic", isProvisional: false };
  if (existing[0]) await db.update(clinicPublicSettings).set(values).where(eq(clinicPublicSettings.id, existing[0].id));
  else await db.insert(clinicPublicSettings).values(values);
  return getClinicPublicSettings();
}

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
