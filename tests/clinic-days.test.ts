import { describe, expect, it } from "vitest";
import { formatClinicDay, upcomingClinicDays } from "../lib/clinic-days";

describe("upcomingClinicDays", () => {
  const wed = new Date(2026, 8, 16); // Wed 16 Sep 2026

  it("starts from today and never returns a past or duplicate day", () => {
    const days = upcomingClinicDays(3, { from: wed });
    expect(days[0]).toBe("Wed, Sep 16");
    expect(days).toEqual(["Wed, Sep 16", "Thu, Sep 17", "Fri, Sep 18"]);
    expect(new Set(days).size).toBe(days.length);
  });

  it("skips weekdays the clinic is closed", () => {
    expect(upcomingClinicDays(2, { from: wed, closedWeekdays: ["Fri"] })).toEqual(["Wed, Sep 16", "Thu, Sep 17"]);
  });

  it("skips explicit holiday dates and rolls into the next month correctly", () => {
    const days = upcomingClinicDays(3, { from: new Date(2026, 8, 29), closedDates: ["Tue, Sep 29"] });
    expect(days).toEqual(["Wed, Sep 30", "Thu, Oct 1", "Fri, Oct 2"]);
    expect(days.some((day) => day.startsWith("Aug"))).toBe(false);
  });

  it("formats the leading weekday token the clinic-hours lookup depends on", () => {
    expect(formatClinicDay(new Date(2026, 8, 16)).slice(0, 3)).toBe("Wed");
  });
});
