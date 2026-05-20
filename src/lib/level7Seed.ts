export type Level7Seed = 'toastflower' | 'jamflower';

const STORAGE_KEY = 'kawaii-todo-level7-seed';

export const LEVEL_7_SEED_PROMPT =
  'Level 7!\nPick Toast flower or Jam flower!\nComplete tasks to help it grow!';

export function loadLevel7Seed(): Level7Seed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'toastflower' || raw === 'jamflower') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel7Seed(seed: Level7Seed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}

export function clearLevel7Seed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
