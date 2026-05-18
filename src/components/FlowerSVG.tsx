import {
  clampTaskFlowerScale,
  FLOWER_PALETTES,
  TASK_FLOWER_VIEW_BOX,
} from '../lib/growthTier';

interface FlowerSVGProps {
  paletteIndex: number;
  petalCount: number;
  scale: number;
  blooming: boolean;
  wilting?: boolean;
  size?: number;
}

export function FlowerSVG({
  paletteIndex,
  petalCount,
  scale,
  blooming,
  wilting = false,
  size = 36,
}: FlowerSVGProps) {
  const palette = FLOWER_PALETTES[paletteIndex % FLOWER_PALETTES.length];
  const drawScale = clampTaskFlowerScale(scale);
  const viewBox = TASK_FLOWER_VIEW_BOX;
  const cx = viewBox / 2;
  const cy = viewBox / 2;

  const petals = Array.from({ length: petalCount }, (_, i) => {
    const angle = (360 / petalCount) * i;
    return (
      <g key={i} transform={`rotate(${angle} ${cx} ${cy})`}>
        <ellipse
          cx={cx}
          cy={cy - 7 * drawScale}
          rx={6 * drawScale}
          ry={9 * drawScale}
          fill={palette.petals}
          stroke="#fff"
          strokeWidth={1.5}
          className={`flower-petal ${
            wilting ? 'flower-petal--wilt' : blooming ? 'flower-petal--bloom' : 'flower-petal--open'
          }`}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      </g>
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={`flower-svg ${blooming ? 'flower-svg--blooming' : ''} ${wilting ? 'flower-svg--wilting' : ''}`}
      aria-hidden
    >
      <g className="flower-petals">{petals}</g>
      <circle
        cx={cx}
        cy={cy}
        r={4.5 * drawScale}
        fill={palette.center}
        stroke="#fff"
        strokeWidth={1.5}
        className="flower-center"
      />
      <circle cx={cx - 2} cy={cy - 2} r={1.2} fill="#fff" opacity={0.7} />
      <circle cx={cx + 2} cy={cy - 1} r={0.8} fill="#fff" opacity={0.5} />
    </svg>
  );
}
