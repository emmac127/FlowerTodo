import { useMemo } from 'react';

const BLOSSOM_COUNT = 32;
const PETAL_ANGLES = [0, 72, 144, 216, 288] as const;
const STAMEN_ANGLES = [0, 45, 90, 135, 22, 67, 112, 157] as const;

const PETAL_LIGHT = ['#ffd6e8', '#ffe8f2', '#fff5f9', '#ffc9dd'];
const PETAL_DEEP = ['#ffb7d5', '#f8a8c4', '#ff9fbe'];
const CENTERS = ['#d45678', '#c43d5c', '#e87898'];

interface BlossomConfig {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: string;
  spin: string;
  opacity: number;
  petalFill: string;
  sway: string;
  tilt: string;
  variant: 'light' | 'deep';
}

function FallingSakuraBlossom({
  petalFill,
  centerColor,
  variant,
}: {
  petalFill: string;
  centerColor: string;
  variant: 'light' | 'deep';
}) {
  const petalHi = variant === 'deep' ? '#ffb7d5' : '#ffd6e8';
  const outline = '#f3e4ea';

  return (
    <svg className="falling-sakura__blossom-svg" viewBox="0 0 40 40" fill="none" aria-hidden>
      <g transform="translate(20 20)">
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={angle}
            cx={0}
            cy={-7.2}
            rx={5.4}
            ry={7.4}
            fill={petalFill}
            stroke={outline}
            strokeWidth={0.55}
            transform={`rotate(${angle})`}
          />
        ))}
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={`hi-${angle}`}
            cx={0}
            cy={-6.2}
            rx={3.2}
            ry={4.6}
            fill={petalHi}
            opacity={0.45}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r={3} fill={centerColor} />
        <circle r={2.2} fill="#e87898" opacity={0.55} />
        {STAMEN_ANGLES.map((angle) => (
          <line
            key={angle}
            x1={0}
            y1={0}
            x2={0}
            y2={angle % 45 === 0 ? -2.6 : -2}
            stroke="#b83a58"
            strokeWidth={angle % 45 === 0 ? 0.5 : 0.35}
            strokeLinecap="round"
            opacity={angle % 45 === 0 ? 0.9 : 0.65}
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
    </svg>
  );
}

function createBlossoms(count: number): BlossomConfig[] {
  return Array.from({ length: count }, (_, id) => {
    const driftVw = (Math.random() - 0.5) * 36;
    const spinDeg = 360 + Math.random() * 540;
    const variant = Math.random() > 0.45 ? 'light' : 'deep';
    const palette = variant === 'light' ? PETAL_LIGHT : PETAL_DEEP;
    const slot = (id + 0.5) / count;
    const jitter = (Math.random() - 0.5) * (100 / count) * 0.85;
    const left = Math.min(98, Math.max(2, slot * 100 + jitter));

    return {
      id,
      left,
      size: 22 + Math.random() * 20,
      duration: 22 + Math.random() * 18,
      delay: -(Math.random() * 40),
      drift: `${driftVw}vw`,
      spin: `${spinDeg}deg`,
      opacity: 0.5 + Math.random() * 0.4,
      petalFill: palette[id % palette.length],
      sway: `${4 + Math.random() * 8}vw`,
      tilt: `${-50 + Math.random() * 100}deg`,
      variant,
    };
  });
}

interface FallingSakuraPetalsProps {
  reducedMotion?: boolean;
}

export function FallingSakuraPetals({ reducedMotion = false }: FallingSakuraPetalsProps) {
  const blossoms = useMemo(() => createBlossoms(BLOSSOM_COUNT), []);

  if (reducedMotion) return null;

  return (
    <div className="falling-sakura" aria-hidden>
      {blossoms.map((blossom) => (
        <span
          key={blossom.id}
          className="falling-sakura__track"
          style={
            {
              left: `${blossom.left}%`,
              ['--duration' as string]: `${blossom.duration}s`,
              ['--delay' as string]: `${blossom.delay}s`,
              ['--sway' as string]: blossom.sway,
            } as React.CSSProperties
          }
        >
          <span
            className="falling-sakura__petal falling-sakura__petal--blossom"
            style={
              {
                width: blossom.size,
                height: blossom.size,
                ['--duration' as string]: `${blossom.duration}s`,
                ['--delay' as string]: `${blossom.delay}s`,
                ['--drift' as string]: blossom.drift,
                ['--spin' as string]: blossom.spin,
                ['--tilt' as string]: blossom.tilt,
                ['--peak-opacity' as string]: String(blossom.opacity),
              } as React.CSSProperties
            }
          >
            <FallingSakuraBlossom
              petalFill={blossom.petalFill}
              centerColor={CENTERS[blossom.id % CENTERS.length]}
              variant={blossom.variant}
            />
          </span>
        </span>
      ))}
    </div>
  );
}
