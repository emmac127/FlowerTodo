import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../hooks/useTasks';
import { getNextBottomReleaseAt, isPinnedBeforeBottom, sortTasksForDisplay } from '../lib/sortTasks';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: Task[];
  muted: boolean;
  reducedMotion: boolean;
  pickedTaskId: string | null;
  onComplete: (id: string, completionIndex: number) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  getNextCompletionIndex: () => number;
  onClearCompleted: () => void;
  onReorder: (activeId: string, overId: string, place: 'before' | 'after') => void;
}

const LONG_PRESS_MS = 180;
const DRAG_MOVE_THRESHOLD_PX = 8;

type DropEdge = 'above' | 'below' | null;

function getDropEdge(clientY: number, rect: DOMRect): DropEdge {
  const mid = rect.top + rect.height / 2;
  return clientY < mid ? 'above' : 'below';
}

export function TaskList({
  tasks,
  muted,
  reducedMotion,
  pickedTaskId,
  onComplete,
  onUncomplete,
  onDelete,
  getNextCompletionIndex,
  onClearCompleted,
  onReorder,
}: TaskListProps) {
  const [listTick, setListTick] = useState(0);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const pinnedIdsRef = useRef<Set<string>>(new Set());

  const sortedTasks = useMemo(() => sortTasksForDisplay(tasks), [tasks, listTick]);
  const hasCompleted = tasks.some((t) => t.completed);
  const canReorder = tasks.filter((t) => !t.completed).length >= 2;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressCleanupRef = useRef<(() => void) | null>(null);
  const dragActiveRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dropEdgeRef = useRef<DropEdge>(null);
  const sortedTasksRef = useRef(sortedTasks);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    sortedTasksRef.current = sortedTasks;
    onReorderRef.current = onReorder;
  });

  useEffect(() => {
    dropTargetRef.current = dropTargetId;
    dropEdgeRef.current = dropEdge;
  }, [dropTargetId, dropEdge]);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressCleanupRef.current?.();
    pressCleanupRef.current = null;
  }, []);

  const pointerHandlersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const removePointerListeners = useCallback(() => {
    const handlers = pointerHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener('pointermove', handlers.move);
    window.removeEventListener('pointerup', handlers.up);
    window.removeEventListener('pointercancel', handlers.up);
    pointerHandlersRef.current = null;
  }, []);

  const endDrag = useCallback(() => {
    clearPressTimer();
    removePointerListeners();
    dragActiveRef.current = false;
    pointerIdRef.current = null;
    dragIdRef.current = null;
    setDraggingId(null);
    setDropTargetId(null);
    setDropEdge(null);
  }, [clearPressTimer, removePointerListeners]);

  const commitReorder = useCallback(() => {
    const activeId = dragIdRef.current;
    const targetId = dropTargetRef.current;
    const edge = dropEdgeRef.current;
    if (!activeId || !targetId || activeId === targetId) return;

    const activeTask = sortedTasksRef.current.find((t) => t.id === activeId);
    const targetTask = sortedTasksRef.current.find((t) => t.id === targetId);
    if (!activeTask || !targetTask || activeTask.completed || targetTask.completed) return;

    onReorderRef.current(activeId, targetId, edge === 'below' ? 'after' : 'before');
  }, []);

  const startDrag = useCallback(
    (taskId: string, pointerId: number) => {
      dragActiveRef.current = true;
      pointerIdRef.current = pointerId;
      dragIdRef.current = taskId;
      setDraggingId(taskId);
      setDropTargetId(null);
      setDropEdge(null);

      const handlePointerMove = (e: PointerEvent) => {
        if (!dragActiveRef.current || pointerIdRef.current !== e.pointerId) return;

        const el = document.elementFromPoint(e.clientX, e.clientY);
        const row = el?.closest<HTMLElement>('[data-task-id]');
        const overId = row?.dataset.taskId ?? null;
        const activeId = dragIdRef.current;

        if (!overId || overId === activeId) {
          setDropTargetId(null);
          setDropEdge(null);
          return;
        }

        const overTask = sortedTasksRef.current.find((t) => t.id === overId);
        if (!overTask || overTask.completed) {
          setDropTargetId(null);
          setDropEdge(null);
          return;
        }

        const rect = row!.getBoundingClientRect();
        setDropTargetId(overId);
        setDropEdge(getDropEdge(e.clientY, rect));
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (pointerIdRef.current !== e.pointerId) return;
        if (dragActiveRef.current) {
          commitReorder();
        }
        endDrag();
      };

      pointerHandlersRef.current = { move: handlePointerMove, up: handlePointerUp };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [commitReorder, endDrag],
  );

  const handleRowPointerDown = useCallback(
    (taskId: string, e: React.PointerEvent) => {
      const task = sortedTasksRef.current.find((t) => t.id === taskId);
      if (!task || task.completed) return;
      if ((e.target as HTMLElement).closest('button, input, .task-checkbox-label')) return;

      clearPressTimer();

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const thresholdSq = DRAG_MOVE_THRESHOLD_PX * DRAG_MOVE_THRESHOLD_PX;

      const beginDrag = () => {
        if (dragActiveRef.current) return;
        clearPressTimer();
        startDrag(taskId, pointerId);
      };

      const handlePreDragMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dx * dx + dy * dy >= thresholdSq) {
          beginDrag();
        }
      };

      window.addEventListener('pointermove', handlePreDragMove);
      pressCleanupRef.current = () => {
        window.removeEventListener('pointermove', handlePreDragMove);
      };

      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        beginDrag();
      }, LONG_PRESS_MS);
    },
    [clearPressTimer, startDrag],
  );

  const handleRowPointerUp = useCallback(() => {
    clearPressTimer();
  }, [clearPressTimer]);

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
    <div className="task-list-wrap">
      <ul className="task-list">
        {sortedTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            muted={muted}
            reducedMotion={reducedMotion}
            isPicked={pickedTaskId === task.id}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onDelete={onDelete}
            getNextCompletionIndex={getNextCompletionIndex}
            isDragging={draggingId === task.id}
            isDroppingToBottom={droppingId === task.id}
            showReorderHandle={canReorder && !task.completed}
            dropHint={
              dropTargetId === task.id
                ? dropEdge === 'above'
                  ? 'above'
                  : dropEdge === 'below'
                    ? 'below'
                    : null
                : null
            }
            onRowPointerDown={(e) => handleRowPointerDown(task.id, e)}
            onRowPointerUp={handleRowPointerUp}
            onRowPointerCancel={handleRowPointerUp}
          />
        ))}
      </ul>
      {hasCompleted && (
        <footer className="task-list-footer">
          <button type="button" className="clear-completed" onClick={onClearCompleted}>
            Clear completed
          </button>
        </footer>
      )}
    </div>
  );
}
