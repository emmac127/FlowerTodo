import { useMemo } from 'react';
import type { Task } from '../hooks/useTasks';
import { getGardenLayers, getSceneMilestoneCount } from '../lib/gardenProgress';
import { buildPlantedFlowers } from '../lib/plantedGarden';
import { CssDoodle } from './CssDoodle';
import { PlantedFlower } from './PlantedFlower';

interface GardenSceneProps {
  tasks: Task[];
  completedCount: number;
  newlyPlantedIndex?: number | null;
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
  tasks,
  completedCount,
  newlyPlantedIndex = null,
}: GardenSceneProps) {
  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const plantedFlowers = useMemo(() => buildPlantedFlowers(tasks), [tasks]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);

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

      <svg
        className="garden-svg garden-svg--planted"
        viewBox="0 0 400 120"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <g className="garden-planted-flowers">
          {plantedFlowers.map((spec) => (
            <PlantedFlower
              key={spec.completionIndex}
              spec={spec}
              isNew={spec.completionIndex === newlyPlantedIndex}
            />
          ))}
        </g>
      </svg>

      {plantedFlowers.length === 0 && (
        <p className="garden-scene__hint">Complete tasks to plant your garden…</p>
      )}
    </div>
  );
}
