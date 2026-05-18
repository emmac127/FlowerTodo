import type { Task } from '../hooks/useTasks';
import { FLOWER_PALETTES, getGrowthTier } from './growthTier';

export const FLOWERS_PER_GARDEN_LEVEL = 5;

export interface PlantedFlowerSpec {
  completionIndex: number;
  x: number;
  growthAge: number;
  paletteIndex: number;
}

const GARDEN_VIEW_WIDTH = 400;
const GROUND_Y = 82;

/** Five fixed horizontal slots — positions never change when new flowers are planted. */
const FIXED_SLOT_X: readonly number[] = [104, 152, 200, 248, 296];

export function getGardenGroundY(): number {
  return GROUND_Y;
}

/** Garden level increases every 5 completed tasks (1–5 → level 1, 6–10 → level 2, …). */
export function getGardenLevel(completedCount: number): number {
  if (completedCount <= 0) return 0;
  return Math.floor((completedCount - 1) / FLOWERS_PER_GARDEN_LEVEL) + 1;
}

/** Flowers planted in the current level cycle (1–5). Resets visually after a level-up. */
export function getGardenCycleProgress(completedCount: number): {
  planted: number;
  max: number;
} {
  if (completedCount <= 0) {
    return { planted: 0, max: FLOWERS_PER_GARDEN_LEVEL };
  }
  const planted = ((completedCount - 1) % FLOWERS_PER_GARDEN_LEVEL) + 1;
  return { planted, max: FLOWERS_PER_GARDEN_LEVEL };
}

export function getPlantSlotForCompletion(completionIndex: number): number {
  return (completionIndex - 1) % FLOWERS_PER_GARDEN_LEVEL;
}

export function getCurrentPlantingCycle(completionIndex: number): number {
  return Math.floor((completionIndex - 1) / FLOWERS_PER_GARDEN_LEVEL);
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
