import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../hooks/useTasks';
import { getCombinedDragScrollDelta, getScrollSafeZone } from '../lib/dragAutoScroll';
import {
  getDragShiftY,
  getPreviewInsertIndex,
  measureDragSlideStepPx,
} from '../lib/dragPreviewShift';
import {
  getNextBottomReleaseAt,
  isPinnedBeforeBottom,
  sortTasksForDisplay,
} from '../lib/sortTasks';
import { TaskRow } from './TaskRow';

export type GardenRevealPhase = 'idle' | 'active' | 'exit';

interface TaskListProps {
  tasks: Task[];
  muted: boolean;
  reducedMotion: boolean;
  pickedTaskId: string | null;
  gardenRevealPhase?: GardenRevealPhase;
  onComplete: (id: string, completionIndex: number) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  getNextCompletionIndex: () => number;
  onClearCompleted: () => void;
  onReorder: (activeId: string, overId: string, place: 'before' | 'after') => void;
  onReorderToIndex: (activeId: string, toIndex: number) => void;
}

const DRAG_START_THRESHOLD_PX = 6;

function isReleasedCompleted(task: Task, now = Date.now()): boolean {
  return task.completed && !isPinnedBeforeBottom(task, now);
}

function updateDragFloatPosition(
  taskId: string,
  clientY: number,
  grabOffsetY: number,
): void {
  const floating = document.querySelector<HTMLElement>(
    `[data-task-id="${taskId}"][data-drag-floating]`,
  );
  if (!floating) return;

  const list = document.querySelector<HTMLElement>('.task-list');
  const sample = document.querySelector<HTMLElement>(
    '.task-row:not(.task-row--drag-placeholder):not(.task-row--drag-floating)',
  );
  const listRect = list?.getBoundingClientRect();
  const sampleRect = sample?.getBoundingClientRect();

  floating.style.top = `${clientY - grabOffsetY}px`;
  if (listRect && sampleRect) {
    floating.style.left = `${sampleRect.left}px`;
    floating.style.width = `${sampleRect.width}px`;
  }
}

function getFloatingRowRect(taskId: string): DOMRect | null {
  return document
    .querySelector<HTMLElement>(`[data-task-id="${taskId}"][data-drag-floating]`)
    ?.getBoundingClientRect() ?? null;
}

export function TaskList({
  tasks,
  muted,
  reducedMotion,
  pickedTaskId,
  gardenRevealPhase = 'idle',
  onComplete,
  onUncomplete,
  onDelete,
  onUpdateText,
  getNextCompletionIndex,
  onClearCompleted,
  onReorder: _onReorder,
  onReorderToIndex,
}: TaskListProps) {
  const [listTick, setListTick] = useState(0);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const pinnedIdsRef = useRef<Set<string>>(new Set());

  const sortedTasks = useMemo(() => sortTasksForDisplay(tasks), [tasks, listTick]);
  const hiddenCompletedCount = useMemo(
    () => sortedTasks.filter((t) => isReleasedCompleted(t)).length,
    [sortedTasks],
  );
  const hasCompleted = tasks.some((t) => t.completed);
  const canReorder = tasks.filter((t) => !t.completed).length >= 2;
  const gardenRevealActive = gardenRevealPhase !== 'idle';
  const blindOffset = 1;

  const [actionMenuTaskId, setActionMenuTaskId] = useState<string | null>(null);
  const [moveModeTaskId, setMoveModeTaskId] = useState<string | null>(null);
  const visibleTasks = useMemo(
    () =>
      moveModeTaskId
        ? sortedTasks.filter((t) => !isReleasedCompleted(t))
        : sortedTasks,
    [moveModeTaskId, sortedTasks],
  );

  const incompleteIds = useMemo(
    () => visibleTasks.filter((t) => !t.completed).map((t) => t.id),
    [visibleTasks],
  );

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragFloatStyle, setDragFloatStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [dragPlaceholderHeight, setDragPlaceholderHeight] = useState(0);
  const [dragFromIndex, setDragFromIndex] = useState(0);
  const [dragSlideStepPx, setDragSlideStepPx] = useState(0);
  const [previewInsertIndex, setPreviewInsertIndex] = useState<number | null>(null);

  const dragActiveRef = useRef(false);
  const dragIdRef = useRef<string | null>(null);
  const dragGrabOffsetYRef = useRef(0);
  const previewInsertIndexRef = useRef(0);
  const sortedTasksRef = useRef(sortedTasks);
  const incompleteIdsRef = useRef(incompleteIds);
  const onReorderToIndexRef = useRef(onReorderToIndex);
  const pointerLastRef = useRef({ x: 0, y: 0 });
  const dragLoopRef = useRef<number | null>(null);

  useEffect(() => {
    sortedTasksRef.current = sortedTasks;
    incompleteIdsRef.current = incompleteIds;
    onReorderToIndexRef.current = onReorderToIndex;
  });

  const updatePreviewInsert = useCallback((clientY: number) => {
    const activeId = dragIdRef.current;
    if (!activeId) return;

    const ids = incompleteIdsRef.current;
    const nextIndex = getPreviewInsertIndex(clientY, ids, activeId);
    if (nextIndex === previewInsertIndexRef.current) return;

    previewInsertIndexRef.current = nextIndex;
    setPreviewInsertIndex(nextIndex);
  }, []);

  const stopDragLoop = useCallback(() => {
    if (dragLoopRef.current != null) {
      cancelAnimationFrame(dragLoopRef.current);
      dragLoopRef.current = null;
    }
  }, []);

  const runDragLoop = useCallback(() => {
    if (!dragActiveRef.current) {
      stopDragLoop();
      return;
    }

    const { y } = pointerLastRef.current;
    const activeId = dragIdRef.current;
    const safeZone = getScrollSafeZone();
    const rowRect = activeId ? getFloatingRowRect(activeId) : null;
    const scrollDelta = getCombinedDragScrollDelta(y, rowRect, safeZone);
    if (scrollDelta !== 0) {
      window.scrollBy(0, scrollDelta);
    }

    updatePreviewInsert(y);
    if (activeId) {
      updateDragFloatPosition(activeId, y, dragGrabOffsetYRef.current);
    }

    dragLoopRef.current = requestAnimationFrame(runDragLoop);
  }, [stopDragLoop, updatePreviewInsert]);

  const endDrag = useCallback(() => {
    dragActiveRef.current = false;
    dragIdRef.current = null;
    stopDragLoop();
    setDraggingId(null);
    setDragFloatStyle(null);
    setDragPlaceholderHeight(0);
    setPreviewInsertIndex(null);
    setDragSlideStepPx(0);
  }, [stopDragLoop]);

  const commitDropReorder = useCallback(() => {
    const activeId = dragIdRef.current;
    if (!activeId) return;

    const ids = incompleteIdsRef.current;
    const fromIdx = ids.indexOf(activeId);
    if (fromIdx === -1) return;

    const targetIdx = previewInsertIndexRef.current;
    if (targetIdx === fromIdx) return;

    onReorderToIndexRef.current(activeId, targetIdx);
  }, []);

  const startDrag = useCallback(
    (taskId: string, rowEl: HTMLElement, rowRect: DOMRect) => {
      const fromIdx = incompleteIdsRef.current.indexOf(taskId);
      if (fromIdx === -1) return;

      const slideStep = measureDragSlideStepPx(rowEl);

      dragActiveRef.current = true;
      dragIdRef.current = taskId;
      dragGrabOffsetYRef.current = pointerLastRef.current.y - rowRect.top;
      previewInsertIndexRef.current = fromIdx;

      setDragFromIndex(fromIdx);
      setDragSlideStepPx(slideStep);
      setPreviewInsertIndex(fromIdx);
      setDraggingId(taskId);
      setDragPlaceholderHeight(rowRect.height);
      setDragFloatStyle({
        top: rowRect.top,
        left: rowRect.left,
        width: rowRect.width,
      });
      runDragLoop();
    },
    [runDragLoop],
  );

  const scrollTaskIntoReorderView = useCallback((taskId: string) => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-task-id="${taskId}"]:not([data-drag-placeholder])`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const handleRowPointerDown = useCallback(
    (taskId: string, e: React.PointerEvent<HTMLElement>) => {
      const task = sortedTasksRef.current.find((t) => t.id === taskId);
      if (!task || task.completed) return;

      e.preventDefault();

      const row = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const thresholdSq = DRAG_START_THRESHOLD_PX * DRAG_START_THRESHOLD_PX;
      let dragging = false;

      const handlePointerMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        pointerLastRef.current = { x: ev.clientX, y: ev.clientY };

        if (!dragging) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (dx * dx + dy * dy < thresholdSq) return;
          dragging = true;
          startDrag(taskId, row, row.getBoundingClientRect());
        }

        updatePreviewInsert(ev.clientY);
        updateDragFloatPosition(taskId, ev.clientY, dragGrabOffsetYRef.current);
      };

      const handlePointerUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
        if (dragging) {
          pointerLastRef.current = { x: ev.clientX, y: ev.clientY };
          updatePreviewInsert(ev.clientY);
          commitDropReorder();
          setMoveModeTaskId(null);
        }
        endDrag();
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
    },
    [commitDropReorder, endDrag, startDrag, updatePreviewInsert],
  );

  useEffect(() => () => endDrag(), [endDrag]);

  useEffect(() => {
    const nextAt = getNextBottomReleaseAt(tasks);
    if (nextAt == null) return;
    const delay = nextAt - Date.now() + 20;
    const id = window.setTimeout(() => setListTick((n) => n + 1), Math.max(0, delay));
    return () => window.clearTimeout(id);
  }, [tasks, listTick]);

  useEffect(() => {
    const now = Date.now();
    const currentlyPinned = new Set(
      tasks.filter((t) => isPinnedBeforeBottom(t, now)).map((t) => t.id),
    );
    const prev = pinnedIdsRef.current;

    for (const id of prev) {
      if (!currentlyPinned.has(id)) {
        setDroppingId(id);
        window.setTimeout(() => setDroppingId((current) => (current === id ? null : current)), 480);
      }
    }

    pinnedIdsRef.current = currentlyPinned;
  }, [tasks, listTick, reducedMotion]);

  if (tasks.length === 0) {
    return (
      <div className="empty-state" role="status">
        <div className="empty-state__flower" aria-hidden>
          <span className="empty-petal empty-petal--1" />
          <span className="empty-petal empty-petal--2" />
          <span className="empty-petal empty-petal--3" />
          <span className="empty-petal empty-petal--4" />
          <span className="empty-petal empty-petal--5" />
          <span className="empty-center" />
        </div>
        <p className="empty-state__title">No tasks yet!</p>
        <p className="empty-state__hint">Add something sweet to do ✿</p>
      </div>
    );
  }

  return (
    <div
      className={`task-list-wrap${gardenRevealActive ? ' task-list-wrap--garden-reveal' : ''}${gardenRevealPhase === 'exit' ? ' task-list-wrap--garden-reveal-exit' : ''}`}
    >
      {moveModeTaskId && (
        <p className="task-list__reorder-hint" id="task-reorder-hint" role="status">
          Drag the purple task, then release to place it.{' '}
          <button
            type="button"
            className="task-list__reorder-done"
            onClick={() => setMoveModeTaskId(null)}
          >
            Done
          </button>
        </p>
      )}
      {moveModeTaskId && hiddenCompletedCount > 0 && (
        <p className="task-list__completed-hidden" role="status">
          {hiddenCompletedCount} completed {hiddenCompletedCount === 1 ? 'task' : 'tasks'} hidden
          while moving
        </p>
      )}
      <ul
        className={`task-list${moveModeTaskId ? ' task-list--reordering' : ''}${draggingId ? ' task-list--dragging' : ''}${gardenRevealActive ? ' task-list--garden-reveal' : ''}${gardenRevealPhase === 'exit' ? ' task-list--garden-reveal-exit' : ''}`}
        aria-describedby={moveModeTaskId ? 'task-reorder-hint' : undefined}
      >
        {visibleTasks.map((task, rowIndex) => {
          const incompleteIndex = incompleteIds.indexOf(task.id);
          const isActiveDrag = draggingId === task.id;
          const previewIndex = previewInsertIndex ?? dragFromIndex;
          const shiftY =
            draggingId &&
            incompleteIndex >= 0 &&
            !isActiveDrag &&
            dragSlideStepPx > 0
              ? getDragShiftY(
                  incompleteIndex,
                  dragFromIndex,
                  previewIndex,
                  dragSlideStepPx,
                )
              : 0;

          return (
            <TaskRow
              key={task.id}
              blindIndex={gardenRevealActive ? rowIndex + blindOffset : undefined}
              task={task}
              muted={muted}
              reducedMotion={reducedMotion}
              isPicked={pickedTaskId === task.id}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              onDelete={onDelete}
              onUpdateText={onUpdateText}
              getNextCompletionIndex={getNextCompletionIndex}
              isDragging={isActiveDrag}
              dragFloatStyle={isActiveDrag ? dragFloatStyle : null}
              dragPlaceholderHeight={isActiveDrag ? dragPlaceholderHeight : undefined}
              dragPlaceholderCollapsed={
                isActiveDrag && previewIndex !== dragFromIndex
              }
              dragShiftY={shiftY}
              showInsertPreview={
                !!draggingId &&
                incompleteIndex >= 0 &&
                incompleteIndex === previewIndex
              }
              isDroppingToBottom={droppingId === task.id}
              canMove={canReorder && !task.completed}
              isMoveMode={moveModeTaskId === task.id}
              onEnterMoveMode={() => {
                setMoveModeTaskId(task.id);
                setActionMenuTaskId(null);
                scrollTaskIntoReorderView(task.id);
              }}
              onExitMoveMode={() => setMoveModeTaskId(null)}
              actionMenuOpen={actionMenuTaskId === task.id}
              onActionMenuOpenChange={(open) => {
                setActionMenuTaskId(open ? task.id : null);
                if (open) setMoveModeTaskId(null);
              }}
              onDragPointerDown={
                moveModeTaskId === task.id && canReorder && !task.completed
                  ? (e) => handleRowPointerDown(task.id, e)
                  : undefined
              }
            />
          );
        })}
      </ul>
      {hasCompleted && !moveModeTaskId && (
        <footer className="task-list-footer">
          <button type="button" className="clear-completed" onClick={onClearCompleted}>
            Clear completed
          </button>
        </footer>
      )}
    </div>
  );
}
