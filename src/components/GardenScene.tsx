import { useEffect, useMemo, useRef, useState } from 'react';
import { GardenFlowerStrip } from './GardenFlowerStrip';
import { GardenSceneCanvas } from './GardenSceneCanvas';
import { buildGardenSceneInstances } from '../lib/garden/buildScene';
import { getGardenLayers, getSceneMilestoneCount } from '../lib/gardenProgress';
import { getGardenLevel } from '../lib/plantedGarden';
import type { PlacedElement } from '../lib/garden/types';

interface GardenSceneProps {
  completedCount: number;
  /** Editor: render this element list instead of the gameplay scene. */
  elementsOverride?: PlacedElement[] | null;
  /** Editor: enable selection + dragging on the canvas. */
  editable?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
}

export function GardenScene({
  completedCount,
  elementsOverride = null,
  editable = false,
  selectedId = null,
  onSelectElement,
  onElementDrag,
}: GardenSceneProps) {
  const bandRef = useRef<HTMLDivElement>(null);
  const [bandHeight, setBandHeight] = useState(280);

  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);
  const activeLevel = getGardenLevel(completedCount);

  const gameplayElements = useMemo(
    () => buildGardenSceneInstances(completedCount),
    [completedCount],
  );
  const elements = elementsOverride ?? gameplayElements;

  const newestId = useMemo(() => {
    if (editable || gameplayElements.length === 0) return null;
    return gameplayElements[gameplayElements.length - 1]!.id;
  }, [editable, gameplayElements]);

  const showGrass = layers.grass || activeLevel >= 1 || editable;

  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const update = () => setBandHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={`garden-scene${editable ? ' garden-scene--editable' : ''}`}
      aria-hidden={!editable}
    >
      <div className="garden-scene__sky" />

      {showGrass && (
        <div className={`garden-layer garden-layer--grass stage-${stage}`} />
      )}

      <div className="garden-scene__band" ref={bandRef}>
        <GardenFlowerStrip autoScrollKey={completedCount} freeScroll={editable}>
          <GardenSceneCanvas
            elements={elements}
            bandHeight={bandHeight}
            newestId={newestId}
            editable={editable}
            selectedId={selectedId}
            onSelectElement={onSelectElement}
            onElementDrag={onElementDrag}
          />
        </GardenFlowerStrip>
      </div>

      {!editable && elements.length === 0 && (
        <p className="garden-scene__hint">Complete tasks to plant your garden…</p>
      )}
    </div>
  );
}
