import NepaliDate, { dateConfigMap } from "nepali-date-converter";

/**
 * Bikram Sambat (B.S.) dates, for parents who know the child's birth date in
 * the Nepali calendar rather than the English one.
 *
 * The conversion data (BS 2000–2090) comes from the `nepali-date-converter`
 * package — the same months-per-year table every published converter uses — and
 * is pinned by tests against the known Nepali New Year dates (Baisakh 1):
 * 2077 → 13 Apr 2020, 2078 → 14 Apr 2021, 2079 → 14 Apr 2022, 2080 → 14 Apr
 * 2023, 2081 → 13 Apr 2024, 2082 → 14 Apr 2025, 2083 → 14 Apr 2026.
 *
 * Month numbers here are ZERO-BASED in calendar order (Baisakh = 0, Chaitra =
 * 11), mirroring the converter's internal indexing.
 */

/** Month names exactly as the conversion table spells them, in calendar order. */
export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

export type BsDate = { year: number; month: number; day: number };

const BS_TABLE = dateConfigMap as Record<string, Record<string, number>>;

/** English date → Bikram Sambat. */
export function adToBs(date: Date): BsDate {
  const bs = new NepaliDate(date);
  return { year: bs.getYear(), month: bs.getMonth(), day: bs.getDate() };
}

/**
 * Bikram Sambat → English date, or null when the date does not exist.
 * The converter silently rolls overflow days into the next month (day 32
 * becomes the 1st of the following month), so validity is checked by
 * converting back and comparing — never by trusting the constructor.
 */
export function bsToAd(bs: BsDate): Date | null {
  try {
    const ad = new NepaliDate(bs.year, bs.month, bs.day).toJsDate();
    const back = adToBs(ad);
    if (back.year !== bs.year || back.month !== bs.month || back.day !== bs.day) return null;
    return ad;
  } catch {
    return null;
  }
}

/** "13 Aswin 2083" — the way a Nepali speaker writes the date. */
export function formatBsDate(bs: BsDate): string {
  return `${bs.day} ${BS_MONTH_NAMES[bs.month] ?? "?"} ${bs.year}`;
}

/** Days in a B.S. month (some have 29–32), or null outside the table. */
export function bsMonthDays(year: number, month: number): number | null {
  const months = BS_TABLE[String(year)];
  if (!months) return null;
  const days = months[BS_MONTH_NAMES[month]];
  return typeof days === "number" ? days : null;
}

/** The current B.S. year. */
export function currentBsYear(today = new Date()): number {
  return adToBs(today).year;
}

/** Selectable birth years: this B.S. year back by `span` (most recent first). */
export function bsYearsForChildren(today = new Date(), span = 20): number[] {
  const current = currentBsYear(today);
  return Array.from({ length: span + 1 }, (_, index) => current - index);
}

/**
 * A birth date is plausible for this clinic when it is not in the future and
 * not more than 22 years ago (child & adolescent practice).
 */
export function isPlausibleChildBirthDate(date: Date, today = new Date()): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const earliest = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate());
  const latest = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date >= earliest && date <= latest;
}
