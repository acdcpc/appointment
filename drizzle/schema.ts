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
  type: mysqlEnum("type", ["appointment-change", "referral-letter", "email-share", "patient-communication"]).notNull(),
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
  monthlySummaryEnabled: boolean("monthlySummaryEnabled").default(false).notNull(),
  monthlySummaryCronTaskUid: varchar("monthlySummaryCronTaskUid", { length: 65 }),
  monthlySummaryDeliveryMinute: int("monthlySummaryDeliveryMinute").default(540).notNull(),
  lastMonthlySummaryPeriod: varchar("lastMonthlySummaryPeriod", { length: 7 }),
  lastMonthlySummaryAt: timestamp("lastMonthlySummaryAt"),
  quarterlyReviewEnabled: boolean("quarterlyReviewEnabled").default(false).notNull(),
  quarterlyReviewCronTaskUid: varchar("quarterlyReviewCronTaskUid", { length: 65 }),
  lastQuarterlyReviewPeriod: varchar("lastQuarterlyReviewPeriod", { length: 7 }),
  lastQuarterlyReviewAt: timestamp("lastQuarterlyReviewAt"),
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

export const clinicPublicSettings = mysqlTable("clinic_public_settings", {
  id: int("id").autoincrement().primaryKey(),
  clinicName: varchar("clinicName", { length: 255 }).notNull(),
  address: text("address").notNull(),
  mapUrl: varchar("mapUrl", { length: 2048 }).notNull(),
  whatsappNumber: varchar("whatsappNumber", { length: 20 }).notNull(),
  whatsappResponseNotice: varchar("whatsappResponseNotice", { length: 500 }).notNull().default("Messages are reviewed during clinic hours; please allow a response on the next working day."),
  guardianReverificationDays: int("guardianReverificationDays").notNull().default(180),
  isProvisional: boolean("isProvisional").default(true).notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const guardianContacts = mysqlTable("guardian_contacts", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed"]).notNull().default("pending"),
  confirmedBy: varchar("confirmedBy", { length: 255 }),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("guardian_contacts_scope_email_unique").on(table.clinicianUserId, table.childId, table.email),
  index("guardian_contacts_child_status_idx").on(table.clinicianUserId, table.childId, table.status),
]);

export const patientReportShares = mysqlTable("patient_report_shares", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  guardianContactId: int("guardianContactId").notNull(),
  scope: mysqlEnum("scope", ["record-pdf", "timeline-report"]).notNull(),
  acknowledgementToken: varchar("acknowledgementToken", { length: 96 }).notNull(),
  deliveryStatus: mysqlEnum("deliveryStatus", ["draft-opened", "sent", "saved", "cancelled", "unavailable"]).notNull().default("draft-opened"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgementText: varchar("acknowledgementText", { length: 500 }),
}, (table) => [
  uniqueIndex("patient_report_shares_token_unique").on(table.acknowledgementToken),
  index("patient_report_shares_child_created_idx").on(table.clinicianUserId, table.childId, table.createdAt),
]);

export const waitlistRequests = mysqlTable("waitlist_requests", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), requestId: varchar("requestId", { length: 120 }).notNull(), appointmentId: varchar("appointmentId", { length: 120 }).notNull(), childId: varchar("childId", { length: 120 }).notNull(), requestedAt: timestamp("requestedAt").notNull(), status: mysqlEnum("status", ["pending", "reviewed", "declined", "withdrawn", "offered", "responded", "expired", "converted"]).notNull(), note: text("note"), offerDate: varchar("offerDate", { length: 40 }), offerTime: varchar("offerTime", { length: 20 }), offeredAt: timestamp("offeredAt"), offerExpiresAt: timestamp("offerExpiresAt"), parentResponse: mysqlEnum("parentResponse", ["accepted", "declined"]), respondedAt: timestamp("respondedAt"), clinicianAcknowledgedAt: timestamp("clinicianAcknowledgedAt"), convertedAt: timestamp("convertedAt"), convertedBy: varchar("convertedBy", { length: 255 }), assignedStaffId: varchar("assignedStaffId", { length: 120 }), assignedAt: timestamp("assignedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("waitlist_requests_scope_request_unique").on(table.clinicianUserId, table.requestId), index("waitlist_requests_scope_offered_idx").on(table.clinicianUserId, table.offeredAt), index("waitlist_requests_scope_assigned_idx").on(table.clinicianUserId, table.assignedAt)]);

export const waitlistEventLog = mysqlTable("waitlist_event_log", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), eventId: varchar("eventId", { length: 120 }).notNull(), requestId: varchar("requestId", { length: 120 }).notNull(), eventType: mysqlEnum("eventType", ["requested", "reviewed", "withdrawn", "offer-created", "parent-response", "expired", "converted", "assignment-changed", "response-acknowledged"]).notNull(), actor: mysqlEnum("actor", ["clinician", "guardian", "system"]).notNull(), occurredAt: timestamp("occurredAt").notNull(), status: mysqlEnum("status", ["pending", "reviewed", "declined", "withdrawn", "offered", "responded", "expired", "converted"]).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("waitlist_event_log_scope_event_unique").on(table.clinicianUserId, table.eventId), index("waitlist_event_log_scope_request_occurred_idx").on(table.clinicianUserId, table.requestId, table.occurredAt)]);

export const staffCapacitySnapshots = mysqlTable("staff_capacity_snapshots", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), snapshotId: varchar("snapshotId", { length: 120 }).notNull(), staffId: varchar("staffId", { length: 120 }).notNull(), staffName: varchar("staffName", { length: 255 }).notNull(), triageCapacity: int("triageCapacity").notNull(), effectiveAt: timestamp("effectiveAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("staff_capacity_snapshots_scope_snapshot_unique").on(table.clinicianUserId, table.snapshotId), index("staff_capacity_snapshots_scope_staff_effective_idx").on(table.clinicianUserId, table.staffId, table.effectiveAt)]);

export const internalFollowUpPrintAudits = mysqlTable("internal_follow_up_print_audits", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), auditId: varchar("auditId", { length: 120 }).notNull(), documentScope: mysqlEnum("documentScope", ["appointment-change-follow-up"]).notNull(), itemCount: int("itemCount").notNull(), actorName: varchar("actorName", { length: 255 }).notNull(), initiatedAt: timestamp("initiatedAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("internal_follow_up_print_audits_scope_audit_unique").on(table.clinicianUserId, table.auditId), index("internal_follow_up_print_audits_scope_initiated_idx").on(table.clinicianUserId, table.initiatedAt)]);

export const capacityTargetChangeAlerts = mysqlTable("capacity_target_change_alerts", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), alertId: varchar("alertId", { length: 120 }).notNull(), staffId: varchar("staffId", { length: 120 }).notNull(), staffName: varchar("staffName", { length: 255 }).notNull(), previousTarget: int("previousTarget").notNull(), newTarget: int("newTarget").notNull(), changedBy: varchar("changedBy", { length: 255 }).notNull(), changedAt: timestamp("changedAt").notNull(), acknowledgedAt: timestamp("acknowledgedAt"), acknowledgedBy: varchar("acknowledgedBy", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("capacity_target_change_alerts_scope_alert_unique").on(table.clinicianUserId, table.alertId), index("capacity_target_change_alerts_scope_changed_idx").on(table.clinicianUserId, table.changedAt), index("capacity_target_change_alerts_scope_acknowledged_idx").on(table.clinicianUserId, table.acknowledgedAt)]);

export type ReferralAuditEventRow = typeof referralAuditEvents.$inferSelect;
export type InsertReferralAuditEvent = typeof referralAuditEvents.$inferInsert;
