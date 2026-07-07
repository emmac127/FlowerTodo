import { filterUnlockedSurfaces } from './surfaces';
import type {
  BirdAnimationsDef,
  BirdBehaviorDef,
  BirdStageImage,
  GardenDefinition,
  PlacedBirdBehavior,
  SurfaceRect,
  SurfacesConfig,
} from './types';
import type { GardenConfig } from './loadConfig';
import { resolveGardenAsset } from './gardenAsset';

const DEFAULT_HOP_INTERVAL = { min: 2, max: 5 };
/** Normalized design-width units per second while hopping. */
const DEFAULT_HOP_NORM_PER_SEC = 0.08;
const DEFAULT_WINGFLAP_CHANCE = 0.25;
const DEFAULT_PECK_CHANCE = 0.2;
const DEFAULT_FRAME_DURATION = 0.15;

function defaultHopChance(wingflapChance: number): number {
  return Math.max(0.15, 1 - wingflapChance);
}

/** Max normalized distance from a food rect edge for peck to be allowed. */
export const PECK_NEAR_DISTANCE = 0.035;

/** Shortest distance from a point to a surface rectangle (0 when inside). */
export function distanceToSurfaceRect(
  x: number,
  y: number,
  rect: SurfaceRect,
): number {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return Math.hypot(x - closestX, y - closestY);
}

/** True when the bird anchor is on or very near a food rectangle. */
export function isNearFoodSurface(
  x: number,
  y: number,
  foodSurfaces: SurfaceRect[],
  maxDistance = PECK_NEAR_DISTANCE,
): boolean {
  return foodSurfaces.some(
    (rect) => distanceToSurfaceRect(x, y, rect) <= maxDistance,
  );
}

/** Center of the nearest food rect the bird is close enough to peck at. */
export function nearestNearbyFoodCenter(
  x: number,
  y: number,
  foodSurfaces: SurfaceRect[],
  maxDistance = PECK_NEAR_DISTANCE,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (const f of foodSurfaces) {
    if (distanceToSurfaceRect(x, y, f) > maxDistance) continue;
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestDist) {
      bestDist = d;
      best = { x: cx, y: cy };
    }
  }
  return best;
}

/** Whether peck is allowed at the bird's current position. */
export function canPeckAtPosition(
  behavior: PlacedBirdBehavior,
  x: number,
  y: number,
): boolean {
  return (
    behavior.peckFrames.length > 1 &&
    behavior.foodSurfaces.length > 0 &&
    isNearFoodSurface(x, y, behavior.foodSurfaces)
  );
}

/**
 * Surfaces a bird may use for hopping or pecking.
 * Uses every rectangle in the pool unless the layout entry sets an override id.
 */
function resolveSurfaceList(
  surfaces: SurfacesConfig | undefined,
  kind: 'hop' | 'food',
  layoutSurfaceId?: string,
  completedCount?: number,
  config?: GardenConfig,
): SurfaceRect[] {
  if (!surfaces) return [];
  let pool = kind === 'hop' ? surfaces.hop : surfaces.food;
  if (pool.length === 0) return [];

  if (completedCount != null && config) {
    pool = filterUnlockedSurfaces(pool, completedCount, config);
  }
  if (pool.length === 0) return [];

  if (layoutSurfaceId) {
    const match = pool.find((r) => r.id === layoutSurfaceId);
    if (match) return [match];
  }

  return [...pool];
}

function framesFromAnim(
  anim: { frames?: string[] } | undefined,
  fallback: string,
): string[] {
  if (anim?.frames && anim.frames.length > 0) return anim.frames;
  return [fallback];
}

/** Resolve runtime bird behavior for a placed ambient bird. */
export function resolveBirdBehavior(
  def: GardenDefinition,
  stage: BirdStageImage | undefined,
  src: string,
  layoutHopId?: string,
  layoutFoodId?: string,
  surfaces?: SurfacesConfig,
  completedCount?: number,
  config?: GardenConfig,
): PlacedBirdBehavior | undefined {
  if (def.mode !== 'birdAmbient') return undefined;

  const hopEnabled = stage?.hopEnabled !== false;
  const behavior: BirdBehaviorDef = def.behavior ?? {};
  const animations: BirdAnimationsDef = def.animations ?? {};

  const idleFrames = framesFromAnim(
    animations.idle,
    animations.wingflap?.frames?.[0] ?? src,
  );
  const wingflapFrames = framesFromAnim(animations.wingflap, idleFrames[0]!);
  const peckFrames = framesFromAnim(animations.peck, idleFrames[0]!);

  const hopSurfaces = resolveSurfaceList(
    surfaces,
    'hop',
    layoutHopId,
    completedCount,
    config,
  );
  const foodSurfaces = resolveSurfaceList(
    surfaces,
    'food',
    layoutFoodId,
    completedCount,
    config,
  );

  const wingflapChance = behavior.wingflapChance ?? DEFAULT_WINGFLAP_CHANCE;

  return {
    hopEnabled,
    idleFrame: behavior.idleFrame ?? 0,
    idleFrames,
    wingflapFrames,
    peckFrames,
    wingflapFrameDuration:
      animations.wingflap?.frameDuration ?? DEFAULT_FRAME_DURATION,
    peckFrameDuration: animations.peck?.frameDuration ?? DEFAULT_FRAME_DURATION,
    hopIntervalMin: behavior.hopIntervalSec?.min ?? DEFAULT_HOP_INTERVAL.min,
    hopIntervalMax: behavior.hopIntervalSec?.max ?? DEFAULT_HOP_INTERVAL.max,
    hopNormPerSec: behavior.hopNormPerSec ?? DEFAULT_HOP_NORM_PER_SEC,
    hopChance: behavior.hopChance ?? defaultHopChance(wingflapChance),
    wingflapChance,
    peckChance: behavior.peckChance ?? DEFAULT_PECK_CHANCE,
    flyChance: behavior.flyChance,
    hopSurfaces,
    foodSurfaces,
  };
}

/** Unlock display image for a level definition. */
export function getUnlockImageForDefinition(def: GardenDefinition): string | null {
  if (def.unlockImage) return def.unlockImage;
  if (def.onLevelStart?.src) return def.onLevelStart.src;
  const stages = def.stages ?? [];
  for (const stage of stages) {
    const resolved = resolveGardenAsset(stage);
    if (resolved?.src) return resolved.src;
  }
  const asset = resolveGardenAsset(def.asset as string | undefined);
  return asset?.src ?? null;
}
