import { useId } from 'react';
import {
  GARDEN_CELL_VIEW_HEIGHT,
  GARDEN_PLANT_SCALE,
  getGardenPlantRootTransform,
} from '../lib/plantedGarden';
import { getSeedGrowthMetrics, type SeedGrowthStage } from '../lib/seedGrowth';

const TOAST_WIDTH = 225;
const TOAST_HEIGHT = 372;

/**
 * Scale so the fully-grown toast fills ~75% of the cell height.
 * GARDEN_CELL_VIEW_HEIGHT / GARDEN_PLANT_SCALE is the cell height in the
 * local coordinate system after getGardenPlantRootTransform.
 */
const TOAST_BASE_SCALE =
  ((GARDEN_CELL_VIEW_HEIGHT / GARDEN_PLANT_SCALE) * 0.75) / TOAST_HEIGHT;

/**
 * Stage 0 → silver square sprout
 * Stage 1 → Toast1.svg, Stage 2 → Toast2.svg, etc.
 */
const TOAST_STAGE_IMAGES = [
  null,                          // stage 0: drawn inline
  '/toast-flowers/Toast1.svg',  // stage 1
  '/toast-flowers/Toast2.svg',  // stage 2
  '/toast-flowers/Toast3.svg',  // stage 3
  '/toast-flowers/Toast4.svg',  // stage 4
  '/toast-flowers/Toast4.svg',  // stage 5 (fully bloomed, reuse last)
] as const;

/** Small silver square with two green leaves, shown at level score 0. */
function ToastSprout({ scale }: { scale: number }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* left leaf */}
      <ellipse cx={-7} cy={-18} rx={5} ry={2.5} fill="#6abf69" transform="rotate(-35 -7 -18)" />
      {/* right leaf */}
      <ellipse cx={7} cy={-20} rx={5} ry={2.5} fill="#8ed98e" transform="rotate(35 7 -20)" />
      {/* silver square body */}
      <rect
        x={-9}
        y={-32}
        width={18}
        height={18}
        rx={2}
        fill="#d4d8dd"
        stroke="#a8b0b8"
        strokeWidth={1.2}
      />
      {/* subtle shine */}
      <rect x={-6} y={-30} width={5} height={3} rx={1} fill="#eef0f2" opacity={0.8} />
    </g>
  );
}

interface ToastFlowerPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

export function ToastFlowerPlant({
  growthStage,
  x = 200,
  className = '',
}: ToastFlowerPlantProps) {
  const clipId = useId();
  const metrics = getSeedGrowthMetrics(growthStage);
  const scale = TOAST_BASE_SCALE * metrics.scale;
  const src = TOAST_STAGE_IMAGES[growthStage] ?? null;

  const clipHeight = GARDEN_CELL_VIEW_HEIGHT / GARDEN_PLANT_SCALE;
  const clipHalfW = (TOAST_WIDTH * scale) / 2 + 2;

  if (src === null) {
    return (
      <g
        className={`toast-flower-plant${className ? ` ${className}` : ''}`}
        transform={getGardenPlantRootTransform(x)}
        aria-hidden
      >
        <ToastSprout scale={metrics.scale} />
      </g>
    );
  }

  return (
    <g
      className={`toast-flower-plant${className ? ` ${className}` : ''}`}
      transform={getGardenPlantRootTransform(x)}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={-clipHalfW}
            y={-clipHeight}
            width={clipHalfW * 2}
            height={clipHeight}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g transform={`scale(${scale})`}>
          <image
            href={src}
            x={-TOAST_WIDTH / 2}
            y={-TOAST_HEIGHT}
            width={TOAST_WIDTH}
            height={TOAST_HEIGHT}
            preserveAspectRatio="xMidYMax meet"
          />
        </g>
      </g>
    </g>
  );
}
