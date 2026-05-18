import type { StartingSeed } from '../lib/startingSeed';

interface StartingSeedPickerProps {
  onSelect: (seed: StartingSeed) => void;
}

function MoonIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="18" fill="#d8e8f8" stroke="#8aa8c8" strokeWidth="2" />
      <circle cx="18" cy="20" r="3.5" fill="#b8cce8" opacity={0.7} />
      <circle cx="28" cy="28" r="2.5" fill="#b8cce8" opacity={0.6} />
      <circle cx="30" cy="16" r="2" fill="#b8cce8" opacity={0.5} />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="12" fill="#ffe566" stroke="#e8b830" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = 24 + Math.cos(angle) * 16;
        const y1 = 24 + Math.sin(angle) * 16;
        const x2 = 24 + Math.cos(angle) * 22;
        const y2 = 24 + Math.sin(angle) * 22;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#e8b830"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function StartingSeedPicker({ onSelect }: StartingSeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="starting-seed-picker-title"
    >
      <p id="starting-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your starting flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--moon"
          onClick={() => onSelect('moonflower')}
        >
          <MoonIcon />
          <span className="seed-choice__label">Moon flower</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--sun"
          onClick={() => onSelect('sunflower')}
        >
          <SunIcon />
          <span className="seed-choice__label">Sun flower</span>
        </button>
      </div>
    </div>
  );
}
