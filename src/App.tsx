import { useCallback, useEffect, useRef, useState } from 'react';
import { FallingSakuraPetals } from './components/FallingSakuraPetals';
import { GardenScene } from './components/GardenScene';
import { KawaiiMascot } from './components/KawaiiMascot';
import { StarBurst } from './components/StarBurst';
import { TaskList } from './components/TaskList';
import { getCompletedCount, useTasks } from './hooks/useTasks';
import { pickMotivationalPhrase } from './lib/motivationalPhrases';
import { playCelebrationTune, unlockAudio } from './lib/sounds';

const SPEECH_DURATION_MS = 3200;
const HOP_DURATION_MS = 1400;
const PICKED_CELEBRATION_PHRASE = 'You did the one I picked! So proud of you! ⭐';

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
  const [starOrigin, setStarOrigin] = useState({ x: 72, y: 100 });

  const inputRef = useRef<HTMLInputElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhraseRef = useRef<string | undefined>(undefined);
  const reducedMotion = usePrefersReducedMotion();

  const {
    tasks,
    hydrated,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    clearCompleted,
    getNextCompletionIndex,
  } = useTasks();

  const completedCount = getCompletedCount(tasks);

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
    const rect = el.getBoundingClientRect();
    setStarOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.35,
    });
  }, []);

  const runPickedCelebration = useCallback(() => {
    showMascotCheer(PICKED_CELEBRATION_PHRASE);
    unlockAudio();

    if (reducedMotion) {
      playCelebrationTune(muted);
      return;
    }

    setMascotDancing(true);
    const tuneMs = playCelebrationTune(muted);
    const waitMs = Math.max(tuneMs, HOP_DURATION_MS);

    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      setMascotDancing(false);
      measureMascotOrigin();
      setStarsActive(true);
    }, waitMs);
  }, [muted, measureMascotOrigin, reducedMotion, showMascotCheer]);

  const handlePickRandom = useCallback(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    if (incomplete.length === 0) return;
    unlockAudio();
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
      const wasPicked = id === pickedTaskId;
      completeTask(id, completionIndex);
      if (wasPicked) {
        setPickedTaskId(null);
        runPickedCelebration();
      } else {
        showMascotCheer();
      }
    },
    [completeTask, pickedTaskId, runPickedCelebration, showMascotCheer],
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      if (id === pickedTaskId) setPickedTaskId(null);
      uncompleteTask(id);
    },
    [pickedTaskId, uncompleteTask],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
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
        <div className="app__top">
          <KawaiiMascot
            ref={mascotRef}
            message={mascotMessage}
            visible={speechVisible}
            dancing={mascotDancing}
          />

          <div className="app-toolbar">
            <button
              type="button"
              className="mute-toggle"
              onClick={() => {
                unlockAudio();
                setMuted((m) => !m);
              }}
              aria-pressed={muted}
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? '🔇' : '🔔'}
            </button>
          </div>

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
              onPickRandom={handlePickRandom}
              onComplete={handleTaskCompleted}
              onUncomplete={handleUncomplete}
              onDelete={handleDelete}
              getNextCompletionIndex={getNextCompletionIndex}
              onClearCompleted={clearCompleted}
            />
          </main>
        </div>
      </div>

      <StarBurst
        active={starsActive}
        originX={starOrigin.x}
        originY={starOrigin.y}
        onComplete={() => setStarsActive(false)}
      />

      <GardenScene completedCount={completedCount} />
    </div>
  );
}
