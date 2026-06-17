import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppVariant } from '../context/AppVariantContext';

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
  burstRadius: string;
  startRadius: string;
  kind: 'heart' | 'flower';
}

const HEART_COLORS = ['#ff6b95', '#ff8fab', '#ffb7d5', '#ffc9dd', '#fff0f6'];
const FLOWER_COLORS = ['#ffd6e8', '#ffb7d5', '#ffe8f2', '#ff9fbe'];
const PETAL_ANGLES = [0, 72, 144, 216, 288] as const;
const PARTICLE_COUNT = 20;
const TRAIL_SEGMENTS = 3;
const TRAIL_LAG_S = 0.1;
const BURST_DURATION_MS = 7000;

function BurstArm({
  className,
  style,
  children,
}: {
  className: string;
  style: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`celebration-burst-arm ${className}`} style={style}>
      {children}
    </div>
  );
}

const STAR_BURST_COLORS = ['#fff8e7', '#e8c878', '#c8d4e8', '#9eb8e8', '#f0d080'];

function MiniStar({ size, color }: { size: number; color: string }) {
  return (
    <svg
      className="spiral-celebration__star"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill={color}
        d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 17.8 6.4 19.5l2.1-6.7L3 8.8h6.8z"
      />
    </svg>
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
  const variant = useAppVariant();
  const isDad = variant === 'dad';
  const [visible, setVisible] = useState(false);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const reach = maxRadius * (0.92 + Math.random() * 0.1);
      const start = startRadius * (0.9 + Math.random() * 0.15);

      const kind: 'heart' | 'flower' = i % 2 === 0 ? 'heart' : 'flower';
      const size =
        kind === 'heart'
          ? 22 + Math.random() * 18
          : 16 + Math.random() * 12;

      return {
        id: i,
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 12,
        size,
        delay: Math.random() * 0.15,
        color:
          kind === 'heart'
            ? HEART_COLORS[i % HEART_COLORS.length]
            : FLOWER_COLORS[i % FLOWER_COLORS.length],
        burstRadius: `${reach}px`,
        startRadius: `${start}px`,
        kind,
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
        const burstVars = {
          '--burst-angle': `${particle.angle}deg`,
          '--burst-radius': particle.burstRadius,
          '--burst-start-radius': particle.startRadius,
          '--burst-duration': '6s',
        } as React.CSSProperties;

        const heartSize = particle.size;
        const flowerSize = particle.size * 0.72;

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
                <BurstArm
                  key={`trail-${trailIndex}`}
                  className="spiral-celebration__arm spiral-celebration__arm--trail"
                  style={{
                    ...burstVars,
                    animationDelay: `${particle.delay + trailLag}s`,
                  }}
                >
                  <span
                    className="spiral-celebration__particle spiral-celebration__particle--trail spiral-celebration__particle--combo"
                    style={{ ['--trail-peak' as string]: `${0.5 - trailIndex * 0.12}` }}
                  >
                    {isDad ? (
                      <MiniStar
                        size={trailSize}
                        color={STAR_BURST_COLORS[particle.id % STAR_BURST_COLORS.length]}
                      />
                    ) : (
                      <>
                        <HeartShape
                          size={trailSize}
                          color={HEART_COLORS[particle.id % HEART_COLORS.length]}
                        />
                        <MiniFlower
                          size={trailSize * 0.72}
                          color={FLOWER_COLORS[particle.id % FLOWER_COLORS.length]}
                        />
                      </>
                    )}
                  </span>
                </BurstArm>
              );
            })}

            <BurstArm
              className="spiral-celebration__arm spiral-celebration__arm--head"
              style={{
                ...burstVars,
                animationDelay: `${particle.delay}s`,
              }}
            >
              <span className="spiral-celebration__particle spiral-celebration__particle--head spiral-celebration__particle--combo">
                {isDad ? (
                  <MiniStar
                    size={heartSize}
                    color={STAR_BURST_COLORS[particle.id % STAR_BURST_COLORS.length]}
                  />
                ) : (
                  <>
                    <HeartShape
                      size={heartSize}
                      color={HEART_COLORS[particle.id % HEART_COLORS.length]}
                    />
                    <MiniFlower
                      size={flowerSize}
                      color={FLOWER_COLORS[particle.id % FLOWER_COLORS.length]}
                    />
                  </>
                )}
              </span>
            </BurstArm>
          </div>
        );
      })}
    </div>
  );
}
