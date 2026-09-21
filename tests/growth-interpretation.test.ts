import { describe, expect, it } from "vitest";
import {
  bandForZ, bmiZScore, headCircumferenceZScore, heightZScore, interpretMeasurement, percentileFromZ, weightZScore, zFromLMS,
} from "../lib/growth-interpretation";

describe("WHO growth interpretation", () => {
  it("gives z = 0 at the WHO median", () => {
    // The stored LMS tables carry the WHO median (M): boys weight-for-age at
    // 12 months is M = 9.646 kg, girls height-for-age at 24 months is M = 86.4008 cm.
    expect(Math.abs(weightZScore(9.646, 12, "male"))).toBeLessThan(0.01);
    expect(Math.abs(heightZScore(86.4008, 24, "female"))).toBeLessThan(0.01);
  });

  it("matches published WHO z-score cut-offs for weight-for-age", () => {
    // WHO boys weight-for-age at 12 months: -2 SD = 7.7 kg, +2 SD = 12.0 kg.
    // Bands are checked within ±0.6 z, which catches a wrong table, unit or age
    // without over-fitting to the difference between the SD and LMS series.
    expect(weightZScore(7.7, 12, "male")).toBeLessThan(-1.4);
    expect(weightZScore(7.7, 12, "male")).toBeGreaterThan(-2.6);
    expect(weightZScore(12.0, 12, "male")).toBeGreaterThan(1.4);
    expect(weightZScore(12.0, 12, "male")).toBeLessThan(2.6);
  });

  it("handles the L = 0 case of the LMS formula", () => {
    expect(zFromLMS(10, 0, 10, 0.1)).toBeCloseTo(0, 6);
  });

  it("maps percentiles from z correctly", () => {
    expect(percentileFromZ(0)).toBeCloseTo(50, 0);
    expect(percentileFromZ(-1.96)).toBeCloseTo(2.5, 0);
    expect(percentileFromZ(1.96)).toBeCloseTo(97.5, 0);
  });

  it("bands the WHO cut-offs", () => {
    expect(bandForZ(-3.4)).toBe("severe-low");
    expect(bandForZ(-2.5)).toBe("low");
    expect(bandForZ(0)).toBe("normal");
    expect(bandForZ(2.5)).toBe("high");
    expect(bandForZ(3.5)).toBe("severe-high");
    expect(bandForZ(NaN)).toBe("undefined");
  });

  it("refuses to score metrics outside their WHO age range", () => {
    expect(Number.isNaN(weightZScore(30, 130, "male"))).toBe(true);
    expect(Number.isNaN(headCircumferenceZScore(52, 72, "male"))).toBe(true);
    expect(Number.isNaN(bmiZScore(16, 12, "male"))).toBe(true);
  });

  it("interprets a full measurement set and reports flags", () => {
    const result = interpretMeasurement({ ageMonths: 12, sex: "male", weightKg: 6.4, heightCm: 68, headCircumferenceCm: 43 });
    expect(result.metrics).toHaveLength(4);
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0]).toMatch(/z /);
    expect(result.summary).toMatch(/outside the WHO ±2 SD range|within the WHO/);
  });

  it("reports normal when a child sits near the median", () => {
    const result = interpretMeasurement({ ageMonths: 24, sex: "female", weightKg: 12.0, heightCm: 86.4, headCircumferenceCm: 47.2 });
    expect(result.metrics.find((metric) => metric.metric === "height")?.band).toBe("normal");
  });
});
