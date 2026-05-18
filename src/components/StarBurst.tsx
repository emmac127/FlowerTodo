import { useEffect, useMemo, useState, type ReactNode } from 'react';

interface StarBurstProps {
  active: boolean;
  burstId: number;
  originX: number;
  originY: number;
  startRadius: number;
  maxRadius: number;
  onComplete?: () => void;
}

interface Star {
  id: number;
  angle: number;
  size: number;
  delay: number;
  color: string;
  burstRadius: string;
  startRadius: string;
}

const COLORS = ['#ffe566', '#ffb7d5', '#fff4a3', '#ff8fab', '#d4b5ff'];
const TRAIL_SEGMENTS = 4;
const TRAIL_LAG_S = 0.12;
const BURST_DURATION_MS = 8000;

const starClip = {
  clipPath:
    'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
} as const;

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

export function StarBurst({
  active,
  burstId,
  originX,
  originY,
  startRadius,
  maxRadius,
  onComplete,
}: StarBurstProps) {
  const [visible, setVisible] = useState(false);

  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const reach = maxRadius * (0.9 + Math.random() * 0.12);
      const start = startRadius * (0.9 + Math.random() * 0.14);

      return {
        id: i,
        angle: (360 / 16) * i + Math.random() * 14,
        size: 20 + Math.random() * 18,
        delay: Math.random() * 0.18,
        color: COLORS[i % COLORS.length],
        burstRadius: `${reach}px`,
        startRadius: `${start}px`,
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
    <div className="star-burst" aria-hidden>
      {stars.map((star) => {
        const burstVars = {
          '--burst-angle': `${star.angle}deg`,
          '--burst-radius': star.burstRadius,
          '--burst-start-radius': star.startRadius,
          '--burst-duration': '6.5s',
        } as React.CSSProperties;

        return (
          <div
            key={star.id}
            className="star-burst__comet"
            style={{ left: originX, top: originY }}
          >
            {Array.from({ length: TRAIL_SEGMENTS }, (_, trailIndex) => {
              const trailScale = 0.92 - trailIndex * 0.14;
              const trailSize = star.size * trailScale;
              const trailLag = (TRAIL_SEGMENTS - trailIndex) * TRAIL_LAG_S;

              return (
                <BurstArm
                  key={`trail-${trailIndex}`}
                  className="star-burst__burst-arm--trail"
                  style={{
                    ...burstVars,
                    animationDelay: `${star.delay + trailLag}s`,
                  }}
                >
                  <span
                    className="star-burst__star star-burst__star--trail"
                    style={{
                      ...starClip,
                      width: trailSize,
                      height: trailSize,
                      backgroundColor: star.color,
                      ['--trail-peak' as string]: `${0.55 - trailIndex * 0.1}`,
                    }}
                  />
                </BurstArm>
              );
            })}

            <BurstArm
              className="star-burst__burst-arm--streak"
              style={{
                ...burstVars,
                animationDelay: `${star.delay + TRAIL_LAG_S * 0.5}s`,
              }}
            >
              <span
                className="star-burst__streak"
                style={{
                  ['--streak-color' as string]: star.color,
                  width: star.size * 2.8,
                  height: Math.max(8, star.size * 0.22),
                }}
              />
            </BurstArm>

            <BurstArm
              className="star-burst__burst-arm--head"
              style={{
                ...burstVars,
                animationDelay: `${star.delay}s`,
              }}
            >
              <span
                className="star-burst__star star-burst__star--head"
                style={{
                  ...starClip,
                  width: star.size,
                  height: star.size,
                  backgroundColor: star.color,
                }}
              />
            </BurstArm>
          </div>
        );
      })}
    </div>
  );
}
