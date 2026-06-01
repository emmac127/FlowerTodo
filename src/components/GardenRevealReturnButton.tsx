interface GardenRevealReturnButtonProps {
  onReturn: () => void;
}

export function GardenRevealReturnButton({ onReturn }: GardenRevealReturnButtonProps) {
  return (
    <button
      type="button"
      className="garden-reveal-return"
      onClick={onReturn}
      aria-label="Back to my list"
    >
      <span className="garden-reveal-return__arrow" aria-hidden />
      <span className="garden-reveal-return__label">Back to my list ✿</span>
    </button>
  );
}
