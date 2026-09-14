import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GardenConfig } from '../lib/garden/loadConfig';
import type { AmbientBirdPoolConfig, PlacedElement } from '../lib/garden/types';
import {
  initialActiveAmbientIds,
  listAmbientBirds,
  pickArrivalCandidate,
  pickDepartureCandidate,
  randomWaitSeconds,
} from '../lib/garden/ambientBirdPool';

export type BirdTransitKind = 'depart' | 'arrive';

interface UseAmbientBirdPoolArgs {
  enabled: boolean;
  pool: AmbientBirdPoolConfig | undefined;
  elements: PlacedElement[];
  currentLevel: number;
  config: GardenConfig;
}

interface UseAmbientBirdPoolResult {
  /** Elements with ambient birds filtered to the active/transiting pool. */
  filteredElements: PlacedElement[];
  birdTransit: Record<string, BirdTransitKind>;
  onBirdTransitComplete: (id: string) => void;
}

/**
 * Caps on-screen mode2 ambient birds and runs timed fly-off / fly-in visits
 * for earlier-level birds (see mode2.yaml `ambientBirds`).
 */
export function useAmbientBirdPool({
  enabled,
  pool,
  elements,
  currentLevel,
  config,
}: UseAmbientBirdPoolArgs): UseAmbientBirdPoolResult {
  const unlocked = useMemo(() => listAmbientBirds(elements), [elements]);
  const unlockedIdsKey = useMemo(
    () =>
      unlocked
        .map((b) => b.id)
        .sort()
        .join('|'),
    [unlocked],
  );

  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set());
  const [transit, setTransit] = useState<Record<string, BirdTransitKind>>({});
  const knownUnlockedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const activeIdsRef = useRef(activeIds);
  const transitRef = useRef(transit);
  const unlockedRef = useRef(unlocked);
  const currentLevelRef = useRef(currentLevel);
  const poolRef = useRef(pool);

  activeIdsRef.current = activeIds;
  transitRef.current = transit;
  unlockedRef.current = unlocked;
  currentLevelRef.current = currentLevel;
  poolRef.current = pool;

  const beginDepart = useCallback((id: string) => {
    setTransit((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: 'depart' };
    });
  }, []);

  const beginArrive = useCallback((id: string) => {
    setActiveIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTransit((prev) => ({ ...prev, [id]: 'arrive' }));
  }, []);

  // Seed / reconcile when unlocked ambient set changes (before paint so new
  // birds are never filtered out for a frame).
  useLayoutEffect(() => {
    if (!enabled || !pool) {
      initializedRef.current = false;
      knownUnlockedRef.current = new Set();
      setActiveIds(new Set());
      setTransit({});
      return;
    }

    const unlockedNow = unlockedRef.current;
    const unlockedIdSet = new Set(unlockedNow.map((b) => b.id));

    if (!initializedRef.current) {
      initializedRef.current = true;
      knownUnlockedRef.current = unlockedIdSet;
      setActiveIds(
        initialActiveAmbientIds(
          unlockedNow,
          currentLevelRef.current,
          pool.minAmbientBirds,
          pool.maxAmbientBirds,
        ),
      );
      setTransit({});
      return;
    }

    const prevKnown = knownUnlockedRef.current;
    const newlyUnlocked = unlockedNow.filter((b) => !prevKnown.has(b.id));
    knownUnlockedRef.current = unlockedIdSet;

    // Drop birds that are no longer unlocked (dev rewind).
    setActiveIds((prev) => {
      let next = prev;
      for (const id of prev) {
        if (!unlockedIdSet.has(id)) {
          if (next === prev) next = new Set(prev);
          next.delete(id);
        }
      }

      if (newlyUnlocked.length === 0) return next;

      const withNew = new Set(next);
      const exclude = new Set<string>();
      for (const bird of newlyUnlocked) {
        withNew.add(bird.id);
        exclude.add(bird.id);
      }

      // Over-cap: fly off an earlier-level bird (not the newcomer), if above min.
      if (withNew.size > pool.maxAmbientBirds) {
        const victim = pickDepartureCandidate({
          unlocked: unlockedNow,
          activeIds: withNew,
          currentLevel: currentLevelRef.current,
          minAmbientBirds: pool.minAmbientBirds,
          excludeIds: exclude,
        });
        if (victim) {
          queueMicrotask(() => beginDepart(victim.id));
        }
      }

      return withNew;
    });

    setTransit((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!unlockedIdSet.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [enabled, pool, unlockedIdsKey, beginDepart]);

  // Periodic departure of earlier-level birds.
  useEffect(() => {
    if (!enabled || !pool) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const wait =
        randomWaitSeconds(pool.minDepartureWait, pool.maxDepartureWait) * 1000;
      timer = setTimeout(() => {
        if (cancelled) return;
        const active = activeIdsRef.current;
        const inTransit = transitRef.current;
        const busy = new Set(Object.keys(inTransit));
        const victim = pickDepartureCandidate({
          unlocked: unlockedRef.current,
          activeIds: active,
          currentLevel: currentLevelRef.current,
          minAmbientBirds: pool.minAmbientBirds,
          excludeIds: busy,
        });
        if (victim && !inTransit[victim.id]) {
          beginDepart(victim.id);
        }
        schedule();
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, pool, beginDepart]);

  // Periodic arrival from earlier levels while under the cap.
  useEffect(() => {
    if (!enabled || !pool) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const wait =
        randomWaitSeconds(pool.minArrivalWait, pool.maxArrivalWait) * 1000;
      timer = setTimeout(() => {
        if (cancelled) return;
        const p = poolRef.current;
        if (!p) {
          schedule();
          return;
        }
        const active = activeIdsRef.current;
        const inTransit = transitRef.current;
        if (active.size < p.maxAmbientBirds) {
          const candidate = pickArrivalCandidate({
            unlocked: unlockedRef.current,
            activeIds: active,
            currentLevel: currentLevelRef.current,
            config,
          });
          if (candidate && !inTransit[candidate.id] && !active.has(candidate.id)) {
            beginArrive(candidate.id);
          }
        }
        schedule();
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, pool, config, beginArrive]);

  const onBirdTransitComplete = useCallback((id: string) => {
    const kind = transitRef.current[id];
    setTransit((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (kind === 'depart') {
      setActiveIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const filteredElements = useMemo(() => {
    if (!enabled || !pool) return elements;
    const visible = new Set(activeIds);
    for (const id of Object.keys(transit)) {
      visible.add(id);
    }
    return elements.filter((el) => {
      if (el.kind !== 'birdAmbientStage') return true;
      return visible.has(el.id);
    });
  }, [enabled, pool, elements, activeIds, transit]);

  const birdTransit = useMemo(() => {
    if (!enabled || !pool) return {};
    return transit;
  }, [enabled, pool, transit]);

  return {
    filteredElements,
    birdTransit,
    onBirdTransitComplete,
  };
}
