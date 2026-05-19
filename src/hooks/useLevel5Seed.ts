import { useCallback, useEffect, useState } from 'react';
import { loadLevel5Seed, saveLevel5Seed, type Level5Seed } from '../lib/level5Seed';

export function useLevel5Seed() {
  const [level5Seed, setLevel5Seed] = useState<Level5Seed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel5Seed(loadLevel5Seed());
    setHydrated(true);
  }, []);

  const chooseLevel5Seed = useCallback((seed: Level5Seed) => {
    saveLevel5Seed(seed);
    setLevel5Seed(seed);
  }, []);

  return { level5Seed, hydrated, chooseLevel5Seed };
}
