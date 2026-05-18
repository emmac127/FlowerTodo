import { useCallback, useEffect, useState } from 'react';
import { loadLevel4Seed, saveLevel4Seed, type Level4Seed } from '../lib/level4Seed';

export function useLevel4Seed() {
  const [level4Seed, setLevel4Seed] = useState<Level4Seed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevel4Seed(loadLevel4Seed());
    setHydrated(true);
  }, []);

  const chooseLevel4Seed = useCallback((seed: Level4Seed) => {
    saveLevel4Seed(seed);
    setLevel4Seed(seed);
  }, []);

  return { level4Seed, hydrated, chooseLevel4Seed };
}
