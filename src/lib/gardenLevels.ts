import type { GardenSeed } from './gardenSeed';
import {
  FIXED_SLOT_X,
  getGardenCycleProgress,
  getGardenLevel,
  LEVEL_1_TASKS,
  LEVEL_2_PLUS_TASKS,
} from './plantedGarden';
import type { SeedGrowthStage } from './seedGrowth';

/** Petal count for a fully open moonflower or sunflower bloom in the garden. */
export const MOON_SUN_FULL_PETAL_COUNT = 8;

export const LEVEL_1_CENTER_X = 200;

/** Total completions needed to finish a garden level. */
export function getLevelEndCompletionCount(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return LEVEL_1_TASKS;
  return LEVEL_1_TASKS + (level - 1) * LEVEL_2_PLUS_TASKS;
}

/** Fixed X position for a level's flower in the garden SVG. */
export function getLevelFlowerX(level: number): number {
  if (level <= 1) return LEVEL_1_CENTER_X;
  const slot = level - 2;
  return FIXED_SLOT_X[Math.min(slot, FIXED_SLOT_X.length - 1)]!;
}

/** Full bloom stage when a level is finished (3 for level 1, 5 for later levels). */
export function getMaxGrowthStageForLevel(level: number): SeedGrowthStage {
  if (level <= 1) return 3;
  return 5;
}

/** Moon and sun flowers show every petal slot once they have fully bloomed for their level. */
export function moonSunHasFullPetalBloom(
  seed: GardenSeed,
  growthStage: SeedGrowthStage,
  options: { planted: boolean; gardenLevel: number },
): boolean {
  if (seed !== 'moonflower' && seed !== 'sunflower') return false;
  if (options.planted) return true;
  return growthStage >= getMaxGrowthStageForLevel(Math.max(1, options.gardenLevel));
}

/** Levels that are fully complete and stay planted forever. */
export function getCompletedGardenLevels(gardenProgressCount: number): number[] {
  const levels: number[] = [];
  const maxLevel = getGardenLevel(gardenProgressCount);
  for (let level = 1; level <= maxLevel; level++) {
    if (gardenProgressCount >= getLevelEndCompletionCount(level)) {
      levels.push(level);
    }
  }
  return levels;
}

/**
 * Show the in-progress sprout for the current (unfinished) level.
 * When `hasCurrentLevelSeed` is true, also show a stage-0 sprout right after seed
 * selection so the player can see where the new plant will grow.
 */
export function shouldShowActiveLevelGrower(
  gardenProgressCount: number,
  hasCurrentLevelSeed = false,
): boolean {
  const level = getGardenLevel(gardenProgressCount);
  if (level === 0) return hasCurrentLevelSeed;
  if (gardenProgressCount >= getLevelEndCompletionCount(level)) return false;
  const { planted } = getGardenCycleProgress(gardenProgressCount);
  if (planted === 0) return hasCurrentLevelSeed;
  return true;
}

export function getActiveLevelFlowerX(gardenProgressCount: number): number {
  const level = getGardenLevel(gardenProgressCount);
  return getLevelFlowerX(Math.max(1, level));
}
