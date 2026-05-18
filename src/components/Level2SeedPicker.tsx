import type { Level2Seed } from '../lib/level2Seed';

interface Level2SeedPickerProps {
  onSelect: (seed: Level2Seed) => void;
}

function StarIcon() {
  const points = Array.from({ length: 5 }, (_, i) => {
    const outerAngle = ((i * 72 - 90) * Math.PI) / 180;
    const innerAngle = ((i * 72 + 36 - 90) * Math.PI) / 180;
    const ox = 24 + Math.cos(outerAngle) * 18;
    const oy = 24 + Math.sin(outerAngle) * 18;
    const ix = 24 + Math.cos(innerAngle) * 7;
    const iy = 24 + Math.sin(innerAngle) * 7;
    return `${ox},${oy} ${ix},${iy}`;
  }).join(' ');

  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <polygon points={points} fill="#ffe566" stroke="#e8b830" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="4" fill="#fff8c8" stroke="#e8b830" strokeWidth="1.5" />
    </svg>
  );
}

function SaturnIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <ellipse
        cx="24"
        cy="26"
        rx="22"
        ry="7"
        fill="none"
        stroke="#e8c878"
        strokeWidth="2.5"
        opacity={0.9}
      />
      <circle cx="24" cy="24" r="11" fill="#f5d4a8" stroke="#d4a060" strokeWidth="2" />
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="#fff0d8" opacity={0.55} />
    </svg>
  );
}

export function Level2SeedPicker({ onSelect }: Level2SeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level2-seed-picker-title"
    >
      <p id="level2-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 2 flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--star"
          onClick={() => onSelect('starflower')}
        >
          <StarIcon />
          <span className="seed-choice__label">Star flower</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--saturn"
          onClick={() => onSelect('saturnflower')}
        >
          <SaturnIcon />
          <span className="seed-choice__label">Saturn flower</span>
        </button>
      </div>
    </div>
  );
}
