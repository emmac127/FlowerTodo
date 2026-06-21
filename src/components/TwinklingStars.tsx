import { useMemo } from 'react';

interface TwinklingStarsProps {
  reducedMotion?: boolean;
}

interface StarConfig {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  delay: number;
  duration: number;
  opacity: number;
  bright: boolean;
}

/** Four-point twinkle with concave sides — vertically elongated sparkle shape. */
const SPARKLE_PATH =
  'M20 0C21 12 24 20 40 26C24 32 21 40 20 52C19 40 16 32 0 26C16 20 19 12 20 0Z';

const STAR_COUNT = 52;

export function TwinklingStars({ reducedMotion = false }: TwinklingStarsProps) {
  const stars = useMemo<StarConfig[]>(() => {
    const result: StarConfig[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const bright = i % 7 === 0;
      const width = bright ? 14 + (i % 3) * 3 : 6 + (i % 5) * 2;
      const height = width * 1.3;
      result.push({
        id: i,
        left: (i * 37 + 11) % 100,
        top: (i * 53 + 7) % 100,
        width,
        height,
        delay: (i * 0.37) % 4,
        duration: 1.8 + (i % 5) * 0.4,
        opacity: 0.45 + (i % 4) * 0.12,
        bright,
      });
    }
    return result;
  }, []);

  return (
    <div
      className={`twinkling-stars${reducedMotion ? ' twinkling-stars--static' : ''}`}
      aria-hidden
    >
      {stars.map((star) => (
        <span
          key={star.id}
          className={`twinkling-stars__star${star.bright ? ' twinkling-stars__star--bright' : ''}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.width}px`,
            height: `${star.height}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        >
          <svg
            className="twinkling-stars__star-svg"
            viewBox="0 0 40 52"
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={`twinkle-fill-${star.id}`}
                x1="20"
                y1="0"
                x2="20"
                y2="52"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#fffef8" />
                <stop offset="45%" stopColor="#f5ecd0" />
                <stop offset="100%" stopColor="#e8c878" />
              </linearGradient>
            </defs>
            <path d={SPARKLE_PATH} fill={`url(#twinkle-fill-${star.id})`} />
          </svg>
        </span>
      ))}
    </div>
  );
}
