export type BlurRectangle = { x: number; y: number; width: number; height: number };

export function clampBlurRectangle(startX: number, startY: number, endX: number, endY: number, canvasWidth: number, canvasHeight: number): BlurRectangle | null {
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;
  const left = Math.max(0, Math.min(startX, endX, canvasWidth));
  const top = Math.max(0, Math.min(startY, endY, canvasHeight));
  const right = Math.max(0, Math.min(Math.max(startX, endX), canvasWidth));
  const bottom = Math.max(0, Math.min(Math.max(startY, endY), canvasHeight));
  const width = right - left;
  const height = bottom - top;
  return width >= 12 && height >= 12 ? { x: left, y: top, width, height } : null;
}

export function clampViewportPan(x: number, y: number, zoom: number, canvasWidth: number, canvasHeight: number) {
  const safeZoom = Math.max(1, Math.min(3, zoom));
  return {
    x: Math.min(0, Math.max(canvasWidth - canvasWidth * safeZoom, x)),
    y: Math.min(0, Math.max(canvasHeight - canvasHeight * safeZoom, y)),
  };
}
