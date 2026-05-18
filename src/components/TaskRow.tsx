import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import type { Task } from '../hooks/useTasks';
import { getGrowthTier, type GrowthTier } from '../lib/growthTier';
import {
  playBloomSound,
  scheduleCompletionSounds,
  scheduleUncompleteSounds,
  unlockAudio,
} from '../lib/sounds';
import { ReorderGripIcon } from './ReorderGripIcon';
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
  isDragging?: boolean;
  isDroppingToBottom?: boolean;
  showReorderHandle?: boolean;
  dropHint?: 'above' | 'below' | null;
  onRowPointerDown?: (e: React.PointerEvent) => void;
  onRowPointerUp?: () => void;
  onRowPointerCancel?: () => void;
}

type AnimDirection = 'complete' | 'uncomplete' | null;

const WILT_DURATION_MS = 320;
const PETAL_BLOOM_MS = 350;
const PETAL_BLOOM_STAGGER_MS = 40;
const PICKED_RING_STROKE = 2.5;
const PICKED_RING_GAP = 1;
const PICKED_RING_RADIUS = 16;
const PICKED_RING_OUTSET = PICKED_RING_GAP + PICKED_RING_STROKE;

/** Wait for staggered petal + center bloom before firing onComplete (hearts, etc.). */
function getFlowerBloomSettleMs(petalCount: number): number {
  return PETAL_BLOOM_MS + (petalCount - 1) * PETAL_BLOOM_STAGGER_MS;
}

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
  isDragging = false,
  isDroppingToBottom = false,
  showReorderHandle = false,
  dropHint = null,
  onRowPointerDown,
  onRowPointerUp,
  onRowPointerCancel,
}: TaskRowProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [ringDims, setRingDims] = useState({ w: 0, h: 0 });
  const [rowHeight, setRowHeight] = useState(40);
  const [progress, setProgress] = useState(task.completed ? 1 : 0);
  const [blooming, setBlooming] = useState(task.completed);
  const [wilting, setWilting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState<AnimDirection>(null);
  const [activeTier, setActiveTier] = useState<GrowthTier | null>(
    task.completionIndex != null ? getGrowthTier(task.completionIndex) : null,
  );
  const completionRafRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const cancelCompletionAnimation = useCallback(() => {
    if (completionRafRef.current != null) {
      cancelAnimationFrame(completionRafRef.current);
      completionRafRef.current = null;
    }
    if (completionTimeoutRef.current != null) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

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
      setActiveTier(null);
    }
  }, [isAnimating, task.completed, task.completionIndex]);

  const runCompletionAnimation = useCallback(
    (completionIdx: number) => {
      const animTier = getGrowthTier(completionIdx);
      setActiveTier(animTier);
      setAnimDirection('complete');
      const duration = reducedMotion ? 0 : animTier.growDurationMs;

      if (duration === 0) {
        setProgress(1);
        setBlooming(true);
        if (!muted) void playBloomSound(completionIdx, muted);
        onComplete(task.id, completionIdx);
        setIsAnimating(false);
        setAnimDirection(null);
        return;
      }

      const bloomSettleMs = getFlowerBloomSettleMs(animTier.petalCount);

      setIsAnimating(true);
      setWilting(false);

      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        setProgress(easeOutCubic(t));

        if (t < 1) {
          completionRafRef.current = requestAnimationFrame(tick);
        } else {
          setBlooming(true);
          completionTimeoutRef.current = setTimeout(() => {
            completionTimeoutRef.current = null;
            onComplete(task.id, completionIdx);
            setIsAnimating(false);
            setAnimDirection(null);
          }, bloomSettleMs);
        }
      };

      completionRafRef.current = requestAnimationFrame(tick);
    },
    [muted, onComplete, reducedMotion, task.id],
  );

  const runUncompleteAnimation = useCallback((options?: { skipStateUpdate?: boolean }) => {
    const skipStateUpdate = options?.skipStateUpdate ?? false;
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
      if (!skipStateUpdate) onUncomplete(task.id);
      setIsAnimating(false);
      setAnimDirection(null);
      return;
    }

    setIsAnimating(true);
    setBlooming(false);
    setWilting(true);
    setProgress(1);

    const startWilt = performance.now();

    const afterWilt = () => {
      setWilting(false);

      if (retractDuration === 0) {
        setProgress(0);
        if (!skipStateUpdate) onUncomplete(task.id);
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
          if (!skipStateUpdate) onUncomplete(task.id);
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

  const checkboxChecked =
    animDirection === 'complete'
      ? true
      : animDirection === 'uncomplete'
        ? false
        : task.completed;

  const handleCheck = () => {
    const markingComplete = !checkboxChecked;

    void (async () => {
      const ctx = !muted ? await unlockAudio() : null;

      if (!markingComplete) {
        cancelCompletionAnimation();
        setIsAnimating(false);
        const completionIdx = task.completionIndex ?? 1;
        const animTier = getGrowthTier(completionIdx);
        if (ctx) {
          scheduleUncompleteSounds(
            ctx,
            completionIdx,
            reducedMotion ? 0 : animTier.growDurationMs,
            reducedMotion ? 0 : WILT_DURATION_MS,
          );
        }
        measure();
        onUncomplete(task.id);
        runUncompleteAnimation({ skipStateUpdate: true });
        return;
      }

      if (isAnimating) return;

      const idx = getNextCompletionIndex();
      const tier = getGrowthTier(idx);
      if (ctx && !reducedMotion) {
        scheduleCompletionSounds(ctx, idx, tier.growDurationMs, tier.petalCount);
      }
      measure();
      runCompletionAnimation(idx);
    })();
  };

  const showStem = task.completed || isAnimating || progress > 0;
  const isStruck = progress >= 0.95;
  const textOpacity = progress > 0.2 ? 0.55 + (1 - Math.min(progress, 1)) * 0.45 : 1;

  const showPickedRing = isPicked && !task.completed;

  useLayoutEffect(() => {
    if (!showPickedRing) return;
    const el = rowRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setRingDims({ w: width, h: height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPickedRing, task.text, textWidth, rowHeight]);

  const ringInset = PICKED_RING_STROKE / 2;
  const ringPad = PICKED_RING_OUTSET;
  const ringViewW = ringDims.w + ringPad * 2;
  const ringViewH = ringDims.h + ringPad * 2;
  const ringX = ringPad - PICKED_RING_GAP - ringInset;
  const ringY = ringX;
  const ringW = ringDims.w + PICKED_RING_GAP * 2 + PICKED_RING_STROKE;
  const ringH = ringDims.h + PICKED_RING_GAP * 2 + PICKED_RING_STROKE;
  const ringRx = Math.min(
    PICKED_RING_RADIUS + PICKED_RING_GAP + ringInset,
    ringW / 2,
    ringH / 2,
  );

  const rowClass = [
    'task-row',
    checkboxChecked && animDirection !== 'uncomplete' ? 'task-row--completed' : '',
    showPickedRing ? 'task-row--picked' : '',
    isDragging ? 'task-row--dragging' : '',
    isDroppingToBottom ? 'task-row--dropping' : '',
    dropHint === 'above' ? 'task-row--drop-above' : '',
    dropHint === 'below' ? 'task-row--drop-below' : '',
    showReorderHandle ? 'task-row--reorderable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    onDelete(task.id);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  return (
    <li
      ref={rowRef}
      id={`task-${task.id}`}
      data-task-id={task.id}
      className={rowClass}
    >
      {showPickedRing && ringDims.w > 0 && (
        <svg
          className="task-row__picked-ring"
          viewBox={`0 0 ${ringViewW} ${ringViewH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect
            className={`task-row__picked-ring-rect${reducedMotion ? ' task-row__picked-ring-rect--static' : ''}`}
            x={ringX}
            y={ringY}
            width={ringW}
            height={ringH}
            rx={ringRx}
            ry={ringRx}
          />
        </svg>
      )}
      {showReorderHandle && (
        <span
          className="task-row__grip"
          role="img"
          aria-label="Drag to reorder"
          onPointerDown={onRowPointerDown}
          onPointerUp={onRowPointerUp}
          onPointerCancel={onRowPointerCancel}
        >
          <ReorderGripIcon />
        </span>
      )}
      <label className="task-checkbox-label">
        <input
          type="checkbox"
          className="task-checkbox"
          checked={checkboxChecked}
          disabled={isAnimating && !checkboxChecked}
          onChange={handleCheck}
          aria-label={
            checkboxChecked
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
        onClick={handleDeleteClick}
        disabled={isAnimating}
        aria-label={`Delete "${task.text}"`}
      >
        ×
      </button>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </li>
  );
}
