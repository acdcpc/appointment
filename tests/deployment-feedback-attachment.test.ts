import { describe, expect, it } from "vitest";
import { decodeFeedbackScreenshot, isAcceptedFeedbackScreenshotType, maxFeedbackScreenshotBytes } from "../server/deployment-feedback-attachment";

describe("deployment feedback screenshot safeguards", () => {
  it("accepts only approved screenshot content types", () => {
    expect(isAcceptedFeedbackScreenshotType("image/png")).toBe(true);
    expect(isAcceptedFeedbackScreenshotType("image/gif")).toBe(false);
  });

  it("rejects malformed and oversized encoded data", () => {
    expect(() => decodeFeedbackScreenshot("not a base64 value", "image/png")).toThrow("invalid");
    expect(() => decodeFeedbackScreenshot(Buffer.alloc(maxFeedbackScreenshotBytes + 1).toString("base64"), "image/jpeg")).toThrow("1.5 MB");
  });
});
