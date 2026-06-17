import { useMemo } from 'react';

interface TwinklingStarsProps {
  reducedMotion?: boolean;
}

interface StarConfig {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

const STAR_COUNT = 48;

export function TwinklingStars({ reducedMotion = false }: TwinklingStarsProps) {
  const stars = useMemo<StarConfig[]>(() => {
    const result: StarConfig[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      result.push({
        id: i,
        left: (i * 37 + 11) % 100,
        top: (i * 53 + 7) % 100,
        size: 1 + (i % 3),
        delay: (i * 0.37) % 4,
        duration: 1.8 + (i % 5) * 0.4,
        opacity: 0.35 + (i % 4) * 0.15,
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
          className="twinkling-stars__star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
