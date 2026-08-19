import { describe, expect, it } from "vitest";
import { countReferralEmailResends, countUnresolvedReferralDeliveryFailures, MAX_REFERRAL_EMAIL_RESENDS, referralEmailAttemptTimestamp, type PatientAuditEvent } from "../lib/pediatric-care";

const event = (id: string, isResend: boolean): PatientAuditEvent => ({ id, childId: "child-1", type: "email-share", occurredOn: "Today", actorRole: "clinician", summary: "Referral email unavailable", message: "specialist@example.com", deliveryStatus: "unavailable", isResend, attemptedAt: "2026-08-19T00:00:00.000Z", serverRetryLimit: 3 });

describe("referral email resend safeguards", () => {
  it("counts only clinician-reviewed resend events for the same child and specialist", () => {
    const events = [event("initial", false), event("retry-1", true), event("retry-2", true), { ...event("other-child", true), childId: "child-2" }];
    expect(countReferralEmailResends(events, "child-1", "specialist@example.com")).toBe(2);
  });

  it("uses a fixed visible resend limit", () => {
    expect(MAX_REFERRAL_EMAIL_RESENDS).toBe(3);
  });

  it("counts only unresolved cancelled or unavailable referral delivery events for the active child", () => {
    const events = [event("unavailable", false), { ...event("cancelled", false), deliveryStatus: "cancelled" as const }, { ...event("sent", false), deliveryStatus: "sent" as const }, { ...event("other-child", false), childId: "child-2" }];
    expect(countUnresolvedReferralDeliveryFailures(events, "child-1")).toBe(2);
  });

  it("prefers an exact ISO attempt timestamp for email-share audit display", () => {
    expect(referralEmailAttemptTimestamp(event("timestamped", false))).toBe("2026-08-19T00:00:00.000Z");
  });
});
