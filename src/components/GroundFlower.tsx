import type { GroundFlowerAppearance } from '../lib/groundFlowers';

interface GroundFlowerProps {
  appearance: GroundFlowerAppearance;
  isNew?: boolean;
}

const BASE_SIZE = 28;

export function GroundFlower({ appearance, isNew = false }: GroundFlowerProps) {
  const { palette, scale, petalCount, rotation } = appearance;
  const size = BASE_SIZE * scale;
  const stemH = 10 * scale;
  const angles = Array.from({ length: petalCount }, (_, i) => (360 / petalCount) * i);

  return (
    <svg
      className={`garden-ground-flower${isNew ? ' garden-ground-flower--new' : ''}`}
      width={size}
      height={size * 1.25}
      viewBox="0 0 40 50"
      overflow="visible"
      aria-hidden
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <g transform="translate(20 48)">
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-stemH}
          stroke={palette.stem}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <ellipse cx={-3} cy={-stemH + 3} rx={3.5} ry={2} fill={palette.leaf} opacity={0.9} />
        <g transform={`translate(0 ${-stemH})`}>
          {angles.map((angle) => (
            <ellipse
              key={angle}
              cx={0}
              cy={-5}
              rx={4}
              ry={5.5}
              fill={palette.petals}
              stroke="#fff"
              strokeWidth={0.6}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r={3.2} fill={palette.center} stroke="#fff" strokeWidth={0.6} />
        </g>
      </g>
    </svg>
  );
}
