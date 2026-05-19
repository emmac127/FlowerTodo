import { useId } from 'react';
import { getGardenPlantRootTransform } from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  SEED_PALETTES,
  type SeedGrowthStage,
} from '../lib/seedGrowth';

const MAX_STEM_HEIGHT = 52;

/** Flame wisps around the bloom center (0 = flower head). */
const FLAME_OFFSETS = [
  { x: -6, y: -5, rx: 2.8, ry: 4 },
  { x: 5, y: -7, rx: 2.4, ry: 3.5 },
  { x: -3, y: -9, rx: 2.2, ry: 3.8 },
  { x: 4, y: -8, rx: 2, ry: 3.2 },
  { x: 0, y: -11, rx: 3, ry: 4.5 },
] as const;

interface FireFlowerPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

/** Leaf path with base at (0,0) — anchored on the stem, tip points outward. */
function FlameLeaf({
  side,
  sway,
  className,
}: {
  side: 'left' | 'right';
  sway: boolean;
  className: string;
}) {
  const palette = SEED_PALETTES.fireflower;
  const d =
    side === 'left'
      ? 'M 0 0 Q -5 -8 -7 -14 Q -2 -9 0 0'
      : 'M 0 0 Q 5 -8 7 -14 Q 2 -9 0 0';

  return (
    <g className={`fire-flower__leaf-anchor ${className}`}>
      <g className={sway ? 'fire-flower__leaf-sway--active' : undefined}>
        <path
          d={d}
          fill={palette.leaf}
          stroke={palette.budStroke}
          strokeWidth={0.6}
          opacity={0.92}
        />
      </g>
    </g>
  );
}

export function FireFlowerPlant({
  growthStage,
  x = 200,
  className = '',
}: FireFlowerPlantProps) {
  const flameGradientId = useId().replace(/:/g, '');
  const palette = SEED_PALETTES.fireflower;
  const metrics = getSeedGrowthMetrics(growthStage);
  const stemTop = -metrics.stemHeight;
  const stemScaleY = metrics.stemHeight / MAX_STEM_HEIGHT;
  const showBloom = metrics.showBloom;
  const sway = growthStage >= 3;

  const leafOpacity = growthStage >= 1 ? 1 : 0;
  const bloomOpacity = showBloom ? 1 : 0;
  const budOpacity = showBloom ? 0 : 1;
  const flameOpacity = growthStage >= 3 ? 1 : 0;

  return (
    <g
      className={`growing-seed growing-seed--fireflower${sway ? ' growing-seed--fireflower-mature' : ''}${className ? ` ${className}` : ''}`}
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

        <g className="fire-flower__tip" style={{ transform: `translate(0px, ${stemTop}px)` }}>
          <g
            className="fire-flower__leaves-mount fire-flower__leaves-mount--lower"
            style={{ opacity: leafOpacity }}
          >
            <g style={{ transform: 'translate(-2px, 14px)' }}>
              <FlameLeaf side="left" sway={sway} className="fire-flower__leaf--a" />
            </g>
            <g style={{ transform: 'translate(2px, 15px)' }}>
              <FlameLeaf side="right" sway={sway} className="fire-flower__leaf--b" />
            </g>
          </g>

          <g
            className="fire-flower__leaves-mount fire-flower__leaves-mount--upper"
            style={{ opacity: leafOpacity }}
          >
            <g style={{ transform: 'translate(-2px, 8px)' }}>
              <FlameLeaf side="left" sway={sway} className="fire-flower__leaf--c" />
            </g>
            <g style={{ transform: 'translate(2px, 9px)' }}>
              <FlameLeaf side="right" sway={sway} className="fire-flower__leaf--d" />
            </g>
          </g>

          <g className="fire-flower__head">
            <g className="growing-seed__bud" style={{ opacity: budOpacity }}>
              <ellipse
                cx={0}
                cy={-2}
                rx={3.5}
                ry={4}
                fill={palette.bud}
                stroke={palette.budStroke}
                strokeWidth={0.8}
              />
            </g>

            <g className="growing-seed__bloom growing-seed__bloom--fire" style={{ opacity: bloomOpacity }}>
              <circle r={5} fill="#ff9f43" stroke="#ff6b35" strokeWidth={0.8} />
              <circle r={2.5} fill="#fff4a3" />
              <g className="fire-flower__flames" style={{ opacity: flameOpacity }} aria-hidden>
                <defs>
                  <radialGradient id={flameGradientId} cx="50%" cy="80%" r="70%">
                    <stop offset="0%" stopColor="#fff4a3" />
                    <stop offset="45%" stopColor="#ff9f43" />
                    <stop offset="100%" stopColor="#ff6b35" stopOpacity={0.2} />
                  </radialGradient>
                </defs>
                {FLAME_OFFSETS.map((f, i) => (
                  <ellipse
                    key={i}
                    className={`fire-flower__flame fire-flower__flame--${i}`}
                    cx={f.x}
                    cy={f.y}
                    rx={f.rx}
                    ry={f.ry}
                    fill={`url(#${flameGradientId})`}
                  />
                ))}
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
