import { useCallback, useEffect, useState } from 'react';
import {
  clearLevel2Seed,
  loadLevel2Seed,
  saveLevel2Seed,
  type Level2Seed,
} from '../lib/level2Seed';

export function useLevel2Seed() {
  const [level2Seed, setLevel2Seed] = useState<Level2Seed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel2Seed(loadLevel2Seed());
    setHydrated(true);
  }, []);

  const chooseLevel2Seed = useCallback((seed: Level2Seed) => {
    saveLevel2Seed(seed);
    setLevel2Seed(seed);
  }, []);

  const resetLevel2Seed = useCallback(() => {
    clearLevel2Seed();
    setLevel2Seed(null);
  }, []);

  return { level2Seed, hydrated, chooseLevel2Seed, resetLevel2Seed };
}
