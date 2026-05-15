import { useMemo } from 'react';
import { getGardenLayers } from '../lib/gardenProgress';
import { CssDoodle } from './CssDoodle';
import {
  GardenSakuraTree,
  getTreeGrowth,
  SAKURA_TREE_H,
  SAKURA_TREE_W,
} from './GardenSakuraTree';

interface GardenSceneProps {
  completedCount: number;
}

const GRASS_DOODLE = `
  :doodle {
    @grid: 24x3 / 100% 100%;
    background: linear-gradient(#b8e8a8 0%, #8ed98e 55%, #6bc96b 100%);
  }
  @size: 100%;
  background: @pn(
    radial-gradient(@wc(h) @wc(h) at @r(100%) @r(100%), #7dd87d 0%, transparent 70%),
    radial-gradient(@wc(h) @wc(h) at @r(100%) @r(100%), #a8f0a0 0%, transparent 65%)
  );
  opacity: @r(.35, .75);
`;

const PETALS_DOODLE = `
  :doodle {
    @grid: 14x10 / 100% 100%;
  }
  @size: 2px 7px;
  background: @p(#ffb7d5, #ffd6e8, #fff, #fff4a3);
  border-radius: 50%;
  transform: rotate(@r(360deg));
  opacity: @r(.35, .9);
`;

const WATER_DOODLE = `
  :doodle {
    @grid: 8x2 / 100% 100%;
    background: linear-gradient(#9ad4f5 0%, #6ec8e8 100%);
  }
  @size: 100%;
  background: radial-gradient(ellipse at @r(100%) @r(100%), rgba(255,255,255,.4) 0%, transparent 55%);
  opacity: @r(.15, .45);
`;

const GROUND_FLOWERS: { x: number; y: number; petals: string; center: string }[] = [
  { x: 42, y: 98, petals: '#ffb7d5', center: '#ffe566' },
  { x: 95, y: 104, petals: '#fff4a3', center: '#ff9f43' },
  { x: 155, y: 100, petals: '#d4b5ff', center: '#ffe566' },
  { x: 210, y: 106, petals: '#ffc9a8', center: '#ff8fab' },
  { x: 268, y: 98, petals: '#ffb7d5', center: '#ffe566' },
  { x: 330, y: 102, petals: '#a8f0d4', center: '#ffb7d5' },
];

function GroundFlower({
  x,
  y,
  petals,
  center,
}: {
  x: number;
  y: number;
  petals: string;
  center: string;
}) {
  return (
    <g className="garden-ground-flower" transform={`translate(${x}, ${y})`}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx={0}
          cy={-7}
          rx={5}
          ry={7}
          fill={petals}
          stroke="#fff"
          strokeWidth={1}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r={4} fill={center} stroke="#fff" strokeWidth={1} />
    </g>
  );
}

export function GardenScene({ completedCount }: GardenSceneProps) {
  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const treeGrowth = getTreeGrowth(layers);
  const stage = Math.min(completedCount, 12);

  return (
    <div className="garden-scene" aria-hidden>
      <div className="garden-scene__sky" />

      {layers.grass && (
        <div className={`garden-layer garden-layer--grass stage-${stage}`}>
          <CssDoodle className="garden-doodle garden-doodle--grass">{GRASS_DOODLE}</CssDoodle>
        </div>
      )}

      {layers.grassDetail && (
        <div className={`garden-layer garden-layer--tufts stage-${stage}`}>
          <span className="grass-tuft grass-tuft--1" />
          <span className="grass-tuft grass-tuft--2" />
          <span className="grass-tuft grass-tuft--3" />
          <span className="grass-tuft grass-tuft--4" />
        </div>
      )}

      {layers.pond && (
        <div className={`garden-layer garden-layer--pond stage-${stage}`}>
          <CssDoodle className="garden-doodle garden-doodle--water">{WATER_DOODLE}</CssDoodle>
        </div>
      )}

      <svg className="garden-svg" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet">
        {layers.bridgePiers && (
          <g className={`garden-bridge-piers stage-${stage}`}>
            <rect x="118" y="68" width="8" height="32" rx="2" fill="#c49a6c" />
            <rect x="274" y="68" width="8" height="32" rx="2" fill="#c49a6c" />
          </g>
        )}

        {layers.bridgeDeck && (
          <g className={`garden-bridge stage-${stage}`}>
            <path
              d="M 100 72 Q 200 48 300 72 L 300 78 Q 200 56 100 78 Z"
              fill="#e8b88a"
              stroke="#c49a6c"
              strokeWidth="2"
            />
            <path
              d="M 108 74 Q 200 54 292 74"
              fill="none"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line x1="140" y1="66" x2="140" y2="76" stroke="#c49a6c" strokeWidth="2" />
            <line x1="200" y1="58" x2="200" y2="74" stroke="#c49a6c" strokeWidth="2" />
            <line x1="260" y1="66" x2="260" y2="76" stroke="#c49a6c" strokeWidth="2" />
          </g>
        )}

        {layers.lanterns && (
          <g className="garden-lanterns">
            <rect x="136" y="58" width="10" height="14" rx="2" fill="#ff8fab" />
            <rect x="254" y="58" width="10" height="14" rx="2" fill="#ff8fab" />
            <ellipse cx="141" cy="56" rx="6" ry="3" fill="#ffb7d5" />
            <ellipse cx="259" cy="56" rx="6" ry="3" fill="#ffb7d5" />
          </g>
        )}

        {layers.extraLanterns && (
          <g className="garden-lanterns-extra">
            <rect x="168" y="52" width="8" height="12" rx="2" fill="#ff8fab" opacity="0.9" />
            <rect x="224" y="52" width="8" height="12" rx="2" fill="#ff8fab" opacity="0.9" />
          </g>
        )}

        {layers.bushLeft && (
          <g className="garden-bush garden-bush--left">
            <ellipse cx="28" cy="88" rx="22" ry="14" fill="#7dd87d" stroke="#5cb85c" strokeWidth="2" />
            <ellipse cx="20" cy="82" rx="14" ry="10" fill="#8ed98e" />
            <ellipse cx="36" cy="80" rx="12" ry="9" fill="#a8f0a0" />
          </g>
        )}

        {layers.bushRight && (
          <g className="garden-bush garden-bush--right">
            <ellipse cx="372" cy="90" rx="20" ry="13" fill="#7dd87d" stroke="#5cb85c" strokeWidth="2" />
            <ellipse cx="380" cy="84" rx="13" ry="9" fill="#8ed98e" />
          </g>
        )}

        {GROUND_FLOWERS.slice(0, layers.groundFlowers).map((f) => (
          <GroundFlower key={`${f.x}-${f.y}`} {...f} />
        ))}
      </svg>

      {treeGrowth > 0 && (
        <svg
          className="garden-svg garden-svg--tree"
          viewBox={`0 0 ${SAKURA_TREE_W} ${SAKURA_TREE_H}`}
          preserveAspectRatio="xMaxYMax meet"
          aria-hidden
        >
          <GardenSakuraTree
            growth={treeGrowth}
            className={`garden-sakura-tree stage-${stage}`}
          />
        </svg>
      )}

      {layers.petals && (
        <div className="garden-layer garden-layer--petals">
          <CssDoodle className="garden-doodle garden-doodle--petals">{PETALS_DOODLE}</CssDoodle>
        </div>
      )}

      {completedCount === 0 && (
        <p className="garden-scene__hint">Complete tasks to grow your garden…</p>
      )}
    </div>
  );
}
