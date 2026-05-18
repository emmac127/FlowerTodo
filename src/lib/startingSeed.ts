export type StartingSeed = 'moonflower' | 'sunflower';

const STORAGE_KEY = 'kawaii-todo-starting-seed';

export const STARTING_SEED_PROMPT =
  'Choose your starting flower seed!\nCompleting tasks will make it grow!';

export function loadStartingSeed(): StartingSeed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'moonflower' || raw === 'sunflower') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveStartingSeed(seed: StartingSeed): void {
  localStorage.setItem(STORAGE_KEY, seed);
}
