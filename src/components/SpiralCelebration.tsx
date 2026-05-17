import { useEffect, useMemo, useState, type ReactNode } from 'react';

interface SpiralCelebrationProps {
  active: boolean;
  burstId: number;
  originX: number;
  originY: number;
  startRadius: number;
  maxRadius: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  angle: number;
  size: number;
  delay: number;
  color: string;
  spiralTurns: string;
  spiralRadius: string;
  startRadius: string;
  kind: 'heart' | 'flower';
}

const HEART_COLORS = ['#ff6b95', '#ff8fab', '#ffb7d5', '#ffc9dd', '#fff0f6'];
const FLOWER_COLORS = ['#ffd6e8', '#ffb7d5', '#ffe8f2', '#ff9fbe'];
const PETAL_ANGLES = [0, 72, 144, 216, 288] as const;
const PARTICLE_COUNT = 18;
const TRAIL_SEGMENTS = 3;
const TRAIL_LAG_S = 0.16;
const BURST_DURATION_MS = 6400;

function SpiralArm({
  className,
  style,
  children,
}: {
  className: string;
  style: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`star-burst__spiral-arm ${className}`} style={style}>
      {children}
    </div>
  );
}

function HeartShape({ size, color }: { size: number; color: string }) {
  return (
    <svg
      className="spiral-celebration__heart"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill={color}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}

function MiniFlower({ size, color }: { size: number; color: string }) {
  const petalHi = '#fff5f9';
  return (
    <svg
      className="spiral-celebration__flower"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <g transform="translate(12 12)">
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={angle}
            cx={0}
            cy={-4.2}
            rx={3.2}
            ry={4.6}
            fill={color}
            stroke={petalHi}
            strokeWidth={0.35}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r={1.8} fill="#e87898" />
      </g>
    </svg>
  );
}

export function SpiralCelebration({
  active,
  burstId,
  originX,
  originY,
  startRadius,
  maxRadius,
  onComplete,
}: SpiralCelebrationProps) {
  const [visible, setVisible] = useState(false);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const turnSign = Math.random() > 0.5 ? 1 : -1;
      const turnsDeg = turnSign * (480 + Math.random() * 320);
      const reach = maxRadius * (0.9 + Math.random() * 0.14);
      const start = startRadius * (0.85 + Math.random() * 0.2);

      return {
        id: i,
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 18,
        size: 12 + Math.random() * 14,
        delay: Math.random() * 0.22,
        color:
          i % 2 === 0
            ? HEART_COLORS[i % HEART_COLORS.length]
            : FLOWER_COLORS[i % FLOWER_COLORS.length],
        spiralTurns: `${turnsDeg}deg`,
        spiralRadius: `${reach}px`,
        startRadius: `${start}px`,
        kind: i % 3 === 0 ? 'flower' : 'heart',
      };
    });
  }, [burstId, maxRadius, startRadius]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, BURST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [active, burstId, onComplete]);

  if (!visible) return null;

  return (
    <div className="spiral-celebration" aria-hidden>
      {particles.map((particle) => {
        const spiralVars = {
          '--start-angle': `${particle.angle}deg`,
          '--spiral-turns': particle.spiralTurns,
          '--spiral-radius': particle.spiralRadius,
          '--spiral-start-radius': particle.startRadius,
          '--spiral-duration': '6.4s',
        } as React.CSSProperties;

        const Shape =
          particle.kind === 'flower' ? (
            <MiniFlower size={particle.size} color={particle.color} />
          ) : (
            <HeartShape size={particle.size} color={particle.color} />
          );

        return (
          <div
            key={particle.id}
            className="star-burst__comet"
            style={{ left: originX, top: originY }}
          >
            {Array.from({ length: TRAIL_SEGMENTS }, (_, trailIndex) => {
              const trailScale = 0.88 - trailIndex * 0.16;
              const trailSize = particle.size * trailScale;
              const trailLag = (TRAIL_SEGMENTS - trailIndex) * TRAIL_LAG_S;

              return (
                <SpiralArm
                  key={`trail-${trailIndex}`}
                  className="spiral-celebration__arm spiral-celebration__arm--trail"
                  style={{
                    ...spiralVars,
                    animationDelay: `${particle.delay + trailLag}s`,
                  }}
                >
                  <span
                    className="spiral-celebration__particle spiral-celebration__particle--trail"
                    style={{ ['--trail-peak' as string]: `${0.5 - trailIndex * 0.12}` }}
                  >
                    {particle.kind === 'flower' ? (
                      <MiniFlower size={trailSize} color={particle.color} />
                    ) : (
                      <HeartShape size={trailSize} color={particle.color} />
                    )}
                  </span>
                </SpiralArm>
              );
            })}

            <SpiralArm
              className="spiral-celebration__arm spiral-celebration__arm--head"
              style={{
                ...spiralVars,
                animationDelay: `${particle.delay}s`,
              }}
            >
              <span className="spiral-celebration__particle spiral-celebration__particle--head">
                {Shape}
              </span>
            </SpiralArm>
          </div>
        );
      })}
    </div>
  );
}
