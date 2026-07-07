import { useCallback, useEffect, useRef, useState } from 'react';
import { FallingSakuraPetals } from './components/FallingSakuraPetals';
import { TwinklingStars } from './components/TwinklingStars';
import { GardenScene } from './components/GardenScene';
import { StickyKawaiiHeader } from './components/StickyKawaiiHeader';
import { SpiralCelebration } from './components/SpiralCelebration';
import { StarBurst } from './components/StarBurst';
import { TaskList } from './components/TaskList';
import { useTasks } from './hooks/useTasks';
import { useGardenEditor } from './hooks/useGardenEditor';
import { useAppVariant, useGardenConfig } from './context/AppVariantContext';
import {
  GARDEN_REVEAL_ANIM_MS,
  getGardenAutoReturnDelayMs,
  getGardenRevealGrowthStartDelayMs,
  getGardenRevealScrollTop,
  shouldRevealGardenForCompletion,
} from './lib/gardenReveal';
import { buildGardenSceneInstances } from './lib/garden/buildScene';
import { getUnlockImageForDefinition } from './lib/garden/birdBehavior';
import {
  getGardenConfigForPhase,
  mode1GardenConfig,
} from './lib/garden/loadConfig';
import {
  getSceneGardenPhase,
  getSceneProgressCount,
} from './lib/gardenPhase';
import { Mode2UnlockOverlay } from './components/Mode2UnlockOverlay';
import { LevelUnlockOverlay } from './components/LevelUnlockOverlay';
import { GardenPhaseToggle } from './components/GardenPhaseToggle';
import type { GardenPhase } from './lib/garden/types';
import { preloadGardenAssetSize, waitForGardenAssetSize } from './lib/garden/elementDisplaySize';
import {
  getGardenCycleProgress,
  getGardenLevel,
  isGardenLevelComplete,
  isGardenFullyComplete,
} from './lib/plantedGarden';
import {
  DEFAULT_CELEBRATION_ORIGIN,
  measureScreenCelebrationOrigin,
  type CelebrationOrigin,
} from './lib/mascotCelebration';
import { DevPanel } from './components/DevPanel';
import { GardenEditor } from './components/GardenEditor';
import { pickMotivationalPhrase } from './lib/motivationalPhrases';
import { pickDadMotivationalPhrase } from './lib/dadMotivationalPhrases';
import { playAddTaskSound, playCelebrationTune, unlockAudio } from './lib/sounds';

const SPEECH_DURATION_MS = 3200;
const HOP_DURATION_MS = 1400;
const PICKED_CELEBRATION_PHRASE_DEFAULT =
  'You did the one I picked!\nSo proud of you! ⭐';
const PICKED_CELEBRATION_PHRASE_DAD =
  'You did the one I picked!\nMission accomplished! 🚀';

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
  const variant = useAppVariant();
  const gardenConfig = useGardenConfig();
  const isDad = variant === 'dad';
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
  const [gardenRevealManual, setGardenRevealManual] = useState(false);
  const [mode2UnlockActive, setMode2UnlockActive] = useState(false);
  const [showFlowerButton, setShowFlowerButton] = useState(false);
  const [gardenFadePhase, setGardenFadePhase] = useState<'mode1' | 'mode2' | 'none'>('none');
  const [levelUnlock, setLevelUnlock] = useState<{
    name: string;
    image: string | null;
  } | null>(null);
  const [editorPhase, setEditorPhase] = useState<GardenPhase>('mode1');

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
    phaseState,
    reorderTask,
    reorderTaskToIndex,
    setGardenProgressForDev,
    resetGardenLevel,
    resetAllGardenState,
    unlockMode2,
    completeMode2Onboarding,
    toggleNostalgicView,
  } = useTasks(variant);

  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const isDev = import.meta.env.DEV;
  const editor = useGardenEditor(gardenConfig, variant, editorPhase);

  useEffect(() => {
    if (!hydrated || isDad || !phaseState.mode2Unlocked) return;
    setEditorPhase((prev) => (prev === 'mode1' ? 'mode2' : prev));
  }, [hydrated, isDad, phaseState.mode2Unlocked]);

  const sceneProgressInput = {
    gardenProgressCount,
    mode2Unlocked: phaseState.mode2Unlocked,
    mode2ProgressCount: phaseState.mode2ProgressCount,
    mode1FrozenProgressCount: phaseState.mode1FrozenProgressCount,
    viewingNostalgicMode1: phaseState.viewingNostalgicMode1,
  };
  const sceneProgressCount = getSceneProgressCount(sceneProgressInput);
  const sceneGardenPhase = getSceneGardenPhase(sceneProgressInput);
  const sceneGardenConfig =
    !isDad && phaseState.mode2Unlocked
      ? getGardenConfigForPhase(sceneGardenPhase)
      : gardenConfig;

  const showTaskList =
    !phaseState.viewingNostalgicMode1 &&
    !mode2UnlockActive;

  const handleDevApply = useCallback(
    ({ completedCount, devPhase }: { completedCount: number; devPhase?: GardenPhase }) => {
      if (devPhase === 'mode2') {
        if (!phaseState.mode2Unlocked) {
          unlockMode2(phaseState.mode1FrozenProgressCount || gardenProgressCount);
        }
        setGardenProgressForDev(completedCount, devPhase);
        completeMode2Onboarding();
      } else if (devPhase === 'mode1') {
        setGardenProgressForDev(completedCount, devPhase);
        setMode2UnlockActive(false);
        setShowFlowerButton(false);
        setGardenFadePhase('none');
        setLevelUnlock(null);
        setEditorPhase('mode1');
      } else {
        setGardenProgressForDev(completedCount, devPhase);
      }
    },
    [
      setGardenProgressForDev,
      unlockMode2,
      completeMode2Onboarding,
      phaseState.mode2Unlocked,
      phaseState.mode1FrozenProgressCount,
      gardenProgressCount,
    ],
  );

  const handleDevResetEverything = useCallback(() => {
    resetAllGardenState();
    setMode2UnlockActive(false);
    setShowFlowerButton(false);
    setGardenFadePhase('none');
    setLevelUnlock(null);
    setEditorPhase('mode1');
  }, [resetAllGardenState]);

  const handleResetGarden = useCallback(() => {
    if (gardenProgressCount <= 0) return;
    if (
      !window.confirm(
        'Reset your garden to level 0? All tasks stay on your list (including completed ones), but your garden will start fresh.',
      )
    ) {
      return;
    }
    resetGardenLevel();
    setMode2UnlockActive(false);
    setShowFlowerButton(false);
    setGardenFadePhase('none');
    setLevelUnlock(null);
    setEditorPhase('mode1');
    setGardenRevealPhase('idle');
    setGardenRevealHeldCount(null);
    setGardenRevealGrowthUnlocked(false);
    setGardenRevealManual(false);
    if (gardenRevealAutoReturnRef.current) {
      clearTimeout(gardenRevealAutoReturnRef.current);
      gardenRevealAutoReturnRef.current = null;
    }
    if (gardenRevealGrowthTimerRef.current) {
      clearTimeout(gardenRevealGrowthTimerRef.current);
      gardenRevealGrowthTimerRef.current = null;
    }
  }, [gardenProgressCount, resetGardenLevel]);

  const gardenLevel = getGardenLevel(sceneProgressCount, sceneGardenConfig);
  const gardenCycleProgress = getGardenCycleProgress(
    sceneProgressCount,
    sceneGardenConfig,
  );
  const gardenDisplayCount =
    gardenRevealPhase === 'active' &&
    !gardenRevealGrowthUnlocked &&
    gardenRevealHeldCount != null
      ? gardenRevealHeldCount
      : sceneProgressCount;

  const showMascotCheer = useCallback((phrase?: string) => {
    const text =
      phrase ??
      (isDad
        ? pickDadMotivationalPhrase(lastPhraseRef.current)
        : pickMotivationalPhrase(lastPhraseRef.current));
    lastPhraseRef.current = text;
    setMascotMessage(text);
    setSpeechVisible(true);

    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setSpeechVisible(false);
    }, SPEECH_DURATION_MS);
  }, [isDad]);

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
    showMascotCheer(
      isDad ? PICKED_CELEBRATION_PHRASE_DAD : PICKED_CELEBRATION_PHRASE_DEFAULT,
    );

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
  }, [isDad, muted, measureMascotOrigin, reducedMotion, showMascotCheer]);

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
    setGardenRevealManual(false);
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

  const handleViewGarden = useCallback(() => {
    if (gardenRevealPhase === 'exit') return;

    if (gardenRevealPhase === 'active') {
      endGardenReveal();
      return;
    }

    void unlockAudio();
    setGardenRevealManual(true);
    setGardenRevealHeldCount(null);
    setGardenRevealGrowthUnlocked(false);
    beginGardenReveal();
  }, [gardenRevealPhase, beginGardenReveal, endGardenReveal]);

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
    let cancelled = false;
    gardenRevealGrowthTimerRef.current = window.setTimeout(() => {
      gardenRevealGrowthTimerRef.current = null;
      void (async () => {
        const scene = buildGardenSceneInstances(sceneProgressCount, sceneGardenConfig);
        const newest = scene.newestId
          ? scene.elements.find((el) => el.id === scene.newestId)
          : null;
        if (newest) {
          await waitForGardenAssetSize(newest);
        }
        if (!cancelled) {
          setGardenRevealGrowthUnlocked(true);
        }
      })();
    }, growthDelay);

    return () => {
      cancelled = true;
      clearGardenRevealGrowthTimer();
    };
  }, [
    gardenRevealPhase,
    tasks.length,
    reducedMotion,
    gardenProgressCount,
    sceneProgressCount,
    sceneGardenConfig,
    gardenConfig,
    clearGardenRevealGrowthTimer,
  ]);

  useEffect(() => {
    if (gardenRevealPhase !== 'active' || gardenRevealManual) {
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
    gardenRevealManual,
    tasks.length,
    reducedMotion,
    endGardenReveal,
    clearGardenRevealAutoReturn,
  ]);

  useEffect(() => {
    if (sceneProgressCount <= 0) return;
    const scene = buildGardenSceneInstances(sceneProgressCount, sceneGardenConfig);
    if (!scene.newestId) return;
    const newest = scene.elements.find((el) => el.id === scene.newestId);
    if (newest) preloadGardenAssetSize(newest);
  }, [sceneProgressCount, sceneGardenConfig]);

  const handleMode2UnlockComplete = useCallback(() => {
    unlockMode2(gardenProgressCount);
    completeMode2Onboarding();
    setMode2UnlockActive(false);
    setShowFlowerButton(true);
    setGardenFadePhase('none');
  }, [unlockMode2, completeMode2Onboarding, gardenProgressCount]);

  const handleMode2Transition = useCallback(() => {
    setGardenFadePhase('mode2');
  }, []);

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
      if (mode2UnlockActive || levelUnlock) return;

      const celebrationKey = `${id}:${completionIndex}`;
      const now = Date.now();
      const last = lastCelebrationRef.current;
      if (last && last.key === celebrationKey && now - last.at < 200) {
        return;
      }
      lastCelebrationRef.current = { key: celebrationKey, at: now };

      const wasPicked = id === pickedTaskId;
      const mode2Active = !isDad && phaseState.mode2Unlocked;
      const progressConfig = mode2Active
        ? getGardenConfigForPhase('mode2')
        : mode1GardenConfig;
      const previousGardenCount = mode2Active
        ? phaseState.mode2ProgressCount
        : gardenProgressCount;
      const nextGardenCount = previousGardenCount + 1;

      const revealGarden = shouldRevealGardenForCompletion(
        nextGardenCount,
        previousGardenCount,
        progressConfig,
      );

      if (revealGarden) {
        setGardenRevealHeldCount(previousGardenCount);
        setGardenRevealGrowthUnlocked(false);
        beginGardenReveal();
      }

      completeTask(id, completionIndex);

      if (
        !isDad &&
        !phaseState.mode2Unlocked &&
        isGardenFullyComplete(nextGardenCount, mode1GardenConfig)
      ) {
        setMode2UnlockActive(true);
        setGardenFadePhase('mode1');
        if (wasPicked) setPickedTaskId(null);
        return;
      }

      if (mode2Active && isGardenLevelComplete(nextGardenCount, progressConfig)) {
        const newLevel = getGardenLevel(nextGardenCount, progressConfig);
        const def = progressConfig.getLevelDefinition(newLevel);
        if (def) {
          setLevelUnlock({
            name: def.name ?? `Level ${newLevel}`,
            image: getUnlockImageForDefinition(def),
          });
        }
      } else if (
        !mode2Active &&
        isGardenLevelComplete(nextGardenCount, isDad ? gardenConfig : mode1GardenConfig)
      ) {
        showMascotCheer(
          isDad
            ? 'Moon level up! 🌙✨\nMission accomplished!'
            : 'Garden level up! 🌸✨\nYour flower has fully bloomed!',
        );
      }

      if (wasPicked) {
        setPickedTaskId(null);
        runPickedCelebration();
        return;
      }
      runNormalCelebration();
    },
    [
      mode2UnlockActive,
      levelUnlock,
      beginGardenReveal,
      completeTask,
      gardenConfig,
      gardenProgressCount,
      isDad,
      phaseState.mode2Unlocked,
      phaseState.mode2ProgressCount,
      pickedTaskId,
      runNormalCelebration,
      runPickedCelebration,
      showMascotCheer,
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

  const displayGardenConfig = mode2UnlockActive
    ? gardenFadePhase === 'mode2'
      ? getGardenConfigForPhase('mode2')
      : mode1GardenConfig
    : sceneGardenConfig;

  const displayGardenCount = mode2UnlockActive
    ? gardenFadePhase === 'mode2'
      ? 0
      : gardenProgressCount
    : gardenDisplayCount;

  const isMode2PageTheme =
    !isDad &&
    (editor.enabled
      ? editorPhase === 'mode2'
      : sceneGardenPhase === 'mode2' &&
        (!mode2UnlockActive || gardenFadePhase === 'mode2'));

  if (!hydrated) {
    return (
      <div className="app-shell">
        {isDad ? (
          <TwinklingStars reducedMotion={reducedMotion} />
        ) : (
          <FallingSakuraPetals reducedMotion={reducedMotion} />
        )}
        <div className="app app--loading">
          <p>{isDad ? 'Loading your moon base…' : 'Loading your garden…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-shell${editor.enabled ? ' app-shell--garden-editor' : ''}${isMode2PageTheme ? ' app-shell--mode2' : ''}`}
    >
      {isMode2PageTheme && (
        <div className="mode2-sky-backdrop" aria-hidden />
      )}
      {isDad ? (
        <TwinklingStars reducedMotion={reducedMotion} />
      ) : (
        <FallingSakuraPetals reducedMotion={reducedMotion} />
      )}
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
          onViewGarden={handleViewGarden}
          gardenViewOpen={gardenRevealPhase !== 'idle'}
          onPickRandom={tasks.length > 0 ? handlePickRandom : undefined}
          pickDisabled={tasks.filter((t) => !t.completed).length === 0}
          onResetGarden={handleResetGarden}
          resetGardenDisabled={gardenProgressCount <= 0}
        />

        <div
          className={`app-body${gardenRevealPhase !== 'idle' ? ' app-body--garden-reveal' : ''}${gardenRevealPhase === 'exit' ? ' app-body--garden-reveal-exit' : ''}${!showTaskList ? ' app-body--garden-only' : ''}`}
        >
          {showTaskList && (
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
          )}

          {showTaskList && (
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
          )}
        </div>

        <div className="app-celebrations-layer" aria-hidden>
          <SpiralCelebration
            key={`spiral-${spiralBurstId}`}
            active={spiralActive}
            burstId={spiralBurstId}
            originX={celebrationOrigin.x}
            originY={celebrationOrigin.y}
            startRadius={celebrationOrigin.startRadius}
            maxRadius={celebrationOrigin.maxRadius}
            onComplete={() => setSpiralActive(false)}
          />

          <StarBurst
            key={`star-${starsBurstId}`}
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
        completedCount={displayGardenCount}
        gardenConfigOverride={
          editor.enabled ? editor.activeConfig : displayGardenConfig
        }
        gardenFadePhase={mode2UnlockActive ? gardenFadePhase : 'none'}
        elementsOverride={editor.enabled ? editor.elements : null}
        editable={editor.enabled}
        selectedId={editor.selectedId}
        levelMoveLevel={editor.levelMoveLevel}
        onSelectElement={editor.setSelectedId}
        onElementDrag={editor.handleDrag}
        editorSurfaces={editor.enabled ? editor.workingSurfaces : undefined}
        surfaceTool={editor.enabled ? editor.surfaceTool : null}
        onAddSurfaceRect={editor.enabled ? editor.addSurfaceRect : undefined}
        onUpdateSurfaceRect={editor.enabled ? editor.updateSurfaceRect : undefined}
        selectedSurface={editor.enabled ? editor.selectedSurface : null}
        onSelectSurface={editor.enabled ? editor.selectSurfaceOnCanvas : undefined}
        collisionBoxTool={editor.enabled ? editor.collisionBoxTool : false}
        onSetCollisionBox={editor.enabled ? editor.setCollisionBox : undefined}
        suppressMascotDelivery={!!levelUnlock || mode2UnlockActive}
        levelUnlockActive={!!levelUnlock}
      />

      {((!isDad &&
        (phaseState.mode2OnboardingComplete ||
          (mode2UnlockActive && showFlowerButton))) ||
        isDev) && (
        <div className="app-bottom-toolbar">
          {isDev && (
            <>
              <button
                type="button"
                className="dev-toggle-btn"
                onClick={() => setDevPanelOpen(true)}
                aria-label="Open dev tools"
                title="Dev tools"
              >
                DEV
              </button>
              <button
                type="button"
                className={`dev-toggle-btn${editor.enabled ? ' dev-toggle-btn--active' : ''}`}
                onClick={editor.toggle}
                aria-label="Toggle garden editor"
                title="Garden editor"
              >
                EDIT
              </button>
            </>
          )}
          {!isDad &&
            (phaseState.mode2OnboardingComplete ||
              (mode2UnlockActive && showFlowerButton)) && (
              <GardenPhaseToggle
                viewingNostalgicMode1={phaseState.viewingNostalgicMode1}
                highlight={mode2UnlockActive && showFlowerButton}
                onToggle={toggleNostalgicView}
              />
            )}
        </div>
      )}

      {!isDad && (
        <Mode2UnlockOverlay
          active={mode2UnlockActive}
          muted={muted}
          showFlowerButton={showFlowerButton}
          onShowFlowerButton={() => setShowFlowerButton(true)}
          onTransitionToMode2={handleMode2Transition}
          onComplete={handleMode2UnlockComplete}
        />
      )}

      {!isDad && levelUnlock && (
        <LevelUnlockOverlay
          active
          itemName={levelUnlock.name}
          itemImage={levelUnlock.image}
          muted={muted}
          onDismiss={() => setLevelUnlock(null)}
        />
      )}

      {isDev && (
        <>
          <DevPanel
            open={devPanelOpen}
            variant={variant}
            currentGardenProgressCount={gardenProgressCount}
            phaseState={phaseState}
            onClose={() => setDevPanelOpen(false)}
            onApply={handleDevApply}
            onResetEverything={handleDevResetEverything}
          />

          {editor.enabled && (
            <GardenEditor
              entries={editor.entries}
              selectedId={editor.selectedId}
              selectedElement={editor.selectedElement}
              gardenConfig={editor.activeConfig}
              configuredLevels={editor.configuredLevels}
              levelMoveLevel={editor.levelMoveLevel}
              onLevelMoveLevelChange={editor.setLevelMoveLevel}
              onOffsetLevel={editor.offsetLevel}
              onScaleLevel={editor.scaleLevel}
              onSelect={editor.setSelectedId}
              onZIndexChange={editor.setZIndex}
              onNudgeZIndex={editor.nudgeZIndex}
              onScaleChange={editor.setScale}
              onFlipXChange={editor.setFlipX}
              onAnimationLastFrameHoldChange={editor.setAnimationLastFrameHold}
              onSave={editor.save}
              saving={editor.saving}
              onClose={editor.toggle}
              editorPhase={editorPhase}
              onEditorPhaseChange={setEditorPhase}
              surfaceTool={editor.surfaceTool}
              onSurfaceToolChange={editor.setSurfaceTool}
              onUpdateSurfaceRect={editor.updateSurfaceRect}
              selectedSurfaceRect={editor.selectedSurfaceRect}
              onDeleteSurface={editor.deleteSurfaceRect}
              collisionBoxTool={editor.collisionBoxTool}
              onCollisionBoxToolChange={editor.setCollisionBoxTool}
              onClearCollisionBox={editor.clearCollisionBox}
            />
          )}
        </>
      )}
    </div>
  );
}
