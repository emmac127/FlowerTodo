import { useCallback, useEffect, useState } from 'react';
import {
  clearStartingSeed,
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

  const resetStartingSeed = useCallback(() => {
    clearStartingSeed();
    setStartingSeed(null);
  }, []);

  return { startingSeed, hydrated, chooseStartingSeed, resetStartingSeed };
}
