export type Level3Seed = 'tulip' | 'catgrass';

const STORAGE_KEY = 'kawaii-todo-level3-seed';

export const LEVEL_3_SEED_PROMPT =
  'Level 3!\nPick a Normal tulip or Cat grass seed!\nComplete tasks to help it grow!';

export function loadLevel3Seed(): Level3Seed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'tulip' || raw === 'catgrass') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel3Seed(seed: Level3Seed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}

export function clearLevel3Seed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
