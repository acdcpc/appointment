import { describe, expect, it } from "vitest";
import { getAccessReviewStatus } from "../lib/super-admin-review";

describe("super-admin access review reminder", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");
  it("shows a factual never-reviewed state when no review is recorded", () => { expect(getAccessReviewStatus(null, 90, now).kind).toBe("never-reviewed"); });
  it("marks a review due within the documented 14-day reminder window", () => { const result = getAccessReviewStatus("2026-06-09T00:00:00.000Z", 90, now); expect(result.kind).toBe("due-soon"); expect(result.daysUntilDue).toBe(14); });
  it("marks past reviews overdue without claiming background delivery", () => { expect(getAccessReviewStatus("2026-05-01T00:00:00.000Z", 90, now).kind).toBe("overdue"); });
});
