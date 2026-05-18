import type { GardenSeedChoices } from './gardenSeed';
import { getGardenLevel } from './plantedGarden';

export type PendingSeedPicker = 'starting' | 'level2' | 'level3' | 'level4';

/**
 * Which flower picker (if any) should show for the current garden progress.
 * Walks levels in order so cached progress without stored seeds can be backfilled.
 */
export function getPendingSeedPicker(
  gardenProgressCount: number,
  choices: GardenSeedChoices,
): PendingSeedPicker | null {
  const gardenLevel = getGardenLevel(gardenProgressCount);

  if (!choices.starting) {
    return 'starting';
  }
  if (gardenLevel >= 2 && !choices.level2) {
    return 'level2';
  }
  if (gardenLevel >= 3 && !choices.level3) {
    return 'level3';
  }
  if (gardenLevel >= 4 && !choices.level4) {
    return 'level4';
  }
  return null;
}

export function isBackfillSeedPicker(
  picker: PendingSeedPicker,
  gardenProgressCount: number,
): boolean {
  const gardenLevel = getGardenLevel(gardenProgressCount);
  switch (picker) {
    case 'starting':
      return gardenLevel >= 1;
    case 'level2':
      return gardenProgressCount >= 3;
    case 'level3':
      return gardenLevel >= 3;
    case 'level4':
      return gardenLevel >= 4;
    default:
      return false;
  }
}
