import { useCallback, useEffect, useState } from 'react';
import {
  loadStartingSeed,
  saveStartingSeed,
  type StartingSeed,
} from '../lib/startingSeed';

export function useStartingSeed() {
  const [startingSeed, setStartingSeed] = useState<StartingSeed | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStartingSeed(loadStartingSeed());
    setHydrated(true);
  }, []);

  const chooseStartingSeed = useCallback((seed: StartingSeed) => {
    saveStartingSeed(seed);
    setStartingSeed(seed);
  }, []);

  return { startingSeed, hydrated, chooseStartingSeed };
}
