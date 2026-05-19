import { getGardenPlantRootTransform } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';

const MAX_STEM_HEIGHT = 52;

interface TulipPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

export function TulipPlant({ growthStage, x = 200, className = '' }: TulipPlantProps) {
  const palette = SEED_PALETTES.tulip;
  const metrics = getSeedGrowthMetrics(growthStage);
  const stemTop = -metrics.stemHeight;
  const stemScaleY = metrics.stemHeight / MAX_STEM_HEIGHT;
  const showBloom = metrics.showBloom;
  const showSmile = showBloom && growthStage >= 3;
  const cupScale = showBloom ? 1 : 0.55 + growthStage * 0.12;

  return (
    <g
      className={`growing-seed growing-seed--tulip${className ? ` ${className}` : ''}`}
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
          style={{
            transform: `translateY(${stemTop}px)`,
            transformOrigin: '0px 0px',
          }}
        >
          <ellipse
            cx={-6}
            cy={8}
            rx={4}
            ry={2.2}
            fill={palette.leaf}
            opacity={0.92}
            transform="rotate(-32 -6 8)"
          />
          <ellipse
            cx={6}
            cy={10}
            rx={3.5}
            ry={2}
            fill={palette.leaf}
            opacity={0.88}
            transform="rotate(28 6 10)"
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
            rx={3 + growthStage * 0.35}
            ry={4 + growthStage * 0.45}
            fill={palette.bud}
            stroke={palette.budStroke}
            strokeWidth={0.8}
          />
        </g>

        <g
          className="growing-seed__bloom growing-seed__bloom--tulip"
          style={{ opacity: showBloom ? 1 : 0 }}
          transform={`translate(0 ${stemTop}) scale(${cupScale})`}
        >
          <ellipse cx={0} cy={-8} rx={9} ry={11} fill={palette.petals} stroke={palette.budStroke} strokeWidth={1} />
          <ellipse cx={-5} cy={-9} rx={5} ry={9} fill={palette.bud} opacity={0.9} />
          <ellipse cx={5} cy={-9} rx={5} ry={9} fill={palette.bud} opacity={0.9} />
          <ellipse cx={0} cy={-10} rx={4} ry={7} fill={palette.petals} opacity={0.95} />
          {showSmile && (
            <g className="growing-seed__tulip-smile">
              <circle cx={-3.5} cy={-6} r={1.2} fill="#4a3728" />
              <circle cx={3.5} cy={-6} r={1.2} fill="#4a3728" />
              <path
                d="M -5 -2 Q 0 4 5 -2"
                fill="none"
                stroke="#4a3728"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}
