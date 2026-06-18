// Garden level math shared by the scene builder, progress meter, and dev tools.

import {
  defaultGardenConfig,
  type GardenConfig,
} from './garden/loadConfig';

/** Default tasks per level when levels.yaml does not define a level. */
export const LEVEL_1_TASKS = 3;

/** Default tasks per level from level 2 onward (scatter / fallback). */
export const LEVEL_2_PLUS_TASKS = 5;

/** @deprecated Use {@link getTasksForGardenLevel} — level 2+ default. */
export const FLOWERS_PER_GARDEN_LEVEL = LEVEL_2_PLUS_TASKS;

export function getTasksForGardenLevel(level: number): number {
  if (level <= 1) return LEVEL_1_TASKS;
  return LEVEL_2_PLUS_TASKS;
}

/**
 * Scatter levels: when `scatterAssets` has more entries than the default task
 * count, the level lasts long enough to place every listed asset.
 */
export function getScatterSlotCount(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const def = config.getLevelDefinition(level);
  const defaultTasks = getTasksForGardenLevel(level);
  if (def?.mode !== 'scatterPerCompletion') return defaultTasks;
  const scatterCount = def.scatterAssets?.length ?? 0;
  if (scatterCount > 0) return scatterCount;
  return defaultTasks;
}

/**
 * Task completions required to finish a garden level and advance to the next.
 * multiStage: one completion per stage after the first (7 stages → 6 completions).
 */
export function getLevelCompletionBudget(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const def = config.getLevelDefinition(level);
  if (def?.mode === 'multiStage') {
    return Math.max(1, getMaxInLevelScore(level, config));
  }
  if (def?.mode === 'scatterPerCompletion') {
    return getScatterSlotCount(level, config);
  }
  if (def?.mode === 'planter') {
    return def.perCompletion?.max ?? getTasksForGardenLevel(level);
  }
  if (def?.mode === 'planterSequence') {
    return def.fills?.length ?? getTasksForGardenLevel(level);
  }
  return getTasksForGardenLevel(level);
}

/** Completions required before a garden level begins (level 1 starts at 0). */
export function getCompletionsBeforeLevel(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let L = 1; L < level; L++) {
    sum += getLevelCompletionBudget(L, config);
  }
  return sum;
}

/** Current garden level from lifetime completion count. */
export function getGardenLevel(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  if (completedCount <= 0) return 0;
  const levels = config.getConfiguredLevels();
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i]!;
    if (completedCount >= getCompletionsBeforeLevel(level, config)) {
      return level;
    }
  }
  return 0;
}

/** Progress within the current garden level (0 right after a level-up). */
export function getGardenCycleProgress(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): {
  planted: number;
  max: number;
} {
  const level = getGardenLevel(completedCount, config);
  if (level <= 0) {
    return { planted: 0, max: getLevelCompletionBudget(1, config) };
  }
  const max = getLevelCompletionBudget(level, config);
  const planted = completedCount - getCompletionsBeforeLevel(level, config);
  return { planted, max };
}

/**
 * Highest in-level score (stage index for multiStage, item count for scatter).
 * Used to cap which stage or scatter slot is visible.
 */
export function getMaxInLevelScore(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const def = config.getLevelDefinition(level);
  if (def?.mode === 'multiStage') {
    const stageCount = def.stages?.length ?? 0;
    if (config.variant === 'dad') {
      return stageCount;
    }
    return Math.max(0, stageCount - 1);
  }
  if (def?.mode === 'planter') {
    return def.perCompletion?.max ?? getTasksForGardenLevel(level);
  }
  if (def?.mode === 'planterSequence') {
    return def.fills?.length ?? getTasksForGardenLevel(level);
  }
  if (def?.mode === 'scatterPerCompletion') {
    return getScatterSlotCount(level, config);
  }
  return getTasksForGardenLevel(level);
}

/** True when this completion finishes a garden level. */
export function isGardenLevelComplete(
  completionIndex: number,
  config: GardenConfig = defaultGardenConfig,
): boolean {
  if (completionIndex <= 0) return false;
  for (const level of config.getConfiguredLevels()) {
    if (level > 1 && completionIndex === getCompletionsBeforeLevel(level, config)) {
      return true;
    }
  }
  return false;
}
