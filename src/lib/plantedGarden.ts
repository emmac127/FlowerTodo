import type { Task } from '../hooks/useTasks';
import type { GardenSeed } from './gardenSeed';
import { FLOWER_PALETTES, getGrowthTier } from './growthTier';

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

export interface PlantedFlowerSpec {
  completionIndex: number;
  x: number;
  growthAge: number;
  paletteIndex: number;
}

const GARDEN_VIEW_WIDTH = 400;

/** Base scale for bottom-garden flower geometry (stems, leaves, blooms). */
export const GARDEN_PLANT_SCALE = 2;

/** Legacy strip height (ground line uses {@link GARDEN_CELL_VIEW_HEIGHT}). */
export const GARDEN_STRIP_VIEW_HEIGHT = 220;

/** SVG viewBox width for an individual flower cell. */
export const GARDEN_CELL_VIEW_WIDTH = 200;

/**
 * Tall viewBox so pinwheel (2× stem + stacked blooms) fits above the ground line.
 * Ground sits near the bottom via {@link GARDEN_CELL_GROUND_Y}.
 */
export const GARDEN_CELL_VIEW_HEIGHT = 320;

const GROUND_INSET = 20;
export const GARDEN_CELL_GROUND_Y = GARDEN_CELL_VIEW_HEIGHT - GROUND_INSET;

/**
 * Target on-screen height for a fully bloomed flower, as a percentage of the
 * visible viewport height (dvh). Younger growth stages render proportionally
 * shorter because each flower's `growthStage` already scales its geometry.
 */
export const FLOWER_HEIGHT_DVH: Record<GardenSeed, number> = {
  moonflower: 22,
  sunflower: 25,
  starflower: 22,
  saturnflower: 25,
  tulip: 22,
  catgrass: 20,
  puppypoppy: 25,
  wigglewisteria: 28,
  pinwheelflower: 30,
  fireflower: 30,
};

export function getFlowerHeightDvh(seed: GardenSeed): number {
  return FLOWER_HEIGHT_DVH[seed];
}

/** Five fixed horizontal slots — positions never change when new flowers are planted. */
export const FIXED_SLOT_X: readonly number[] = [104, 152, 200, 248, 296];

export function getGardenGroundY(): number {
  return GARDEN_CELL_GROUND_Y;
}

/** Root transform for a bottom-garden plant anchored at ground level. */
export function getGardenPlantRootTransform(x: number): string {
  return `translate(${x} ${GARDEN_CELL_GROUND_Y}) scale(${GARDEN_PLANT_SCALE})`;
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

export function getPlantSlotForCompletion(completionIndex: number): number {
  const { planted } = getGardenCycleProgress(completionIndex);
  return Math.max(0, planted - 1);
}

export function getCurrentPlantingCycle(completionIndex: number): number {
  return Math.max(0, getGardenLevel(completionIndex) - 1);
}

export function getFixedSlotX(slot: number): number {
  const i = Math.max(0, Math.min(slot, FIXED_SLOT_X.length - 1));
  return FIXED_SLOT_X[i]!;
}

/** @deprecated Use {@link getFixedSlotX} with a plant slot — positions must not depend on total count. */
export function getSlotX(slot: number, _total?: number): number {
  return getFixedSlotX(slot);
}

export function resolvePlantX(task: Task): number {
  if (task.plantX != null) return task.plantX;
  if (task.plantSlot != null) return getFixedSlotX(task.plantSlot);
  if (task.completionIndex != null) {
    return getFixedSlotX(getPlantSlotForCompletion(task.completionIndex));
  }
  return getFixedSlotX(0);
}

export function isGardenFlowerRevealed(task: Task): boolean {
  return task.gardenRevealed !== false;
}

export function buildPlantedFlowers(tasks: Task[]): PlantedFlowerSpec[] {
  const completed = tasks
    .filter(
      (t) =>
        t.completed && t.completionIndex != null && isGardenFlowerRevealed(t),
    )
    .sort((a, b) => a.completionIndex! - b.completionIndex!);

  if (completed.length === 0) return [];

  const latestCycle = getCurrentPlantingCycle(
    completed[completed.length - 1]!.completionIndex!,
  );

  const inCycle = completed.filter(
    (t) => getCurrentPlantingCycle(t.completionIndex!) === latestCycle,
  );
  const cycleTotal = inCycle.length;

  return inCycle.map((task, rank) => {
    const completionIndex = task.completionIndex!;
    const tier = getGrowthTier(completionIndex);

    return {
      completionIndex,
      x: resolvePlantX(task),
      growthAge: cycleTotal - 1 - rank,
      paletteIndex: tier.paletteIndex,
    };
  });
}

export function getPlantedFlowerScale(growthAge: number, completionIndex: number): number {
  const tier = getGrowthTier(completionIndex);
  return 0.72 + tier.flowerScale * 0.26 + growthAge * 0.12;
}

export function getPlantedFlowerPetalCount(growthAge: number, completionIndex: number): number {
  const tier = getGrowthTier(completionIndex);
  return Math.min(tier.petalCount + growthAge, 9);
}

export function getPlantedFlowerStemHeight(growthAge: number, completionIndex: number): number {
  const tier = getGrowthTier(completionIndex);
  return 14 + tier.stemWidth * 2.5 + growthAge * 5;
}

export function getPalette(completionIndex: number) {
  return FLOWER_PALETTES[getGrowthTier(completionIndex).paletteIndex];
}

export function getPaletteByIndex(paletteIndex: number) {
  return FLOWER_PALETTES[paletteIndex % FLOWER_PALETTES.length];
}

/** Map viewBox X (0–400) to horizontal % across the garden strip. */
export function slotXToPercent(x: number): number {
  return (x / GARDEN_VIEW_WIDTH) * 100;
}
