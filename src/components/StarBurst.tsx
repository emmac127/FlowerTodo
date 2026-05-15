import { useEffect, useMemo, useState, type ReactNode } from 'react';

interface StarBurstProps {
  active: boolean;
  burstId: number;
  originX: number;
  originY: number;
  onComplete?: () => void;
}

interface Star {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
  spiralTurns: string;
  spiralRadius: string;
}

const COLORS = ['#ffe566', '#ffb7d5', '#fff4a3', '#ff8fab', '#d4b5ff'];
const TRAIL_SEGMENTS = 5;
const TRAIL_LAG_S = 0.28;
const BURST_DURATION_MS = 8200;

const starClip = {
  clipPath:
    'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
} as const;

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

export function StarBurst({
  active,
  burstId,
  originX,
  originY,
  onComplete,
}: StarBurstProps) {
  const [visible, setVisible] = useState(false);

  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const distance = 55 + Math.random() * 45;
      const turnSign = Math.random() > 0.5 ? 1 : -1;
      const turnsDeg = turnSign * (520 + Math.random() * 380);

      return {
        id: i,
        angle: (360 / 14) * i + Math.random() * 18,
        distance,
        size: 34 + Math.random() * 30,
        delay: Math.random() * 0.2,
        color: COLORS[i % COLORS.length],
        spiralTurns: `${turnsDeg}deg`,
        spiralRadius: `${distance * 1.15}vmin`,
      };
    });
  }, [burstId]);

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
        const spiralVars = {
          '--start-angle': `${star.angle}deg`,
          '--spiral-turns': star.spiralTurns,
          '--spiral-radius': star.spiralRadius,
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
                <SpiralArm
                  key={`trail-${trailIndex}`}
                  className="star-burst__spiral-arm--trail"
                  style={{
                    ...spiralVars,
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
                </SpiralArm>
              );
            })}

            <SpiralArm
              className="star-burst__spiral-arm--streak"
              style={{
                ...spiralVars,
                animationDelay: `${star.delay + TRAIL_LAG_S * 0.6}s`,
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
            </SpiralArm>

            <SpiralArm
              className="star-burst__spiral-arm--head"
              style={{
                ...spiralVars,
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
            </SpiralArm>
          </div>
        );
      })}
    </div>
  );
}
