import type { Level7Seed } from '../lib/level7Seed';

interface Level7SeedPickerProps {
  onSelect: (seed: Level7Seed) => void;
}

function ToastFlowerIcon() {
  return (
    <img
      className="seed-choice__toast-preview"
      src="/toast-flowers/Toast1.svg"
      alt=""
      width={40}
      height={56}
    />
  );
}

function JamFlowerIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <path
        d="M 14 38 L 12 22 Q 12 18 18 18 Q 24 18 24 18 Q 30 18 30 18 Q 36 18 36 22 L 34 38 Z"
        fill="#f5e6d3"
        stroke="#a08060"
        strokeWidth={0.8}
      />
      <ellipse cx="18" cy="18" rx="7" ry="2.5" fill="#c45c8a" />
      <line x1="18" y1="18" x2="18" y2="10" stroke="#5cb85c" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="18" cy="8" rx="2.2" ry="3.5" fill="#ffb7d5" />
      <ellipse cx="20" cy="7" rx="2" ry="3" fill="#ffb7d5" transform="rotate(72 20 7)" />
      <ellipse cx="16" cy="7" rx="2" ry="3" fill="#ffb7d5" transform="rotate(-72 16 7)" />
      <circle cx="18" cy="8" r={1.5} fill="#ffe566" />
      <path
        d="M 28 38 L 26 24 Q 26 20 32 20 Q 38 20 38 24 L 36 38 Z"
        fill="#e8f4ff"
        stroke="#a08060"
        strokeWidth={0.8}
      />
      <ellipse cx="32" cy="20" rx="7" ry="2.5" fill="#6b9fd4" />
      <line x1="32" y1="20" x2="32" y2="12" stroke="#5a7a4a" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="32" cy="10" rx="2.2" ry="3.5" fill="#c9b8ff" />
      <circle cx="32" cy="10" r={1.5} fill="#fff8c8" />
    </svg>
  );
}

export function Level7SeedPicker({ onSelect }: Level7SeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level7-seed-picker-title"
    >
      <p id="level7-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 7 flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--toast"
          onClick={() => onSelect('toastflower')}
        >
          <ToastFlowerIcon />
          <span className="seed-choice__label">Toast flower</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--jam"
          onClick={() => onSelect('jamflower')}
        >
          <JamFlowerIcon />
          <span className="seed-choice__label">Jam flower</span>
        </button>
      </div>
    </div>
  );
}
