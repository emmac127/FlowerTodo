interface ViewGardenButtonProps {
  onClick: () => void;
  active?: boolean;
}

function EyeIcon() {
  return (
    <>
      <ellipse
        cx="12"
        cy="12.5"
        rx="8.5"
        ry="5.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12.5" r="2.75" fill="currentColor" />
      <path
        d="M4.5 12.5c2-3.25 4.75-4.75 7.5-4.75s5.5 1.5 7.5 4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  );
}

export function ViewGardenButton({
  onClick,
  active = false,
}: ViewGardenButtonProps) {
  return (
    <button
      type="button"
      className="view-garden-toggle view-garden-toggle--actions"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Back to my list' : 'View garden'}
      title={active ? 'Back to my list' : 'View garden'}
    >
      <svg className="view-garden-toggle__icon" viewBox="0 0 24 24" aria-hidden>
        <EyeIcon />
      </svg>
    </button>
  );
}
