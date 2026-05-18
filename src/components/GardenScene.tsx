import { useMemo } from 'react';
import { getGardenLayers, getSceneMilestoneCount } from '../lib/gardenProgress';
import { getGardenCycleProgress } from '../lib/plantedGarden';
import { getSeedGrowthStage } from '../lib/seedGrowth';
import type { StartingSeed } from '../lib/startingSeed';
import { CssDoodle } from './CssDoodle';
import { GrowingSeedPlant } from './GrowingSeedPlant';

interface GardenSceneProps {
  completedCount: number;
  startingSeed?: StartingSeed | null;
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

export function GardenScene({
  completedCount,
  startingSeed = null,
}: GardenSceneProps) {
  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);
  const growthStage = getSeedGrowthStage(completedCount);
  const cycleProgress = getGardenCycleProgress(completedCount);
  const showGrowingSeed = startingSeed != null;
  const showGrass = layers.grass || showGrowingSeed;

  return (
    <div className="garden-scene" aria-hidden>
      <div className="garden-scene__sky" />

      {showGrass && (
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

      <svg
        className="garden-svg garden-svg--planted"
        viewBox="0 0 400 120"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <g className="garden-growing-seed">
          {showGrowingSeed && (
            <GrowingSeedPlant seed={startingSeed} growthStage={growthStage} />
          )}
        </g>
      </svg>

      {!startingSeed && (
        <p className="garden-scene__hint">Complete tasks to plant your garden…</p>
      )}

      {startingSeed && cycleProgress.planted === 0 && (
        <p className="garden-scene__hint garden-scene__hint--seed">
          Complete tasks to help your seed grow…
        </p>
      )}
    </div>
  );
}
