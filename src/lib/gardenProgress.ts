import { getGardenLevel, getGardenCycleProgress, FLOWERS_PER_GARDEN_LEVEL } from './plantedGarden';

export { getGardenLevel, getGardenCycleProgress, FLOWERS_PER_GARDEN_LEVEL };

/** Core scene (grass, pond, tree, bridge) finishes by this many completed tasks. */
export const GARDEN_CORE_COMPLETE_AT = 6;

/** Max garden level shown in the header (each level = 5 planted flowers). */
export const GARDEN_MAX_LEVEL = 12;

/** Scene milestone count from garden level (5 tasks per level). */
export function getSceneMilestoneCount(completedCount: number): number {
  const level = getGardenLevel(completedCount);
  if (level <= 0) return 0;
  return Math.min(level * 5, GARDEN_MAX_LEVEL);
}

export interface GardenLayers {
  grass: boolean;
  grassDetail: boolean;
}

export function getGardenLayers(completedCount: number): GardenLayers {
  const n = Math.max(0, getSceneMilestoneCount(completedCount));

  return {
    grass: n >= 1,
    grassDetail: n >= 2,
  };
}
