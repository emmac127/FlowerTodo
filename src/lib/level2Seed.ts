export type Level2Seed = 'starflower' | 'saturnflower';

const STORAGE_KEY = 'kawaii-todo-level2-seed';

export const LEVEL_2_SEED_PROMPT =
  'Level 2!\nChoose a Star flower or Saturn flower seed!\nComplete tasks to help it grow!';

export function loadLevel2Seed(): Level2Seed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'starflower' || raw === 'saturnflower') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel2Seed(seed: Level2Seed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}

export function clearLevel2Seed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
