import type { GardenSeed, GardenSeedChoices } from './gardenSeed';
import type { Level2Seed } from './level2Seed';
import type { Level3Seed } from './level3Seed';
import type { Level4Seed } from './level4Seed';
import type { Level5Seed } from './level5Seed';
import type { StartingSeed } from './startingSeed';

/** Pairs offered at each garden level (levels 1–5). */
export const LEVEL_SEED_PAIRS: readonly {
  readonly options: readonly [GardenSeed, GardenSeed];
}[] = [
  { options: ['moonflower', 'sunflower'] },
  { options: ['starflower', 'saturnflower'] },
  { options: ['tulip', 'catgrass'] },
  { options: ['puppypoppy', 'wigglewisteria'] },
  { options: ['pinwheelflower', 'fireflower'] },
] as const;

export const ALL_GARDEN_SEEDS: readonly GardenSeed[] = LEVEL_SEED_PAIRS.flatMap(
  (pair) => pair.options,
);

const GARDEN_SEED_SET = new Set<string>(ALL_GARDEN_SEEDS);

export function isGardenSeed(value: string): value is GardenSeed {
  return GARDEN_SEED_SET.has(value);
}

export const SEED_DISPLAY_NAMES: Record<GardenSeed, string> = {
  moonflower: 'Moon flower',
  sunflower: 'Sun flower',
  starflower: 'Star flower',
  saturnflower: 'Saturn flower',
  tulip: 'Tulip',
  catgrass: 'Cat grass',
  puppypoppy: 'Puppy poppy',
  wigglewisteria: 'Wiggle wisteria',
  pinwheelflower: 'Pinwheel flower',
  fireflower: 'Fire flower',
};

export const SEED_CHOICE_CLASS: Record<GardenSeed, string> = {
  moonflower: 'seed-choice--moon',
  sunflower: 'seed-choice--sun',
  starflower: 'seed-choice--star',
  saturnflower: 'seed-choice--saturn',
  tulip: 'seed-choice--tulip',
  catgrass: 'seed-choice--catgrass',
  puppypoppy: 'seed-choice--puppypoppy',
  wigglewisteria: 'seed-choice--wisteria',
  pinwheelflower: 'seed-choice--pinwheel',
  fireflower: 'seed-choice--fireflower',
};

/** Seeds the player already chose for levels 1–5. */
export function getSelectedSeeds(choices: GardenSeedChoices): GardenSeed[] {
  const selected: GardenSeed[] = [];
  if (choices.starting) selected.push(choices.starting);
  if (choices.level2) selected.push(choices.level2);
  if (choices.level3) selected.push(choices.level3);
  if (choices.level4) selected.push(choices.level4);
  if (choices.level5) selected.push(choices.level5);
  return selected;
}

/** Flowers not picked in any previous level (level-pair order). */
export function getUnselectedSeeds(choices: GardenSeedChoices): GardenSeed[] {
  const selected = new Set(getSelectedSeeds(choices));
  const unselected: GardenSeed[] = [];
  for (const { options } of LEVEL_SEED_PAIRS) {
    for (const seed of options) {
      if (!selected.has(seed)) unselected.push(seed);
    }
  }
  return unselected;
}

/** Level 6 offers the first two flowers the player did not choose before. */
export function getLevel6PickerOptions(
  choices: GardenSeedChoices,
): [GardenSeed, GardenSeed] | null {
  const unselected = getUnselectedSeeds(choices);
  if (unselected.length < 2) return null;
  return [unselected[0]!, unselected[1]!];
}

export function allLevel5SeedsChosen(choices: GardenSeedChoices): boolean {
  return (
    choices.starting != null &&
    choices.level2 != null &&
    choices.level3 != null &&
    choices.level4 != null &&
    choices.level5 != null
  );
}

export type { StartingSeed, Level2Seed, Level3Seed, Level4Seed, Level5Seed };
