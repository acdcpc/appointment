import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { referralAuditEvents, referralDeliveryMonitor, referralRetryCounters } from "../drizzle/schema";
import { and, isNull, lt, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

export const MAX_REFERRAL_EMAIL_RESENDS = 3;
export const UNRESOLVED_REFERRAL_ALERT_HOURS = 24;
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
  await db.update(referralDeliveryMonitor).set({ scheduleCronTaskUid: taskUid }).where(eq(referralDeliveryMonitor.id, config.id));
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
