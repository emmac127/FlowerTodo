import {
  GARDEN_CELL_INNER_WIDTH,
  getGardenPlantRootTransform,
} from '../lib/plantedGarden';
import {
  getSeedGrowthMetrics,
  type SeedGrowthStage,
  type SeedPalette,
} from '../lib/seedGrowth';

const JAR_SPACING = 24;
const JAR_WIDTH = 22;
const JAM_ROW_WIDTH_FRACTION = 0.9;

/** Each growth stage adds another jam jar with a different flower color. */
const JAM_JAR_PALETTES: readonly {
  jar: string;
  lid: string;
  flower: SeedPalette;
}[] = [
  {
    jar: '#f5e6d3',
    lid: '#c45c8a',
    flower: {
      stem: '#5cb85c',
      leaf: '#8ed98e',
      bud: '#ffb7d5',
      budStroke: '#ff6b9d',
      petals: '#ffb7d5',
      center: '#ffe566',
    },
  },
  {
    jar: '#e8f4ff',
    lid: '#6b9fd4',
    flower: {
      stem: '#5a7a4a',
      leaf: '#8ed98e',
      bud: '#c9b8ff',
      budStroke: '#9b7fd4',
      petals: '#c9b8ff',
      center: '#fff8c8',
    },
  },
  {
    jar: '#fff0e8',
    lid: '#e8a030',
    flower: {
      stem: '#4d8f3c',
      leaf: '#8ed98e',
      bud: '#ffe566',
      budStroke: '#e8b830',
      petals: '#ffe566',
      center: '#ff9f43',
    },
  },
  {
    jar: '#f0ffe8',
    lid: '#5cb85c',
    flower: {
      stem: '#5cb85c',
      leaf: '#8ed98e',
      bud: '#ff8fab',
      budStroke: '#ff6b9d',
      petals: '#ff8fab',
      center: '#fff4a3',
    },
  },
  {
    jar: '#faf0ff',
    lid: '#9b7fd4',
    flower: {
      stem: '#6b5a9a',
      leaf: '#c9b8ff',
      bud: '#d4e4f8',
      budStroke: '#8aa8c8',
      petals: '#d4e4f8',
      center: '#f0f6ff',
    },
  },
  {
    jar: '#fff8ee',
    lid: '#ff9f43',
    flower: {
      stem: '#5a4a3a',
      leaf: '#ff9f43',
      bud: '#ffcc66',
      budStroke: '#ff6b35',
      petals: '#ffcc66',
      center: '#fff4a3',
    },
  },
];

function JamJarBloom({ palette, bloomScale }: { palette: SeedPalette; bloomScale: number }) {
  const petalCount = 5;
  const petalAngles = Array.from({ length: petalCount }, (_, i) => (360 / petalCount) * i);
  return (
    <g transform={`scale(${bloomScale})`}>
      {petalAngles.map((angle) => (
        <ellipse
          key={angle}
          cx={0}
          cy={-5}
          rx={2.8}
          ry={4.5}
          fill={palette.petals}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r={2.2} fill={palette.center} />
    </g>
  );
}

function JamJar({
  x,
  style,
  bloomScale,
}: {
  x: number;
  style: (typeof JAM_JAR_PALETTES)[number];
  bloomScale: number;
}) {
  const { jar, lid, flower } = style;
  return (
    <g transform={`translate(${x}, 0)`}>
      <path
        d="M -9 0 L -10.5 -20 Q -10.5 -24 0 -24 Q 10.5 -24 10.5 -20 L 9 0 Z"
        fill={jar}
        stroke="#a08060"
        strokeWidth={0.7}
      />
      <ellipse cx={0} cy={-24} rx={11} ry={3.5} fill={lid} stroke="#8b6914" strokeWidth={0.5} />
      <line
        x1={0}
        y1={-24}
        x2={0}
        y2={-32}
        stroke={flower.stem}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <ellipse
        cx={-4}
        cy={-18}
        rx={3}
        ry={1.8}
        fill={flower.leaf}
        transform="rotate(-25 -4 -18)"
      />
      <g transform="translate(0, -34)">
        <JamJarBloom palette={flower} bloomScale={bloomScale} />
      </g>
    </g>
  );
}

interface JamFlowerPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
}

export function JamFlowerPlant({
  growthStage,
  x = 200,
  className = '',
}: JamFlowerPlantProps) {
  const metrics = getSeedGrowthMetrics(growthStage);
  const jarCount = Math.min(growthStage + 1, JAM_JAR_PALETTES.length);
  const bloomScale = 0.55 + metrics.scale * 0.35;
  const rowWidth = (jarCount - 1) * JAR_SPACING;
  const naturalWidth = rowWidth + JAR_WIDTH;
  const maxRowWidth = GARDEN_CELL_INNER_WIDTH * JAM_ROW_WIDTH_FRACTION;
  const rowFit = naturalWidth > maxRowWidth ? maxRowWidth / naturalWidth : 1;
  const groupScale = metrics.scale * rowFit;
  const startX = -rowWidth / 2;

  return (
    <g
      className={`jam-flower-plant${className ? ` ${className}` : ''}`}
      transform={getGardenPlantRootTransform(x)}
      aria-hidden
    >
      <g
        style={{ transform: `scale(${groupScale})`, transformOrigin: '0px 0px' }}
      >
        {Array.from({ length: jarCount }, (_, i) => (
          <JamJar
            key={i}
            x={startX + i * JAR_SPACING}
            style={JAM_JAR_PALETTES[i]!}
            bloomScale={bloomScale}
          />
        ))}
      </g>
    </g>
  );
}
