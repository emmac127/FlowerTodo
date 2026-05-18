import { getPaletteByIndex } from '../lib/plantedGarden';

interface HeldFlowerProps {
  paletteIndex: number;
  size?: number;
}

export function HeldFlower({ paletteIndex, size = 36 }: HeldFlowerProps) {
  const palette = getPaletteByIndex(paletteIndex);
  const angles = [0, 72, 144, 216, 288];

  return (
    <svg
      className="held-flower"
      width={size}
      height={Math.round(size * 1.35)}
      viewBox="0 0 32 44"
      aria-hidden
    >
      <g transform="translate(16 34)">
        <line x1={0} y1={0} x2={0} y2={-16} stroke={palette.stem} strokeWidth={2.2} strokeLinecap="round" />
        <ellipse cx={-3} cy={-6} rx={3.5} ry={2} fill={palette.leaf} opacity={0.9} />
        <g transform="translate(0 -16)">
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
