import type { Level2Seed } from './level2Seed';
import type { Level3Seed } from './level3Seed';
import type { Level4Seed } from './level4Seed';
import type { Level5Seed } from './level5Seed';
import type { Level7Seed } from './level7Seed';
import type { StartingSeed } from './startingSeed';

export type GardenSeed =
  | StartingSeed
  | Level2Seed
  | Level3Seed
  | Level4Seed
  | Level5Seed
  | Level7Seed;

export interface GardenSeedChoices {
  starting: StartingSeed | null;
  level2: Level2Seed | null;
  level3: Level3Seed | null;
  level4: Level4Seed | null;
  level5: Level5Seed | null;
  level6: GardenSeed | null;
  level7: Level7Seed | null;
}

export function getSeedForGardenLevel(
  level: number,
  choices: GardenSeedChoices,
): GardenSeed | null {
  if (level <= 1) return choices.starting;
  if (level === 2) return choices.level2;
  if (level === 3) return choices.level3;
  if (level === 4) return choices.level4;
  if (level === 5) return choices.level5;
  if (level === 6) return choices.level6;
  return choices.level7;
}
