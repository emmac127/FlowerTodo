interface GardenPhaseToggleProps {
  viewingNostalgicMode1: boolean;
  highlight?: boolean;
  onToggle: () => void;
}

export function GardenPhaseToggle({
  viewingNostalgicMode1,
  highlight = false,
  onToggle,
}: GardenPhaseToggleProps) {
  return (
    <button
      type="button"
      className={`garden-phase-toggle${highlight ? ' garden-phase-toggle--highlight' : ''}${viewingNostalgicMode1 ? ' garden-phase-toggle--active' : ''}`}
      onClick={onToggle}
      aria-label={
        viewingNostalgicMode1
          ? 'Return to bird garden'
          : 'View your first garden'
      }
      title={viewingNostalgicMode1 ? 'Back to Bird Garden' : 'View First Garden'}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2c-1.5 3-4 5.5-4 9a4 4 0 0 0 8 0c0-3.5-2.5-6-4-9zm0 13a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z"
        />
        <ellipse cx="8" cy="10" rx="2" ry="3" fill="currentColor" opacity="0.7" />
        <ellipse cx="16" cy="10" rx="2" ry="3" fill="currentColor" opacity="0.7" />
      </svg>
    </button>
  );
}
