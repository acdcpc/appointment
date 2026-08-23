export const LARGE_TEXT_THRESHOLD = 1.3;

export function getLargeTextLayout(fontScale: number) {
  const safeFontScale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const isLargeText = safeFontScale >= LARGE_TEXT_THRESHOLD;
  return {
    fontScale: safeFontScale,
    isLargeText,
    minimumActionHeight: isLargeText ? 48 : 44,
    shouldStackDenseRows: isLargeText,
  } as const;
}
