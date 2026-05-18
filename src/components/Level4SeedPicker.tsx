import type { Level4Seed } from '../lib/level4Seed';

interface Level4SeedPickerProps {
  onSelect: (seed: Level4Seed) => void;
}

function PuppyPoppyIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="26" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="16" rx="11" ry="10" fill="#ff6b6b" opacity={0.9} />
      <circle cx="24" cy="17" r="7" fill="#f5d4a8" stroke="#d4a060" strokeWidth="1" />
      <ellipse cx="16" cy="12" rx="4" ry="5" fill="#d4a060" />
      <ellipse cx="32" cy="12" rx="4" ry="5" fill="#d4a060" />
      <circle cx="21" cy="16" r="1.2" fill="#4a3728" />
      <circle cx="27" cy="16" r="1.2" fill="#4a3728" />
      <ellipse cx="24" cy="18" rx="1.5" ry="1" fill="#4a3728" />
      <ellipse cx="24" cy="22" rx="2.5" ry="3" fill="#ff8fab" />
    </svg>
  );
}

function WiggleWisteriaIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <path
        d="M 24 42 Q 30 32 22 24 Q 16 16 26 8"
        fill="none"
        stroke="#5cb85c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="18" cy="28" rx="4" ry="2" fill="#8ed98e" transform="rotate(-25 18 28)" />
      <ellipse cx="28" cy="18" rx="4" ry="2" fill="#8ed98e" transform="rotate(20 28 18)" />
      <g transform="translate(22 8)">
        <ellipse cx={0} cy={0} rx={2.5} ry={4} fill="#c9b8ff" />
        <ellipse cx={-4} cy={5} rx={2} ry={3.5} fill="#d4b5ff" />
        <ellipse cx={4} cy={5} rx={2} ry={3.5} fill="#d4b5ff" />
      </g>
      <g transform="translate(26 20)">
        <ellipse cx={0} cy={0} rx={2} ry={3.5} fill="#c9b8ff" />
        <ellipse cx={-3} cy={4} rx={1.8} ry={3} fill="#d4b5ff" />
        <ellipse cx={3} cy={4} rx={1.8} ry={3} fill="#d4b5ff" />
      </g>
    </svg>
  );
}

export function Level4SeedPicker({ onSelect }: Level4SeedPickerProps) {
  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level4-seed-picker-title"
    >
      <p id="level4-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 4 flower seed
      </p>
      <div className="starting-seed-picker__choices">
        <button
          type="button"
          className="seed-choice seed-choice--puppypoppy"
          onClick={() => onSelect('puppypoppy')}
        >
          <PuppyPoppyIcon />
          <span className="seed-choice__label">Puppy poppy</span>
        </button>
        <button
          type="button"
          className="seed-choice seed-choice--wisteria"
          onClick={() => onSelect('wigglewisteria')}
        >
          <WiggleWisteriaIcon />
          <span className="seed-choice__label">Wiggle wisteria</span>
        </button>
      </div>
    </div>
  );
}
