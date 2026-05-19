import { getGardenPlantRootTransform } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';

/** Pinwheel stems grow 2× the standard garden height. */
const PINWHEEL_HEIGHT_SCALE = 2;
/** Each pinwheel bloom renders at 2× base petal size. */
const BLOOM_SIZE_SCALE = 2;
const MAX_STEM_HEIGHT = 52 * PINWHEEL_HEIGHT_SCALE;
const METRICS_STEM_MAX = 52;

const PINWHEEL_COLORS = [
  '#ff8fab',
  '#ffe566',
  '#8ed98e',
  '#c9b8ff',
  '#ffb7d5',
  '#ff9f43',
] as const;

/** One bloom per growth stage (0–5), stacked up the tall stem. */
const BLOOM_SLOTS: readonly { y: number; scale: number }[] = [
  { y: -22, scale: 0.38 },
  { y: -38, scale: 0.48 },
  { y: -54, scale: 0.58 },
  { y: -70, scale: 0.72 },
  { y: -86, scale: 0.88 },
  { y: -102, scale: 1 },
];

interface PinwheelFlowerPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

function PinwheelBloom({
  y,
  scale,
  index,
}: {
  y: number;
  scale: number;
  index: number;
}) {
  const palette = SEED_PALETTES.pinwheelflower;
  const petalCount = PINWHEEL_COLORS.length;

  return (
    <g
      className="pinwheel-bloom"
      transform={`translate(0 ${y}) scale(${scale * BLOOM_SIZE_SCALE})`}
    >
      <g
        className={`pinwheel-bloom__spinner pinwheel-bloom__spinner--${index}`}
        style={{ transformOrigin: '0px 0px' }}
      >
        {PINWHEEL_COLORS.map((color, i) => {
          const angle = (360 / petalCount) * i;
          return (
            <ellipse
              key={angle}
              cx={0}
              cy={-5}
              rx={3.2}
              ry={5.5}
              fill={color}
              stroke="#fff"
              strokeWidth={0.6}
              transform={`rotate(${angle})`}
            />
          );
        })}
      </g>
      <circle r={3} fill={palette.center} stroke="#fff" strokeWidth={0.7} />
    </g>
  );
}

export function PinwheelFlowerPlant({
  growthStage,
  x = 200,
  className = '',
}: PinwheelFlowerPlantProps) {
  const palette = SEED_PALETTES.pinwheelflower;
  const metrics = getSeedGrowthMetrics(growthStage);
  const stemScaleY = metrics.stemHeight / METRICS_STEM_MAX;
  const bloomCount = growthStage + 1;

  return (
    <g
      className={`growing-seed growing-seed--pinwheel${className ? ` ${className}` : ''}`}
      transform={getGardenPlantRootTransform(x)}
      aria-hidden
    >
      <g
        className="growing-seed__plant"
        style={{ transform: `scale(${metrics.scale})`, transformOrigin: '0px 0px' }}
      >
        <g
          className="growing-seed__stem"
          style={{
            transform: `scaleY(${stemScaleY})`,
            transformOrigin: '0px 0px',
          }}
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-MAX_STEM_HEIGHT}
            stroke={palette.stem}
            strokeWidth={metrics.stemWidth}
            strokeLinecap="round"
          />
        </g>

        <g className="growing-seed__pinwheel-blooms">
          {BLOOM_SLOTS.slice(0, bloomCount).map((slot, i) => (
            <PinwheelBloom key={i} y={slot.y} scale={slot.scale} index={i} />
          ))}
        </g>
      </g>
    </g>
  );
}
