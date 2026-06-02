// Garden level math shared by the scene builder, progress meter, and dev tools.

import { getConfiguredLevels, getLevelDefinition } from './garden/loadConfig';

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
 * Task completions required to finish a garden level and advance to the next.
 * multiStage: one completion per stage after the first (7 stages → 6 completions).
 */
export function getLevelCompletionBudget(level: number): number {
  const def = getLevelDefinition(level);
  if (def?.mode === 'multiStage') {
    return Math.max(1, getMaxInLevelScore(level));
  }
  if (def?.mode === 'planter') {
    return def.perCompletion?.max ?? getTasksForGardenLevel(level);
  }
  return getTasksForGardenLevel(level);
}

/** Completions required before a garden level begins (level 1 starts at 0). */
export function getCompletionsBeforeLevel(level: number): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let L = 1; L < level; L++) {
    sum += getLevelCompletionBudget(L);
  }
  return sum;
}

/** Current garden level from lifetime completion count. */
export function getGardenLevel(completedCount: number): number {
  if (completedCount <= 0) return 0;
  const levels = getConfiguredLevels();
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i]!;
    if (completedCount >= getCompletionsBeforeLevel(level)) {
      return level;
    }
  }
  return 0;
}

/** Progress within the current garden level (0 right after a level-up). */
export function getGardenCycleProgress(completedCount: number): {
  planted: number;
  max: number;
} {
  const level = getGardenLevel(completedCount);
  if (level <= 0) {
    return { planted: 0, max: getLevelCompletionBudget(1) };
  }
  const max = getLevelCompletionBudget(level);
  const planted = completedCount - getCompletionsBeforeLevel(level);
  return { planted, max };
}

/**
 * Highest in-level score (stage index for multiStage, item count for scatter).
 * Used to cap which stage or scatter slot is visible.
 */
export function getMaxInLevelScore(level: number): number {
  const def = getLevelDefinition(level);
  if (def?.mode === 'multiStage') {
    const stageCount = def.stages?.length ?? 0;
    return Math.max(0, stageCount - 1);
  }
  if (def?.mode === 'planter') {
    return def.perCompletion?.max ?? getTasksForGardenLevel(level);
  }
  return getTasksForGardenLevel(level);
}

/** True when this completion finishes a garden level. */
export function isGardenLevelComplete(completionIndex: number): boolean {
  if (completionIndex <= 0) return false;
  for (const level of getConfiguredLevels()) {
    if (level > 1 && completionIndex === getCompletionsBeforeLevel(level)) {
      return true;
    }
  }
  return false;
}
