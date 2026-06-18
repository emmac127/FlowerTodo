import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface GardenPlacementStarsProps {
  /** X in design pixels (stage coordinates). */
  designX: number;
  /** Y from stage bottom in design pixels. */
  designY: number;
}

const STAR_ANGLES = [-42, 0, 42];

/**
 * A few small stars that pop outward when a new garden asset appears on the moon.
 */
export function GardenPlacementStars({
  designX,
  designY,
}: GardenPlacementStarsProps) {
  const stars = useMemo(
    () =>
      STAR_ANGLES.map((angle, id) => ({
        id,
        angle,
        delay: id * 0.06,
      })),
    [],
  );

  return (
    <div
      className="garden-placement-stars"
      style={{ left: `${designX}px`, bottom: `${designY}px` }}
      aria-hidden
    >
      {stars.map((star) => (
        <span
          key={star.id}
          className="garden-placement-stars__star"
          style={
            {
              '--star-angle': `${star.angle}deg`,
              '--star-delay': `${star.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
