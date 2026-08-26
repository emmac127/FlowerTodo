import { getCompletionsBeforeLevel, getMaxInLevelScore } from '../plantedGarden';
import type { GardenConfig } from './loadConfig';
import type { SurfaceRect, SurfacesConfig } from './types';

/** True when the player has reached the surface's unlock level and in-level stage. */
export function isSurfaceUnlocked(
  rect: SurfaceRect,
  completedCount: number,
  config: GardenConfig,
): boolean {
  const unlockLevel = rect.unlockLevel ?? 1;
  // unlockStage 0 = level start → treat as stage 1 (first planted stage).
  const unlockStage = Math.max(1, rect.unlockStage ?? 0);
  if (unlockLevel < 1) return true;
  const threshold =
    getCompletionsBeforeLevel(unlockLevel, config) + unlockStage;
  return completedCount >= threshold;
}

export function filterUnlockedSurfaces(
  surfaces: SurfaceRect[],
  completedCount: number,
  config: GardenConfig,
): SurfaceRect[] {
  return surfaces.filter((rect) =>
    isSurfaceUnlocked(rect, completedCount, config),
  );
}

/** Hop/food pools visible at the current garden progress. */
export function filterSurfacesForProgress(
  surfaces: SurfacesConfig | undefined,
  completedCount: number,
  config: GardenConfig,
): SurfacesConfig {
  if (!surfaces) return { hop: [], food: [] };
  return {
    hop: filterUnlockedSurfaces(surfaces.hop, completedCount, config),
    food: filterUnlockedSurfaces(surfaces.food, completedCount, config),
  };
}

export function surfaceUnlockLabel(
  rect: SurfaceRect,
  config: GardenConfig,
): string {
  const level = rect.unlockLevel ?? 1;
  const stage = rect.unlockStage ?? 0;
  const def = config.getLevelDefinition(level);
  const levelName = def?.name ? `L${level} ${def.name}` : `L${level}`;
  if (stage <= 0) return levelName;
  return `${levelName} stage ${stage}`;
}

export function maxUnlockStageForLevel(
  level: number,
  config: GardenConfig,
): number {
  return getMaxInLevelScore(level, config);
}

/** Level that unlocks this surface (defaults to 1). */
export function surfaceUnlockLevel(rect: SurfaceRect): number {
  return rect.unlockLevel ?? 1;
}

/** Shift hop/food rects that unlock at the given level by a normalized delta. */
export function offsetSurfacesForLevel(
  surfaces: SurfacesConfig,
  level: number,
  deltaX: number,
  deltaY: number,
): SurfacesConfig {
  if (deltaX === 0 && deltaY === 0) return surfaces;
  const shift = (rect: SurfaceRect): SurfaceRect =>
    surfaceUnlockLevel(rect) === level
      ? { ...rect, x: rect.x + deltaX, y: rect.y + deltaY }
      : rect;
  return {
    hop: surfaces.hop.map(shift),
    food: surfaces.food.map(shift),
  };
}
