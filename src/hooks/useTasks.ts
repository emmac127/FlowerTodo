import { useCallback, useEffect, useState } from 'react';
import { COMPLETED_MOVE_DELAY_MS, getNextSortOrder } from '../lib/sortTasks';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completionIndex?: number;
  sortOrder: number;
  createdAt: number;
  /** While in the future, completed task stays in place before moving to the bottom. */
  releaseToBottomAt?: number;
}

interface StoredState {
  tasks: Task[];
}

const STORAGE_KEY = 'kawaii-todo-tasks';

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

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [] };
    const parsed = JSON.parse(raw) as StoredState & { totalCompletedEver?: number };
    const storedTasks = parsed.tasks ?? [];
    const tasks = renumberCompleted(
      storedTasks.map((t, i) => ({
        ...t,
        sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : i,
      })),
    );
    return { tasks };
  } catch {
    return { tasks: [] };
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCompletedCount(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadState();
    setTasks(stored.tasks);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ tasks });
  }, [tasks, hydrated]);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        completed: false,
        sortOrder: getNextSortOrder(prev),
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const completeTask = useCallback((id: string, completionIndex: number) => {
    const releaseToBottomAt = Date.now() + COMPLETED_MOVE_DELAY_MS;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: true, completionIndex, releaseToBottomAt }
          : t,
      ),
    );
  }, []);

  const uncompleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const nextOrder = getNextSortOrder(prev);
      const cleared = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: false,
              completionIndex: undefined,
              sortOrder: nextOrder,
              releaseToBottomAt: undefined,
            }
          : t,
      );
      return renumberCompleted(cleared);
    });
  }, []);

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
        toIdx = Math.max(0, Math.min(toIdx, incomplete.length - 1));

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

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => renumberCompleted(prev.filter((t) => t.id !== id)));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  }, []);

  const getNextCompletionIndex = useCallback(() => {
    return getCompletedCount(tasks) + 1;
  }, [tasks]);

  return {
    tasks,
    hydrated,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    clearCompleted,
    getNextCompletionIndex,
    reorderTask,
  };
}
