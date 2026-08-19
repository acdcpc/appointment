import { describe, expect, it } from "vitest";
import { countReferralEmailResends, MAX_REFERRAL_EMAIL_RESENDS, type PatientAuditEvent } from "../lib/pediatric-care";

const event = (id: string, isResend: boolean): PatientAuditEvent => ({ id, childId: "child-1", type: "email-share", occurredOn: "Today", actorRole: "clinician", summary: "Referral email unavailable", message: "specialist@example.com", deliveryStatus: "unavailable", isResend });

describe("referral email resend safeguards", () => {
  it("counts only clinician-reviewed resend events for the same child and specialist", () => {
    const events = [event("initial", false), event("retry-1", true), event("retry-2", true), { ...event("other-child", true), childId: "child-2" }];
    expect(countReferralEmailResends(events, "child-1", "specialist@example.com")).toBe(2);
  });

  it("uses a fixed visible resend limit", () => {
    expect(MAX_REFERRAL_EMAIL_RESENDS).toBe(3);
  });
});
