import type { ElementKind, PlacedElement } from './types';

/** Cached intrinsic heights so layout-only edits (z-index, etc.) do not resize assets. */
const naturalHeightByMeasureKey = new Map<string, number>();

/** Stable key for one asset or animated sprite sheet (all frame URLs). */
export function elementMeasureKey(
  element: Pick<PlacedElement, 'src' | 'animation'>,
): string {
  if (element.animation?.frames.length) {
    return element.animation.frames.join('\0');
  }
  return element.src;
}

export function getCachedNaturalHeight(key: string): number | null {
  const height = naturalHeightByMeasureKey.get(key);
  return height != null && height > 0 ? height : null;
}

/** Remember the tallest measured frame for this asset; returns the cached value. */
export function cacheNaturalHeight(key: string, height: number): number {
  if (height <= 0) return getCachedNaturalHeight(key) ?? 0;
  const prev = naturalHeightByMeasureKey.get(key);
  const next = prev == null ? height : Math.max(prev, height);
  naturalHeightByMeasureKey.set(key, next);
  return next;
}

/**
 * Source pixel height that maps to {@link PlacedElement.heightDesign} at scale 1.
 * Keeps proportional sizing while matching the previous fixed-height layout scale.
 */
const NATURAL_HEIGHT_REFERENCE: Record<ElementKind, number> = {
  scatter: 240,
  multiStage: 600,
  planterBase: 240,
  planterFill: 240,
};

/** Pixel height before the image's natural dimensions are known. */
export function elementFallbackPixelHeight(
  element: Pick<PlacedElement, 'heightDesign' | 'scale'>,
): number {
  return element.heightDesign * element.scale;
}

/** Pixel height from the asset's intrinsic height and layout scale. */
export function elementPixelHeightFromNatural(
  naturalHeight: number,
  element: Pick<PlacedElement, 'kind' | 'scale' | 'heightDesign'>,
): number {
  if (naturalHeight <= 0) return 0;
  const reference = NATURAL_HEIGHT_REFERENCE[element.kind] ?? 320;
  return (
    naturalHeight * element.scale * (element.heightDesign / reference)
  );
}
