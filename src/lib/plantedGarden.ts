// Garden level math shared by the scene builder, progress meter, and dev tools.
//
// Vocab:
//   Level  — one entry in levels.yaml (one flower definition).
//   Stage  — progression within a level (1 .. budget). Stage 0 is pre-start only.
//   Budget — max stage for a level (meter size). When stage === budget the level
//            is full; the next task completion starts the following level at stage 1.
//
// Level start: a new level begins at stage 0, then immediately advances to stage 1
// (mascot plants the first item — planter base, first scatter, or stages[0]).
// Further stages advance only on task completions.

import {
  defaultGardenConfig,
  type GardenConfig,
} from './garden/loadConfig';

/** Default budget for scatterPerCompletion when `scatterAssets` is omitted. */
export const SCATTER_DEFAULT_BUDGET = 5;

/** @deprecated Prefer {@link SCATTER_DEFAULT_BUDGET}. */
export const LEVEL_1_TASKS = SCATTER_DEFAULT_BUDGET;

/** @deprecated Prefer {@link SCATTER_DEFAULT_BUDGET}. */
export const LEVEL_2_PLUS_TASKS = SCATTER_DEFAULT_BUDGET;

/** @deprecated Use {@link getLevelBudget} — scatter / fallback default. */
export const FLOWERS_PER_GARDEN_LEVEL = SCATTER_DEFAULT_BUDGET;

/** Default budget when a level has no usable definition fields. */
export function getTasksForGardenLevel(_level?: number): number {
  return SCATTER_DEFAULT_BUDGET;
}

/**
 * How many scatter slots a scatterPerCompletion level places.
 * Uses `scatterAssets.length` when set; otherwise {@link SCATTER_DEFAULT_BUDGET}.
 */
export function getScatterSlotCount(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const def = config.getLevelDefinition(level);
  if (def?.mode !== 'scatterPerCompletion') return SCATTER_DEFAULT_BUDGET;
  const scatterCount = def.scatterAssets?.length ?? 0;
  if (scatterCount > 0) return scatterCount;
  return SCATTER_DEFAULT_BUDGET;
}

/**
 * Budget for a garden level: the maximum stage index (1 .. budget).
 * This is the meter max and the stage value when the level is full.
 */
export function getLevelBudget(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const def = config.getLevelDefinition(level);
  if (!def) return SCATTER_DEFAULT_BUDGET;

  switch (def.mode) {
    case 'multiStage': {
      const stageCount = def.stages?.length ?? 0;
      return Math.max(1, stageCount || SCATTER_DEFAULT_BUDGET);
    }
    case 'birdAmbient': {
      const instances = config.getLevelBirdInstances(level);
      if (instances && instances.length > 1) return instances.length;
      const stageCount = def.stages?.length ?? 0;
      return Math.max(1, stageCount || SCATTER_DEFAULT_BUDGET);
    }
    case 'birdPerch': {
      // onLevelStart (perch) is stage 1; each stages[] entry is a later stage.
      const stageCount = def.stages?.length ?? 0;
      if (def.onLevelStart) return Math.max(1, stageCount + 1);
      return Math.max(1, stageCount || SCATTER_DEFAULT_BUDGET);
    }
    case 'scatterPerCompletion':
      return getScatterSlotCount(level, config);
    case 'planter': {
      const fills = def.perCompletion?.max ?? SCATTER_DEFAULT_BUDGET;
      return Math.max(1, fills + 1);
    }
    case 'planterSequence': {
      const fills = def.fills?.length ?? 0;
      return Math.max(1, fills + 1);
    }
    default:
      return SCATTER_DEFAULT_BUDGET;
  }
}

/**
 * Completions spent on a level while it is active (equals {@link getLevelBudget}).
 * Kept as a named export for call sites that talk about "completion budget".
 */
export function getLevelCompletionBudget(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  return getLevelBudget(level, config);
}

/** Completions required before a garden level can reach stage 1 (level 1 → 0). */
export function getCompletionsBeforeLevel(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let L = 1; L < level; L++) {
    sum += getLevelBudget(L, config);
  }
  return sum;
}

/** Current garden level from lifetime completion count. */
export function getGardenLevel(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  if (completedCount <= 0) {
    // Mode2 begins with level 1 assets (bird bath) visible before any tasks.
    if (config.phase === 'mode2') {
      const levels = config.getConfiguredLevels();
      if (levels.length > 0) return levels[0]!;
    }
    return 0;
  }
  const levels = config.getConfiguredLevels();
  // Level L is active while before(L) < count <= before(L) + budget(L).
  // Equivalently: highest L with count > before(L).
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i]!;
    if (completedCount > getCompletionsBeforeLevel(level, config)) {
      return level;
    }
  }
  return 0;
}

/**
 * In-level stage (0 .. budget). Stage 0 is pre-start; stage 1+ are planted.
 * Mode2 at zero completions is treated as stage 1 so the bird bath shows.
 */
export function getInLevelScore(
  completedCount: number,
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  const budget = getLevelBudget(level, config);
  if (
    completedCount <= 0 &&
    config.phase === 'mode2' &&
    level === (config.getConfiguredLevels()[0] ?? 1)
  ) {
    return Math.min(1, budget);
  }
  const raw = completedCount - getCompletionsBeforeLevel(level, config);
  return Math.max(0, Math.min(raw, budget));
}

/**
 * User-facing stage count for the progress meter — same as {@link getLevelBudget}.
 */
export function getGardenStageMeterMax(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  return getLevelBudget(level, config);
}

/** Progress within the current garden level (bubbles filled = current stage). */
export function getGardenCycleProgress(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): {
  planted: number;
  max: number;
} {
  const level = getGardenLevel(completedCount, config);
  if (level <= 0) {
    return { planted: 0, max: getLevelBudget(1, config) };
  }
  const max = getLevelBudget(level, config);
  const planted = getInLevelScore(completedCount, level, config);
  return { planted: Math.min(planted, max), max };
}

/**
 * Highest in-level stage (equals {@link getLevelBudget}).
 * Used to cap which stage / scatter / fill slot is visible.
 */
export function getMaxInLevelScore(
  level: number,
  config: GardenConfig = defaultGardenConfig,
): number {
  return getLevelBudget(level, config);
}

/**
 * True when this completion enters a new level at stage 1 (level-up beat).
 * The previous level was full (stage === budget); this task starts the next.
 */
export function isGardenLevelComplete(
  completionIndex: number,
  config: GardenConfig = defaultGardenConfig,
): boolean {
  if (completionIndex <= 0) return false;
  for (const level of config.getConfiguredLevels()) {
    if (
      level > 1 &&
      completionIndex === getCompletionsBeforeLevel(level, config) + 1
    ) {
      return true;
    }
  }
  return false;
}

/** Total completions required to finish every configured level. */
export function getTotalCompletionsToFinishGarden(
  config: GardenConfig = defaultGardenConfig,
): number {
  const levels = config.getConfiguredLevels();
  if (levels.length === 0) return 0;
  const maxLevel = levels[levels.length - 1]!;
  return (
    getCompletionsBeforeLevel(maxLevel, config) + getLevelBudget(maxLevel, config)
  );
}

/** True when the final stage of the final configured level is complete. */
export function isGardenFullyComplete(
  completionIndex: number,
  config: GardenConfig = defaultGardenConfig,
): boolean {
  if (completionIndex <= 0) return false;
  return completionIndex >= getTotalCompletionsToFinishGarden(config);
}
