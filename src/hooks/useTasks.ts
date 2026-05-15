import { useCallback, useEffect, useState } from 'react';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completionIndex?: number;
  createdAt: number;
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
    const tasks = renumberCompleted(parsed.tasks ?? []);
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
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const completeTask = useCallback((id: string, completionIndex: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: true, completionIndex } : t,
      ),
    );
  }, []);

  const uncompleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const cleared = prev.map((t) =>
        t.id === id
          ? { ...t, completed: false, completionIndex: undefined }
          : t,
      );
      return renumberCompleted(cleared);
    });
  }, []);

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
  };
}
