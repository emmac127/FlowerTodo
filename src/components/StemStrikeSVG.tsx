import {
  FLOWER_PALETTES,
  getTaskFlowerSize,
  TASK_FLOWER_VIEW_BOX,
  type GrowthTier,
} from '../lib/growthTier';
import { FlowerSVG } from './FlowerSVG';

interface StemStrikeSVGProps {
  textWidth: number;
  progress: number;
  tier: GrowthTier;
  blooming: boolean;
  wilting: boolean;
  rowHeight: number;
}

export function StemStrikeSVG({
  textWidth,
  progress,
  tier,
  blooming,
  wilting,
  rowHeight,
}: StemStrikeSVGProps) {
  const palette = FLOWER_PALETTES[tier.paletteIndex];
  const stemLength = Math.max(textWidth * progress, 0);
  const y = rowHeight / 2;
  const flowerSize = getTaskFlowerSize(tier.flowerScale);
  const tipX = stemLength;
  const flowerCenterX = tipX;

  return (
    <svg
      className="stem-strike-svg"
      width={textWidth + TASK_FLOWER_VIEW_BOX}
      height={rowHeight}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      {progress > 0 && (
        <>
          <line
            x1={0}
            y1={y}
            x2={flowerCenterX + 3}
            y2={y}
            stroke={palette.stem}
            strokeWidth={tier.stemWidth}
            strokeLinecap="round"
          />
          {progress > 0.15 && (
            <ellipse
              cx={tipX * 0.35}
              cy={y - 6}
              rx={5}
              ry={3}
              fill={palette.leaf}
              transform={`rotate(-25 ${tipX * 0.35} ${y - 6})`}
              opacity={Math.min(progress * 2, 1)}
            />
          )}
          {progress > 0.4 && (
            <ellipse
              cx={tipX * 0.65}
              cy={y + 5}
              rx={4}
              ry={2.5}
              fill={palette.leaf}
              transform={`rotate(20 ${tipX * 0.65} ${y + 5})`}
              opacity={Math.min((progress - 0.4) * 2, 1)}
            />
          )}
        </>
      )}
      {(progress >= 1 || wilting) && (
        <foreignObject
          x={flowerCenterX - TASK_FLOWER_VIEW_BOX / 2}
          y={y - TASK_FLOWER_VIEW_BOX / 2}
          width={TASK_FLOWER_VIEW_BOX}
          height={TASK_FLOWER_VIEW_BOX}
        >
          <div
            className={`flower-anchor ${wilting ? 'flower-anchor--wilt' : ''}`}
          >
            <FlowerSVG
              paletteIndex={tier.paletteIndex}
              petalCount={tier.petalCount}
              scale={tier.flowerScale}
              blooming={blooming}
              wilting={wilting}
              size={flowerSize}
            />
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
