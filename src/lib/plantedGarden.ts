// Garden level math shared by the scene builder, progress meter, and dev tools.

/** Tasks to complete in garden level 1 (first bloom on the 3rd). */
export const LEVEL_1_TASKS = 3;

/** Tasks per level from level 2 onward. */
export const LEVEL_2_PLUS_TASKS = 5;

/** @deprecated Use {@link getTasksForGardenLevel} — level 2+ default. */
export const FLOWERS_PER_GARDEN_LEVEL = LEVEL_2_PLUS_TASKS;

export function getTasksForGardenLevel(level: number): number {
  if (level <= 1) return LEVEL_1_TASKS;
  return LEVEL_2_PLUS_TASKS;
}

/** Completions required before a garden level begins (level 1 starts at 0). */
export function getCompletionsBeforeLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_1_TASKS + (level - 2) * LEVEL_2_PLUS_TASKS;
}

/**
 * Current garden level. Finishing 3 tasks completes level 1 and starts level 2.
 * Level 1: tasks 1–2 in progress; level 2 begins at 3 completions; then +5 per level.
 */
export function getGardenLevel(completedCount: number): number {
  if (completedCount <= 0) return 0;
  if (completedCount < LEVEL_1_TASKS) return 1;
  const afterLevel1 = completedCount - LEVEL_1_TASKS;
  return 2 + Math.floor(afterLevel1 / LEVEL_2_PLUS_TASKS);
}

/** Progress within the current garden level (0 right after a level-up). */
export function getGardenCycleProgress(completedCount: number): {
  planted: number;
  max: number;
} {
  const level = getGardenLevel(completedCount);
  if (level <= 0) {
    return { planted: 0, max: LEVEL_1_TASKS };
  }
  const max = getTasksForGardenLevel(level);
  const planted = completedCount - getCompletionsBeforeLevel(level);
  return { planted, max };
}

/** True when this completion finishes a garden level (3rd task, then every 5). */
export function isGardenLevelComplete(completionIndex: number): boolean {
  if (completionIndex === LEVEL_1_TASKS) return true;
  if (completionIndex > LEVEL_1_TASKS) {
    return (completionIndex - LEVEL_1_TASKS) % LEVEL_2_PLUS_TASKS === 0;
  }
  return false;
}
