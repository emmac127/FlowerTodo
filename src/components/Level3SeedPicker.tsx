import type { Level3Seed } from '../lib/level3Seed';

interface Level3SeedPickerProps {
  onSelect: (seed: Level3Seed) => void;
}

function TulipIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="22" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="16" rx="10" ry="12" fill="#ff8fab" stroke="#ff6b9d" strokeWidth="2" />
      <ellipse cx="20" cy="14" rx="4" ry="7" fill="#ffb7d5" opacity={0.85} />
      <ellipse cx="28" cy="14" rx="4" ry="7" fill="#ffb7d5" opacity={0.85} />
      <path
        d="M 18 20 Q 24 26 30 20"
        fill="none"
        stroke="#4a3728"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CatGrassIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <path
        d="M 14 40 Q 12 28 16 18 Q 14 30 18 40"
        fill="#7dd87d"
        stroke="#5cb85c"
        strokeWidth="1.2"
      />
      <path
        d="M 22 40 Q 20 24 24 12 Q 22 28 26 40"
        fill="#8ed98e"
        stroke="#5cb85c"
        strokeWidth="1.2"
      />
      <path
        d="M 30 40 Q 32 28 28 20 Q 30 32 26 40"
        fill="#7dd87d"
        stroke="#5cb85c"
        strokeWidth="1.2"
      />
      <ellipse cx="20" cy="14" rx="2.5" ry="3" fill="#ffe566" stroke="#e8b830" strokeWidth="0.8" />
      <ellipse cx="28" cy="14" rx="2.5" ry="3" fill="#ffe566" stroke="#e8b830" strokeWidth="0.8" />
      <path
        d="M 18 18 Q 24 22 30 18"
        fill="none"
        stroke="#4a3728"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Level3SeedPicker({ onSelect }: Level3SeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level3-seed-picker-title"
    >
      <p id="level3-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 3 flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--tulip"
          onClick={() => onSelect('tulip')}
        >
          <TulipIcon />
          <span className="seed-choice__label">Normal tulip</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--catgrass"
          onClick={() => onSelect('catgrass')}
        >
          <CatGrassIcon />
          <span className="seed-choice__label">Cat grass</span>
        </button>
      </div>
    </div>
  );
}
