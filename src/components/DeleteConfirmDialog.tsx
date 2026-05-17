import { useEffect, useRef } from 'react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="delete-confirm"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <p className="delete-confirm__message">Are u sure you wanna delete this?</p>
      <div className="delete-confirm__actions">
        <button type="button" className="delete-confirm__btn delete-confirm__btn--cancel" onClick={onCancel}>
          Nope
        </button>
        <button
          type="button"
          className="delete-confirm__btn delete-confirm__btn--delete"
          onClick={onConfirm}
        >
          Yes, delete
        </button>
      </div>
    </dialog>
  );
}
