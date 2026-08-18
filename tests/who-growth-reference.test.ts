import { describe, expect, it } from "vitest";
import { getWhoReferenceCurves } from "../lib/who-growth-reference";

describe("WHO growth reference samples", () => {
  it("selects sex-specific height curves across the supported 24–60 month interval", () => {
    const boys = getWhoReferenceCurves("male", "heightCm");
    const girls = getWhoReferenceCurves("female", "heightCm");
    expect(boys[0]).toMatchObject({ month: 24, p50: 87.1 });
    expect(girls[0]).toMatchObject({ month: 24, p50: 85.7 });
    expect(boys.at(-1)?.month).toBe(60);
  });

  it("selects weight curves with documented percentile bands", () => {
    const boys = getWhoReferenceCurves("male", "weightKg");
    expect(boys.every((point) => point.p3 < point.p50 && point.p50 < point.p97)).toBe(true);
  });
});
