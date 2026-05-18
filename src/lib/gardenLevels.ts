import {
  FIXED_SLOT_X,
  getGardenCycleProgress,
  getGardenLevel,
  LEVEL_1_TASKS,
  LEVEL_2_PLUS_TASKS,
} from './plantedGarden';
import type { SeedGrowthStage } from './seedGrowth';

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

/** Show the in-progress sprout for the current (unfinished) level. */
export function shouldShowActiveLevelGrower(gardenProgressCount: number): boolean {
  const level = getGardenLevel(gardenProgressCount);
  if (level === 0) return true;
  const { planted } = getGardenCycleProgress(gardenProgressCount);
  if (planted === 0) return false;
  return gardenProgressCount < getLevelEndCompletionCount(level);
}

export function getActiveLevelFlowerX(gardenProgressCount: number): number {
  const level = getGardenLevel(gardenProgressCount);
  return getLevelFlowerX(Math.max(1, level));
}
