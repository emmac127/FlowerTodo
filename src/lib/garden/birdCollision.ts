import type { BirdCollisionBox, SurfaceRect } from './types';

/** World-space collision rect from a bird anchor and layout offset box. */
export function worldBirdCollisionRect(
  anchorX: number,
  anchorY: number,
  box: BirdCollisionBox,
): SurfaceRect {
  return {
    id: '',
    x: anchorX + box.offsetX,
    y: anchorY + box.offsetY,
    width: box.width,
    height: box.height,
  };
}

/** Convert an absolute canvas rect to offsets from a bird anchor. */
export function collisionBoxFromWorldRect(
  anchorX: number,
  anchorY: number,
  rect: Pick<SurfaceRect, 'x' | 'y' | 'width' | 'height'>,
): BirdCollisionBox {
  return {
    offsetX: rect.x - anchorX,
    offsetY: rect.y - anchorY,
    width: rect.width,
    height: rect.height,
  };
}

export function rectsOverlap(a: SurfaceRect, b: SurfaceRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function hopPointOverlapsOthers(
  anchorX: number,
  anchorY: number,
  collisionBox: BirdCollisionBox | undefined,
  otherRects: SurfaceRect[],
): boolean {
  if (!collisionBox) return false;
  const self = worldBirdCollisionRect(anchorX, anchorY, collisionBox);
  return otherRects.some((other) => rectsOverlap(self, other));
}

/** Pick a hop point on surfaces that does not overlap other bird collision boxes. */
export function randomHopPointAvoidingCollisions(
  surfaces: SurfaceRect[],
  collisionBox: BirdCollisionBox | undefined,
  otherRects: SurfaceRect[],
  maxAttempts = 24,
): { x: number; y: number } | null {
  if (surfaces.length === 0) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const surface = surfaces[Math.floor(Math.random() * surfaces.length)]!;
    const x = surface.x + Math.random() * surface.width;
    const y = surface.y + Math.random() * surface.height;
    if (!hopPointOverlapsOthers(x, y, collisionBox, otherRects)) {
      return { x, y };
    }
  }

  return null;
}
