import { describe, expect, it } from "vitest";
import { buildConfidentialAppointmentCsv } from "../lib/confidential-appointment-csv-format";

describe("confidential appointment CSV", () => {
  it("labels the export as confidential and records the reviewed date range", () => {
    const csv = buildConfidentialAppointmentCsv([], "2026-08-01", "2026-08-31");
    expect(csv).toContain("CONFIDENTIAL");
    expect(csv).toContain("2026-08-01 to 2026-08-31");
    expect(csv).toContain("does not prove delivery, viewing, secure storage, or disposal");
    expect(csv).toContain("Clinic export-retention policy: 30 day(s)");
  });
  it("escapes sensitive appointment fields without placing patient names in the header", () => {
    const csv = buildConfidentialAppointmentCsv([{ appointmentId: "apt-1", clinicianUserId: 7, childId: "child-opaque", service: "Development review", appointmentDate: "2026-08-20", appointmentTime: "17:30", durationMinutes: 30, reason: "Parent said \"follow up\"", status: "confirmed", changeMessage: null, guardianConfirmedAt: null, rescheduledAt: null, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" }], "2026-08-01", "2026-08-31");
    expect(csv).toContain('"Parent said ""follow up"""');
    expect(csv).toContain("child_reference");
    expect(csv).not.toContain("child_name");
  });
});
