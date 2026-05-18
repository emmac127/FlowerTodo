import { getGardenCycleProgress } from './plantedGarden';
import type { StartingSeed } from './startingSeed';

export type SeedGrowthStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface SeedPalette {
  stem: string;
  leaf: string;
  bud: string;
  budStroke: string;
  petals: string;
  center: string;
}

export const SEED_PALETTES: Record<StartingSeed, SeedPalette> = {
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
  const { planted } = getGardenCycleProgress(completedCount);
  return Math.min(planted, 5) as SeedGrowthStage;
}

export function getSeedGrowthMetrics(stage: SeedGrowthStage): SeedGrowthMetrics {
  return { stage, ...STAGE_METRICS[stage]! };
}
