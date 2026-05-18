import type { Level2Seed } from './level2Seed';
import type { Level3Seed } from './level3Seed';
import type { StartingSeed } from './startingSeed';

export type GardenSeed = StartingSeed | Level2Seed | Level3Seed;

export interface GardenSeedChoices {
  starting: StartingSeed | null;
  level2: Level2Seed | null;
  level3: Level3Seed | null;
}

export function getSeedForGardenLevel(
  level: number,
  choices: GardenSeedChoices,
): GardenSeed | null {
  if (level <= 1) return choices.starting;
  if (level === 2) return choices.level2;
  return choices.level3;
}
