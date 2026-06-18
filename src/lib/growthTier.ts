export interface FlowerPalette {
  petals: string;
  center: string;
  stem: string;
  leaf: string;
  name: string;
}

export const FLOWER_PALETTES: FlowerPalette[] = [
  { name: 'sakura', petals: '#ffb7d5', center: '#ffe566', stem: '#6bc96b', leaf: '#8ed98e' },
  { name: 'daisy', petals: '#fff4a3', center: '#ff9f43', stem: '#5cb85c', leaf: '#7dd87d' },
  { name: 'lavender', petals: '#d4b5ff', center: '#ffe566', stem: '#6bc96b', leaf: '#8ed98e' },
  { name: 'mint', petals: '#a8f0d4', center: '#ffb7d5', stem: '#5cb85c', leaf: '#7dd87d' },
  { name: 'peach', petals: '#ffc9a8', center: '#ff8fab', stem: '#6bc96b', leaf: '#8ed98e' },
];

export interface GrowthTier {
  stemWidth: number;
  flowerScale: number;
  petalCount: number;
  paletteIndex: number;
  growDurationMs: number;
}

/** Keeps task-row blooms round — petals must not touch the square anchor edges. */
export const MAX_TASK_FLOWER_SCALE = 1.05;
export const MAX_TASK_FLOWER_SIZE = 40;
export const TASK_FLOWER_VIEW_BOX = 48;
const BASE_TASK_FLOWER_SIZE = 30;

export function clampTaskFlowerScale(scale: number): number {
  return Math.min(scale, MAX_TASK_FLOWER_SCALE);
}

export function getTaskFlowerSize(flowerScale: number): number {
  const scaled = BASE_TASK_FLOWER_SIZE + clampTaskFlowerScale(flowerScale) * 8;
  return Math.min(scaled, MAX_TASK_FLOWER_SIZE);
}

export function getGrowthTier(completedCount: number): GrowthTier {
  const rawScale = 0.6 + Math.min(completedCount * 0.08, 0.5);
  return {
    stemWidth: 2 + Math.min(completedCount * 0.4, 4),
    flowerScale: clampTaskFlowerScale(rawScale),
    petalCount: completedCount < 3 ? 5 : completedCount < 8 ? 6 : 8,
    paletteIndex: completedCount % FLOWER_PALETTES.length,
    growDurationMs: 400 + Math.min(completedCount * 20, 200),
  };
}

/** Dad rocket strike — slower than the garden stem so the trail reads clearly. */
export function getStrikeDurationMs(completedCount: number, isDad: boolean): number {
  if (!isDad) {
    return getGrowthTier(completedCount).growDurationMs;
  }
  return 1500 + Math.min(completedCount * 30, 500);
}
