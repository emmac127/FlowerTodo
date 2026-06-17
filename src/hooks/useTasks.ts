import { useCallback, useEffect, useState } from 'react';
import {
  TASK_STORAGE_KEYS,
  type AppVariant,
} from '../lib/appVariant';
import {
  COMPLETED_MOVE_DELAY_MS,
  getNewTaskSortOrder,
  getNextSortOrder,
} from '../lib/sortTasks';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completionIndex?: number;
  /** Fixed garden slot (0–4) assigned when planted — never recalculated. */
  plantSlot?: number;
  /** Fixed horizontal position in the garden SVG — never recalculated. */
  plantX?: number;
  /** False until the mascot planting animation finishes for this completion. */
  gardenRevealed?: boolean;
  sortOrder: number;
  createdAt: number;
  /** While in the future, completed task stays in place before moving to the bottom. */
  releaseToBottomAt?: number;
}

interface StoredState {
  tasks: Task[];
  /** Lifetime completions — kept when clearing completed tasks from the list. */
  gardenProgressCount?: number;
}

function inferGardenProgressCount(tasks: Task[], stored?: number): number {
  const fromIndices = tasks
    .filter((t) => t.completionIndex != null)
    .map((t) => t.completionIndex!);
  const fromTasks = fromIndices.length > 0 ? Math.max(...fromIndices) : 0;
  const fromStored = typeof stored === 'number' && stored >= 0 ? stored : 0;
  return Math.max(fromStored, fromTasks);
}

function renumberCompleted(tasks: Task[]): Task[] {
  const completed = tasks
    .filter((t) => t.completed && t.completionIndex != null)
    .sort((a, b) => a.completionIndex! - b.completionIndex!);

  const rankById = new Map(completed.map((t, i) => [t.id, i + 1]));

  return tasks.map((t) => {
    if (!t.completed) return t;
    const rank = rankById.get(t.id);
    return rank != null ? { ...t, completionIndex: rank } : t;
  });
}

function loadState(storageKey: string): StoredState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { tasks: [], gardenProgressCount: 0 };
    const parsed = JSON.parse(raw) as StoredState & { totalCompletedEver?: number };
    const storedTasks = parsed.tasks ?? [];
    const tasks = renumberCompleted(
      storedTasks.map((t, i) => ({
        ...t,
        sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : i,
        gardenRevealed:
          t.completed && t.gardenRevealed === false ? true : t.gardenRevealed,
      })),
    );
    const legacyEver = parsed.totalCompletedEver;
    const gardenProgressCount = inferGardenProgressCount(
      tasks,
      parsed.gardenProgressCount ?? legacyEver,
    );
    return { tasks, gardenProgressCount };
  } catch {
    return { tasks: [], gardenProgressCount: 0 };
  }
}

function saveState(storageKey: string, state: StoredState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function getCompletedCount(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}

export function useTasks(variant: AppVariant = 'default') {
  const storageKey = TASK_STORAGE_KEYS[variant];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [gardenProgressCount, setGardenProgressCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadState(storageKey);
    setTasks(stored.tasks);
    setGardenProgressCount(stored.gardenProgressCount ?? 0);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveState(storageKey, { tasks, gardenProgressCount });
  }, [tasks, gardenProgressCount, hydrated, storageKey]);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        completed: false,
        sortOrder: getNewTaskSortOrder(prev),
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const completeTask = useCallback(
    (
      id: string,
      completionIndex: number,
      plant?: { plantSlot: number; plantX: number },
    ) => {
      const releaseToBottomAt = Date.now() + COMPLETED_MOVE_DELAY_MS;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: true,
                completionIndex,
                plantSlot: plant?.plantSlot,
                plantX: plant?.plantX,
                gardenRevealed: true,
                releaseToBottomAt,
              }
            : t,
        ),
      );
      setGardenProgressCount((prev) => Math.max(prev, completionIndex));
    },
    [],
  );

  const uncompleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const nextOrder = getNextSortOrder(prev);
      const cleared = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: false,
              completionIndex: undefined,
              plantSlot: undefined,
              plantX: undefined,
              gardenRevealed: undefined,
              sortOrder: nextOrder,
              releaseToBottomAt: undefined,
            }
          : t,
      );
      return renumberCompleted(cleared);
    });
  }, []);

  const applyIncompleteReorder = useCallback(
    (activeId: string, toIndex: number) => {
      setTasks((prev) => {
        const incomplete = prev
          .filter((t) => !t.completed)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const fromIdx = incomplete.findIndex((t) => t.id === activeId);
        if (fromIdx === -1) return prev;

        const toIdx = Math.max(0, Math.min(toIndex, incomplete.length - 1));
        if (fromIdx === toIdx) return prev;

        const reordered = [...incomplete];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        const orderById = new Map(
          reordered.map((t, index) => [t.id, index] as const),
        );

        return prev.map((t) =>
          orderById.has(t.id) ? { ...t, sortOrder: orderById.get(t.id)! } : t,
        );
      });
    },
    [],
  );

  const reorderTask = useCallback(
    (activeId: string, overId: string, place: 'before' | 'after' = 'before') => {
      if (activeId === overId) return;
      setTasks((prev) => {
        const incomplete = prev
          .filter((t) => !t.completed)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const fromIdx = incomplete.findIndex((t) => t.id === activeId);
        let toIdx = incomplete.findIndex((t) => t.id === overId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        if (place === 'after') toIdx += 1;
        if (fromIdx < toIdx) toIdx -= 1;
        const targetIndex = Math.max(0, Math.min(toIdx, incomplete.length - 1));
        if (fromIdx === targetIndex) return prev;

        const reordered = [...incomplete];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(targetIndex, 0, moved);
        const orderById = new Map(
          reordered.map((t, index) => [t.id, index] as const),
        );

        return prev.map((t) =>
          orderById.has(t.id) ? { ...t, sortOrder: orderById.get(t.id)! } : t,
        );
      });
    },
    [],
  );

  const reorderTaskToIndex = useCallback(
    (activeId: string, toIndex: number) => {
      applyIncompleteReorder(activeId, toIndex);
    },
    [applyIncompleteReorder],
  );

  const updateTaskText = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => renumberCompleted(prev.filter((t) => t.id !== id)));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  }, []);

  const getNextCompletionIndex = useCallback(() => {
    return gardenProgressCount + 1;
  }, [gardenProgressCount]);

  /**
   * Dev helper: force the garden progress count to a target value and drop any
   * task completion data that no longer makes sense (completionIndex above the
   * new count). Existing tasks are kept but reset to "not completed" when the
   * progress count moves backwards, so the picker / planting flow can replay.
   */
  /**
   * Reset garden to level 0 while keeping every task (including completed ones).
   * Clears garden linkage on tasks so progress does not re-infer from old indices.
   */
  const resetGardenLevel = useCallback(() => {
    setGardenProgressCount(0);
    setTasks((prev) =>
      prev.map((t) =>
        t.completed
          ? {
              ...t,
              completionIndex: undefined,
              plantSlot: undefined,
              plantX: undefined,
              gardenRevealed: undefined,
              releaseToBottomAt: undefined,
            }
          : t,
      ),
    );
  }, []);

  const setGardenProgressForDev = useCallback((target: number) => {
    const safe = Math.max(0, Math.floor(target));
    setGardenProgressCount(safe);
    setTasks((prev) =>
      renumberCompleted(
        prev.map((t) => {
          if (
            t.completed &&
            t.completionIndex != null &&
            t.completionIndex > safe
          ) {
            return {
              ...t,
              completed: false,
              completionIndex: undefined,
              plantSlot: undefined,
              plantX: undefined,
              gardenRevealed: undefined,
              releaseToBottomAt: undefined,
            };
          }
          return t;
        }),
      ),
    );
  }, []);

  return {
    tasks,
    gardenProgressCount,
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
    setGardenProgressForDev,
    resetGardenLevel,
  };
}
