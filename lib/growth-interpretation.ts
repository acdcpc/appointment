/**
 * WHO growth interpretation (clinician-facing, English).
 *
 * Ported from the Kapoori Ka growth engine: exact LMS z-scores and percentiles
 * from the WHO Child Growth Standards (0–60 months, 2006) and the WHO Growth
 * Reference (61–216 months, 2007). The data tables live in lib/who-data/.
 *
 * Language here is deliberately clinical and English: this panel is used by the
 * clinic, not by parents, and a care decision should not depend on a friendly
 * paraphrase. Nothing here is a diagnosis — it is decision support that states
 * the WHO z-band and what that band is called.
 */
import {
  WHO_BFA_BOYS, WHO_BFA_GIRLS, WHO_BFA_LMS_BOYS, WHO_BFA_LMS_GIRLS,
} from "./who-data/whoBFA";
import {
  WHO_HCFA_BOYS, WHO_HCFA_GIRLS, WHO_HCFA_LMS_BOYS, WHO_HCFA_LMS_GIRLS,
} from "./who-data/whoHCFA";
import {
  WHO_HFA_BOYS, WHO_HFA_GIRLS, WHO_HFA_LMS_BOYS, WHO_HFA_LMS_GIRLS,
} from "./who-data/whoHFA";
import {
  WHO_WFA_BOYS, WHO_WFA_GIRLS, WHO_WFA_LMS_BOYS, WHO_WFA_LMS_GIRLS,
} from "./who-data/whoWFA";

export type Sex = "male" | "female";
export type MetricKey = "weight" | "height" | "headCircumference" | "bmi";

/** SD table layout: [ageMonths, -3SD, -2SD, median, +2SD, +3SD]. */
function sdRowAt(table: number[][], ageMonths: number): number[] {
  if (ageMonths <= table[0][0]) return table[0];
  const last = table[table.length - 1];
  if (ageMonths >= last[0]) return last;
  for (let i = 0; i < table.length - 1; i += 1) {
    const a = table[i];
    const b = table[i + 1];
    if (ageMonths >= a[0] && ageMonths <= b[0]) {
      const f = (ageMonths - a[0]) / (b[0] - a[0]);
      return [ageMonths, a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), a[3] + f * (b[3] - a[3]), a[4] + f * (b[4] - a[4]), a[5] + f * (b[5] - a[5])];
    }
  }
  return last;
}

/** LMS table layout: [ageMonths, L, M, S]. */
function lmsAt(table: number[][], ageMonths: number): [number, number, number] {
  if (ageMonths <= table[0][0]) return [table[0][1], table[0][2], table[0][3]];
  const last = table[table.length - 1];
  if (ageMonths >= last[0]) return [last[1], last[2], last[3]];
  for (let i = 0; i < table.length - 1; i += 1) {
    const a = table[i];
    const b = table[i + 1];
    if (ageMonths >= a[0] && ageMonths <= b[0]) {
      const f = (ageMonths - a[0]) / (b[0] - a[0]);
      return [a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), a[3] + f * (b[3] - a[3])];
    }
  }
  return [last[1], last[2], last[3]];
}

/** Exact WHO LMS z-score: z = ((v/M)^L − 1) / (L·S); L = 0 → z = ln(v/M)/S. */
export function zFromLMS(value: number, L: number, M: number, S: number): number {
  if (value <= 0 || M <= 0 || S <= 0) return NaN;
  if (L === 0) return Math.log(value / M) / S;
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26) → percentile 0.1–99.9. */
export function percentileFromZ(z: number): number {
  if (Number.isNaN(z)) return NaN;
  const zz = Math.abs(z);
  const tt = 1 / (1 + 0.2316419 * zz);
  const poly = tt * (0.319381530 + tt * (-0.356563782 + tt * (1.781477937 + tt * (-1.821255978 + tt * 1.330274429))));
  const pdf = Math.exp((-zz * zz) / 2) / Math.sqrt(2 * Math.PI);
  const p = z >= 0 ? 1 - pdf * poly : pdf * poly;
  return Math.round(Math.min(99.9, Math.max(0.1, p * 100)) * 10) / 10;
}

// ── Metric z-scores (WHO defined age ranges) ────────────────────────────────

/** Weight-for-age: WHO 2006 (0–60m) + WHO 2007 (61–120m). Undefined beyond 10 years. */
export function weightZScore(weight: number, ageMonths: number, sex: Sex): number {
  if (weight <= 0 || ageMonths > 120) return NaN;
  const [L, M, S] = lmsAt(sex === "male" ? WHO_WFA_LMS_BOYS : WHO_WFA_LMS_GIRLS, ageMonths);
  return zFromLMS(weight, L, M, S);
}

/** Height/length-for-age: WHO 2006 (0–60m) + WHO 2007 (61–216m). */
export function heightZScore(height: number, ageMonths: number, sex: Sex): number {
  if (height <= 0 || ageMonths > 216) return NaN;
  const [L, M, S] = lmsAt(sex === "male" ? WHO_HFA_LMS_BOYS : WHO_HFA_LMS_GIRLS, ageMonths);
  return zFromLMS(height, L, M, S);
}

/** Head circumference-for-age: WHO 2006, defined 0–60 months only. */
export function headCircumferenceZScore(value: number, ageMonths: number, sex: Sex): number {
  if (value <= 0 || ageMonths > 60) return NaN;
  const [L, M, S] = lmsAt(sex === "male" ? WHO_HCFA_LMS_BOYS : WHO_HCFA_LMS_GIRLS, ageMonths);
  return zFromLMS(value, L, M, S);
}

/** BMI-for-age: WHO 2006 (24–60m) + WHO 2007 (61–216m). */
export function bmiZScore(bmi: number, ageMonths: number, sex: Sex): number {
  if (bmi <= 0 || ageMonths < 24 || ageMonths > 216) return NaN;
  const [L, M, S] = lmsAt(sex === "male" ? WHO_BFA_LMS_BOYS : WHO_BFA_LMS_GIRLS, ageMonths);
  return zFromLMS(bmi, L, M, S);
}

export type ZBand = "severe-low" | "low" | "normal" | "high" | "severe-high" | "undefined";

export function bandForZ(z: number): ZBand {
  if (Number.isNaN(z)) return "undefined";
  if (z < -3) return "severe-low";
  if (z < -2) return "low";
  if (z <= 2) return "normal";
  if (z <= 3) return "high";
  return "severe-high";
}

/** WHO classification term for each metric and z-band. */
const CLASSIFICATION: Record<MetricKey, Partial<Record<ZBand, string>>> = {
  weight: {
    "severe-low": "Severe underweight for age (WHO < -3 SD)",
    low: "Underweight for age (WHO -3 to -2 SD)",
    normal: "Weight-for-age within the WHO normal range (-2 to +2 SD)",
    high: "Weight-for-age above the WHO normal range (+2 to +3 SD)",
    "severe-high": "Weight-for-age far above the WHO normal range (> +3 SD)",
  },
  height: {
    "severe-low": "Severe stunting (WHO < -3 SD)",
    low: "Stunting (WHO -3 to -2 SD)",
    normal: "Length/height-for-age within the WHO normal range",
    high: "Tall for age (+2 to +3 SD) — verify measurements and parental heights",
    "severe-high": "Very tall for age (> +3 SD) — consider referral",
  },
  headCircumference: {
    "severe-low": "Severe microcephaly (WHO < -3 SD)",
    low: "Microcephaly (WHO -3 to -2 SD)",
    normal: "Head circumference within the WHO normal range",
    high: "Macrocephaly (+2 to +3 SD) — plot on the chart and review the trend",
    "severe-high": "Severe macrocephaly (> +3 SD) — review urgently",
  },
  bmi: {
    "severe-low": "Severe wasting by BMI-for-age (WHO < -3 SD)",
    low: "Wasting by BMI-for-age (WHO -3 to -2 SD)",
    normal: "BMI-for-age within the WHO normal range",
    high: "Overweight by BMI-for-age (+2 to +3 SD)",
    "severe-high": "Obesity by BMI-for-age (> +3 SD)",
  },
};

export type MetricInterpretation = {
  metric: MetricKey;
  value?: number;
  z?: number;
  percentile?: number;
  band: ZBand;
  classification: string;
  /** Why a value could not be scored (age range or missing data). */
  note?: string;
  unit: string;
  label: string;
};

const METRIC_LABEL: Record<MetricKey, string> = {
  weight: "Weight-for-age",
  height: "Length/height-for-age",
  headCircumference: "Head circumference-for-age",
  bmi: "BMI-for-age",
};

const UNIT: Record<MetricKey, string> = { weight: "kg", height: "cm", headCircumference: "cm", bmi: "kg/m²" };

export function interpretMetric(metric: MetricKey, value: number | undefined, ageMonths: number, sex: Sex): MetricInterpretation {
  const label = METRIC_LABEL[metric];
  if (value === undefined || Number.isNaN(value) || value <= 0) {
    return { metric, band: "undefined", classification: "Not recorded", note: "No measurement available for this metric.", unit: UNIT[metric], label };
  }
  if (metric === "weight" && ageMonths > 120) {
    return { metric, value, band: "undefined", classification: "Not applicable", note: "WHO defines weight-for-age only to 10 years. Use BMI-for-age beyond that.", unit: UNIT[metric], label };
  }
  if (metric === "headCircumference" && ageMonths > 60) {
    return { metric, value, band: "undefined", classification: "Not applicable", note: "WHO defines head-circumference-for-age only to 5 years.", unit: UNIT[metric], label };
  }
  if (metric === "bmi" && ageMonths < 24) {
    return { metric, value, band: "undefined", classification: "Not applicable", note: "WHO defines BMI-for-age from 24 months.", unit: UNIT[metric], label };
  }
  const z = metric === "weight" ? weightZScore(value, ageMonths, sex)
    : metric === "height" ? heightZScore(value, ageMonths, sex)
      : metric === "headCircumference" ? headCircumferenceZScore(value, ageMonths, sex)
        : bmiZScore(value, ageMonths, sex);
  if (Number.isNaN(z)) {
    return { metric, value, band: "undefined", classification: "Outside the WHO reference", note: "This age is outside the published WHO range for the metric.", unit: UNIT[metric], label };
  }
  const band = bandForZ(z);
  return {
    metric,
    value,
    z: Math.round(z * 100) / 100,
    percentile: percentileFromZ(z),
    band,
    classification: CLASSIFICATION[metric][band] ?? "Within the WHO normal range",
    unit: UNIT[metric],
    label,
  };
}

export type GrowthInterpretation = {
  ageMonths: number;
  sex: Sex;
  metrics: MetricInterpretation[];
  /** Flags that warrant clinical attention, most severe first. */
  flags: string[];
  summary: string;
};

/**
 * Interprets one measurement set. Weight, height, head circumference and BMI
 * are each scored against their own WHO standard; flags collect anything outside
 * ±2 SD so the clinician sees what needs attention without reading all four.
 */
export function interpretMeasurement(input: {
  ageMonths: number;
  sex: Sex;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
}): GrowthInterpretation {
  const { ageMonths, sex, weightKg, heightCm, headCircumferenceCm } = input;
  const bmi = weightKg !== undefined && heightCm !== undefined && heightCm > 0
    ? Math.round(((weightKg / Math.pow(heightCm / 100, 2))) * 10) / 10
    : undefined;

  const metrics = [
    interpretMetric("weight", weightKg, ageMonths, sex),
    interpretMetric("height", heightCm, ageMonths, sex),
    interpretMetric("headCircumference", headCircumferenceCm, ageMonths, sex),
    interpretMetric("bmi", bmi, ageMonths, sex),
  ];

  const severity = (band: ZBand) => ({ "severe-low": 4, "severe-high": 4, low: 3, high: 3, normal: 1, undefined: 0 }[band]);
  const flags = metrics
    .filter((metric) => metric.band === "low" || metric.band === "high" || metric.band === "severe-low" || metric.band === "severe-high")
    .sort((left, right) => severity(right.band) - severity(left.band))
    .map((metric) => `${metric.label}: ${metric.classification}${metric.z !== undefined ? ` (z ${metric.z > 0 ? "+" : ""}${metric.z}, P${metric.percentile})` : ""}`);

  const scored = metrics.filter((metric) => metric.z !== undefined);
  const summary = !scored.length
    ? "No metric could be scored against a WHO standard for this age."
    : flags.length
      ? `${scored.length} of 4 metrics scored; ${flags.length} outside the WHO ±2 SD range.`
      : `All ${scored.length} scored metrics are within the WHO ±2 SD range.`;

  return { ageMonths, sex, metrics, flags, summary };
}

/** Median and ±2 SD for the chart bands at an age. */
export function referenceBand(metric: MetricKey, ageMonths: number, sex: Sex) {
  const table = metric === "weight" ? (sex === "male" ? WHO_WFA_BOYS : WHO_WFA_GIRLS)
    : metric === "height" ? (sex === "male" ? WHO_HFA_BOYS : WHO_HFA_GIRLS)
      : metric === "headCircumference" ? (sex === "male" ? WHO_HCFA_BOYS : WHO_HCFA_GIRLS)
        : (sex === "male" ? WHO_BFA_BOYS : WHO_BFA_GIRLS);
  const row = sdRowAt(table, ageMonths);
  return { minus3: row[1], minus2: row[2], median: row[3], plus2: row[4], plus3: row[5] };
}

/** WHO table range for a metric, so the UI can say why a chart stops. */
export function referenceRange(metric: MetricKey) {
  if (metric === "weight") return { min: 0, max: 120, unit: "months" };
  if (metric === "height") return { min: 0, max: 216, unit: "months" };
  if (metric === "headCircumference") return { min: 0, max: 60, unit: "months" };
  return { min: 24, max: 216, unit: "months" };
}
