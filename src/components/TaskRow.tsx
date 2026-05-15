import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../hooks/useTasks';
import { getGrowthTier, type GrowthTier } from '../lib/growthTier';
import {
  playBloomSound,
  playGrowSound,
  playRetractSound,
  playWiltSound,
  unlockAudio,
} from '../lib/sounds';
import { StemStrikeSVG } from './StemStrikeSVG';

interface TaskRowProps {
  task: Task;
  muted: boolean;
  reducedMotion: boolean;
  isPicked: boolean;
  onComplete: (id: string, completionIndex: number) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  getNextCompletionIndex: () => number;
}

type AnimDirection = 'complete' | 'uncomplete' | null;

const WILT_DURATION_MS = 320;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export function TaskRow({
  task,
  muted,
  reducedMotion,
  isPicked,
  onComplete,
  onUncomplete,
  onDelete,
  getNextCompletionIndex,
}: TaskRowProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(40);
  const [progress, setProgress] = useState(task.completed ? 1 : 0);
  const [blooming, setBlooming] = useState(task.completed);
  const [wilting, setWilting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState<AnimDirection>(null);
  const [activeTier, setActiveTier] = useState<GrowthTier | null>(
    task.completionIndex != null ? getGrowthTier(task.completionIndex) : null,
  );

  const tier =
    activeTier ??
    (task.completionIndex != null
      ? getGrowthTier(task.completionIndex)
      : getGrowthTier(1));

  const measure = useCallback(() => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setTextWidth(rect.width);
    setRowHeight(Math.max(rect.height, 36));
  }, []);

  useEffect(() => {
    measure();
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, task.text]);

  useEffect(() => {
    if (isAnimating) return;
    if (task.completed && task.completionIndex != null) {
      setActiveTier(getGrowthTier(task.completionIndex));
      setProgress(1);
      setBlooming(true);
      setWilting(false);
    } else if (!task.completed) {
      setProgress(0);
      setBlooming(false);
      setWilting(false);
      if (!isAnimating) setActiveTier(null);
    }
  }, [task.completed, task.completionIndex, isAnimating]);

  const runCompletionAnimation = useCallback(
    (completionIdx: number) => {
      const animTier = getGrowthTier(completionIdx);
      setActiveTier(animTier);
      setAnimDirection('complete');
      const duration = reducedMotion ? 0 : animTier.growDurationMs;

      if (duration === 0) {
        setProgress(1);
        setBlooming(true);
        if (!muted) playBloomSound(completionIdx, muted);
        onComplete(task.id, completionIdx);
        setIsAnimating(false);
        setAnimDirection(null);
        return;
      }

      setIsAnimating(true);
      setWilting(false);
      playGrowSound(completionIdx, duration, muted);

      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        setProgress(easeOutCubic(t));

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          setBlooming(true);
          playBloomSound(completionIdx, muted);
          onComplete(task.id, completionIdx);
          setTimeout(() => {
            setIsAnimating(false);
            setAnimDirection(null);
          }, 350);
        }
      };

      requestAnimationFrame(tick);
    },
    [muted, onComplete, reducedMotion, task.id],
  );

  const runUncompleteAnimation = useCallback(() => {
    const completionIdx = task.completionIndex ?? 1;
    const animTier = getGrowthTier(completionIdx);
    setActiveTier(animTier);
    setAnimDirection('uncomplete');
    const retractDuration = reducedMotion ? 0 : animTier.growDurationMs;
    const wiltDuration = reducedMotion ? 0 : WILT_DURATION_MS;

    if (wiltDuration === 0 && retractDuration === 0) {
      setProgress(0);
      setBlooming(false);
      setWilting(false);
      onUncomplete(task.id);
      setAnimDirection(null);
      return;
    }

    setIsAnimating(true);
    setBlooming(false);
    setWilting(true);
    setProgress(1);
    playWiltSound(completionIdx, muted);

    const startWilt = performance.now();

    const afterWilt = () => {
      setWilting(false);
      playRetractSound(completionIdx, retractDuration, muted);

      if (retractDuration === 0) {
        setProgress(0);
        onUncomplete(task.id);
        setIsAnimating(false);
        setAnimDirection(null);
        return;
      }

      const startRetract = performance.now();

      const tickRetract = (now: number) => {
        const elapsed = now - startRetract;
        const t = Math.min(elapsed / retractDuration, 1);
        setProgress(1 - easeInCubic(t));

        if (t < 1) {
          requestAnimationFrame(tickRetract);
        } else {
          setProgress(0);
          onUncomplete(task.id);
          setIsAnimating(false);
          setAnimDirection(null);
        }
      };

      requestAnimationFrame(tickRetract);
    };

    if (wiltDuration === 0) {
      afterWilt();
      return;
    }

    const tickWilt = (now: number) => {
      const elapsed = now - startWilt;
      if (elapsed < wiltDuration) {
        requestAnimationFrame(tickWilt);
      } else {
        afterWilt();
      }
    };

    requestAnimationFrame(tickWilt);
  }, [muted, onUncomplete, reducedMotion, task.completionIndex, task.id]);

  const handleCheck = () => {
    if (isAnimating) return;
    unlockAudio();
    measure();

    if (task.completed) {
      runUncompleteAnimation();
    } else {
      const idx = getNextCompletionIndex();
      runCompletionAnimation(idx);
    }
  };

  const checkboxChecked =
    animDirection === 'complete'
      ? true
      : animDirection === 'uncomplete'
        ? false
        : task.completed;

  const showStem = task.completed || isAnimating || progress > 0;
  const isStruck = progress >= 0.95;
  const textOpacity = progress > 0.2 ? 0.55 + (1 - Math.min(progress, 1)) * 0.45 : 1;

  return (
    <li
      id={`task-${task.id}`}
      className={`task-row ${checkboxChecked && animDirection !== 'uncomplete' ? 'task-row--completed' : ''} ${isPicked && !task.completed ? 'task-row--picked' : ''}`}
    >
      <label className="task-checkbox-label">
        <input
          type="checkbox"
          className="task-checkbox"
          checked={checkboxChecked}
          disabled={isAnimating}
          onChange={handleCheck}
          aria-label={
            task.completed
              ? `Mark "${task.text}" as not done`
              : `Mark "${task.text}" as complete`
          }
        />
        <span className="checkbox-face" aria-hidden />
      </label>

      <div className="task-text-wrapper">
        <span
          ref={textRef}
          className={`task-text ${isStruck ? 'task-text--struck' : ''}`}
          style={{ opacity: textOpacity }}
        >
          {task.text}
        </span>

        {showStem && textWidth > 0 && (
          <div
            className="stem-overlay"
            style={{ width: textWidth + 48, height: rowHeight }}
          >
            <StemStrikeSVG
              textWidth={textWidth}
              progress={progress}
              tier={tier}
              blooming={blooming}
              wilting={wilting}
              rowHeight={rowHeight}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className="task-delete"
        onClick={() => onDelete(task.id)}
        disabled={isAnimating}
        aria-label={`Delete "${task.text}"`}
      >
        ×
      </button>
    </li>
  );
}
