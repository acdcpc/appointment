import { describe, expect, it } from "vitest";
import { clampBlurRectangle, clampViewportPan } from "../lib/screenshot-redaction";

describe("manual screenshot redaction", () => {
  it("normalizes reverse brush drags and constrains them to the preview canvas", () => {
    expect(clampBlurRectangle(180, 90, -20, 30, 200, 120)).toEqual({ x: 0, y: 30, width: 180, height: 60 });
  });

  it("rejects tap-sized or unavailable brush marks", () => {
    expect(clampBlurRectangle(10, 10, 18, 18, 100, 100)).toBeNull();
    expect(clampBlurRectangle(10, 10, 80, 80, 0, 100)).toBeNull();
  });

  it("keeps zoom-pan offsets within the full screenshot viewport", () => {
    expect(clampViewportPan(75, -250, 2, 200, 120)).toEqual({ x: 0, y: -120 });
    expect(clampViewportPan(-999, -999, 4, 200, 120)).toEqual({ x: -400, y: -240 });
  });
});
