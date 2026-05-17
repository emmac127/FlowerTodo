import type { Task } from '../hooks/useTasks';

/** Pause after completion before the row moves to the bottom of the list. */
export const COMPLETED_MOVE_DELAY_MS = 2400;

export function isPinnedBeforeBottom(task: Task, now = Date.now()): boolean {
  return (
    task.completed &&
    task.releaseToBottomAt != null &&
    task.releaseToBottomAt > now
  );
}

/** Incomplete + pinned-complete (still in place), then released completed tasks. */
export function sortTasksForDisplay(tasks: Task[], now = Date.now()): Task[] {
  const active = tasks
    .filter((t) => !t.completed || isPinnedBeforeBottom(t, now))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const completed = tasks
    .filter((t) => t.completed && !isPinnedBeforeBottom(t, now))
    .sort((a, b) => (a.completionIndex ?? 0) - (b.completionIndex ?? 0));
  return [...active, ...completed];
}

export function getNextBottomReleaseAt(tasks: Task[], now = Date.now()): number | null {
  const pending = tasks
    .filter((t) => isPinnedBeforeBottom(t, now))
    .map((t) => t.releaseToBottomAt!);
  return pending.length > 0 ? Math.min(...pending) : null;
}

export function getNextSortOrder(tasks: Task[]): number {
  const incomplete = tasks.filter((t) => !t.completed);
  if (incomplete.length === 0) return 0;
  return Math.max(...incomplete.map((t) => t.sortOrder)) + 1;
}
