import { useId } from 'react';

interface GardenSakuraTreeProps {
  /** 0 = hidden, 0.35 = trunk, 0.7 = partial bloom, 1 = full tree */
  growth: number;
  className?: string;
}

export const SAKURA_TREE_W = 118;
export const SAKURA_TREE_H = 108;

const W = SAKURA_TREE_W;
const H = SAKURA_TREE_H;

const OUTLINE = '#f8ece8';
const TRUNK = '#7a4f32';
const TRUNK_DARK = '#5c3a24';
const CANOPY_LIGHT = '#ffc8dc';
const CANOPY_MID = '#ff9fbe';
const CANOPY_DEEP = '#e8789a';
const PETAL = '#ffb7d5';
const PETAL_HI = '#ffd6e8';
const CENTER = '#c43d5c';
const BUD = '#d45678';

interface FlowerSpec {
  x: number;
  y: number;
  scale?: number;
  rot?: number;
  variant?: 'light' | 'deep';
}

const FLOWERS: FlowerSpec[] = [
  { x: 28, y: 32, scale: 0.85, rot: 10, variant: 'light' },
  { x: 42, y: 24, scale: 0.95, rot: -8 },
  { x: 58, y: 18, scale: 1.1, rot: 0, variant: 'light' },
  { x: 74, y: 22, scale: 1, rot: 12 },
  { x: 90, y: 30, scale: 0.9, rot: -15, variant: 'light' },
  { x: 20, y: 44, scale: 0.8, rot: 20, variant: 'deep' },
  { x: 36, y: 38, scale: 1, rot: -5 },
  { x: 52, y: 30, scale: 1.05, rot: 18, variant: 'light' },
  { x: 68, y: 32, scale: 0.95, rot: -12 },
  { x: 84, y: 40, scale: 0.88, rot: 8 },
  { x: 98, y: 48, scale: 0.82, rot: -20, variant: 'deep' },
  { x: 24, y: 54, scale: 0.9, rot: -18 },
  { x: 44, y: 48, scale: 1, rot: 6, variant: 'light' },
  { x: 62, y: 42, scale: 1.12, rot: -8 },
  { x: 80, y: 46, scale: 0.95, rot: 14 },
  { x: 96, y: 56, scale: 0.85, rot: -10, variant: 'light' },
  { x: 34, y: 58, scale: 0.88, rot: 22, variant: 'deep' },
  { x: 54, y: 52, scale: 1, rot: -15 },
  { x: 72, y: 54, scale: 0.92, rot: 10, variant: 'light' },
  { x: 88, y: 58, scale: 0.8, rot: -6 },
];

const BUDS: { x: number; y: number; rot?: number }[] = [
  { x: 18, y: 38, rot: -25 },
  { x: 50, y: 14, rot: 10 },
  { x: 102, y: 42, rot: 20 },
  { x: 30, y: 62, rot: -10 },
  { x: 76, y: 16, rot: -15 },
  { x: 94, y: 64, rot: 8 },
];

function SakuraFlower({
  x,
  y,
  scale = 1,
  rot = 0,
  variant = 'light',
}: FlowerSpec) {
  const petalFill = variant === 'deep' ? PETAL : PETAL_HI;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx={0}
          cy={-5.5}
          rx={4.2}
          ry={6}
          fill={petalFill}
          stroke={OUTLINE}
          strokeWidth={0.6}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r={2.2} fill={CENTER} />
      {[0, 45, 90, 135].map((a) => (
        <line
          key={a}
          x1={0}
          y1={0}
          x2={0}
          y2={-1.8}
          stroke={CENTER}
          strokeWidth={0.5}
          transform={`rotate(${a})`}
        />
      ))}
    </g>
  );
}

function SakuraBud({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={2.5}
      ry={4}
      fill={BUD}
      stroke={OUTLINE}
      strokeWidth={0.5}
      transform={`rotate(${rot} ${x} ${y})`}
    />
  );
}

export function GardenSakuraTree({ growth, className }: GardenSakuraTreeProps) {
  const clipId = useId().replace(/:/g, '');

  if (growth <= 0) return null;

  const reveal = Math.min(Math.max(growth, 0), 1);
  const clipY = H * (1 - reveal);
  const flowerCount =
    growth >= 1 ? FLOWERS.length : growth >= 0.72 ? Math.floor(FLOWERS.length * 0.65) : 0;
  const budCount = growth >= 0.72 ? BUDS.length : growth >= 0.38 ? 2 : 0;
  const showCanopy = growth >= 0.38;

  return (
    <g className={className}>
      <defs>
        <clipPath id={`sakura-clip-${clipId}`}>
          <rect x={0} y={clipY} width={W} height={H - clipY} />
        </clipPath>
      </defs>

      <g clipPath={`url(#sakura-clip-${clipId})`}>
        {/* Trunk */}
        <path
          d="M 52 108
             L 48 78
             Q 46 62 52 54
             L 59 50
             L 66 54
             Q 72 62 70 78
             L 66 108 Z"
          fill={TRUNK}
          stroke={OUTLINE}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <path
          d="M 55 78 L 55 54"
          fill="none"
          stroke={TRUNK_DARK}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.35}
        />

        {/* Branches */}
        <g stroke={TRUNK} strokeWidth={3.5} strokeLinecap="round" fill="none">
          <path d="M 59 54 L 59 28" stroke={OUTLINE} strokeWidth={5} />
          <path d="M 59 54 L 59 28" />
          <path d="M 59 52 L 32 42" />
          <path d="M 59 52 L 86 42" />
          <path d="M 59 52 L 22 50" />
          <path d="M 59 52 L 96 50" />
          <path d="M 59 50 L 40 34" />
          <path d="M 59 50 L 78 34" />
        </g>

        {showCanopy && (
          <>
            {/* Canopy volume layers */}
            <ellipse cx={59} cy={42} rx={50} ry={30} fill={CANOPY_DEEP} opacity={0.55} />
            <path
              d="M 14 52
                 Q 8 38 18 28
                 Q 38 12 59 14
                 Q 82 12 100 26
                 Q 112 40 104 52
                 Q 82 64 59 62
                 Q 34 64 14 52 Z"
              fill={CANOPY_MID}
            />
            <ellipse cx={59} cy={40} rx={44} ry={26} fill={CANOPY_LIGHT} />
            <path
              d="M 20 48
                 Q 28 22 59 20
                 Q 90 22 98 48
                 Q 78 58 59 56
                 Q 38 58 20 48 Z"
              fill={PETAL_HI}
              opacity={0.85}
            />

            {BUDS.slice(0, budCount).map((b) => (
              <SakuraBud key={`${b.x}-${b.y}`} {...b} />
            ))}

            {FLOWERS.slice(0, flowerCount).map((f, i) => (
              <SakuraFlower key={i} {...f} />
            ))}
          </>
        )}
      </g>
    </g>
  );
}

export function getTreeGrowth(layers: {
  treeTrunk: boolean;
  treeBlossoms: boolean;
  treeBlossomsFull: boolean;
}): number {
  if (!layers.treeTrunk) return 0;
  if (!layers.treeBlossoms) return 0.38;
  if (!layers.treeBlossomsFull) return 0.72;
  return 1;
}
