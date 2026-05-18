import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FallingSakuraPetals } from './components/FallingSakuraPetals';
import { GardenRevealReturnButton } from './components/GardenRevealReturnButton';
import { GardenScene } from './components/GardenScene';
import { StickyKawaiiHeader } from './components/StickyKawaiiHeader';
import { SpiralCelebration } from './components/SpiralCelebration';
import { StarBurst } from './components/StarBurst';
import { TaskList } from './components/TaskList';
import { useTasks } from './hooks/useTasks';
import { useLevel2Seed } from './hooks/useLevel2Seed';
import { useLevel3Seed } from './hooks/useLevel3Seed';
import { useLevel4Seed } from './hooks/useLevel4Seed';
import { useStartingSeed } from './hooks/useStartingSeed';
import {
  GARDEN_REVEAL_ANIM_MS,
  getGardenAutoReturnDelayMs,
  getGardenRevealGrowthStartDelayMs,
  getGardenRevealScrollTop,
  shouldRevealGardenForCompletion,
} from './lib/gardenReveal';
import {
  getPendingSeedPicker,
  isBackfillSeedPicker,
} from './lib/gardenSeedPickers';
import { getGardenCycleProgress, getGardenLevel } from './lib/gardenProgress';
import { isGardenLevelComplete } from './lib/plantedGarden';
import {
  DEFAULT_CELEBRATION_ORIGIN,
  measureScreenCelebrationOrigin,
  type CelebrationOrigin,
} from './lib/mascotCelebration';
import { Level2SeedPicker } from './components/Level2SeedPicker';
import { Level3SeedPicker } from './components/Level3SeedPicker';
import { Level4SeedPicker } from './components/Level4SeedPicker';
import { StartingSeedPicker } from './components/StartingSeedPicker';
import { pickMotivationalPhrase } from './lib/motivationalPhrases';
import { LEVEL_2_SEED_PROMPT, type Level2Seed } from './lib/level2Seed';
import { LEVEL_3_SEED_PROMPT, type Level3Seed } from './lib/level3Seed';
import { LEVEL_4_SEED_PROMPT, type Level4Seed } from './lib/level4Seed';
import { STARTING_SEED_PROMPT, type StartingSeed } from './lib/startingSeed';
import { playAddTaskSound, playCelebrationTune, unlockAudio } from './lib/sounds';

const SPEECH_DURATION_MS = 3200;
const HOP_DURATION_MS = 1400;
const PICKED_CELEBRATION_PHRASE = 'You did the one I picked!\nSo proud of you! ⭐';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export default function App() {
  const [input, setInput] = useState('');
  const [muted, setMuted] = useState(false);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);
  const [speechVisible, setSpeechVisible] = useState(false);
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const [mascotDancing, setMascotDancing] = useState(false);
  const [starsActive, setStarsActive] = useState(false);
  const [starsBurstId, setStarsBurstId] = useState(0);
  const [spiralActive, setSpiralActive] = useState(false);
  const [spiralBurstId, setSpiralBurstId] = useState(0);
  const [celebrationOrigin, setCelebrationOrigin] =
    useState<CelebrationOrigin>(DEFAULT_CELEBRATION_ORIGIN);
  const inputRef = useRef<HTMLInputElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhraseRef = useRef<string | undefined>(undefined);
  const lastCelebrationRef = useRef<{ key: string; at: number } | null>(null);
  const savedScrollYRef = useRef(0);
  const gardenRevealAutoReturnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gardenRevealGrowthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [gardenRevealPhase, setGardenRevealPhase] = useState<'idle' | 'active' | 'exit'>(
    'idle',
  );
  const [gardenRevealHeldCount, setGardenRevealHeldCount] = useState<number | null>(null);
  const [gardenRevealGrowthUnlocked, setGardenRevealGrowthUnlocked] = useState(false);

  const {
    tasks,
    hydrated,
    addTask,
    completeTask,
    uncompleteTask,
    updateTaskText,
    deleteTask,
    clearCompleted,
    getNextCompletionIndex,
    gardenProgressCount,
    reorderTask,
    reorderTaskToIndex,
  } = useTasks();

  const {
    startingSeed,
    hydrated: seedHydrated,
    chooseStartingSeed,
  } = useStartingSeed();

  const {
    level2Seed,
    hydrated: level2SeedHydrated,
    chooseLevel2Seed,
  } = useLevel2Seed();

  const {
    level3Seed,
    hydrated: level3SeedHydrated,
    chooseLevel3Seed,
  } = useLevel3Seed();

  const {
    level4Seed,
    hydrated: level4SeedHydrated,
    chooseLevel4Seed,
  } = useLevel4Seed();

  const gardenLevel = getGardenLevel(gardenProgressCount);
  const gardenCycleProgress = getGardenCycleProgress(gardenProgressCount);
  const gardenDisplayCount =
    gardenRevealPhase === 'active' &&
    !gardenRevealGrowthUnlocked &&
    gardenRevealHeldCount != null
      ? gardenRevealHeldCount
      : gardenProgressCount;
  const seedsHydrated =
    hydrated &&
    seedHydrated &&
    level2SeedHydrated &&
    level3SeedHydrated &&
    level4SeedHydrated;
  const seedChoices = useMemo(
    () => ({
      starting: startingSeed,
      level2: level2Seed,
      level3: level3Seed,
      level4: level4Seed,
    }),
    [startingSeed, level2Seed, level3Seed, level4Seed],
  );
  const pendingSeedPicker = seedsHydrated
    ? getPendingSeedPicker(gardenProgressCount, seedChoices)
    : null;
  const showSeedPicker = pendingSeedPicker === 'starting';
  const showLevel2SeedPicker = pendingSeedPicker === 'level2';
  const showLevel3SeedPicker = pendingSeedPicker === 'level3';
  const showLevel4SeedPicker = pendingSeedPicker === 'level4';
  const showLevelSeedPicker =
    showLevel2SeedPicker || showLevel3SeedPicker || showLevel4SeedPicker;

  const showMascotCheer = useCallback((phrase?: string) => {
    const text = phrase ?? pickMotivationalPhrase(lastPhraseRef.current);
    lastPhraseRef.current = text;
    setMascotMessage(text);
    setSpeechVisible(true);

    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setSpeechVisible(false);
    }, SPEECH_DURATION_MS);
  }, []);

  const measureMascotOrigin = useCallback(() => {
    const el = mascotRef.current;
    if (!el) return;
    setCelebrationOrigin(measureScreenCelebrationOrigin(el));
  }, []);

  const dismissCelebrations = useCallback(() => {
    setSpiralActive(false);
    setStarsActive(false);
    setMascotDancing(false);
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
  }, []);

  const runNormalCelebration = useCallback(() => {
    showMascotCheer();
    if (reducedMotion) return;
    setSpiralBurstId((n) => n + 1);
    requestAnimationFrame(() => {
      measureMascotOrigin();
      setSpiralActive(true);
    });
  }, [measureMascotOrigin, reducedMotion, showMascotCheer]);

  const runPickedCelebration = useCallback(() => {
    showMascotCheer(PICKED_CELEBRATION_PHRASE);

    void (async () => {
      await unlockAudio();

      if (reducedMotion) {
        await playCelebrationTune(muted);
        return;
      }

      setMascotDancing(true);
      const tuneMs = await playCelebrationTune(muted);
    const waitMs = Math.max(tuneMs, HOP_DURATION_MS);

      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => {
        setMascotDancing(false);
        setStarsBurstId((n) => n + 1);
        requestAnimationFrame(() => {
          measureMascotOrigin();
          setStarsActive(true);
        });
      }, waitMs);
    })();
  }, [muted, measureMascotOrigin, reducedMotion, showMascotCheer]);

  const beginGardenReveal = useCallback(() => {
    savedScrollYRef.current = window.scrollY;
    setGardenRevealPhase('active');
    requestAnimationFrame(() => {
      const top = getGardenRevealScrollTop();
      window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }, [reducedMotion]);

  const clearGardenRevealAutoReturn = useCallback(() => {
    if (gardenRevealAutoReturnRef.current !== null) {
      clearTimeout(gardenRevealAutoReturnRef.current);
      gardenRevealAutoReturnRef.current = null;
    }
  }, []);

  const clearGardenRevealGrowthTimer = useCallback(() => {
    if (gardenRevealGrowthTimerRef.current !== null) {
      clearTimeout(gardenRevealGrowthTimerRef.current);
      gardenRevealGrowthTimerRef.current = null;
    }
  }, []);

  const endGardenReveal = useCallback(() => {
    clearGardenRevealAutoReturn();
    clearGardenRevealGrowthTimer();
    setGardenRevealPhase('exit');
    window.scrollTo({
      top: savedScrollYRef.current,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    window.setTimeout(
      () => setGardenRevealPhase('idle'),
      reducedMotion ? 0 : GARDEN_REVEAL_ANIM_MS,
    );
  }, [clearGardenRevealAutoReturn, clearGardenRevealGrowthTimer, reducedMotion]);

  useEffect(() => {
    if (gardenRevealPhase !== 'active') {
      clearGardenRevealGrowthTimer();
      if (gardenRevealPhase === 'idle') {
        setGardenRevealHeldCount(null);
        setGardenRevealGrowthUnlocked(false);
      }
      return;
    }

    setGardenRevealGrowthUnlocked(false);
    const blindSlatCount = Math.max(1, tasks.length) + 1;
    const growthDelay = getGardenRevealGrowthStartDelayMs(blindSlatCount, reducedMotion);
    gardenRevealGrowthTimerRef.current = window.setTimeout(() => {
      gardenRevealGrowthTimerRef.current = null;
      setGardenRevealGrowthUnlocked(true);
    }, growthDelay);

    return clearGardenRevealGrowthTimer;
  }, [
    gardenRevealPhase,
    tasks.length,
    reducedMotion,
    clearGardenRevealGrowthTimer,
  ]);

  useEffect(() => {
    if (gardenRevealPhase !== 'active') {
      clearGardenRevealAutoReturn();
      return;
    }

    const blindSlatCount = Math.max(1, tasks.length) + 1;
    const delay = getGardenAutoReturnDelayMs(blindSlatCount, reducedMotion);
    gardenRevealAutoReturnRef.current = window.setTimeout(() => {
      gardenRevealAutoReturnRef.current = null;
      endGardenReveal();
    }, delay);

    return clearGardenRevealAutoReturn;
  }, [
    gardenRevealPhase,
    tasks.length,
    reducedMotion,
    endGardenReveal,
    clearGardenRevealAutoReturn,
  ]);

  const handlePickRandom = useCallback(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    if (incomplete.length === 0) return;
    void unlockAudio();
    const pick = incomplete[Math.floor(Math.random() * incomplete.length)];
    setPickedTaskId(pick.id);
    requestAnimationFrame(() => {
      document.getElementById(`task-${pick.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [tasks]);

  const handleTaskCompleted = useCallback(
    (id: string, completionIndex: number) => {
      const celebrationKey = `${id}:${completionIndex}`;
      const now = Date.now();
      const last = lastCelebrationRef.current;
      if (last && last.key === celebrationKey && now - last.at < 200) {
        return;
      }
      lastCelebrationRef.current = { key: celebrationKey, at: now };

      const wasPicked = id === pickedTaskId;
      const previousGardenCount = gardenProgressCount;
      completeTask(id, completionIndex);

      if (
        startingSeed &&
        shouldRevealGardenForCompletion(completionIndex, previousGardenCount)
      ) {
        setGardenRevealHeldCount(previousGardenCount);
        setGardenRevealGrowthUnlocked(false);
        beginGardenReveal();
      }

      if (isGardenLevelComplete(completionIndex)) {
        showMascotCheer('Garden level up! 🌸✨\nYour flower has fully bloomed!');
      }

      if (wasPicked) {
        setPickedTaskId(null);
        runPickedCelebration();
        return;
      }
      runNormalCelebration();
    },
    [
      beginGardenReveal,
      completeTask,
      gardenProgressCount,
      pickedTaskId,
      runNormalCelebration,
      runPickedCelebration,
      showMascotCheer,
      startingSeed,
    ],
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      if (id === pickedTaskId) setPickedTaskId(null);
      lastCelebrationRef.current = null;
      dismissCelebrations();
      uncompleteTask(id);
    },
    [dismissCelebrations, pickedTaskId, uncompleteTask],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (id === pickedTaskId) setPickedTaskId(null);
      deleteTask(id);
    },
    [deleteTask, pickedTaskId],
  );

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      clearGardenRevealAutoReturn();
      clearGardenRevealGrowthTimer();
    };
  }, [clearGardenRevealAutoReturn, clearGardenRevealGrowthTimer]);

  useEffect(() => {
    if (!showSeedPicker) return;
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setMascotMessage(
      isBackfillSeedPicker('starting', gardenProgressCount)
        ? 'Welcome back!\nChoose your level 1 flower to restore your garden! 🌸'
        : STARTING_SEED_PROMPT,
    );
    setSpeechVisible(true);
  }, [gardenProgressCount, showSeedPicker]);

  useEffect(() => {
    if (!showLevel2SeedPicker) return;
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setMascotMessage(
      isBackfillSeedPicker('level2', gardenProgressCount)
        ? 'Pick your level 2 flower so your garden can bloom again! ⭐'
        : LEVEL_2_SEED_PROMPT,
    );
    setSpeechVisible(true);
  }, [gardenProgressCount, showLevel2SeedPicker]);

  useEffect(() => {
    if (!showLevel3SeedPicker) return;
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setMascotMessage(
      isBackfillSeedPicker('level3', gardenProgressCount)
        ? 'Pick your level 3 flower to fill in your garden! 🌷'
        : LEVEL_3_SEED_PROMPT,
    );
    setSpeechVisible(true);
  }, [gardenProgressCount, showLevel3SeedPicker]);

  useEffect(() => {
    if (!showLevel4SeedPicker) return;
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setMascotMessage(
      isBackfillSeedPicker('level4', gardenProgressCount)
        ? 'Pick your level 4 flower to complete your garden row! 💜'
        : LEVEL_4_SEED_PROMPT,
    );
    setSpeechVisible(true);
  }, [gardenProgressCount, showLevel4SeedPicker]);

  const handleStartingSeedSelect = useCallback(
    (seed: StartingSeed) => {
      chooseStartingSeed(seed);
      const cheer = isBackfillSeedPicker('starting', gardenProgressCount)
        ? 'Lovely choice!\nYour garden flowers are back! 🌱'
        : 'Lovely choice!\nComplete a task to help it grow! 🌱';
      showMascotCheer(cheer);
    },
    [chooseStartingSeed, gardenProgressCount, showMascotCheer],
  );

  const handleLevel2SeedSelect = useCallback(
    (seed: Level2Seed) => {
      chooseLevel2Seed(seed);
      const cheer = isBackfillSeedPicker('level2', gardenProgressCount)
        ? 'Wonderful pick!\nYour level 2 flower is ready to grow! ✨'
        : 'Wonderful pick!\nComplete a task to help it grow! ✨';
      showMascotCheer(cheer);
    },
    [chooseLevel2Seed, gardenProgressCount, showMascotCheer],
  );

  const handleLevel3SeedSelect = useCallback(
    (seed: Level3Seed) => {
      chooseLevel3Seed(seed);
      const backfill = isBackfillSeedPicker('level3', gardenProgressCount);
      const cheer =
        seed === 'catgrass'
          ? backfill
            ? 'Cat grass!\nYour level 3 sprout is in the garden! 🐱🌿'
            : 'Cat grass!\nIt might meow as it grows! 🐱🌿'
          : backfill
            ? 'A cheerful tulip!\nYour level 3 sprout is in the garden! 🌷'
            : 'A cheerful tulip!\nComplete a task to help it bloom! 🌷';
      showMascotCheer(cheer);
    },
    [chooseLevel3Seed, gardenProgressCount, showMascotCheer],
  );

  const handleLevel4SeedSelect = useCallback(
    (seed: Level4Seed) => {
      chooseLevel4Seed(seed);
      const backfill = isBackfillSeedPicker('level4', gardenProgressCount);
      const cheer =
        seed === 'puppypoppy'
          ? backfill
            ? 'Puppy poppy!\nYour level 4 sprout is in the garden! 🐶🌺'
            : 'Puppy poppy!\nA puppy with its tongue out awaits! 🐶🌺'
          : backfill
            ? 'Wiggle wisteria!\nYour level 4 sprout is in the garden! 💜'
            : 'Wiggle wisteria!\nWatch the stem and leaves dance! 💜';
      showMascotCheer(cheer);
    },
    [chooseLevel4Seed, gardenProgressCount, showMascotCheer],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    void (async () => {
      await unlockAudio();
      if (!reducedMotion) {
        await playAddTaskSound(muted);
      }
    })();
    addTask(input);
    setInput('');
    inputRef.current?.focus();
  };

  if (!hydrated) {
    return (
      <div className="app-shell">
        <FallingSakuraPetals reducedMotion={reducedMotion} />
        <div className="app app--loading">
          <p>Loading your garden…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <FallingSakuraPetals reducedMotion={reducedMotion} />
      <div className="app">
        <StickyKawaiiHeader
          ref={mascotRef}
          message={mascotMessage}
          visible={speechVisible}
          dancing={mascotDancing}
          gardenLevel={gardenLevel}
          gardenCyclePlanted={gardenCycleProgress.planted}
          gardenCycleMax={gardenCycleProgress.max}
          muted={muted}
          onToggleMute={() => {
            void unlockAudio();
            setMuted((m) => !m);
          }}
          onPickRandom={tasks.length > 0 ? handlePickRandom : undefined}
          pickDisabled={tasks.filter((t) => !t.completed).length === 0}
        />

        <div
          className={`app-body${gardenRevealPhase !== 'idle' ? ' app-body--garden-reveal' : ''}${gardenRevealPhase === 'exit' ? ' app-body--garden-reveal-exit' : ''}`}
        >
          <form
            className={`add-task-form${gardenRevealPhase !== 'idle' ? ' garden-reveal-slat' : ''}`}
            style={
              gardenRevealPhase !== 'idle'
                ? ({ '--blind-index': 0 } as React.CSSProperties)
                : undefined
            }
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              className="add-task-input"
              placeholder="What would you like to do?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="New task"
            />
            <button type="submit" className="add-task-btn" aria-label="Add task">
              +
            </button>
          </form>

          <main
            className={`app-main${gardenRevealPhase !== 'idle' ? ' app-main--garden-reveal' : ''}${gardenRevealPhase === 'exit' ? ' app-main--garden-reveal-exit' : ''}`}
          >
            <TaskList
              tasks={tasks}
              muted={muted}
              reducedMotion={reducedMotion}
              pickedTaskId={pickedTaskId}
              gardenRevealPhase={gardenRevealPhase}
              onComplete={handleTaskCompleted}
              onUncomplete={handleUncomplete}
              onDelete={handleDelete}
              onUpdateText={updateTaskText}
              getNextCompletionIndex={getNextCompletionIndex}
              onClearCompleted={clearCompleted}
              onReorder={reorderTask}
              onReorderToIndex={reorderTaskToIndex}
            />
          </main>

        </div>

        {gardenRevealPhase === 'active' && !showLevelSeedPicker && (
          <GardenRevealReturnButton onReturn={endGardenReveal} />
        )}

        <div className="app-celebrations-layer" aria-hidden>
          <SpiralCelebration
            key={spiralBurstId}
            active={spiralActive}
            burstId={spiralBurstId}
            originX={celebrationOrigin.x}
            originY={celebrationOrigin.y}
            startRadius={celebrationOrigin.startRadius}
            maxRadius={celebrationOrigin.maxRadius}
            onComplete={() => setSpiralActive(false)}
          />

          <StarBurst
            key={starsBurstId}
            active={starsActive}
            burstId={starsBurstId}
            originX={celebrationOrigin.x}
            originY={celebrationOrigin.y}
            startRadius={celebrationOrigin.startRadius}
            maxRadius={celebrationOrigin.maxRadius}
            onComplete={() => setStarsActive(false)}
          />
        </div>
      </div>

      <GardenScene
        completedCount={gardenDisplayCount}
        startingSeed={startingSeed}
        level2Seed={level2Seed}
        level3Seed={level3Seed}
        level4Seed={level4Seed}
        muted={muted}
      />

      {showSeedPicker && <StartingSeedPicker onSelect={handleStartingSeedSelect} />}
      {showLevel2SeedPicker && <Level2SeedPicker onSelect={handleLevel2SeedSelect} />}
      {showLevel3SeedPicker && <Level3SeedPicker onSelect={handleLevel3SeedSelect} />}
      {showLevel4SeedPicker && <Level4SeedPicker onSelect={handleLevel4SeedSelect} />}
    </div>
  );
}
