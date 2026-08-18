export type WhoCurvePoint = { month: number; p3: number; p50: number; p97: number };
export type WhoMetric = "heightCm" | "weightKg";

const heightBoys: WhoCurvePoint[] = [{ month: 24, p3: 81.4, p50: 87.1, p97: 92.9 }, { month: 30, p3: 85.5, p50: 91.9, p97: 98.3 }, { month: 36, p3: 89.1, p50: 96.1, p97: 103.1 }, { month: 42, p3: 92.4, p50: 99.9, p97: 107.3 }, { month: 48, p3: 95.4, p50: 103.3, p97: 111.2 }, { month: 54, p3: 98.4, p50: 106.7, p97: 115 }, { month: 60, p3: 101.2, p50: 110, p97: 118.7 }];
const heightGirls: WhoCurvePoint[] = [{ month: 24, p3: 79.6, p50: 85.7, p97: 91.8 }, { month: 30, p3: 84, p50: 90.7, p97: 97.3 }, { month: 36, p3: 87.9, p50: 95.1, p97: 102.2 }, { month: 42, p3: 91.4, p50: 99, p97: 106.7 }, { month: 48, p3: 94.6, p50: 102.7, p97: 110.8 }, { month: 54, p3: 97.6, p50: 106.2, p97: 114.7 }, { month: 60, p3: 100.5, p50: 109.4, p97: 118.4 }];
const weightBoys: WhoCurvePoint[] = [{ month: 24, p3: 9.8, p50: 12.2, p97: 15.1 }, { month: 30, p3: 10.7, p50: 13.3, p97: 16.6 }, { month: 36, p3: 11.4, p50: 14.3, p97: 18 }, { month: 42, p3: 12.2, p50: 15.3, p97: 19.4 }, { month: 48, p3: 12.9, p50: 16.3, p97: 20.9 }, { month: 54, p3: 13.6, p50: 17.3, p97: 22.3 }, { month: 60, p3: 14.3, p50: 18.3, p97: 23.8 }];
const weightGirls: WhoCurvePoint[] = [{ month: 24, p3: 9.2, p50: 11.5, p97: 14.6 }, { month: 30, p3: 10.1, p50: 12.7, p97: 16.2 }, { month: 36, p3: 11, p50: 13.9, p97: 17.8 }, { month: 42, p3: 11.8, p50: 15, p97: 19.5 }, { month: 48, p3: 12.5, p50: 16.1, p97: 21.1 }, { month: 54, p3: 13.2, p50: 17.2, p97: 22.8 }, { month: 60, p3: 14, p50: 18.2, p97: 24.4 }];

export function getWhoReferenceCurves(sex: "male" | "female", metric: WhoMetric) {
  if (metric === "heightCm") return sex === "male" ? heightBoys : heightGirls;
  return sex === "male" ? weightBoys : weightGirls;
}

export const whoReferenceSource = "WHO Child Growth Standards, sex-specific 2–5-year percentile tables for length/height-for-age and weight-for-age; compact samples shown at six-month intervals.";
