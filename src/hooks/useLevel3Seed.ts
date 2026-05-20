import { useCallback, useEffect, useState } from 'react';
import {
  clearLevel3Seed,
  loadLevel3Seed,
  saveLevel3Seed,
  type Level3Seed,
} from '../lib/level3Seed';

export function useLevel3Seed() {
  const [level3Seed, setLevel3Seed] = useState<Level3Seed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel3Seed(loadLevel3Seed());
    setHydrated(true);
  }, []);

  const chooseLevel3Seed = useCallback((seed: Level3Seed) => {
    saveLevel3Seed(seed);
    setLevel3Seed(seed);
  }, []);

  const resetLevel3Seed = useCallback(() => {
    clearLevel3Seed();
    setLevel3Seed(null);
  }, []);

  return { level3Seed, hydrated, chooseLevel3Seed, resetLevel3Seed };
}
