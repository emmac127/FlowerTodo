import type { BirdCollisionBox, SurfaceRect } from './types';

/** Fallback footprint when a bird has no authored collision box. */
const DEFAULT_FOOTPRINT_WIDTH = 0.018;
const DEFAULT_FOOTPRINT_HEIGHT = 0.05;

/** Mirror a collision box when the bird sprite is flipped horizontally. */
export function flipBirdCollisionBox(box: BirdCollisionBox): BirdCollisionBox {
  return {
    offsetX: -box.offsetX - box.width,
    offsetY: box.offsetY,
    width: box.width,
    height: box.height,
  };
}

/** World-space collision rect from a bird anchor and layout offset box. */
export function worldBirdCollisionRect(
  anchorX: number,
  anchorY: number,
  box: BirdCollisionBox,
  flipX = false,
): SurfaceRect {
  const resolved = flipX ? flipBirdCollisionBox(box) : box;
  return {
    id: '',
    x: anchorX + resolved.offsetX,
    y: anchorY + resolved.offsetY,
    width: resolved.width,
    height: resolved.height,
  };
}

/**
 * Collision footprint at an anchor — authored box when present, otherwise a
 * small default so birds without boxes still block hop destinations.
 */
export function birdFootprintRect(
  id: string,
  anchorX: number,
  anchorY: number,
  collisionBox: BirdCollisionBox | undefined,
  flipX = false,
): SurfaceRect {
  if (collisionBox) {
    return {
      ...worldBirdCollisionRect(anchorX, anchorY, collisionBox, flipX),
      id,
    };
  }
  return {
    id,
    x: anchorX - DEFAULT_FOOTPRINT_WIDTH / 2,
    y: anchorY - DEFAULT_FOOTPRINT_HEIGHT,
    width: DEFAULT_FOOTPRINT_WIDTH,
    height: DEFAULT_FOOTPRINT_HEIGHT,
  };
}

/** Convert an absolute canvas rect to offsets from a bird anchor.
 * When the bird is mirrored, `rect` is in flipped world space — the returned
 * box is always stored in unflipped (facing-right) local coordinates.
 */
export function collisionBoxFromWorldRect(
  anchorX: number,
  anchorY: number,
  rect: Pick<SurfaceRect, 'x' | 'y' | 'width' | 'height'>,
  flipX = false,
): BirdCollisionBox {
  const raw: BirdCollisionBox = {
    offsetX: rect.x - anchorX,
    offsetY: rect.y - anchorY,
    width: rect.width,
    height: rect.height,
  };
  return flipX ? flipBirdCollisionBox(raw) : raw;
}

export function rectsOverlap(a: SurfaceRect, b: SurfaceRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** True when this bird's anchor or collision box overlaps another bird's box. */
export function hopAnchorOverlapsOthers(
  anchorX: number,
  anchorY: number,
  collisionBox: BirdCollisionBox | undefined,
  otherRects: SurfaceRect[],
  flipX = false,
): boolean {
  if (otherRects.length === 0) return false;
  const self = birdFootprintRect('self', anchorX, anchorY, collisionBox, flipX);
  return otherRects.some((other) => rectsOverlap(self, other));
}

/** Pick a hop point on surfaces that does not overlap other bird collision boxes. */
export function randomHopPointAvoidingCollisions(
  surfaces: SurfaceRect[],
  collisionBox: BirdCollisionBox | undefined,
  otherRects: SurfaceRect[],
  fromX?: number,
  maxAttempts = 96,
): { x: number; y: number } | null {
  if (surfaces.length === 0) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const surface = surfaces[Math.floor(Math.random() * surfaces.length)]!;
    const x = surface.x + Math.random() * surface.width;
    const y = surface.y + Math.random() * surface.height;
    const flipX = fromX != null ? x < fromX : false;
    if (!hopAnchorOverlapsOthers(x, y, collisionBox, otherRects, flipX)) {
      return { x, y };
    }
  }

  return null;
}
