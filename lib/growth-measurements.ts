/**
 * Growth measurement entry — weight, height and head circumference.
 *
 * The dashboard displayed growth values that no screen could create: the
 * measurements were a hardcoded demo list with no storage and no input form.
 * These helpers keep parsing, validation and display formatting in one place so
 * the same rules apply to the form, the stored row and the chart.
 */
/** Raw form input: numeric fields arrive as strings from the text inputs. */
export type GrowthMeasurementInput = {
  childId: string;
  measuredOn: string;
  weightKg?: string | number;
  heightCm?: string | number;
  headCircumferenceCm?: string | number;
  note?: string;
};

export type GrowthMeasurementDraft = {
  childId: string;
  measuredOn: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  note?: string;
};

export type GrowthMeasurementResult = { ok: true; ageMonths: number | null } | { ok: false; message: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Parses "14 May 2022", "2022-05-14" or "14/05/2022" into a local date. */
export function parseClinicDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const dayMonthYear = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(text);
  if (dayMonthYear) {
    const month = MONTHS.findIndex((entry) => entry.toLowerCase() === dayMonthYear[2].slice(0, 3).toLowerCase());
    if (month >= 0) return new Date(Number(dayMonthYear[3]), month, Number(dayMonthYear[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slashed) return new Date(Number(slashed[3]), Number(slashed[2]) - 1, Number(slashed[1]));
  return null;
}

export function formatClinicDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function todayClinicDate(): string {
  return formatClinicDate(new Date());
}

/** Whole months between the child's date of birth and the measurement date. */
export function ageInMonths(dateOfBirth: string, measuredOn: string): number | null {
  const birth = parseClinicDate(dateOfBirth);
  const measured = parseClinicDate(measuredOn);
  if (!birth || !measured || measured < birth) return null;
  return (measured.getFullYear() - birth.getFullYear()) * 12 + (measured.getMonth() - birth.getMonth()) - (measured.getDate() < birth.getDate() ? 1 : 0);
}

const toNumber = (value: string | number | undefined) => {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function normaliseDraft(draft: {
  childId: string;
  measuredOn: string;
  weightKg?: string | number;
  heightCm?: string | number;
  headCircumferenceCm?: string | number;
  note?: string;
}): GrowthMeasurementDraft {
  return {
    childId: draft.childId,
    measuredOn: draft.measuredOn.trim(),
    weightKg: toNumber(draft.weightKg),
    heightCm: toNumber(draft.heightCm),
    headCircumferenceCm: toNumber(draft.headCircumferenceCm),
    note: draft.note?.trim() || undefined,
  };
}

/**
 * Validation keeps obviously wrong entries out of a child's chart: at least one
 * value, a real date, and plausible ranges. Ranges are deliberately generous —
 * they catch typos (a 15.2 kg weight typed as 152) without policing clinical
 * judgement.
 */
export function validateGrowthMeasurement(draft: GrowthMeasurementDraft, today = new Date()): GrowthMeasurementResult {
  if (!draft.childId) return { ok: false, message: "Choose which child this measurement belongs to." };
  const measured = parseClinicDate(draft.measuredOn);
  if (!measured) return { ok: false, message: "Enter the measurement date as day, month and year (for example 20 Sep 2026)." };
  if (measured.getTime() > today.getTime() + 24 * 60 * 60 * 1000) return { ok: false, message: "The measurement date cannot be in the future." };
  const hasAny = draft.weightKg !== undefined || draft.heightCm !== undefined || draft.headCircumferenceCm !== undefined;
  if (!hasAny) return { ok: false, message: "Record at least one value: weight, height, or head circumference." };
  if (draft.weightKg !== undefined && (draft.weightKg <= 0 || draft.weightKg > 150)) return { ok: false, message: "Weight must be between 0 and 150 kg." };
  if (draft.heightCm !== undefined && (draft.heightCm <= 0 || draft.heightCm > 230)) return { ok: false, message: "Height must be between 0 and 230 cm." };
  if (draft.headCircumferenceCm !== undefined && (draft.headCircumferenceCm <= 0 || draft.headCircumferenceCm > 80)) return { ok: false, message: "Head circumference must be between 0 and 80 cm." };
  return { ok: true, ageMonths: null };
}

export function describeMeasurement(input: GrowthMeasurementDraft, ageMonths: number | null) {
  const parts: string[] = [];
  if (input.weightKg !== undefined) parts.push(`${input.weightKg} kg`);
  if (input.heightCm !== undefined) parts.push(`${input.heightCm} cm tall`);
  if (input.headCircumferenceCm !== undefined) parts.push(`head ${input.headCircumferenceCm} cm`);
  const age = ageMonths === null ? "" : ` at ${ageMonths} months`;
  return `${input.measuredOn}: ${parts.join(", ")}${age}`;
}
