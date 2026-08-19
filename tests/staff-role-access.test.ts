import { describe, expect, it } from "vitest";
import { auditEventTypesByRole } from "../lib/pediatric-care";

describe("staff audit access", () => {
  it("keeps receptionist access to appointment changes only", () => {
    expect(auditEventTypesByRole.receptionist).toEqual(["appointment-change"]);
  });

  it("allows clinician audit access to appointment changes, referrals, and email shares", () => {
    expect(auditEventTypesByRole.clinician).toEqual(["appointment-change", "referral-letter", "email-share"]);
  });
});
