/** Device pixel ratio for snapping garden layout to physical pixels. */
export function gardenDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Scale bandHeight/designHeight so the band height maps to whole device pixels.
 * When designWidth is given, scale is quantized to 1 / (gcd × DPR) steps so both
 * the rendered scene width and height land on device pixels — reducing blur from
 * fractional CSS transform scale values.
 */
export function snapGardenScale(
  bandHeight: number,
  designHeight: number,
  designWidth?: number,
): number {
  if (bandHeight <= 0 || designHeight <= 0) return 0;
  const dpr = gardenDevicePixelRatio();
  const targetScale = bandHeight / designHeight;
  const quantDenom =
    designWidth != null && designWidth > 0
      ? gcd(designWidth, designHeight) * dpr
      : designHeight * dpr;
  const scaleStep = 1 / quantDenom;
  const n = Math.round(targetScale / scaleStep);
  if (n <= 0) return scaleStep;
  return n * scaleStep;
}

/** Band height in CSS px after scale snapping (use for the canvas container). */
export function snappedGardenBandHeight(
  bandHeight: number,
  designHeight: number,
  designWidth?: number,
): number {
  const scale = snapGardenScale(bandHeight, designHeight, designWidth);
  return scale > 0 ? designHeight * scale : 0;
}

/** Snap a horizontal scroll offset to the device pixel grid. */
export function snapScrollLeft(scrollLeft: number): number {
  if (scrollLeft <= 0) return 0;
  const dpr = gardenDevicePixelRatio();
  return Math.round(scrollLeft * dpr) / dpr;
}

/** Snap a CSS pixel value to the device pixel grid. */
export function snapScreenPx(screenPx: number): number {
  if (screenPx <= 0) return screenPx;
  const dpr = gardenDevicePixelRatio();
  return Math.round(screenPx * dpr) / dpr;
}

/** Snap a design-space length (px) so its on-screen size lands on device pixels. */
export function snapDesignLength(lengthDesignPx: number, scale: number): number {
  if (scale <= 0) return lengthDesignPx;
  const dpr = gardenDevicePixelRatio();
  const screenPx = lengthDesignPx * scale;
  const snappedScreenPx = Math.round(screenPx * dpr) / dpr;
  return snappedScreenPx / scale;
}

/**
 * Anchor position in design pixels (left + bottom), snapped for crisp rendering
 * after the stage scale transform.
 */
export function snapAnchorDesignPx(
  xNorm: number,
  yNorm: number,
  designWidth: number,
  designHeight: number,
  scale: number,
): { left: number; bottom: number } {
  return {
    left: snapDesignLength(xNorm * designWidth, scale),
    bottom: snapDesignLength((1 - yNorm) * designHeight, scale),
  };
}

/** Snap a normalized anchor (x/y in 0..1 layout space) to the device pixel grid. */
export function snapNormalizedPosition(
  xNorm: number,
  yNorm: number,
  designWidth: number,
  designHeight: number,
  scale: number,
): { x: number; y: number } {
  const { left, bottom } = snapAnchorDesignPx(
    xNorm,
    yNorm,
    designWidth,
    designHeight,
    scale,
  );
  return {
    x: designWidth > 0 ? left / designWidth : xNorm,
    y: designHeight > 0 ? 1 - bottom / designHeight : yNorm,
  };
}

/** Snap a normalized X (0–1 across design width) to the device pixel grid. */
export function snapNormalizedX(
  xNorm: number,
  designWidth: number,
  scale: number,
): number {
  if (designWidth <= 0) return xNorm;
  const designPx = xNorm * designWidth;
  return snapDesignLength(designPx, scale) / designWidth;
}

/** Snap a normalized Y (layout y, 0=bottom) to the device pixel grid. */
export function snapNormalizedY(
  yNorm: number,
  designHeight: number,
  scale: number,
): number {
  if (designHeight <= 0) return yNorm;
  const fromBottom = (1 - yNorm) * designHeight;
  const snapped = snapDesignLength(fromBottom, scale);
  return 1 - snapped / designHeight;
}
