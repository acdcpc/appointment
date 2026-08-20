import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { auditArchiveRuns, auditRetentionPolicies, auditRetentionPolicyChanges, referralAuditEvents, referralDeliveryMonitor, referralRetryCounters } from "../drizzle/schema";
import { and, isNull, lt, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

export const MAX_REFERRAL_EMAIL_RESENDS = 3;
export const UNRESOLVED_REFERRAL_ALERT_HOURS = 24;
export const MAX_AUDIT_RETENTION_DAYS = 36500;
type ReferralAuditInput = {
  clientEventId: string; childId: string; type: "appointment-change" | "referral-letter" | "email-share"; occurredAt: Date; actorName: string; summary: string; message?: string; deliveryStatus?: "draft-opened" | "sent" | "saved" | "cancelled" | "unavailable"; isResend?: boolean; retryLimit?: number; retryAttempts?: number;
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
  const candidates = await db.select().from(referralAuditEvents).where(and(or(eq(referralAuditEvents.deliveryStatus, "cancelled"), eq(referralAuditEvents.deliveryStatus, "unavailable")), isNull(referralAuditEvents.alertSentAt), lt(referralAuditEvents.occurredAt, cutoff)));
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

export async function getAuditRetentionDashboard(clinicianUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit retention reporting");
  const counts = await db.select({ total: sql<number>`count(*)`, archived: sql<number>`sum(case when ${referralAuditEvents.archivedAt} is not null then 1 else 0 end)`, storageBytes: sql<number>`coalesce(sum(length(${referralAuditEvents.summary}) + coalesce(length(${referralAuditEvents.message}), 0) + coalesce(length(${referralAuditEvents.archiveReason}), 0)), 0)` }).from(referralAuditEvents).where(eq(referralAuditEvents.clinicianUserId, clinicianUserId));
  const recentRuns = await db.select().from(auditArchiveRuns).where(eq(auditArchiveRuns.clinicianUserId, clinicianUserId)).orderBy(sql`${auditArchiveRuns.executedAt} desc`).limit(5);
  const policyChanges = await db.select().from(auditRetentionPolicyChanges).where(eq(auditRetentionPolicyChanges.clinicianUserId, clinicianUserId)).orderBy(sql`${auditRetentionPolicyChanges.changedAt} desc`).limit(8);
  const total = Number(counts[0]?.total ?? 0); const archived = Number(counts[0]?.archived ?? 0);
  return { totalRecords: total, activeRecords: total - archived, archivedRecords: archived, storageBytes: Number(counts[0]?.storageBytes ?? 0), recentRuns, policyChanges };
}
