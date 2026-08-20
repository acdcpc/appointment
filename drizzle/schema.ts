import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { boolean, index, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const referralAuditEvents = mysqlTable("referral_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  clientEventId: varchar("clientEventId", { length: 80 }).notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  type: mysqlEnum("type", ["appointment-change", "referral-letter", "email-share"]).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  actorRole: mysqlEnum("actorRole", ["clinician"]).notNull(),
  actorName: varchar("actorName", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  message: text("message"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["draft-opened", "sent", "saved", "cancelled", "unavailable"]),
  isResend: boolean("isResend").default(false).notNull(),
  retryLimit: int("retryLimit").default(3).notNull(),
  retryAttempts: int("retryAttempts").default(0).notNull(),
  alertSentAt: timestamp("alertSentAt"),
  archivedAt: timestamp("archivedAt"),
  archivedBy: varchar("archivedBy", { length: 255 }),
  archiveReason: varchar("archiveReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("referral_audit_events_client_event_unique").on(table.clinicianUserId, table.clientEventId),
  index("referral_audit_events_child_occurred_idx").on(table.clinicianUserId, table.childId, table.occurredAt),
  index("referral_audit_events_delivery_alert_idx").on(table.deliveryStatus, table.alertSentAt, table.occurredAt),
]);

export const referralRetryCounters = mysqlTable("referral_retry_counters", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  attemptsUsed: int("attemptsUsed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("referral_retry_counters_scope_unique").on(table.clinicianUserId, table.childId, table.recipientEmail),
]);

export const referralDeliveryMonitor = mysqlTable("referral_delivery_monitor", {
  id: int("id").autoincrement().primaryKey(),
  thresholdHours: int("thresholdHours").default(24).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  scheduleEnabled: boolean("scheduleEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditRetentionPolicies = mysqlTable("audit_retention_policies", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  retentionDays: int("retentionDays").notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull(),
  automaticArchiveEnabled: boolean("automaticArchiveEnabled").default(false).notNull(),
  archiveScheduleCronTaskUid: varchar("archiveScheduleCronTaskUid", { length: 65 }),
  lastArchiveRunAt: timestamp("lastArchiveRunAt"),
  lastArchiveCount: int("lastArchiveCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("audit_retention_policies_clinician_unique").on(table.clinicianUserId),
]);

export const auditArchiveRuns = mysqlTable("audit_archive_runs", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  retentionDays: int("retentionDays").notNull(),
  archivedCount: int("archivedCount").notNull(),
  executionType: mysqlEnum("executionType", ["manual", "scheduled"]).notNull(),
  executedBy: varchar("executedBy", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
}, (table) => [
  index("audit_archive_runs_clinician_executed_idx").on(table.clinicianUserId, table.executedAt),
]);

export const auditRetentionPolicyChanges = mysqlTable("audit_retention_policy_changes", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  setting: mysqlEnum("setting", ["retention-days", "automatic-archive"]).notNull(),
  previousValue: varchar("previousValue", { length: 120 }).notNull(),
  nextValue: varchar("nextValue", { length: 120 }).notNull(),
  changedBy: varchar("changedBy", { length: 255 }).notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
}, (table) => [
  index("audit_retention_policy_changes_clinician_changed_idx").on(table.clinicianUserId, table.changedAt),
]);

export type ReferralAuditEventRow = typeof referralAuditEvents.$inferSelect;
export type InsertReferralAuditEvent = typeof referralAuditEvents.$inferInsert;
