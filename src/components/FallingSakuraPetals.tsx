import { useMemo } from 'react';

const PETAL_COUNT = 28;
const COLORS = ['#ffd6e8', '#ffb7d5', '#ffe8f2', '#fff0f6', '#ffc9dd', '#f8d4e8'];

interface PetalConfig {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: string;
  spin: string;
  opacity: number;
  color: string;
  sway: string;
}

function createPetals(count: number): PetalConfig[] {
  return Array.from({ length: count }, (_, id) => {
    const driftVw = (Math.random() - 0.5) * 28;
    const spinDeg = 360 + Math.random() * 540;

    return {
      id,
      left: Math.random() * 100,
      size: 10 + Math.random() * 14,
      duration: 22 + Math.random() * 18,
      delay: -(Math.random() * 40),
      drift: `${driftVw}vw`,
      spin: `${spinDeg}deg`,
      opacity: 0.35 + Math.random() * 0.45,
      color: COLORS[id % COLORS.length],
      sway: `${3 + Math.random() * 5}vw`,
    };
  });
}

interface FallingSakuraPetalsProps {
  reducedMotion?: boolean;
}

export function FallingSakuraPetals({ reducedMotion = false }: FallingSakuraPetalsProps) {
  const petals = useMemo(() => createPetals(PETAL_COUNT), []);

  if (reducedMotion) return null;

  return (
    <div className="falling-sakura" aria-hidden>
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="falling-sakura__petal"
          style={
            {
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 1.15,
              backgroundColor: petal.color,
              ['--duration' as string]: `${petal.duration}s`,
              ['--delay' as string]: `${petal.delay}s`,
              ['--drift' as string]: petal.drift,
              ['--spin' as string]: petal.spin,
              ['--sway' as string]: petal.sway,
              ['--peak-opacity' as string]: String(petal.opacity),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
