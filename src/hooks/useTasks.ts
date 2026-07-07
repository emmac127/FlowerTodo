import { useCallback, useEffect, useState } from 'react';
import {
  TASK_STORAGE_KEYS,
  type AppVariant,
} from '../lib/appVariant';
import {
  DEFAULT_GARDEN_PHASE_STATE,
  type GardenPhaseState,
} from '../lib/gardenPhase';
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
  /** Lifetime mode1 completions — kept when clearing completed tasks from the list. */
  gardenProgressCount?: number;
  mode2Unlocked?: boolean;
  activeGardenPhase?: GardenPhaseState['activeGardenPhase'];
  mode2ProgressCount?: number;
  mode1FrozenProgressCount?: number;
  viewingNostalgicMode1?: boolean;
  mode2OnboardingComplete?: boolean;
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

function parsePhaseState(parsed: StoredState): GardenPhaseState {
  return {
    mode2Unlocked: parsed.mode2Unlocked === true,
    activeGardenPhase:
      parsed.activeGardenPhase === 'mode2' ? 'mode2' : 'mode1',
    mode2ProgressCount: Math.max(0, parsed.mode2ProgressCount ?? 0),
    mode1FrozenProgressCount: Math.max(0, parsed.mode1FrozenProgressCount ?? 0),
    viewingNostalgicMode1: parsed.viewingNostalgicMode1 === true,
    mode2OnboardingComplete: parsed.mode2OnboardingComplete === true,
  };
}

function loadState(storageKey: string): StoredState & { phase: GardenPhaseState } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        tasks: [],
        gardenProgressCount: 0,
        phase: { ...DEFAULT_GARDEN_PHASE_STATE },
      };
    }
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
    return { tasks, gardenProgressCount, phase: parsePhaseState(parsed) };
  } catch {
    return {
      tasks: [],
      gardenProgressCount: 0,
      phase: { ...DEFAULT_GARDEN_PHASE_STATE },
    };
  }
}

function saveState(
  storageKey: string,
  state: StoredState & { phase: GardenPhaseState },
) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      tasks: state.tasks,
      gardenProgressCount: state.gardenProgressCount,
      mode2Unlocked: state.phase.mode2Unlocked,
      activeGardenPhase: state.phase.activeGardenPhase,
      mode2ProgressCount: state.phase.mode2ProgressCount,
      mode1FrozenProgressCount: state.phase.mode1FrozenProgressCount,
      viewingNostalgicMode1: state.phase.viewingNostalgicMode1,
      mode2OnboardingComplete: state.phase.mode2OnboardingComplete,
    }),
  );
}

export function getCompletedCount(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}

export function useTasks(variant: AppVariant = 'default') {
  const storageKey = TASK_STORAGE_KEYS[variant];
  const isDefault = variant === 'default';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [gardenProgressCount, setGardenProgressCount] = useState(0);
  const [phaseState, setPhaseState] = useState<GardenPhaseState>({
    ...DEFAULT_GARDEN_PHASE_STATE,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadState(storageKey);
    setTasks(stored.tasks);
    setGardenProgressCount(stored.gardenProgressCount ?? 0);
    setPhaseState(isDefault ? stored.phase : { ...DEFAULT_GARDEN_PHASE_STATE });
    setHydrated(true);
  }, [storageKey, isDefault]);

  useEffect(() => {
    if (!hydrated) return;
    saveState(storageKey, { tasks, gardenProgressCount, phase: phaseState });
  }, [tasks, gardenProgressCount, phaseState, hydrated, storageKey]);

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
      if (isDefault && phaseState.mode2Unlocked) {
        setPhaseState((prev) => ({
          ...prev,
          mode2ProgressCount: prev.mode2ProgressCount + 1,
        }));
      } else {
        setGardenProgressCount((g) => Math.max(g, completionIndex));
      }
    },
    [isDefault, phaseState.mode2Unlocked],
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
    if (isDefault && phaseState.mode2Unlocked) {
      return phaseState.mode2ProgressCount + 1;
    }
    return gardenProgressCount + 1;
  }, [
    gardenProgressCount,
    isDefault,
    phaseState.mode2Unlocked,
    phaseState.mode2ProgressCount,
  ]);

  const resetGardenLevel = useCallback(() => {
    setGardenProgressCount(0);
    setPhaseState({ ...DEFAULT_GARDEN_PHASE_STATE });
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

  const setGardenProgressForDev = useCallback(
    (target: number, devPhase?: 'mode1' | 'mode2') => {
      const safe = Math.max(0, Math.floor(target));
      if (isDefault && devPhase === 'mode2') {
        setPhaseState((prev) => ({
          ...prev,
          mode2ProgressCount: safe,
          mode2Unlocked: true,
          activeGardenPhase: 'mode2',
          viewingNostalgicMode1: false,
          mode2OnboardingComplete: true,
        }));
        return;
      }
      if (isDefault && devPhase === 'mode1') {
        setPhaseState({ ...DEFAULT_GARDEN_PHASE_STATE });
      }
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
    },
    [isDefault],
  );

  const unlockMode2 = useCallback((frozenMode1Count: number) => {
    if (!isDefault) return;
    setPhaseState({
      mode2Unlocked: true,
      activeGardenPhase: 'mode2',
      mode2ProgressCount: 0,
      mode1FrozenProgressCount: frozenMode1Count,
      viewingNostalgicMode1: false,
      mode2OnboardingComplete: false,
    });
  }, [isDefault]);

  const completeMode2Onboarding = useCallback(() => {
    if (!isDefault) return;
    setPhaseState((prev) => ({
      ...prev,
      mode2OnboardingComplete: true,
      viewingNostalgicMode1: false,
    }));
  }, [isDefault]);

  const toggleNostalgicView = useCallback(() => {
    if (!isDefault) return;
    setPhaseState((prev) => {
      if (!prev.mode2Unlocked || !prev.mode2OnboardingComplete) return prev;
      return {
        ...prev,
        viewingNostalgicMode1: !prev.viewingNostalgicMode1,
      };
    });
  }, [isDefault]);

  const resetAllGardenState = useCallback(() => {
    resetGardenLevel();
  }, [resetGardenLevel]);

  return {
    tasks,
    gardenProgressCount,
    phaseState,
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
    resetAllGardenState,
    unlockMode2,
    completeMode2Onboarding,
    toggleNostalgicView,
  };
}
