import { describe, expect, it } from "vitest";
import { findAppointmentConflicts, type PediatricAppointment } from "../lib/pediatric-care";

const appointment = (id: string, time: string, durationMinutes: number): PediatricAppointment => ({
  id,
  childId: id,
  service: "Pediatric consultation",
  date: "Tue, Aug 20",
  time,
  durationMinutes,
  reason: "Test visit",
  status: "confirmed",
});

describe("findAppointmentConflicts", () => {
  it("marks both appointments when their time ranges overlap", () => {
    const conflicts = findAppointmentConflicts([appointment("a", "10:00 AM", 30), appointment("b", "10:15 AM", 30)]);
    expect(conflicts.get("a")?.map((item) => item.id)).toEqual(["b"]);
    expect(conflicts.get("b")?.map((item) => item.id)).toEqual(["a"]);
  });

  it("does not flag back-to-back appointments as an overlap", () => {
    const conflicts = findAppointmentConflicts([appointment("a", "10:00 AM", 30), appointment("b", "10:30 AM", 30)]);
    expect(conflicts.size).toBe(0);
  });
});
