export type Level4Seed = 'puppypoppy' | 'wigglewisteria';

const STORAGE_KEY = 'kawaii-todo-level4-seed';

export const LEVEL_4_SEED_PROMPT =
  'Level 4!\nPick Puppy poppy or Wiggle wisteria!\nComplete tasks to help it grow!';

export function loadLevel4Seed(): Level4Seed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'puppypoppy' || raw === 'wigglewisteria') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLevel4Seed(seed: Level4Seed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}
