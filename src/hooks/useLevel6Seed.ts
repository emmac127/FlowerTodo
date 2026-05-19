import { useCallback, useEffect, useState } from 'react';
import type { GardenSeed } from '../lib/gardenSeed';
import { loadLevel6Seed, saveLevel6Seed } from '../lib/level6Seed';

export function useLevel6Seed() {
  const [level6Seed, setLevel6Seed] = useState<GardenSeed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel6Seed(loadLevel6Seed());
    setHydrated(true);
  }, []);

  const chooseLevel6Seed = useCallback((seed: GardenSeed) => {
    saveLevel6Seed(seed);
    setLevel6Seed(seed);
  }, []);

  return { level6Seed, hydrated, chooseLevel6Seed };
}
