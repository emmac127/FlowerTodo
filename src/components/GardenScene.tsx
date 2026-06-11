import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GardenFlowerStrip } from './GardenFlowerStrip';
import { GardenSceneCanvas, gardenHeadroomPx } from './GardenSceneCanvas';
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
  levelMoveLevel?: number | null;
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
}

export function GardenScene({
  completedCount,
  elementsOverride = null,
  editable = false,
  selectedId = null,
  levelMoveLevel = null,
  onSelectElement,
  onElementDrag,
}: GardenSceneProps) {
  const bandRef = useRef<HTMLDivElement>(null);
  const [bandHeight, setBandHeight] = useState(0);
  const [bandReady, setBandReady] = useState(false);
  /** Completion count through which scroll has been synced (hides newest until caught up). */
  const [scrollSyncedForCount, setScrollSyncedForCount] =
    useState(completedCount);

  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);
  const activeLevel = getGardenLevel(completedCount);

  const gameplayScene = useMemo(
    () => buildGardenSceneInstances(completedCount),
    [completedCount],
  );
  const elements = elementsOverride ?? gameplayScene.elements;
  const gameplayNewestId = gameplayScene.newestId;
  const awaitingNewestReveal =
    !editable && completedCount > scrollSyncedForCount;
  const newestId =
    editable || awaitingNewestReveal ? null : gameplayNewestId;
  const scrollFocusX = editable ? 0 : gameplayScene.scrollFocusX;

  const showGrass = layers.grass || activeLevel >= 1 || editable;

  useLayoutEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      if (h > 0) {
        setBandHeight(h);
        setBandReady(true);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (completedCount < scrollSyncedForCount) {
      setScrollSyncedForCount(completedCount);
      return;
    }
    if (editable || completedCount <= scrollSyncedForCount) return;
    const id = requestAnimationFrame(() => {
      setScrollSyncedForCount(completedCount);
    });
    return () => cancelAnimationFrame(id);
  }, [completedCount, scrollSyncedForCount, editable]);

  const handleFocusScrollReady = useCallback(() => {
    if (editable) return;
    setScrollSyncedForCount(completedCount);
  }, [editable, completedCount]);

  const sceneStyle = {
    '--garden-headroom-px': `${gardenHeadroomPx(bandHeight)}px`,
  } as CSSProperties;

  return (
    <div
      className={`garden-scene${editable ? ' garden-scene--editable' : ''}`}
      style={sceneStyle}
      aria-hidden={!editable}
    >
      <div className="garden-scene__sky" />

      {showGrass && (
        <div className={`garden-layer garden-layer--grass stage-${stage}`} />
      )}

      <div className="garden-scene__band" ref={bandRef}>
        <GardenFlowerStrip
          autoScrollKey={completedCount}
          scrollFocusX={scrollFocusX}
          freeScroll={editable}
          placeMode={
            editable && selectedId != null && levelMoveLevel == null
          }
          onFocusScrollReady={handleFocusScrollReady}
        >
          <GardenSceneCanvas
            elements={elements}
            bandHeight={bandHeight}
            bandReady={bandReady}
            newestId={newestId}
            awaitingNewestReveal={awaitingNewestReveal}
            gameplayNewestId={editable ? null : gameplayNewestId}
            editable={editable}
            selectedId={selectedId}
            levelMoveLevel={levelMoveLevel}
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
