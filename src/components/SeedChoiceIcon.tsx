import type { GardenSeed } from '../lib/gardenSeed';

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
      <ellipse cx="24" cy="26" rx="22" ry="7" fill="none" stroke="#e8c878" strokeWidth="2.5" opacity={0.9} />
      <circle cx="24" cy="24" r="11" fill="#f5d4a8" stroke="#d4a060" strokeWidth="2" />
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="#fff0d8" opacity={0.55} />
    </svg>
  );
}

function TulipIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="22" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="16" rx="10" ry="12" fill="#ff8fab" stroke="#ff6b9d" strokeWidth="2" />
      <ellipse cx="20" cy="14" rx="4" ry="7" fill="#ffb7d5" opacity={0.85} />
      <ellipse cx="28" cy="14" rx="4" ry="7" fill="#ffb7d5" opacity={0.85} />
    </svg>
  );
}

function CatGrassIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <path d="M 14 40 Q 12 28 16 18 Q 14 30 18 40" fill="#7dd87d" stroke="#5cb85c" strokeWidth="1.2" />
      <path d="M 22 40 Q 20 24 24 12 Q 22 28 26 40" fill="#8ed98e" stroke="#5cb85c" strokeWidth="1.2" />
      <path d="M 30 40 Q 32 28 28 20 Q 30 32 26 40" fill="#7dd87d" stroke="#5cb85c" strokeWidth="1.2" />
    </svg>
  );
}

function PuppyPoppyIcon() {
  return (
    <svg className="seed-choice__icon" viewBox="0 0 48 48" aria-hidden>
      <line x1="24" y1="42" x2="24" y2="26" stroke="#5cb85c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="16" rx="11" ry="10" fill="#ff6b6b" opacity={0.9} />
      <circle cx="24" cy="17" r="7" fill="#f5d4a8" stroke="#d4a060" strokeWidth="1" />
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
    </svg>
  );
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
      <path d="M 16 30 Q 12 22 16 18 Q 20 22 16 30" fill="#ff9f43" stroke="#ff6b35" strokeWidth={0.8} />
      <path d="M 32 28 Q 36 20 32 16 Q 28 20 32 28" fill="#ffb347" stroke="#ff6b35" strokeWidth={0.8} />
      <circle cx="24" cy="14" r={4} fill="#ff9f43" stroke="#ff6b35" strokeWidth={1} />
      <circle cx="24" cy="14" r={2} fill="#fff4a3" />
    </svg>
  );
}

export function SeedChoiceIcon({ seed }: { seed: GardenSeed }) {
  switch (seed) {
    case 'moonflower':
      return <MoonIcon />;
    case 'sunflower':
      return <SunIcon />;
    case 'starflower':
      return <StarIcon />;
    case 'saturnflower':
      return <SaturnIcon />;
    case 'tulip':
      return <TulipIcon />;
    case 'catgrass':
      return <CatGrassIcon />;
    case 'puppypoppy':
      return <PuppyPoppyIcon />;
    case 'wigglewisteria':
      return <WiggleWisteriaIcon />;
    case 'pinwheelflower':
      return <PinwheelIcon />;
    case 'fireflower':
      return <FireFlowerIcon />;
    default:
      return null;
  }
}
