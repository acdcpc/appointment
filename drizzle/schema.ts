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

export const superAdminAuditEvents = mysqlTable("super_admin_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 120 }).notNull(),
  eventType: mysqlEnum("eventType", ["user-access-updated", "appointment-csv-prepared"]).notNull(),
  actorEmail: varchar("actorEmail", { length: 320 }).notNull(),
  targetUserId: int("targetUserId"),
  targetEmail: varchar("targetEmail", { length: 320 }),
  previousAccess: varchar("previousAccess", { length: 40 }),
  nextAccess: varchar("nextAccess", { length: 40 }),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  recordCount: int("recordCount").default(0).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("super_admin_audit_event_unique").on(table.eventId),
  index("super_admin_audit_type_occurred_idx").on(table.eventType, table.occurredAt),
]);

export const superAdminGovernanceSettings = mysqlTable("super_admin_governance_settings", {
  id: int("id").autoincrement().primaryKey(),
  exportRetentionDays: int("exportRetentionDays").notNull().default(30),
  accessReviewIntervalDays: int("accessReviewIntervalDays").notNull().default(90),
  maintenanceModeEnabled: boolean("maintenanceModeEnabled").notNull().default(false),
  maintenanceNotice: varchar("maintenanceNotice", { length: 300 }).notNull().default("A scheduled clinic service update is in progress. Please return shortly."),
  maintenanceEstimatedCompletion: varchar("maintenanceEstimatedCompletion", { length: 160 }),
  maintenanceEstimatedCompletionAt: timestamp("maintenanceEstimatedCompletionAt"),
  maintenanceChangedAt: timestamp("maintenanceChangedAt"),
  maintenanceChangedBy: varchar("maintenanceChangedBy", { length: 320 }),
  updatedBy: varchar("updatedBy", { length: 320 }).notNull(),
  lastAccessReviewAt: timestamp("lastAccessReviewAt"),
  lastAccessReviewBy: varchar("lastAccessReviewBy", { length: 320 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const superAdminMaintenanceEvents = mysqlTable("super_admin_maintenance_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 120 }).notNull(),
  actorEmail: varchar("actorEmail", { length: 320 }).notNull(),
  enabled: boolean("enabled").notNull(),
  noticeSummary: varchar("noticeSummary", { length: 300 }).notNull(),
  estimatedCompletion: varchar("estimatedCompletion", { length: 160 }),
  estimatedCompletionAt: timestamp("estimatedCompletionAt"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("super_admin_maintenance_event_unique").on(table.eventId), index("super_admin_maintenance_event_time_idx").on(table.occurredAt)]);

export const maintenanceNotificationRequests = mysqlTable("maintenance_notification_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestId: varchar("requestId", { length: 120 }).notNull(),
  maintenanceChangedAt: timestamp("maintenanceChangedAt").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["requested", "withdrawn"]).notNull().default("requested"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("maintenance_notification_request_unique").on(table.maintenanceChangedAt, table.email), uniqueIndex("maintenance_notification_request_id_unique").on(table.requestId), index("maintenance_notification_request_status_idx").on(table.status, table.requestedAt)]);

export const serviceSuggestionRequests = mysqlTable("service_suggestion_requests", {
  id: int("id").autoincrement().primaryKey(),
  suggestionId: varchar("suggestionId", { length: 120 }).notNull(),
  suggestedService: varchar("suggestedService", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["submitted", "reviewed"]).notNull().default("submitted"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("service_suggestion_request_id_unique").on(table.suggestionId), index("service_suggestion_request_service_time_idx").on(table.suggestedService, table.requestedAt)]);

export const maintenanceNotificationPreferenceExports = mysqlTable("maintenance_notification_preference_exports", {
  id: int("id").autoincrement().primaryKey(),
  exportId: varchar("exportId", { length: 120 }).notNull(),
  actorEmail: varchar("actorEmail", { length: 320 }).notNull(),
  statusFilter: varchar("statusFilter", { length: 20 }).notNull(),
  emailQuery: varchar("emailQuery", { length: 160 }),
  recordCount: int("recordCount").notNull().default(0),
  preparedAt: timestamp("preparedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("maintenance_notification_preference_export_unique").on(table.exportId), index("maintenance_notification_preference_export_time_idx").on(table.preparedAt)]);

export const postDeploymentFeedback = mysqlTable("post_deployment_feedback", {
  id: int("id").autoincrement().primaryKey(),
  feedbackId: varchar("feedbackId", { length: 120 }).notNull(),
  submittedBy: varchar("submittedBy", { length: 320 }).notNull(),
  category: mysqlEnum("category", ["login", "scheduling", "records", "display", "other"]).notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  description: varchar("description", { length: 1200 }).notNull(),
  screenshotStorageKey: varchar("screenshotStorageKey", { length: 512 }),
  screenshotContentType: varchar("screenshotContentType", { length: 80 }),
  screenshotBytes: int("screenshotBytes"),
  status: mysqlEnum("status", ["open", "reviewed", "resolved"]).notNull().default("open"),
  reviewedBy: varchar("reviewedBy", { length: 320 }),
  reviewedAt: timestamp("reviewedAt"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("post_deployment_feedback_unique").on(table.feedbackId), index("post_deployment_feedback_status_time_idx").on(table.status, table.submittedAt)]);

export const superAdminAccessReviews = mysqlTable("super_admin_access_reviews", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: varchar("reviewId", { length: 120 }).notNull(),
  actorEmail: varchar("actorEmail", { length: 320 }).notNull(),
  applicationAdminCount: int("applicationAdminCount").notNull(),
  activeStaffCount: int("activeStaffCount").notNull(),
  revokedStaffCount: int("revokedStaffCount").notNull(),
  pendingInvitationCount: int("pendingInvitationCount").notNull(),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("super_admin_access_review_unique").on(table.reviewId), index("super_admin_access_review_time_idx").on(table.reviewedAt)]);

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
  clinicEmail: varchar("clinicEmail", { length: 320 }).notNull().default("rainbowclinic25@gmail.com"),
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

export const printAuditFilterPresets = mysqlTable("print_audit_filter_presets", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), presetId: varchar("presetId", { length: 120 }).notNull(), name: varchar("name", { length: 80 }).notNull(), startDate: varchar("startDate", { length: 10 }).notNull(), endDate: varchar("endDate", { length: 10 }).notNull(), actorName: varchar("actorName", { length: 255 }), displayOrder: int("displayOrder").notNull().default(0), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("print_audit_filter_presets_scope_preset_unique").on(table.clinicianUserId, table.presetId), uniqueIndex("print_audit_filter_presets_scope_name_unique").on(table.clinicianUserId, table.name)]);

export const capacityAlertVisibilitySettings = mysqlTable("capacity_alert_visibility_settings", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), dailyDashboardSummaryEnabled: boolean("dailyDashboardSummaryEnabled").notNull().default(true), receptionistVisible: boolean("receptionistVisible").notNull().default(false), nurseVisible: boolean("nurseVisible").notNull().default(false), clinicianVisible: boolean("clinicianVisible").notNull().default(true), updatedBy: varchar("updatedBy", { length: 255 }).notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("capacity_alert_visibility_settings_scope_unique").on(table.clinicianUserId)]);

export const clinicStaffAccounts = mysqlTable("clinic_staff_accounts", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), staffAccountId: varchar("staffAccountId", { length: 120 }).notNull(), invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(), staffUserId: int("staffUserId"), displayName: varchar("displayName", { length: 255 }), staffRole: mysqlEnum("staffRole", ["receptionist", "nurse", "clinician"]).notNull(), status: mysqlEnum("status", ["invited", "active", "revoked", "expired"]).notNull().default("invited"), invitedBy: varchar("invitedBy", { length: 255 }).notNull(), invitedAt: timestamp("invitedAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt"), resendPreparedAt: timestamp("resendPreparedAt"), resendCount: int("resendCount").notNull().default(0), activatedAt: timestamp("activatedAt"), revokedAt: timestamp("revokedAt"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("clinic_staff_accounts_scope_account_unique").on(table.clinicianUserId, table.staffAccountId), uniqueIndex("clinic_staff_accounts_scope_email_unique").on(table.clinicianUserId, table.invitedEmail), uniqueIndex("clinic_staff_accounts_user_unique").on(table.staffUserId), index("clinic_staff_accounts_email_status_idx").on(table.invitedEmail, table.status)]);

export const weeklyCapacitySummaryExports = mysqlTable("weekly_capacity_summary_exports", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), exportId: varchar("exportId", { length: 120 }).notNull(), internalReportId: varchar("internalReportId", { length: 120 }), referenceExpiresAt: timestamp("referenceExpiresAt"), exportFormat: mysqlEnum("exportFormat", ["csv", "pdf"]).notNull().default("csv"), weekStartDate: varchar("weekStartDate", { length: 10 }).notNull(), weekEndDate: varchar("weekEndDate", { length: 10 }).notNull(), staffCount: int("staffCount").notNull(), unacknowledgedAlertCount: int("unacknowledgedAlertCount").notNull(), reviewedBy: varchar("reviewedBy", { length: 255 }).notNull(), reviewedAt: timestamp("reviewedAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("weekly_capacity_summary_exports_scope_export_unique").on(table.clinicianUserId, table.exportId), index("weekly_capacity_summary_exports_scope_week_idx").on(table.clinicianUserId, table.weekStartDate)]);

export const invitationSearchPresets = mysqlTable("invitation_search_presets", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), presetId: varchar("presetId", { length: 120 }).notNull(), name: varchar("name", { length: 80 }).notNull(), searchText: varchar("searchText", { length: 160 }).notNull().default(""), statusFilter: mysqlEnum("statusFilter", ["all", "invited", "active", "expired", "revoked"]).notNull().default("all"), displayOrder: int("displayOrder").notNull().default(0), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("invitation_search_presets_scope_preset_unique").on(table.clinicianUserId, table.presetId), uniqueIndex("invitation_search_presets_scope_name_unique").on(table.clinicianUserId, table.name)]);

export const weeklyCapacityReportReferenceSettings = mysqlTable("weekly_capacity_report_reference_settings", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), expiryDays: int("expiryDays").notNull().default(30), updatedBy: varchar("updatedBy", { length: 255 }).notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("weekly_capacity_report_reference_settings_scope_unique").on(table.clinicianUserId)]);

export const staffInvitationSettings = mysqlTable("staff_invitation_settings", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), expiryDays: int("expiryDays").notNull().default(7), updatedBy: varchar("updatedBy", { length: 255 }).notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("staff_invitation_settings_scope_unique").on(table.clinicianUserId)]);

export const staffAccountActivity = mysqlTable("staff_account_activity", {
  id: int("id").autoincrement().primaryKey(), clinicianUserId: int("clinicianUserId").notNull(), activityId: varchar("activityId", { length: 120 }).notNull(), staffAccountId: varchar("staffAccountId", { length: 120 }).notNull(), eventType: mysqlEnum("eventType", ["invitation-created", "resend-prepared", "activated", "expired", "role-changed", "revoked"]).notNull(), actorName: varchar("actorName", { length: 255 }).notNull(), summary: varchar("summary", { length: 500 }).notNull(), occurredAt: timestamp("occurredAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("staff_account_activity_scope_activity_unique").on(table.clinicianUserId, table.activityId), index("staff_account_activity_scope_occurred_idx").on(table.clinicianUserId, table.occurredAt)]);

export const clinicAppointments = mysqlTable("clinic_appointments", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  appointmentId: varchar("appointmentId", { length: 120 }).notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  service: varchar("service", { length: 160 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 40 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 20 }).notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["confirmed", "needs-intake", "completed", "cancelled"]).notNull(),
  changeMessage: text("changeMessage"),
  guardianConfirmedAt: timestamp("guardianConfirmedAt"),
  rescheduledAt: timestamp("rescheduledAt"),
  rescheduleAcknowledgedAt: timestamp("rescheduleAcknowledgedAt"),
  appointmentChangeReminderDraftedAt: timestamp("appointmentChangeReminderDraftedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("clinic_appointments_scope_appointment_unique").on(table.clinicianUserId, table.appointmentId),
  index("clinic_appointments_scope_schedule_idx").on(table.clinicianUserId, table.appointmentDate, table.appointmentTime),
  index("clinic_appointments_scope_child_idx").on(table.clinicianUserId, table.childId),
]);

export const clinicDayHourOverrides = mysqlTable("clinic_day_hour_overrides", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  overrideId: varchar("overrideId", { length: 120 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 10 }).notNull(),
  isOpen: boolean("isOpen").notNull(),
  startTime: varchar("startTime", { length: 20 }),
  endTime: varchar("endTime", { length: 20 }),
  familyNotice: varchar("familyNotice", { length: 500 }).notNull().default("Clinic hours have been updated for this date. Please review your confirmed appointment and contact the clinic with questions."),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("clinic_day_hour_override_scope_date_unique").on(table.clinicianUserId, table.appointmentDate),
  uniqueIndex("clinic_day_hour_override_scope_id_unique").on(table.clinicianUserId, table.overrideId),
  index("clinic_day_hour_override_scope_date_idx").on(table.clinicianUserId, table.appointmentDate),
]);

export const guardianRecordAccessChallenges = mysqlTable("guardian_record_access_challenges", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  challengeId: varchar("challengeId", { length: 120 }).notNull(),
  childId: varchar("childId", { length: 120 }).notNull(),
  referenceHash: varchar("referenceHash", { length: 64 }).notNull(),
  verificationCodeHash: varchar("verificationCodeHash", { length: 64 }).notNull(),
  attemptCount: int("attemptCount").notNull().default(0),
  issuedBy: varchar("issuedBy", { length: 255 }).notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  accessTokenHash: varchar("accessTokenHash", { length: 64 }),
  accessExpiresAt: timestamp("accessExpiresAt"),
  revokedAt: timestamp("revokedAt"),
}, (table) => [
  uniqueIndex("guardian_record_access_challenge_unique").on(table.challengeId),
  uniqueIndex("guardian_record_access_reference_unique").on(table.referenceHash),
  index("guardian_record_access_scope_child_idx").on(table.clinicianUserId, table.childId),
  index("guardian_record_access_token_idx").on(table.accessTokenHash),
]);

export type ReferralAuditEventRow = typeof referralAuditEvents.$inferSelect;
export type InsertReferralAuditEvent = typeof referralAuditEvents.$inferInsert;
