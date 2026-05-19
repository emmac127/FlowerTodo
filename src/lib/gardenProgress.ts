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
export const GARDEN_MAX_LEVEL = 12;

/** Scene milestone count from garden progress (level 1 = 3 tasks, then 5 per level). */
export function getSceneMilestoneCount(completedCount: number): number {
  const level = getGardenLevel(completedCount);
  if (level <= 0) return 0;
  const { planted } = getGardenCycleProgress(completedCount);
  const base = level === 1 ? 0 : LEVEL_1_TASKS + (level - 2) * LEVEL_2_PLUS_TASKS;
  return Math.min(base + planted, GARDEN_MAX_LEVEL);
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
