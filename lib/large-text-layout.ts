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

export const LARGE_TEXT_TEST_SCALES = [1, 1.3, 1.6, 2] as const;

export function getStructuredLargeTextChecks(observedFontScale: number) {
  const observed = getLargeTextLayout(observedFontScale);
  return {
    observed,
    targets: LARGE_TEXT_TEST_SCALES.map((fontScale) => {
      const layout = getLargeTextLayout(fontScale);
      return {
        fontScale,
        minimumActionHeight: layout.minimumActionHeight,
        denseRowsStack: layout.shouldStackDenseRows,
        passes: layout.minimumActionHeight >= 44 && (fontScale < LARGE_TEXT_THRESHOLD || layout.shouldStackDenseRows),
      };
    }),
  } as const;
}
