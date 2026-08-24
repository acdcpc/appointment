const acceptedFeedbackScreenshotTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export type FeedbackScreenshotType = (typeof acceptedFeedbackScreenshotTypes)[number];
const maxFeedbackScreenshotBytes = 1_500_000;

export function isAcceptedFeedbackScreenshotType(value: unknown): value is FeedbackScreenshotType {
  return acceptedFeedbackScreenshotTypes.includes(value as FeedbackScreenshotType);
}

export function decodeFeedbackScreenshot(base64: string, contentType: FeedbackScreenshotType) {
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error("Feedback screenshot data is invalid.");
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > maxFeedbackScreenshotBytes) throw new Error("Use one PNG, JPEG, or WebP screenshot no larger than 1.5 MB.");
  return { bytes, contentType };
}

export { maxFeedbackScreenshotBytes };
