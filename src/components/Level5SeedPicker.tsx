import type { Level5Seed } from '../lib/level5Seed';

interface Level5SeedPickerProps {
  onSelect: (seed: Level5Seed) => void;
}

function PinwheelIcon() {
  const colors = ['#ff8fab', '#ffe566', '#8ed98e', '#c9b8ff', '#ffb7d5', '#ff9f43'];
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="28" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <g className="seed-choice__pinwheel-preview" transform="translate(24 18)">
        {colors.map((color, i) => {
          const angle = (360 / colors.length) * i;
          return (
            <ellipse
              key={angle}
              cx={0}
              cy={-6}
              rx={3}
              ry={5}
              fill={color}
              transform={`rotate(${angle})`}
            />
          );
        })}
        <circle r={3} fill="#fff8c8" />
      </g>
    </svg>
  );
}

function FireFlowerIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="26" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M 16 30 Q 12 22 16 18 Q 20 22 16 30"
        fill="#ff9f43"
        stroke="#ff6b35"
        strokeWidth={0.8}
      />
      <path
        d="M 32 28 Q 36 20 32 16 Q 28 20 32 28"
        fill="#ffb347"
        stroke="#ff6b35"
        strokeWidth={0.8}
      />
      <ellipse cx="20" cy="12" rx={3} ry={5} fill="#ffcc66" opacity={0.9} />
      <ellipse cx="28" cy="10" rx={2.5} ry={4} fill="#ff9f43" opacity={0.85} />
      <circle cx="24" cy="14" r={4} fill="#ff9f43" stroke="#ff6b35" strokeWidth={1} />
      <circle cx="24" cy="14" r={2} fill="#fff4a3" />
    </svg>
  );
}

export function Level5SeedPicker({ onSelect }: Level5SeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level5-seed-picker-title"
    >
      <p id="level5-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 5 flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--pinwheel"
          onClick={() => onSelect('pinwheelflower')}
        >
          <PinwheelIcon />
          <span className="seed-choice__label">Pinwheel flower</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--fireflower"
          onClick={() => onSelect('fireflower')}
        >
          <FireFlowerIcon />
          <span className="seed-choice__label">Fire flower</span>
        </button>
      </div>
    </div>
  );
}
