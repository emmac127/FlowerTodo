import { useEffect, useRef, useState } from 'react';

export interface ResetGardenLevelOption {
  level: number;
  label: string;
}

interface ResetGardenDialogProps {
  open: boolean;
  levels: ResetGardenLevelOption[];
  /** Currently active garden level (pre-selected). */
  currentLevel: number;
  onCancel: () => void;
  /** level ≤ 0 means empty garden start. */
  onConfirm: (level: number) => void;
}

export function ResetGardenDialog({
  open,
  levels,
  currentLevel,
  onCancel,
  onConfirm,
}: ResetGardenDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedLevel, setSelectedLevel] = useState(currentLevel);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const unlocked = levels.map((l) => l.level);
    setSelectedLevel(
      unlocked.includes(currentLevel)
        ? currentLevel
        : (unlocked[unlocked.length - 1] ?? 0),
    );
  }, [open, currentLevel, levels]);

  return (
    <dialog
      ref={dialogRef}
      className="reset-garden-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <p className="reset-garden-dialog__title">Reset garden progress</p>
      <p className="reset-garden-dialog__hint">
        Jump back to the start of a level you&apos;ve already unlocked. Tasks stay
        on your list.
      </p>

      <div className="reset-garden-dialog__list" role="radiogroup" aria-label="Level">
        <label className="reset-garden-dialog__option">
          <input
            type="radio"
            name="reset-garden-level"
            checked={selectedLevel <= 0}
            onChange={() => setSelectedLevel(0)}
          />
          <span>Empty garden (start over)</span>
        </label>
        {levels.map((opt) => (
          <label key={opt.level} className="reset-garden-dialog__option">
            <input
              type="radio"
              name="reset-garden-level"
              checked={selectedLevel === opt.level}
              onChange={() => setSelectedLevel(opt.level)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="reset-garden-dialog__actions">
        <button
          type="button"
          className="reset-garden-dialog__btn reset-garden-dialog__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="reset-garden-dialog__btn reset-garden-dialog__btn--confirm"
          onClick={() => onConfirm(selectedLevel)}
        >
          Reset
        </button>
      </div>
    </dialog>
  );
}
