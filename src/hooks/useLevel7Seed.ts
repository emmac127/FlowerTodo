import { useCallback, useEffect, useState } from 'react';
import {
  clearLevel7Seed,
  loadLevel7Seed,
  saveLevel7Seed,
  type Level7Seed,
} from '../lib/level7Seed';

export function useLevel7Seed() {
  const [level7Seed, setLevel7Seed] = useState<Level7Seed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel7Seed(loadLevel7Seed());
    setHydrated(true);
  }, []);

  const chooseLevel7Seed = useCallback((seed: Level7Seed) => {
    saveLevel7Seed(seed);
    setLevel7Seed(seed);
  }, []);

  const resetLevel7Seed = useCallback(() => {
    clearLevel7Seed();
    setLevel7Seed(null);
  }, []);

  return { level7Seed, hydrated, chooseLevel7Seed, resetLevel7Seed };
}
