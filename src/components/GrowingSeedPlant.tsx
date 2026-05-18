import { getGardenGroundY } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';
import type { StartingSeed } from '../lib/startingSeed';

const MAX_STEM_HEIGHT = 52;
const MAX_PETALS = 8;

interface GrowingSeedPlantProps {
  seed: StartingSeed;
  growthStage: SeedGrowthStage;
}

export function GrowingSeedPlant({ seed, growthStage }: GrowingSeedPlantProps) {
  const palette = SEED_PALETTES[seed];
  const metrics = getSeedGrowthMetrics(growthStage);
  const groundY = getGardenGroundY();
  const stemTop = -metrics.stemHeight;
  const stemScaleY = metrics.stemHeight / MAX_STEM_HEIGHT;

  const leafOffset = 5 * metrics.leafSpread;
  const leafW = 4 * metrics.leafSpread;
  const leafH = 2.5 * metrics.leafSpread;
  const petalAngles = Array.from(
    { length: MAX_PETALS },
    (_, i) => (360 / MAX_PETALS) * i,
  );

  return (
    <g className="growing-seed" transform={`translate(200 ${groundY})`} aria-hidden>
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

        <g
          className="growing-seed__leaves"
          style={{
            transform: `translateY(${stemTop}px)`,
            transformOrigin: '0px 0px',
          }}
        >
          <ellipse
            className="growing-seed__leaf growing-seed__leaf--left"
            cx={-leafOffset}
            cy={10}
            rx={leafW}
            ry={leafH}
            fill={palette.leaf}
            opacity={0.92}
            transform={`rotate(-28 ${-leafOffset} 10)`}
          />
          <ellipse
            className="growing-seed__leaf growing-seed__leaf--right"
            cx={leafOffset}
            cy={12}
            rx={leafW * 0.9}
            ry={leafH * 0.9}
            fill={palette.leaf}
            opacity={0.88}
            transform={`rotate(24 ${leafOffset} 12)`}
          />
        </g>

        <g
          className="growing-seed__bud"
          style={{ opacity: metrics.showBloom ? 0 : 1 }}
          transform={`translate(0 ${stemTop - 2})`}
        >
          <ellipse
            cx={0}
            cy={0}
            rx={3 + growthStage * 0.4}
            ry={4 + growthStage * 0.5}
            fill={palette.bud}
            stroke={palette.budStroke}
            strokeWidth={0.8}
          />
        </g>

        <g
          className="growing-seed__bloom"
          style={{ opacity: metrics.showBloom ? 1 : 0 }}
          transform={`translate(0 ${stemTop})`}
        >
          {petalAngles.map((angle, i) => (
            <ellipse
              key={angle}
              cx={0}
              cy={-6}
              rx={5}
              ry={7}
              fill={palette.petals}
              stroke="#fff"
              strokeWidth={0.8}
              style={{ opacity: i < metrics.petalCount ? 1 : 0 }}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r={4.5} fill={palette.center} stroke="#fff" strokeWidth={0.8} />
          {seed === 'moonflower' && growthStage >= 5 && (
            <circle cx={1} cy={-1} r={2.2} fill={palette.budStroke} opacity={0.35} />
          )}
        </g>
      </g>
    </g>
  );
}
