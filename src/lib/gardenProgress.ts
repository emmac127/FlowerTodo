import {
  getGardenLevel,
  getGardenCycleProgress,
  FLOWERS_PER_GARDEN_LEVEL,
  LEVEL_1_TASKS,
  LEVEL_2_PLUS_TASKS,
} from './plantedGarden';

export {
  getGardenLevel,
  getGardenCycleProgress,
  FLOWERS_PER_GARDEN_LEVEL,
  LEVEL_1_TASKS,
  LEVEL_2_PLUS_TASKS,
};

/** Core scene (grass, pond, tree, bridge) finishes by this many completed tasks. */
export const GARDEN_CORE_COMPLETE_AT = 6;

/** Max garden level shown in the header. */
export const GARDEN_MAX_LEVEL = 16;

/** Scene milestone count from garden progress (sum of per-level budgets in levels.yaml). */
export function getSceneMilestoneCount(
  completedCount: number,
  maxLevel: number = GARDEN_MAX_LEVEL,
): number {
  if (completedCount <= 0) return 0;
  return Math.min(completedCount, maxLevel);
}

export interface GardenLayers {
  grass: boolean;
}

export function getGardenLayers(completedCount: number): GardenLayers {
  const n = Math.max(0, getSceneMilestoneCount(completedCount));

  return {
    grass: n >= 1,
  };
}
