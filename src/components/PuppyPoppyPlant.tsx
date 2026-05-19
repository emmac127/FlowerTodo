import { getGardenPlantRootTransform } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';

const MAX_STEM_HEIGHT = 52;

interface PuppyPoppyPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

function PoppyPetals({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  const palette = SEED_PALETTES.puppypoppy;
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (360 / 6) * i;
        return (
          <ellipse
            key={angle}
            cx={cx}
            cy={cy - 10 * scale}
            rx={5 * scale}
            ry={8 * scale}
            fill={palette.petals}
            stroke="#fff"
            strokeWidth={0.8}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        );
      })}
    </>
  );
}

export function PuppyPoppyPlant({
  growthStage,
  x = 200,
  className = '',
}: PuppyPoppyPlantProps) {
  const palette = SEED_PALETTES.puppypoppy;
  const metrics = getSeedGrowthMetrics(growthStage);
  const stemTop = -metrics.stemHeight;
  const stemScaleY = metrics.stemHeight / MAX_STEM_HEIGHT;
  const showBloom = metrics.showBloom;
  const showPuppy = showBloom && growthStage >= 3;
  const bloomScale = showBloom ? 1 : 0.55 + growthStage * 0.12;

  return (
    <g
      className={`growing-seed growing-seed--puppypoppy${className ? ` ${className}` : ''}`}
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

        <g
          className="growing-seed__leaves"
          style={{ transform: `translateY(${stemTop}px)` }}
        >
          <ellipse
            cx={-7}
            cy={10}
            rx={4}
            ry={2}
            fill={palette.leaf}
            transform="rotate(-30 -7 10)"
          />
          <ellipse
            cx={7}
            cy={12}
            rx={3.5}
            ry={2}
            fill={palette.leaf}
            transform="rotate(26 7 12)"
          />
        </g>

        <g
          className="growing-seed__bud"
          style={{ opacity: showBloom ? 0 : 1 }}
          transform={`translate(0 ${stemTop - 2})`}
        >
          <ellipse
            cx={0}
            cy={0}
            rx={3.5}
            ry={4}
            fill={palette.bud}
            stroke={palette.budStroke}
            strokeWidth={0.8}
          />
        </g>

        <g
          className="growing-seed__bloom growing-seed__bloom--puppypoppy"
          style={{ opacity: showBloom ? 1 : 0 }}
          transform={`translate(0 ${stemTop}) scale(${bloomScale})`}
        >
          <PoppyPetals cx={0} cy={0} scale={1} />
          {showPuppy && (
            <g className="growing-seed__puppy-face">
              <circle cx={0} cy={-2} r={8} fill="#f5d4a8" stroke="#d4a060" strokeWidth={1} />
              <ellipse cx={-7} cy={-6} rx={4} ry={5} fill="#d4a060" />
              <ellipse cx={7} cy={-6} rx={4} ry={5} fill="#d4a060" />
              <circle cx={-2.5} cy={-2} r={1.3} fill="#4a3728" />
              <circle cx={2.5} cy={-2} r={1.3} fill="#4a3728" />
              <ellipse cx={0} cy={0.5} rx={1.8} ry={1.2} fill="#4a3728" />
              <ellipse cx={0} cy={5} rx={3} ry={4} fill="#ff8fab" stroke="#ff6b9d" strokeWidth={0.8} />
              <ellipse cx={0} cy={7.5} rx={2} ry={1.5} fill="#ffb7d5" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}
