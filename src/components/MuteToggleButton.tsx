interface MuteToggleButtonProps {
  muted: boolean;
  onClick: () => void;
}

function SpeakerOnIcon() {
  return (
    <>
      <path
        d="M5 9.5v5h3.5l4.5 3.5V6L8.5 9.5H5z"
        fill="currentColor"
      />
      <path
        d="M14.5 9.25a4.25 4.25 0 0 1 0 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16.75 7a7 7 0 0 1 0 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  );
}

function SpeakerMutedIcon() {
  return (
    <>
      <path
        d="M5 9.5v5h3.5l4.5 3.5V6L8.5 9.5H5z"
        fill="currentColor"
      />
      <path
        d="M15 9.5l5.5 5.5M20.5 9.5l-5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  );
}

export function MuteToggleButton({ muted, onClick }: MuteToggleButtonProps) {
  return (
    <button
      type="button"
      className="mute-toggle mute-toggle--actions"
      onClick={onClick}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      <svg className="mute-toggle__icon" viewBox="0 0 24 24" aria-hidden>
        {muted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
      </svg>
    </button>
  );
}
