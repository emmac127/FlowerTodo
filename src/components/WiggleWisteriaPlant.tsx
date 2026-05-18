import { getGardenGroundY } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';

const MAX_STEM_HEIGHT = 52;

interface WiggleWisteriaPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

function WisteriaCluster({
  x,
  y,
  scale,
  opacity,
}: {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}) {
  const palette = SEED_PALETTES.wigglewisteria;
  const drops = [
    { dx: 0, dy: 0, rx: 2.8, ry: 4.5 },
    { dx: -3.5, dy: 5, rx: 2.2, ry: 3.8 },
    { dx: 3.5, dy: 5, rx: 2.2, ry: 3.8 },
    { dx: -2, dy: 9, rx: 2, ry: 3.2 },
    { dx: 2, dy: 9, rx: 2, ry: 3.2 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {drops.map((d, i) => (
        <ellipse
          key={i}
          cx={d.dx}
          cy={d.dy}
          rx={d.rx}
          ry={d.ry}
          fill={palette.petals}
          stroke={palette.budStroke}
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

export function WiggleWisteriaPlant({
  growthStage,
  x = 200,
  className = '',
}: WiggleWisteriaPlantProps) {
  const palette = SEED_PALETTES.wigglewisteria;
  const metrics = getSeedGrowthMetrics(growthStage);
  const groundY = getGardenGroundY();
  const stemScale = metrics.stemHeight / MAX_STEM_HEIGHT;
  const animate = growthStage >= 3;
  const showLowerBloom = growthStage >= 3;
  const showUpperBloom = growthStage >= 4;

  return (
    <g
      className={`growing-seed growing-seed--wisteria${animate ? ' growing-seed--wisteria-mature' : ''}${className ? ` ${className}` : ''}`}
      transform={`translate(${x} ${groundY})`}
      aria-hidden
    >
      <g
        className="growing-seed__plant"
        style={{ transform: `scale(${metrics.scale})`, transformOrigin: '0px 0px' }}
      >
        <g
          style={{
            transform: `scale(${stemScale})`,
            transformOrigin: '0px 0px',
          }}
        >
          <g className="growing-seed__wisteria-stem">
          <path
            d="M 0 0 Q 10 -16 -4 -30 Q -12 -42 2 -52"
            fill="none"
            stroke={palette.stem}
            strokeWidth={metrics.stemWidth + 0.5}
            strokeLinecap="round"
          />

          <ellipse
            className="growing-seed__wisteria-leaf growing-seed__wisteria-leaf--a"
            cx={-8}
            cy={-22}
            rx={5}
            ry={2.5}
            fill={palette.leaf}
            transform="rotate(-32 -8 -22)"
          />
          <ellipse
            className="growing-seed__wisteria-leaf growing-seed__wisteria-leaf--b"
            cx={9}
            cy={-36}
            rx={4.5}
            ry={2.2}
            fill={palette.leaf}
            transform="rotate(28 9 -36)"
          />

          {showLowerBloom && (
            <WisteriaCluster x={-2} y={-28} scale={0.85} opacity={showUpperBloom ? 1 : 0.85} />
          )}
          {showUpperBloom && <WisteriaCluster x={4} y={-50} scale={1} opacity={1} />}
          </g>
        </g>

        {growthStage < 3 && (
          <g className="growing-seed__bud" transform={`translate(0 ${-metrics.stemHeight})`}>
            <ellipse
              cx={0}
              cy={0}
              rx={3}
              ry={4}
              fill={palette.bud}
              stroke={palette.budStroke}
              strokeWidth={0.8}
            />
          </g>
        )}
      </g>
    </g>
  );
}
