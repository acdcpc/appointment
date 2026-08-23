import { describe, expect, it } from "vitest";

import { getLargeTextLayout, LARGE_TEXT_THRESHOLD } from "../lib/large-text-layout";

describe("large-text layout safeguards", () => {
  it("preserves a comfortably tappable action target at default text size", () => {
    const layout = getLargeTextLayout(1);
    expect(layout.isLargeText).toBe(false);
    expect(layout.minimumActionHeight).toBeGreaterThanOrEqual(44);
  });

  it("stacks dense content and increases touch targets when text is enlarged", () => {
    const layout = getLargeTextLayout(LARGE_TEXT_THRESHOLD);
    expect(layout.isLargeText).toBe(true);
    expect(layout.shouldStackDenseRows).toBe(true);
    expect(layout.minimumActionHeight).toBeGreaterThanOrEqual(48);
  });

  it("falls back to a safe scale if a platform reports an invalid font scale", () => {
    expect(getLargeTextLayout(Number.NaN).fontScale).toBe(1);
  });
});
