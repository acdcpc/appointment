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
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

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
