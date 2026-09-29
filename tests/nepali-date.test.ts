import { describe, expect, it } from "vitest";

import {
  adToBs, bsMonthDays, bsToAd, bsYearsForChildren, formatBsDate, isPlausibleChildBirthDate,
} from "../lib/nepali-date";

describe("Bikram Sambat (B.S.) dates", () => {
  it("matches the published Nepali New Year anchors (Baisakh 1)", () => {
    const newYear = (year: number) => bsToAd({ year, month: 0, day: 1 })!;
    expect(newYear(2077).getTime()).toBe(new Date(2020, 3, 13).getTime());
    expect(newYear(2078).getTime()).toBe(new Date(2021, 3, 14).getTime());
    expect(newYear(2079).getTime()).toBe(new Date(2022, 3, 14).getTime());
    expect(newYear(2080).getTime()).toBe(new Date(2023, 3, 14).getTime());
    expect(newYear(2081).getTime()).toBe(new Date(2024, 3, 13).getTime());
    expect(newYear(2082).getTime()).toBe(new Date(2025, 3, 14).getTime());
    expect(newYear(2083).getTime()).toBe(new Date(2026, 3, 14).getTime());
  });

  it("round-trips English ⇄ Nepali dates consistently", () => {
    const samples = [new Date(2022, 4, 14), new Date(2026, 8, 29), new Date(2018, 0, 1)];
    for (const sample of samples) {
      const back = bsToAd(adToBs(sample));
      expect(back?.getFullYear()).toBe(sample.getFullYear());
      expect(back?.getMonth()).toBe(sample.getMonth());
      expect(back?.getDate()).toBe(sample.getDate());
    }
  });

  it("rejects days that do not exist in the calendar instead of rolling over", () => {
    expect(bsToAd({ year: 2083, month: 1, day: 32 })).toBeNull();
    expect(bsToAd({ year: 1900, month: 0, day: 1 })).toBeNull();
    const lastDay = bsMonthDays(2083, 11)!;
    expect(bsToAd({ year: 2083, month: 11, day: lastDay })).not.toBeNull();
    expect(bsToAd({ year: 2083, month: 11, day: lastDay + 1 })).toBeNull();
  });

  it("formats a B.S. date the way it is spoken", () => {
    expect(formatBsDate({ year: 2083, month: 5, day: 13 })).toBe("13 Aswin 2083");
  });

  it("offers this B.S. year back twenty, most recent first", () => {
    const years = bsYearsForChildren(new Date(2026, 8, 29));
    expect(years[0]).toBe(2083);
    expect(years).toContain(2079);
    expect(years).toHaveLength(21);
  });

  it("treats future and implausibly old dates as not a child's birth date", () => {
    const today = new Date(2026, 8, 29);
    expect(isPlausibleChildBirthDate(new Date(2022, 4, 14), today)).toBe(true);
    expect(isPlausibleChildBirthDate(new Date(2030, 0, 1), today)).toBe(false);
    expect(isPlausibleChildBirthDate(new Date(1990, 0, 1), today)).toBe(false);
  });
});
