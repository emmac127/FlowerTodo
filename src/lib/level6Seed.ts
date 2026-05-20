import type { GardenSeed } from './gardenSeed';
import { isGardenSeed } from './gardenSeedCatalog';

const STORAGE_KEY = 'kawaii-todo-level6-seed';

export const LEVEL_6_SEED_PROMPT =
  "Level 6!\nPick a flower you didn't choose before!\nComplete tasks to help it grow!";

export function loadLevel6Seed(): GardenSeed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isGardenSeed(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel6Seed(seed: GardenSeed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}

export function clearLevel6Seed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
