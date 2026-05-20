import type { GardenSeed } from './gardenSeed';
import { getGardenCycleProgress } from './plantedGarden';

export type SeedGrowthStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface SeedPalette {
  stem: string;
  leaf: string;
  bud: string;
  budStroke: string;
  petals: string;
  center: string;
}

export const SEED_PALETTES: Record<GardenSeed, SeedPalette> = {
  moonflower: {
    stem: '#5a7a8a',
    leaf: '#9ec4e0',
    bud: '#c5daf5',
    budStroke: '#8aa8c8',
    petals: '#d4e4f8',
    center: '#f0f6ff',
  },
  sunflower: {
    stem: '#4d8f3c',
    leaf: '#8ed98e',
    bud: '#ffe566',
    budStroke: '#e8b830',
    petals: '#ffe566',
    center: '#ff9f43',
  },
  starflower: {
    stem: '#6b5a9a',
    leaf: '#c9b8ff',
    bud: '#ffe566',
    budStroke: '#d4a830',
    petals: '#fff4a3',
    center: '#ffe566',
  },
  saturnflower: {
    stem: '#8a6b4a',
    leaf: '#e8c898',
    bud: '#f5d4a8',
    budStroke: '#d4a060',
    petals: '#ffd8a8',
    center: '#f5c878',
  },
  tulip: {
    stem: '#4d8f3c',
    leaf: '#8ed98e',
    bud: '#ff8fab',
    budStroke: '#ff6b9d',
    petals: '#ffb7d5',
    center: '#ffe566',
  },
  catgrass: {
    stem: '#5cb85c',
    leaf: '#8ed98e',
    bud: '#7dd87d',
    budStroke: '#5cb85c',
    petals: '#9ee87d',
    center: '#ffe566',
  },
  puppypoppy: {
    stem: '#4d8f3c',
    leaf: '#8ed98e',
    bud: '#ff6b6b',
    budStroke: '#e85555',
    petals: '#ff8f8f',
    center: '#f5d4a8',
  },
  wigglewisteria: {
    stem: '#5a7a4a',
    leaf: '#8ed98e',
    bud: '#d4b5ff',
    budStroke: '#9b7fd4',
    petals: '#c9b8ff',
    center: '#e8dcff',
  },
  pinwheelflower: {
    stem: '#4d8f3c',
    leaf: '#8ed98e',
    bud: '#ffe566',
    budStroke: '#e8b830',
    petals: '#ffb7d5',
    center: '#fff8c8',
  },
  fireflower: {
    stem: '#5a4a3a',
    leaf: '#ff9f43',
    bud: '#ff6b35',
    budStroke: '#e85530',
    petals: '#ffcc66',
    center: '#fff4a3',
  },
  toastflower: {
    stem: '#c4a574',
    leaf: '#8ed98e',
    bud: '#ffe566',
    budStroke: '#e8b830',
    petals: '#ffb7d5',
    center: '#fff8c8',
  },
  jamflower: {
    stem: '#5cb85c',
    leaf: '#8ed98e',
    bud: '#ffb7d5',
    budStroke: '#ff6b9d',
    petals: '#ffb7d5',
    center: '#ffe566',
  },
};

export interface SeedGrowthMetrics {
  stage: SeedGrowthStage;
  stemHeight: number;
  stemWidth: number;
  scale: number;
  petalCount: number;
  leafSpread: number;
  showBloom: boolean;
}

const STAGE_METRICS: readonly Omit<SeedGrowthMetrics, 'stage'>[] = [
  { stemHeight: 14, stemWidth: 2.2, scale: 0.55, petalCount: 0, leafSpread: 1, showBloom: false },
  { stemHeight: 24, stemWidth: 2.5, scale: 0.72, petalCount: 0, leafSpread: 1.15, showBloom: false },
  { stemHeight: 34, stemWidth: 2.8, scale: 0.86, petalCount: 0, leafSpread: 1.3, showBloom: false },
  { stemHeight: 40, stemWidth: 3, scale: 0.94, petalCount: 5, leafSpread: 1.4, showBloom: true },
  { stemHeight: 46, stemWidth: 3.1, scale: 1.02, petalCount: 7, leafSpread: 1.5, showBloom: true },
  { stemHeight: 52, stemWidth: 3.2, scale: 1.12, petalCount: 8, leafSpread: 1.6, showBloom: true },
];

export function getSeedGrowthStage(completedCount: number): SeedGrowthStage {
  const { planted, max } = getGardenCycleProgress(completedCount);
  return Math.min(planted, max) as SeedGrowthStage;
}

export function getSeedGrowthMetrics(stage: SeedGrowthStage): SeedGrowthMetrics {
  return { stage, ...STAGE_METRICS[stage]! };
}
