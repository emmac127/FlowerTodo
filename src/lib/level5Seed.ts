export type Level5Seed = 'pinwheelflower' | 'fireflower';

const STORAGE_KEY = 'kawaii-todo-level5-seed';

export const LEVEL_5_SEED_PROMPT =
  'Level 5!\nPick Pinwheel flower or Fire flower!\nComplete tasks to help it grow!';

export function loadLevel5Seed(): Level5Seed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'pinwheelflower' || raw === 'fireflower') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel5Seed(seed: Level5Seed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}

export function clearLevel5Seed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
