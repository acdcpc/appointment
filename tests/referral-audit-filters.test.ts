import { describe, expect, it } from "vitest";

import { filterAuditEventsForExport, type PatientAuditEvent } from "../lib/pediatric-care";

const event = (id: string, type: PatientAuditEvent["type"], recordedAt: string, isResend = false): PatientAuditEvent => ({ id, childId: "child-1", type, occurredOn: "Today", recordedAt, actorRole: "clinician", actorName: "Associate Professor Dr. Anil Ojha", summary: type, isResend, attemptedAt: type === "email-share" ? recordedAt : undefined });

describe("clinician audit export filters", () => {
  const events = [event("before", "appointment-change", "2026-08-17T23:59:59.000Z"), event("start", "referral-letter", "2026-08-18T00:00:00.000Z"), event("resend", "email-share", "2026-08-18T12:00:00.000Z", true), event("end", "email-share", "2026-08-19T23:59:59.999Z"), { ...event("other", "email-share", "2026-08-18T12:00:00.000Z"), childId: "child-2" }];

  it("applies an inclusive date range to the active child audit export", () => {
    expect(filterAuditEventsForExport(events, "child-1", { startDate: "2026-08-18", endDate: "2026-08-19" }).map((item) => item.id)).toEqual(["start", "resend", "end"]);
  });

  it("filters a clinician export to staff-attributed resend actions", () => {
    expect(filterAuditEventsForExport(events, "child-1", { staffAction: "resend" }).map((item) => item.id)).toEqual(["resend"]);
  });
});
