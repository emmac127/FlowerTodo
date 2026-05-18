import { useCallback, useEffect, useRef, useState } from 'react';
import { FallingSakuraPetals } from './components/FallingSakuraPetals';
import { GardenScene } from './components/GardenScene';
import { StickyKawaiiHeader } from './components/StickyKawaiiHeader';
import { SpiralCelebration } from './components/SpiralCelebration';
import { StarBurst } from './components/StarBurst';
import { TaskList } from './components/TaskList';
import { getCompletedCount, useTasks } from './hooks/useTasks';
import { useStartingSeed } from './hooks/useStartingSeed';
import { getGardenCycleProgress, getGardenLevel } from './lib/gardenProgress';
import {
  DEFAULT_CELEBRATION_ORIGIN,
  measureScreenCelebrationOrigin,
  type CelebrationOrigin,
} from './lib/mascotCelebration';
import { StartingSeedPicker } from './components/StartingSeedPicker';
import { pickMotivationalPhrase } from './lib/motivationalPhrases';
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
  const reducedMotion = usePrefersReducedMotion();

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
    reorderTask,
    reorderTaskToIndex,
  } = useTasks();

  const {
    startingSeed,
    hydrated: seedHydrated,
    chooseStartingSeed,
  } = useStartingSeed();

  const completedCount = getCompletedCount(tasks);
  const gardenLevel = getGardenLevel(completedCount);
  const gardenCycleProgress = getGardenCycleProgress(completedCount);
  const showSeedPicker =
    hydrated && seedHydrated && gardenLevel === 0 && startingSeed === null;

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
      completeTask(id, completionIndex);

      if (completionIndex > 0 && completionIndex % 5 === 0) {
        showMascotCheer('Garden level up! 🌸✨\nYour flower has fully bloomed!');
      }

      if (wasPicked) {
        setPickedTaskId(null);
        runPickedCelebration();
        return;
      }
      runNormalCelebration();
    },
    [completeTask, pickedTaskId, runNormalCelebration, runPickedCelebration, showMascotCheer],
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
    };
  }, []);

  useEffect(() => {
    if (!showSeedPicker) return;
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setMascotMessage(STARTING_SEED_PROMPT);
    setSpeechVisible(true);
  }, [showSeedPicker]);

  const handleStartingSeedSelect = useCallback(
    (seed: StartingSeed) => {
      chooseStartingSeed(seed);
      showMascotCheer('Lovely choice!\nComplete a task to help it grow! 🌱');
    },
    [chooseStartingSeed, showMascotCheer],
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

        <div className="app-body">
          <form className="add-task-form" onSubmit={handleSubmit}>
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

          <main className="app-main">
            <TaskList
              tasks={tasks}
              muted={muted}
              reducedMotion={reducedMotion}
              pickedTaskId={pickedTaskId}
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

          {showSeedPicker && <StartingSeedPicker onSelect={handleStartingSeedSelect} />}
        </div>

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
        completedCount={completedCount}
        startingSeed={startingSeed}
      />
    </div>
  );
}
