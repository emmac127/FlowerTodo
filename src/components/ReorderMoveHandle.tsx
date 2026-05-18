export function ReorderMoveHandle() {
  return (
    <span className="reorder-handle__inner">
      <svg
        className="reorder-handle__icon"
        width="18"
        height="22"
        viewBox="0 0 18 22"
        fill="none"
        aria-hidden
      >
        <path
          d="M9 3L5 7.5h8L9 3z"
          fill="currentColor"
        />
        <path
          d="M9 19l4-4.5H5L9 19z"
          fill="currentColor"
        />
        <rect x="4" y="9.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.45" />
      </svg>
      <span className="reorder-handle__label">Move</span>
    </span>
  );
}
