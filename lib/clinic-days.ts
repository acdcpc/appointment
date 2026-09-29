/**
 * Upcoming clinic days.
 *
 * The booking and reschedule screens used to hardcode a fixed list of dates
 * (for example "Tue, Aug 20"), which silently rotted: a parent could be offered
 * a day that had already passed and the clinic-hours check for a past day was
 * meaningless. This helper derives the real next open days from today.
 *
 * The display format stays `"Tue, Sep 17"` because the clinic-hours lookup
 * parses the weekday from the leading three-letter token.
 */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type UpcomingDayOptions = {
  /** Weekdays the clinic is closed, e.g. ["Fri"]. */
  closedWeekdays?: readonly string[];
  /** Explicit closed dates already in the same display format. */
  closedDates?: readonly string[];
  /** Override "today" (used by tests). */
  from?: Date;
  /** Safety bound on how far ahead to search. */
  maxDaysAhead?: number;
};

export function formatClinicDay(date: Date): string {
  return `${WEEKDAY_SHORT[date.getDay()]}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Parse a displayed day ("Tue, Sep 17") back into a real date, resolving the
 * year against the reference date. The display format carries no year: a day
 * more than a month in the past means next year (the calendar reads forward).
 */
export function parseClinicDay(day: string, reference = new Date()): Date | null {
  const match = /^[A-Z][a-z]{2}, ([A-Z][a-z]{2}) (\d{1,2})$/.exec(day.trim());
  if (!match) return null;
  const month = MONTH_SHORT.indexOf(match[1] as (typeof MONTH_SHORT)[number]);
  const dateNumber = Number(match[2]);
  if (month < 0 || dateNumber < 1 || dateNumber > 31) return null;
  const base = new Date(reference.getFullYear(), month, dateNumber);
  if (base.getMonth() !== month || base.getDate() !== dateNumber) return null;
  const cutoff = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 31);
  if (base < cutoff) base.setFullYear(base.getFullYear() + 1);
  return base;
}

export function upcomingClinicDays(count = 4, options: UpcomingDayOptions = {}): string[] {
  const { closedWeekdays = [], closedDates = [], from = new Date(), maxDaysAhead = 60 } = options;
  const closed = new Set(closedWeekdays);
  const closedDatesSet = new Set(closedDates);
  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let step = 0; step < maxDaysAhead && days.length < count; step += 1) {
    const label = formatClinicDay(cursor);
    if (!closed.has(WEEKDAY_SHORT[cursor.getDay()]) && !closedDatesSet.has(label)) days.push(label);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
