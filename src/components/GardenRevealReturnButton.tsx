interface GardenRevealReturnButtonProps {
  onReturn: () => void;
}

export function GardenRevealReturnButton({ onReturn }: GardenRevealReturnButtonProps) {
  return (
    <button
      type="button"
      className="garden-reveal-return"
      onClick={onReturn}
      aria-label="Return to your tasks"
    >
      <span className="garden-reveal-return__label">Back to tasks</span>
      <span className="garden-reveal-return__arrow" aria-hidden />
    </button>
  );
}
