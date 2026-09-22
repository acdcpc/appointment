/**
 * Visit-to-visit growth comparison (clinician-facing, English).
 *
 * The point of repeated measurements is the change, not the single reading: a
 * child can sit inside the normal range and still be falling across centiles,
 * which is the finding that actually needs action. This module compares the
 * current visit with the previous one for the same child and reports, per metric,
 * the absolute change, the rate, and the change in WHO z-score.
 *
 * Flags follow the WHO / IMCI convention that a fall (or rise) of about 0.67 z —
 * one centile-band width — is a meaningful shift rather than measurement noise.
 */
import { parseClinicDate } from "./growth-measurements";
import { interpretMetric, type MetricKey, type Sex } from "./growth-interpretation";

/** One centile-band width in z units, the threshold for a meaningful shift. */
export const MEANINGFUL_Z_SHIFT = 0.67;

const DAYS_PER_MONTH = 30.4375;

export type TrendVisit = {
  occurredOn: string;
  ageMonths: number;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
};

export type TrendMetric = {
  metric: MetricKey;
  label: string;
  unit: string;
  from?: number;
  to?: number;
  change?: number;
  /** Change per month over the interval between the two visits. */
  ratePerMonth?: number;
  rateUnit?: string;
  fromZ?: number;
  toZ?: number;
  deltaZ?: number;
  fromPercentile?: number;
  toPercentile?: number;
  statement: string;
  direction: "worsening" | "improving" | "steady" | "unavailable";
};

export type GrowthTrend = {
  previousOn: string;
  currentOn: string;
  days: number;
  months: number;
  metrics: TrendMetric[];
  flags: string[];
  summary: string;
};

const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;

function bmiOf(visit: TrendVisit): number | undefined {
  if (visit.weightKg === undefined || visit.heightCm === undefined || visit.heightCm <= 0) return undefined;
  return round(visit.weightKg / (visit.heightCm / 100) ** 2, 1);
}

const METRIC_META: Record<MetricKey, { label: string; unit: string }> = {
  weight: { label: "Weight-for-age", unit: "kg" },
  height: { label: "Length/height-for-age", unit: "cm" },
  headCircumference: { label: "Head circumference-for-age", unit: "cm" },
  bmi: { label: "BMI-for-age", unit: "kg/m²" },
};

function valueFor(metric: MetricKey, visit: TrendVisit) {
  if (metric === "weight") return visit.weightKg;
  if (metric === "height") return visit.heightCm;
  if (metric === "headCircumference") return visit.headCircumferenceCm;
  return bmiOf(visit);
}

/** Rate wording a clinician expects: g/day for short intervals, kg/month beyond. */
function formatRate(metric: MetricKey, change: number, days: number, months: number) {
  if (days <= 0) return { ratePerMonth: undefined, rateUnit: undefined, text: "" };
  if (metric === "weight" && days <= 120) {
    const perDay = (change * 1000) / days;
    return { ratePerMonth: round(change / months, 2), rateUnit: "kg/month", text: `≈ ${Math.round(perDay)} g/day` };
  }
  const perMonth = change / months;
  if (metric === "bmi") return { ratePerMonth: round(perMonth, 2), rateUnit: "kg/m²/month", text: `≈ ${round(perMonth, 2)} kg/m² per month` };
  return { ratePerMonth: round(perMonth, 2), rateUnit: "cm/month", text: `≈ ${round(perMonth, 2)} cm/month` };
}

function describeMetric(metric: MetricKey, sex: Sex, previous: TrendVisit, current: TrendVisit, days: number, months: number): TrendMetric {
  const meta = METRIC_META[metric];
  const from = valueFor(metric, previous);
  const to = valueFor(metric, current);

  if (from === undefined || to === undefined) {
    const missing = from === undefined && to === undefined ? "was not measured at either visit" : from === undefined ? "was not measured at the previous visit" : "has not been measured at this visit";
    return { metric, label: meta.label, unit: meta.unit, from, to, statement: `${meta.label} ${missing}.`, direction: "unavailable" };
  }

  const change = round(to - from, metric === "weight" ? 2 : 1);
  const rate = formatRate(metric, change, days, months);
  const fromScore = interpretMetric(metric, from, previous.ageMonths, sex);
  const toScore = interpretMetric(metric, to, current.ageMonths, sex);
  const hasZ = fromScore.z !== undefined && toScore.z !== undefined;
  const deltaZ = hasZ ? round(toScore.z! - fromScore.z!, 2) : undefined;

  const direction: TrendMetric["direction"] = deltaZ === undefined ? "unavailable"
    : deltaZ <= -MEANINGFUL_Z_SHIFT ? "worsening"
      : deltaZ >= MEANINGFUL_Z_SHIFT ? "improving"
        : "steady";

  const changeText = `${change > 0 ? "+" : change === 0 ? "±" : ""}${change} ${meta.unit}`;
  const zText = hasZ ? ` · z ${fromScore.z! > 0 ? "+" : ""}${fromScore.z!} → ${toScore.z! > 0 ? "+" : ""}${toScore.z!} (Δ ${deltaZ! > 0 ? "+" : ""}${deltaZ})` : "";
  const centileText = hasZ ? ` · P${fromScore.percentile} → P${toScore.percentile}` : "";
  const daysText = days === 0 ? "on the same day" : `over ${days} days`;

  return {
    metric,
    label: meta.label,
    unit: meta.unit,
    from,
    to,
    change,
    ratePerMonth: rate.ratePerMonth,
    rateUnit: rate.rateUnit,
    fromZ: hasZ ? fromScore.z : undefined,
    toZ: hasZ ? toScore.z : undefined,
    deltaZ,
    fromPercentile: hasZ ? fromScore.percentile : undefined,
    toPercentile: hasZ ? toScore.percentile : undefined,
    statement: `${meta.label}: ${from} → ${to} ${meta.unit} (${changeText}${rate.text ? `, ${rate.text}` : ""} ${daysText})${zText}${centileText}`,
    direction,
  };
}

export function buildGrowthTrend(input: { sex: Sex; previous: TrendVisit; current: TrendVisit }): GrowthTrend {
  const { sex, previous, current } = input;
  const from = parseClinicDate(previous.occurredOn);
  const to = parseClinicDate(current.occurredOn);
  const days = from && to ? Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000)) : 0;
  const months = days / DAYS_PER_MONTH;

  const metrics = (["weight", "height", "headCircumference", "bmi"] as MetricKey[])
    .map((metric) => describeMetric(metric, sex, previous, current, days, months));

  const flags = metrics.filter((entry) => entry.direction === "worsening").map((entry) => {
    if (entry.metric === "weight") return `Weight-for-age has fallen by ${Math.abs(entry.deltaZ!)} z since ${previous.occurredOn} — growth faltering until proven otherwise: review feeding, illness and intake.`;
    if (entry.metric === "height") return `Length/height-for-age has fallen by ${Math.abs(entry.deltaZ!)} z since ${previous.occurredOn} — failing linear growth: review nutrition, illness and endocrine causes.`;
    if (entry.metric === "headCircumference") return `Head circumference has fallen by ${Math.abs(entry.deltaZ!)} z since ${previous.occurredOn} — plot the trend and review development.`;
    return `BMI-for-age has fallen by ${Math.abs(entry.deltaZ!)} z since ${previous.occurredOn} — reassess weight for height.`;
  });

  const improving = metrics.filter((entry) => entry.direction === "improving");
  const scored = metrics.filter((entry) => entry.deltaZ !== undefined);
  const summary = !scored.length
    ? "No metric can be compared: the same values were not recorded at both visits."
    : flags.length
      ? `${flags.length} metric${flags.length > 1 ? "s" : ""} moved downward by more than ${MEANINGFUL_Z_SHIFT} z since the previous visit.`
      : `Tracking steadily since ${previous.occurredOn}: no metric fell by more than ${MEANINGFUL_Z_SHIFT} z.${improving.length ? ` ${improving.map((entry) => entry.label).join(", ")} improved.` : ""}`;

  return { previousOn: previous.occurredOn, currentOn: current.occurredOn, days, months: round(months, 1), metrics, flags, summary };
}
