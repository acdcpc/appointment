import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import * as referralDb from "./db";

function parseUtcDeliveryTime(value: string) { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the delivery time as HH:MM in UTC." }); const hours = Number(match[1]); const minutes = Number(match[2]); if (hours > 23 || minutes > 59) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid UTC delivery time." }); return { minuteOfDay: hours * 60 + minutes, cron: `0 ${minutes} ${hours} 1 * *` }; }
function formatUtcDeliveryTime(minuteOfDay: number) { return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`; }
function requireWeeklyCapacityRange(weekStartDate: string, weekEndDate: string) { const start = new Date(`${weekStartDate}T00:00:00.000Z`); const end = new Date(`${weekEndDate}T00:00:00.000Z`); if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || end.getTime() - start.getTime() > 6 * 86400000) throw new TRPCError({ code: "BAD_REQUEST", message: "A weekly capacity summary must use one inclusive seven-day period." }); }

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  clinicPublic: router({
    settings: publicProcedure.query(async () => {
      const settings = await referralDb.getClinicPublicSettings();
      return { clinicName: settings.clinicName, address: settings.address, mapUrl: settings.mapUrl, whatsappNumber: settings.whatsappNumber, whatsappResponseNotice: settings.whatsappResponseNotice, isProvisional: settings.isProvisional, updatedAt: settings.updatedAt.toISOString() };
    }),
  }),
  reportAcknowledgement: router({
    status: publicProcedure.input(z.object({ token: z.string().length(32) })).query(async ({ input }) => {
      const share = await referralDb.getReportAcknowledgement(input.token);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "This acknowledgement link is invalid or unavailable." });
      return { scope: share.scope, createdAt: share.createdAt.toISOString(), acknowledgedAt: share.acknowledgedAt?.toISOString() ?? null };
    }),
    confirm: publicProcedure.input(z.object({ token: z.string().length(32), acknowledgementText: z.string().trim().min(5).max(500) })).mutation(async ({ input }) => {
      const acknowledged = await referralDb.acknowledgeReport(input.token, input.acknowledgementText);
      return { acknowledged };
    }),
  }),
  clinician: router({
    access: protectedProcedure.query(async ({ ctx }) => {
      const access = await referralDb.getAuthenticatedStaffAccess(ctx.user);
      return access.allowed ? { allowed: true, clinicianName: ctx.user.name ?? "Associate Professor Dr. Anil Ojha", staffRole: access.staffRole, isOwner: access.isOwner } : { allowed: false, reason: access.reason };
    }),
    clinicPublicSettings: adminProcedure.query(async () => {
      const settings = await referralDb.getClinicPublicSettings();
      return { clinicName: settings.clinicName, address: settings.address, mapUrl: settings.mapUrl, whatsappNumber: settings.whatsappNumber, whatsappResponseNotice: settings.whatsappResponseNotice, isProvisional: settings.isProvisional };
    }),
    saveClinicPublicSettings: adminProcedure.input(z.object({ address: z.string().trim().min(5).max(1000), mapUrl: z.string().url().max(2048), whatsappNumber: z.string().regex(/^\d{10,15}$/, "Enter the WhatsApp number with country code and digits only."), whatsappResponseNotice: z.string().trim().min(12).max(500) })).mutation(async ({ ctx, input }) => {
      const settings = await referralDb.saveClinicPublicSettings({ ...input, updatedBy: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
      return { address: settings.address, mapUrl: settings.mapUrl, whatsappNumber: settings.whatsappNumber, whatsappResponseNotice: settings.whatsappResponseNotice, isProvisional: settings.isProvisional };
    }),
    guardianVerificationSettings: adminProcedure.query(async () => {
      const settings = await referralDb.getClinicPublicSettings();
      return { guardianReverificationDays: settings.guardianReverificationDays };
    }),
    saveGuardianVerificationSettings: adminProcedure.input(z.object({ guardianReverificationDays: z.number().int().min(30).max(730) })).mutation(async ({ ctx, input }) => {
      const settings = await referralDb.saveGuardianReverificationDays(input.guardianReverificationDays, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { guardianReverificationDays: settings.guardianReverificationDays };
    }),
    listGuardianContacts: adminProcedure.input(z.object({ childId: z.string().min(1).max(120).optional() }).optional()).query(async ({ ctx, input }) => {
      const contacts = await referralDb.listGuardianContacts(ctx.user.id, input?.childId);
      return contacts.map((contact) => ({ ...contact, confirmedAt: contact.confirmedAt?.toISOString() ?? null, createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString() }));
    }),
    createGuardianContact: adminProcedure.input(z.object({ childId: z.string().min(1).max(120), fullName: z.string().trim().min(2).max(255), relationship: z.string().trim().min(2).max(120), email: z.string().email().max(320) })).mutation(async ({ ctx, input }) => {
      const contact = await referralDb.createGuardianContact(ctx.user.id, input);
      return { ...contact, confirmedAt: contact.confirmedAt?.toISOString() ?? null, createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString() };
    }),
    confirmGuardianContact: adminProcedure.input(z.object({ contactId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const contact = await referralDb.confirmGuardianContact(ctx.user.id, input.contactId, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { ...contact, confirmedAt: contact.confirmedAt?.toISOString() ?? null };
    }),
    createPatientReportShare: adminProcedure.input(z.object({ childId: z.string().min(1).max(120), guardianContactId: z.number().int().positive(), scope: z.enum(["record-pdf", "timeline-report"]) })).mutation(async ({ ctx, input }) => {
      const share = await referralDb.createPatientReportShare(ctx.user.id, input);
      return { id: share.id, acknowledgementToken: share.acknowledgementToken, createdAt: share.createdAt.toISOString() };
    }),
    updatePatientReportShareStatus: adminProcedure.input(z.object({ shareId: z.number().int().positive(), deliveryStatus: z.enum(["draft-opened", "sent", "saved", "cancelled", "unavailable"]) })).mutation(async ({ ctx, input }) => {
      await referralDb.updatePatientReportShareStatus(ctx.user.id, input.shareId, input.deliveryStatus);
      return { saved: true };
    }),
    listPatientReportShares: adminProcedure.input(z.object({ childId: z.string().min(1).max(120) })).query(async ({ ctx, input }) => {
      const shares = await referralDb.listPatientReportShares(ctx.user.id, input.childId);
      return shares.map((share) => ({ ...share, createdAt: share.createdAt.toISOString(), acknowledgedAt: share.acknowledgedAt?.toISOString() ?? null }));
    }),
    listReferralAuditEvents: adminProcedure.query(async ({ ctx }) => {
      const events = await referralDb.listReferralAuditEvents(ctx.user.id);
      return events.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString(), alertSentAt: event.alertSentAt?.toISOString() ?? null, archivedAt: event.archivedAt?.toISOString() ?? null }));
    }),
    getDurableWaitlistState: adminProcedure.query(async ({ ctx }) => {
      const state = await referralDb.getDurableWaitlistState(ctx.user.id);
      return { requests: state.requests.map((item) => ({ ...item, requestedAt: item.requestedAt.toISOString(), offeredAt: item.offeredAt?.toISOString() ?? null, offerExpiresAt: item.offerExpiresAt?.toISOString() ?? null, respondedAt: item.respondedAt?.toISOString() ?? null, clinicianAcknowledgedAt: item.clinicianAcknowledgedAt?.toISOString() ?? null, convertedAt: item.convertedAt?.toISOString() ?? null, assignedAt: item.assignedAt?.toISOString() ?? null })), capacitySnapshots: state.capacitySnapshots.map((item) => ({ ...item, effectiveAt: item.effectiveAt.toISOString() })), printAudits: state.printAudits.map((item) => ({ ...item, initiatedAt: item.initiatedAt.toISOString() })) };
    }),
    saveDurableWaitlistState: adminProcedure.input(z.object({ requests: z.array(z.object({ requestId: z.string().min(1).max(120), appointmentId: z.string().min(1).max(120), childId: z.string().min(1).max(120), requestedAt: z.date(), status: z.enum(["pending", "reviewed", "declined", "withdrawn", "offered", "responded", "expired", "converted"]), note: z.string().max(2000).optional(), offerDate: z.string().max(40).optional(), offerTime: z.string().max(20).optional(), offeredAt: z.date().optional(), offerExpiresAt: z.date().optional(), parentResponse: z.enum(["accepted", "declined"]).optional(), respondedAt: z.date().optional(), clinicianAcknowledgedAt: z.date().optional(), convertedAt: z.date().optional(), convertedBy: z.string().max(255).optional(), assignedStaffId: z.string().max(120).optional(), assignedAt: z.date().optional() })).max(500), events: z.array(z.object({ eventId: z.string().min(1).max(120), requestId: z.string().min(1).max(120), eventType: z.enum(["requested", "reviewed", "withdrawn", "offer-created", "parent-response", "expired", "converted", "assignment-changed", "response-acknowledged"]), actor: z.enum(["clinician", "guardian", "system"]), occurredAt: z.date(), status: z.enum(["pending", "reviewed", "declined", "withdrawn", "offered", "responded", "expired", "converted"]) })).max(1000), snapshots: z.array(z.object({ snapshotId: z.string().min(1).max(120), staffId: z.string().min(1).max(120), staffName: z.string().min(1).max(255), triageCapacity: z.number().int().min(1).max(30), effectiveAt: z.date() })).max(500) })).mutation(async ({ ctx, input }) => {
      const state = await referralDb.saveDurableWaitlistState(ctx.user.id, input.requests, input.events, input.snapshots);
      return { saved: true, requests: state.requests.length, capacitySnapshots: state.capacitySnapshots.length };
    }),
    recordInternalFollowUpPrintAudit: adminProcedure.input(z.object({ auditId: z.string().min(1).max(120), itemCount: z.number().int().min(0).max(5000), initiatedAt: z.date() })).mutation(async ({ ctx, input }) => {
      await referralDb.recordInternalFollowUpPrintAudit(ctx.user.id, { ...input, actorName: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
      return { recorded: true, meaning: "Print dialog opened; this is not proof of a physical print, delivery, or viewing." };
    }),
    listInternalFollowUpPrintAudits: adminProcedure.input(z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), actorName: z.string().trim().min(1).max(255).optional() }).optional()).query(async ({ ctx, input }) => {
      const start = input?.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined; const end = input?.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
      if (start && end && start > end) throw new TRPCError({ code: "BAD_REQUEST", message: "The print-audit start date must be on or before the end date." });
      const audits = await referralDb.listInternalFollowUpPrintAudits(ctx.user.id, { start, end, actorName: input?.actorName });
      return audits.map((item) => ({ id: item.id, auditId: item.auditId, documentScope: item.documentScope, itemCount: item.itemCount, actorName: item.actorName, initiatedAt: item.initiatedAt.toISOString() }));
    }),
    listPrintAuditFilterPresets: adminProcedure.query(async ({ ctx }) => {
      const presets = await referralDb.listPrintAuditFilterPresets(ctx.user.id);
      return presets.map((preset) => ({ ...preset, createdAt: preset.createdAt.toISOString(), updatedAt: preset.updatedAt.toISOString() }));
    }),
    savePrintAuditFilterPreset: adminProcedure.input(z.object({ presetId: z.string().min(1).max(120), name: z.string().trim().min(1).max(80), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), actorName: z.string().trim().min(1).max(255).optional(), displayOrder: z.number().int().min(0).max(99).optional() })).mutation(async ({ ctx, input }) => {
      if (input.startDate > input.endDate) throw new TRPCError({ code: "BAD_REQUEST", message: "A saved preset must start on or before its end date." });
      await referralDb.savePrintAuditFilterPreset(ctx.user.id, input);
      return { saved: true };
    }),
    deletePrintAuditFilterPreset: adminProcedure.input(z.object({ presetId: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => {
      await referralDb.deletePrintAuditFilterPreset(ctx.user.id, input.presetId);
      return { deleted: true };
    }),
    reorderPrintAuditFilterPresets: adminProcedure.input(z.object({ presetIds: z.array(z.string().min(1).max(120)).min(1).max(20) })).mutation(async ({ ctx, input }) => {
      await referralDb.reorderPrintAuditFilterPresets(ctx.user.id, input.presetIds);
      return { reordered: true };
    }),
    getCapacityAlertVisibilitySettings: adminProcedure.query(async ({ ctx }) => {
      const settings = await referralDb.getCapacityAlertVisibilitySettings(ctx.user.id);
      const updatedAt = "updatedAt" in settings && settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : null;
      const updatedBy = "updatedBy" in settings && typeof settings.updatedBy === "string" ? settings.updatedBy : null;
      return { dailyDashboardSummaryEnabled: settings.dailyDashboardSummaryEnabled, receptionistVisible: settings.receptionistVisible, nurseVisible: settings.nurseVisible, clinicianVisible: settings.clinicianVisible, updatedBy, updatedAt, enforcement: "Capacity-alert records remain restricted to authenticated clinician administrators until staff accounts have server-enforced role claims." };
    }),
    saveCapacityAlertVisibilitySettings: adminProcedure.input(z.object({ dailyDashboardSummaryEnabled: z.boolean(), receptionistVisible: z.boolean(), nurseVisible: z.boolean(), clinicianVisible: z.literal(true) })).mutation(async ({ ctx, input }) => {
      await referralDb.saveCapacityAlertVisibilitySettings(ctx.user.id, input, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { saved: true };
    }),
    listClinicStaffAccounts: adminProcedure.query(async ({ ctx }) => {
      const accounts = await referralDb.listClinicStaffAccounts(ctx.user.id);
      return accounts.map((account) => ({ ...account, invitedAt: account.invitedAt.toISOString(), expiresAt: account.expiresAt?.toISOString() ?? null, resendPreparedAt: account.resendPreparedAt?.toISOString() ?? null, activatedAt: account.activatedAt?.toISOString() ?? null, revokedAt: account.revokedAt?.toISOString() ?? null, updatedAt: account.updatedAt.toISOString() }));
    }),
    createClinicStaffInvitation: adminProcedure.input(z.object({ staffAccountId: z.string().min(1).max(120), email: z.string().email().max(320), staffRole: z.enum(["receptionist", "nurse", "clinician"]) })).mutation(async ({ ctx, input }) => {
      await referralDb.createClinicStaffInvitation(ctx.user.id, { ...input, invitedBy: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
      return { invited: true };
    }),
    revokeClinicStaffAccount: adminProcedure.input(z.object({ staffAccountId: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => {
      await referralDb.revokeClinicStaffAccount(ctx.user.id, input.staffAccountId, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { revoked: true };
    }),
    getStaffInvitationSettings: adminProcedure.query(async ({ ctx }) => {
      const settings = await referralDb.getStaffInvitationSettings(ctx.user.id);
      return { expiryDays: settings.expiryDays, updatedBy: settings.updatedBy, updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : null, resendPreparationLimit: referralDb.MAX_STAFF_INVITATION_RESENDS };
    }),
    saveStaffInvitationSettings: adminProcedure.input(z.object({ expiryDays: z.number().int().min(1).max(30) })).mutation(async ({ ctx, input }) => {
      await referralDb.saveStaffInvitationSettings(ctx.user.id, input.expiryDays, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { saved: true };
    }),
    prepareStaffInvitationResend: adminProcedure.input(z.object({ staffAccountId: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => {
      await referralDb.prepareStaffInvitationResend(ctx.user.id, input.staffAccountId, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { prepared: true, meaning: "Invitation refresh prepared; no email was sent automatically." };
    }),
    listStaffAccountActivity: adminProcedure.query(async ({ ctx }) => {
      const activity = await referralDb.listStaffAccountActivity(ctx.user.id);
      return activity.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString(), createdAt: item.createdAt.toISOString() }));
    }),
    recordCapacityTargetChangeAlert: adminProcedure.input(z.object({ alertId: z.string().min(1).max(120), staffId: z.string().min(1).max(120), staffName: z.string().trim().min(1).max(255), previousTarget: z.number().int().min(1).max(30), newTarget: z.number().int().min(1).max(30), changedAt: z.date() })).mutation(async ({ ctx, input }) => {
      if (input.previousTarget === input.newTarget) throw new TRPCError({ code: "BAD_REQUEST", message: "A capacity alert requires a changed target." });
      await referralDb.recordCapacityTargetChangeAlert(ctx.user.id, { ...input, changedBy: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
      return { recorded: true };
    }),
    listCapacityTargetChangeAlerts: protectedProcedure.query(async ({ ctx }) => {
      const access = await referralDb.getCapacityAlertAccessForUser(ctx.user); const clinicianUserId = "clinicianUserId" in access ? access.clinicianUserId : undefined; const reason = "reason" in access ? access.reason : undefined;
      if (!access.allowed || typeof clinicianUserId !== "number") throw new TRPCError({ code: "FORBIDDEN", message: reason ?? "Capacity-alert access is not available for this staff account." });
      const alerts = await referralDb.listCapacityTargetChangeAlerts(clinicianUserId);
      return alerts.map((item) => ({ ...item, changedAt: item.changedAt.toISOString(), acknowledgedAt: item.acknowledgedAt?.toISOString() ?? null }));
    }),
    acknowledgeCapacityTargetChangeAlert: adminProcedure.input(z.object({ alertId: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => {
      await referralDb.acknowledgeCapacityTargetChangeAlert(ctx.user.id, input.alertId, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { acknowledged: true };
    }),
    getWeeklyCapacitySummary: adminProcedure.input(z.object({ weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), weekEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(async ({ ctx, input }) => {
      requireWeeklyCapacityRange(input.weekStartDate, input.weekEndDate);
      const summary = await referralDb.getWeeklyCapacitySummary(ctx.user.id, input.weekStartDate, input.weekEndDate);
      return { rows: summary.rows.map((row) => ({ ...row, targetEffectiveAt: row.targetEffectiveAt.toISOString() })), unacknowledgedAlertCount: summary.unacknowledgedAlertCount };
    }),
    recordWeeklyCapacitySummaryExport: adminProcedure.input(z.object({ exportId: z.string().min(1).max(120), exportFormat: z.enum(["csv", "pdf"]), weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), weekEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reviewedAt: z.date() })).mutation(async ({ ctx, input }) => {
      requireWeeklyCapacityRange(input.weekStartDate, input.weekEndDate);
      await referralDb.recordWeeklyCapacitySummaryExport(ctx.user.id, { ...input, reviewedBy: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
      return { recorded: true };
    }),
    getAuditRetentionPolicy: adminProcedure.query(async ({ ctx }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      return policy ? { retentionDays: policy.retentionDays, updatedBy: policy.updatedBy, updatedAt: policy.updatedAt.toISOString(), automaticArchiveEnabled: policy.automaticArchiveEnabled, archiveScheduleConfigured: Boolean(policy.archiveScheduleCronTaskUid), lastArchiveRunAt: policy.lastArchiveRunAt?.toISOString() ?? null, lastArchiveCount: policy.lastArchiveCount, monthlySummaryEnabled: policy.monthlySummaryEnabled, monthlySummaryConfigured: Boolean(policy.monthlySummaryCronTaskUid), monthlySummaryDeliveryTime: formatUtcDeliveryTime(policy.monthlySummaryDeliveryMinute), lastMonthlySummaryAt: policy.lastMonthlySummaryAt?.toISOString() ?? null } : { retentionDays: null, updatedBy: null, updatedAt: null, automaticArchiveEnabled: false, archiveScheduleConfigured: false, lastArchiveRunAt: null, lastArchiveCount: 0, monthlySummaryEnabled: false, monthlySummaryConfigured: false, monthlySummaryDeliveryTime: "09:00", lastMonthlySummaryAt: null };
    }),
    saveAuditRetentionPolicy: adminProcedure.input(z.object({ retentionDays: z.number().int().min(30).max(referralDb.MAX_AUDIT_RETENTION_DAYS) })).mutation(async ({ ctx, input }) => {
      const policy = await referralDb.saveAuditRetentionPolicy(ctx.user.id, input.retentionDays, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { retentionDays: policy?.retentionDays ?? input.retentionDays, updatedBy: policy?.updatedBy ?? ctx.user.name ?? "Associate Professor Dr. Anil Ojha" };
    }),
    previewAuditArchive: adminProcedure.query(async ({ ctx }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy) return { configured: false, eligibleCount: 0, retentionDays: null, cutoff: null };
      const preview = await referralDb.getAuditArchivePreview(ctx.user.id, policy.retentionDays);
      return { configured: true, ...preview };
    }),
    archiveExpiredAuditEvents: adminProcedure.input(z.object({ archiveReason: z.string().trim().min(5).max(500) })).mutation(async ({ ctx, input }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set and confirm the clinic’s retention period before archiving audit records." });
      return referralDb.archiveExpiredAuditEvents(ctx.user.id, policy.retentionDays, ctx.user.name ?? "Associate Professor Dr. Anil Ojha", input.archiveReason);
    }),
    getAuditRetentionDashboard: adminProcedure.input(z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional()).query(async ({ ctx, input }) => {
      const start = input?.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined; const end = input?.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
      if (start && end && start > end) throw new TRPCError({ code: "BAD_REQUEST", message: "The archive report start date must be on or before the end date." });
      const dashboard = await referralDb.getAuditRetentionDashboard(ctx.user.id, { start, end });
      return { ...dashboard, recentRuns: dashboard.recentRuns.map((run) => ({ ...run, executedAt: run.executedAt.toISOString() })), policyChanges: dashboard.policyChanges.map((change) => ({ ...change, changedAt: change.changedAt.toISOString() })) };
    }),
    runArchiveSummaryNow: adminProcedure.mutation(async ({ ctx }) => referralDb.getOnDemandArchiveSummary(ctx.user.id)),
    configureAuditArchiveSchedule: adminProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the clinic app before enabling automatic audit archival." });
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set and confirm the clinic retention period before enabling automatic archival." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (policy.archiveScheduleCronTaskUid) { await updateHeartbeatJob(policy.archiveScheduleCronTaskUid, { enable: true }, session); await referralDb.setAuditArchiveScheduleEnabled(ctx.user.id, true, ctx.user.name ?? "Associate Professor Dr. Anil Ojha"); return { configured: true, enabled: true, nextExecutionAt: null }; }
      const job = await createHeartbeatJob({ name: `audit-retention-archive-${ctx.user.id}`, cron: "0 0 2 * * *", path: "/api/scheduled/audit-retention-archive", description: "Daily non-destructive archive of audit records beyond the clinician-configured retention period." }, session);
      await referralDb.saveAuditArchiveSchedule(ctx.user.id, job.taskUid, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { configured: true, enabled: true, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    setAuditArchiveScheduleEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy?.archiveScheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enable automatic archival once before pausing or resuming it." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      await updateHeartbeatJob(policy.archiveScheduleCronTaskUid, { enable: input.enabled }, session);
      await referralDb.setAuditArchiveScheduleEnabled(ctx.user.id, input.enabled, ctx.user.name ?? "Associate Professor Dr. Anil Ojha");
      return { enabled: input.enabled };
    }),
    configureMonthlyArchiveSummary: adminProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the clinic app before enabling monthly archive summaries." });
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set and confirm the clinic retention period before enabling monthly summaries." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (policy.monthlySummaryCronTaskUid) { await updateHeartbeatJob(policy.monthlySummaryCronTaskUid, { enable: true }, session); await referralDb.setMonthlyArchiveSummaryEnabled(ctx.user.id, true); return { configured: true, enabled: true, nextExecutionAt: null }; }
      const time = formatUtcDeliveryTime(policy.monthlySummaryDeliveryMinute); const cron = parseUtcDeliveryTime(time).cron;
      const job = await createHeartbeatJob({ name: `monthly-archive-summary-${ctx.user.id}`, cron, path: "/api/scheduled/monthly-archive-summary", description: "Monthly clinician summary of aggregate archive activity and audit storage." }, session);
      await referralDb.saveMonthlyArchiveSummarySchedule(ctx.user.id, job.taskUid);
      return { configured: true, enabled: true, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    setMonthlyArchiveSummaryEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy?.monthlySummaryCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enable the monthly archive summary once before pausing or resuming it." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      await updateHeartbeatJob(policy.monthlySummaryCronTaskUid, { enable: input.enabled }, session);
      await referralDb.setMonthlyArchiveSummaryEnabled(ctx.user.id, input.enabled);
      return { enabled: input.enabled };
    }),
    saveMonthlyArchiveSummaryDeliveryTime: adminProcedure.input(z.object({ deliveryTime: z.string() })).mutation(async ({ ctx, input }) => {
      const { minuteOfDay, cron } = parseUtcDeliveryTime(input.deliveryTime); const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id);
      if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set the clinic retention period before saving a monthly summary time." });
      if (policy.monthlySummaryCronTaskUid) { const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; await updateHeartbeatJob(policy.monthlySummaryCronTaskUid, { cron }, session); }
      await referralDb.setMonthlyArchiveSummaryDeliveryMinute(ctx.user.id, minuteOfDay);
      return { deliveryTime: formatUtcDeliveryTime(minuteOfDay) };
    }),
    configureQuarterlyRetentionReview: adminProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the clinic app before enabling quarterly retention reviews." });
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id); if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set the clinic retention period before enabling quarterly reviews." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (policy.quarterlyReviewCronTaskUid) { await updateHeartbeatJob(policy.quarterlyReviewCronTaskUid, { enable: true }, session); await referralDb.setQuarterlyRetentionReviewEnabled(ctx.user.id, true); return { enabled: true }; }
      const job = await createHeartbeatJob({ name: `quarterly-retention-review-${ctx.user.id}`, cron: "0 0 9 1 1,4,7,10 *", path: "/api/scheduled/quarterly-retention-review", description: "Quarterly clinician reminder to review aggregate audit retention storage." }, session); await referralDb.saveQuarterlyRetentionReviewSchedule(ctx.user.id, job.taskUid); return { enabled: true };
    }),
    setQuarterlyRetentionReviewEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const policy = await referralDb.getAuditRetentionPolicy(ctx.user.id); if (!policy?.quarterlyReviewCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enable quarterly retention review once before pausing or resuming it." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; await updateHeartbeatJob(policy.quarterlyReviewCronTaskUid, { enable: input.enabled }, session); await referralDb.setQuarterlyRetentionReviewEnabled(ctx.user.id, input.enabled); return { enabled: input.enabled };
    }),
    persistReferralAuditEvent: adminProcedure
      .input(z.object({ clientEventId: z.string().min(1).max(80), childId: z.string().min(1).max(120), type: z.enum(["appointment-change", "referral-letter", "email-share", "patient-communication"]), occurredAt: z.string().datetime(), summary: z.string().min(1).max(4000), message: z.string().max(4000).optional(), deliveryStatus: z.enum(["draft-opened", "sent", "saved", "cancelled", "unavailable"]).optional(), isResend: z.boolean().optional(), retryLimit: z.number().int().min(1).max(10).optional(), retryAttempts: z.number().int().min(0).max(10).optional() }))
      .mutation(async ({ ctx, input }) => {
        await referralDb.persistReferralAuditEvent(ctx.user.id, { ...input, occurredAt: new Date(input.occurredAt), actorName: ctx.user.name ?? "Associate Professor Dr. Anil Ojha" });
        return { saved: true };
      }),
    requestReferralEmailRetry: adminProcedure
      .input(z.object({ childId: z.string().min(1).max(120), email: z.string().email().max(320) }))
      .mutation(({ ctx, input }) => referralDb.reserveReferralEmailRetry(ctx.user.id, input.childId, input.email)),
    configureReferralDeliveryMonitor: adminProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the clinic app before enabling automatic referral delivery monitoring." });
      const monitor = await referralDb.getReferralDeliveryMonitorConfig();
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (monitor.scheduleCronTaskUid) { await updateHeartbeatJob(monitor.scheduleCronTaskUid, { enable: true }, session); await referralDb.setReferralDeliveryMonitorEnabled(true); return { configured: true, enabled: true, thresholdHours: monitor.thresholdHours, nextExecutionAt: null }; }
      const job = await createHeartbeatJob({ name: "referral-delivery-monitor", cron: "0 0 * * * *", path: "/api/scheduled/referral-delivery-monitor", description: "Hourly check for referral deliveries unresolved for at least 24 hours." }, session);
      await referralDb.saveReferralDeliveryMonitorSchedule(job.taskUid);
      return { configured: true, enabled: true, thresholdHours: monitor.thresholdHours, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    getReferralDeliveryMonitorStatus: adminProcedure.query(async () => {
      const monitor = await referralDb.getReferralDeliveryMonitorConfig();
      return { configured: Boolean(monitor.scheduleCronTaskUid), enabled: monitor.scheduleEnabled, thresholdHours: monitor.thresholdHours, lastRunAt: monitor.lastRunAt?.toISOString() ?? null };
    }),
    setReferralDeliveryMonitorEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const monitor = await referralDb.getReferralDeliveryMonitorConfig();
      if (!monitor.scheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enable the referral monitor once before pausing or resuming it." });
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      await updateHeartbeatJob(monitor.scheduleCronTaskUid, { enable: input.enabled }, session);
      await referralDb.setReferralDeliveryMonitorEnabled(input.enabled);
      return { enabled: input.enabled };
    }),
    draftFromConsultation: adminProcedure
      .input(z.object({ consultationNote: z.string().trim().min(20).max(6000) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 700,
          messages: [
            {
              role: "system",
              content: "You are a clinician documentation assistant. Summarize only the supplied consultation note. Never diagnose, calculate doses, recommend medicines, infer contraindications, or invent treatment. Extract a medication name and directions only when they are explicitly written in the note. Return a draft that requires clinician review before any record is saved.",
            },
            { role: "user", content: `Consultation note:\n${input.consultationNote}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "clinician_review_draft",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  medication: { type: "string" },
                  instructions: { type: "string" },
                  reviewFlags: { type: "array", items: { type: "string" } },
                },
                required: ["summary", "medication", "instructions", "reviewFlags"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message.content;
        if (typeof content !== "string") throw new Error("The AI draft response was empty.");
        const draft = JSON.parse(content) as { summary: string; medication: string; instructions: string; reviewFlags: string[] };
        return {
          ...draft,
          reviewFlags: ["AI-assisted draft only — clinician review and approval are required.", ...draft.reviewFlags],
        };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
