import { useEffect, useRef } from 'react';

interface TaskActionMenuProps {
  open: boolean;
  canMove: boolean;
  onClose: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export function TaskActionMenu({
  open,
  canMove,
  onClose,
  onMove,
  onDelete,
}: TaskActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if ((target as Element).closest?.('.task-row__edit-toggle')) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={menuRef} className="task-action-menu" role="menu" aria-label="Task options">
      {canMove && (
        <button type="button" className="task-action-menu__item" role="menuitem" onClick={onMove}>
          <span className="task-action-menu__icon" aria-hidden>
            ↕
          </span>
          <span className="task-action-menu__label">Move</span>
        </button>
      )}
      <button
        type="button"
        className="task-action-menu__item task-action-menu__item--delete"
        role="menuitem"
        onClick={onDelete}
      >
        <span className="task-action-menu__icon" aria-hidden>
          ×
        </span>
        <span className="task-action-menu__label">Delete</span>
      </button>
    </div>
  );
}
