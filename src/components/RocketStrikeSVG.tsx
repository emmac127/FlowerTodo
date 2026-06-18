import { useId } from 'react';
import {
  getTaskFlowerSize,
  TASK_FLOWER_VIEW_BOX,
  type GrowthTier,
} from '../lib/growthTier';

interface RocketStrikeSVGProps {
  textWidth: number;
  progress: number;
  tier: GrowthTier;
  boosting: boolean;
  wilting: boolean;
  /** True while the completion strike animation is running. */
  inFlight: boolean;
  rowHeight: number;
}

const FLAME_COLORS = {
  core: '#fff9d4',
  mid: '#ffd84a',
  outer: '#ffb82e',
  smoke: '#e8b84a',
};

/** viewBox width; nose points right after the 90° rotate in RocketIcon. */
const ROCKET_VIEW = 32;
/** Tail x in viewBox after rotate(90) — exhaust anchors at the trail tip. */
const ROCKET_CENTER_X = 16;
const ROCKET_TAIL_X = 4;
const ROCKET_TAIL_FROM_CENTER = (ROCKET_CENTER_X - ROCKET_TAIL_X) / ROCKET_VIEW;

function RocketIcon({
  size,
  boosting,
  wilting,
  showFlames,
}: {
  size: number;
  boosting: boolean;
  wilting: boolean;
  showFlames: boolean;
}) {
  return (
    <svg
      className={`rocket-icon${boosting ? ' rocket-icon--boost' : ''}${wilting ? ' rocket-icon--wilt' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <g transform="rotate(90 16 16)">
        <path
          d="M16 3c-2 4-3 8-3 12v5l-2 3h10l-2-3v-5c0-4-1-8-3-12z"
          fill="#d8dce8"
          stroke="#7a8499"
          strokeWidth="1"
        />
        <path d="M13 20h6l-1 4h-4z" fill="#9aa3b8" />
        <path d="M10 18l3 2 5-10 3 2-5 10z" fill="#6b9fd4" opacity="0.85" />
        <path d="M8 24l3-2 1 3z" fill="#c45c5c" />
        <path d="M24 24l-3-2-1 3z" fill="#c45c5c" />
        <circle cx="16" cy="11" r="2.2" fill="#4a6fa5" />
        {showFlames && (
          <g className="rocket-icon__flame">
            <ellipse cx="16" cy="28" rx="3.5" ry="5" fill={FLAME_COLORS.mid} />
            <ellipse cx="16" cy="27" rx="2" ry="3.5" fill={FLAME_COLORS.core} />
          </g>
        )}
      </g>
    </svg>
  );
}

export function RocketStrikeSVG({
  textWidth,
  progress,
  tier,
  boosting,
  wilting,
  inFlight,
  rowHeight,
}: RocketStrikeSVGProps) {
  const gradientId = useId().replace(/:/g, '');
  const trailLength = Math.max(textWidth * progress, 0);
  const y = rowHeight / 2;
  const rocketSize = getTaskFlowerSize(tier.flowerScale);
  const tipX = trailLength;
  const showRocket = inFlight || progress > 0 || wilting;
  const showFlames = inFlight || boosting || wilting;
  // Exhaust at the trail tip; hull and nose extend to the right past the text.
  const rocketIconCenterX = tipX + ROCKET_TAIL_FROM_CENTER * rocketSize;
  const rocketFoX = rocketIconCenterX - TASK_FLOWER_VIEW_BOX / 2;
  const rocketFoY = y - TASK_FLOWER_VIEW_BOX / 2;

  return (
    <svg
      className="rocket-strike-svg"
      width={textWidth + TASK_FLOWER_VIEW_BOX}
      height={rowHeight}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      {progress > 0 && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={FLAME_COLORS.smoke} stopOpacity="0.35" />
              <stop offset="35%" stopColor={FLAME_COLORS.outer} stopOpacity="0.9" />
              <stop offset="70%" stopColor={FLAME_COLORS.mid} />
              <stop offset="100%" stopColor={FLAME_COLORS.core} />
            </linearGradient>
          </defs>
          <line
            x1={0}
            y1={y}
            x2={tipX}
            y2={y}
            stroke={`url(#${gradientId})`}
            strokeWidth={tier.stemWidth + 2}
            strokeLinecap="round"
          />
          {progress > 0.2 && (
            <ellipse
              cx={tipX * 0.3}
              cy={y - 4}
              rx={4}
              ry={2.5}
              fill={FLAME_COLORS.mid}
              opacity={Math.min(progress * 2, 0.7)}
            />
          )}
          {progress > 0.45 && (
            <ellipse
              cx={tipX * 0.6}
              cy={y + 4}
              rx={3}
              ry={2}
              fill={FLAME_COLORS.outer}
              opacity={Math.min((progress - 0.45) * 2, 0.6)}
            />
          )}
        </>
      )}
      {showRocket && (
        <foreignObject
          x={rocketFoX}
          y={rocketFoY}
          width={TASK_FLOWER_VIEW_BOX}
          height={TASK_FLOWER_VIEW_BOX}
        >
          <div
            className={`rocket-anchor ${wilting ? 'rocket-anchor--wilt' : ''}`}
          >
            <RocketIcon
              size={rocketSize}
              boosting={boosting}
              wilting={wilting}
              showFlames={showFlames}
            />
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
