import type { Task } from '../hooks/useTasks';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: Task[];
  muted: boolean;
  reducedMotion: boolean;
  pickedTaskId: string | null;
  onPickRandom: () => void;
  onComplete: (id: string, completionIndex: number) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  getNextCompletionIndex: () => number;
  onClearCompleted: () => void;
}

export function TaskList({
  tasks,
  muted,
  reducedMotion,
  pickedTaskId,
  onPickRandom,
  onComplete,
  onUncomplete,
  onDelete,
  getNextCompletionIndex,
  onClearCompleted,
}: TaskListProps) {
  const hasCompleted = tasks.some((t) => t.completed);
  const incompleteCount = tasks.filter((t) => !t.completed).length;

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
      <button
        type="button"
        className="pick-task-btn"
        onClick={onPickRandom}
        disabled={incompleteCount === 0}
      >
        Choose a task for me to do!
      </button>

      <ul className="task-list">
        {tasks.map((task) => (
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
