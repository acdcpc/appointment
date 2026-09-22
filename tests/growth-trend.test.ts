import { describe, expect, it } from "vitest";
import { buildGrowthTrend, MEANINGFUL_Z_SHIFT } from "../lib/growth-trend";

const visit = (occurredOn: string, ageMonths: number, weightKg?: number, heightCm?: number, headCircumferenceCm?: number) => ({ occurredOn, ageMonths, weightKg, heightCm, headCircumferenceCm });

describe("growth trend between two visits", () => {
  it("computes the interval, the absolute change and the rate", () => {
    const trend = buildGrowthTrend({
      sex: "male",
      previous: visit("20 Jan 2026", 12, 9.0, 74),
      current: visit("20 Mar 2026", 14, 9.6, 76),
    });
    const weight = trend.metrics.find((metric) => metric.metric === "weight")!;
    expect(trend.days).toBe(59);
    expect(weight.change).toBeCloseTo(0.6, 2);
    expect(weight.ratePerMonth).toBeCloseTo(0.31, 2);
    expect(weight.statement).toMatch(/9 → 9\.6 kg/);
    expect(weight.statement).toMatch(/g\/day/);

    const height = trend.metrics.find((metric) => metric.metric === "height")!;
    expect(height.change).toBeCloseTo(2, 1);
    expect(height.rateUnit).toBe("cm/month");
  });

  it("flags a meaningful downward z shift as worsening", () => {
    // A child whose weight stalls while age advances: the z-score must fall well
    // past one centile band, which is the clinically meaningful signal.
    const trend = buildGrowthTrend({
      sex: "female",
      previous: visit("20 Jan 2026", 12, 9.0, 74),
      current: visit("20 Jul 2026", 18, 9.2, 76),
    });
    const weight = trend.metrics.find((metric) => metric.metric === "weight")!;
    expect(weight.direction).toBe("worsening");
    expect(weight.deltaZ!).toBeLessThan(-MEANINGFUL_Z_SHIFT);
    expect(trend.flags.length).toBeGreaterThan(0);
    expect(trend.flags[0]).toMatch(/growth faltering/);
    expect(trend.summary).toMatch(/downward/);
  });

  it("does not flag a child tracking along the same centile", () => {
    // Weight and height both advance roughly with the median: the z-score barely moves.
    const trend = buildGrowthTrend({
      sex: "male",
      previous: visit("20 Jan 2026", 12, 9.6, 75.7),
      current: visit("20 Jul 2026", 18, 10.9, 82.3),
    });
    const weight = trend.metrics.find((metric) => metric.metric === "weight")!;
    expect(Math.abs(weight.deltaZ!)).toBeLessThan(MEANINGFUL_Z_SHIFT);
    expect(trend.flags).toHaveLength(0);
    expect(trend.summary).toMatch(/Tracking steadily/);
  });

  it("marks a metric unavailable when it was not measured at both visits", () => {
    const trend = buildGrowthTrend({
      sex: "male",
      previous: visit("20 Jan 2026", 12, 9.0),
      current: visit("20 Mar 2026", 14, 9.6),
    });
    const height = trend.metrics.find((metric) => metric.metric === "height")!;
    expect(height.direction).toBe("unavailable");
    expect(height.statement).toMatch(/was not measured at either visit/);

    // Height recorded at only one of the two visits is reported as such.
    const partial = buildGrowthTrend({
      sex: "male",
      previous: visit("20 Jan 2026", 12, 9.0),
      current: visit("20 Mar 2026", 14, 9.6, 76),
    });
    expect(partial.metrics.find((metric) => metric.metric === "height")!.statement).toMatch(/was not measured at the previous visit/);
  });

  it("derives BMI for both visits when weight and height are present", () => {
    const trend = buildGrowthTrend({
      sex: "male",
      previous: visit("20 Jan 2026", 36, 13.0, 95),
      current: visit("20 Jul 2026", 42, 14.0, 99),
    });
    const bmi = trend.metrics.find((metric) => metric.metric === "bmi")!;
    expect(bmi.from).toBeCloseTo(14.4, 1);
    expect(bmi.to).toBeCloseTo(14.3, 1);
    expect(bmi.statement).toMatch(/BMI-for-age/);
  });

  it("handles two measurements taken on the same day without inventing a rate", () => {
    const trend = buildGrowthTrend({
      sex: "female",
      previous: visit("20 Mar 2026", 14, 9.0),
      current: visit("20 Mar 2026", 14, 9.4),
    });
    expect(trend.days).toBe(0);
    const weight = trend.metrics.find((metric) => metric.metric === "weight")!;
    expect(weight.statement).toMatch(/on the same day/);
    expect(weight.statement).not.toMatch(/g\/day/);
  });
});
