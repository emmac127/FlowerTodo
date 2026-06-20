import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GardenFlowerStrip } from './GardenFlowerStrip';
import { GardenSceneCanvas, gardenHeadroomPx } from './GardenSceneCanvas';
import { buildGardenSceneInstances } from '../lib/garden/buildScene';
import { useAppVariant, useGardenConfig } from '../context/AppVariantContext';
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
  const variant = useAppVariant();
  const gardenConfig = useGardenConfig();
  const bandRef = useRef<HTMLDivElement>(null);
  const [bandHeight, setBandHeight] = useState(0);
  const [bandReady, setBandReady] = useState(false);
  /** Completion count through which scroll has been synced (hides newest until caught up). */
  const [scrollSyncedForCount, setScrollSyncedForCount] =
    useState(completedCount);
  /** Newest asset has a measured display height (avoids fallback-size flash). */
  const [newestSizeReady, setNewestSizeReady] = useState(true);
  const prevCompletedCountRef = useRef(completedCount);

  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);
  const activeLevel = getGardenLevel(completedCount, gardenConfig);

  const gameplayScene = useMemo(
    () => buildGardenSceneInstances(completedCount, gardenConfig),
    [completedCount, gardenConfig],
  );
  const elements = elementsOverride ?? gameplayScene.elements;
  const gameplayNewestId = gameplayScene.newestId;
  const awaitingNewestReveal =
    !editable &&
    gameplayNewestId != null &&
    (scrollSyncedForCount < completedCount || !newestSizeReady);
  const newestId =
    editable || awaitingNewestReveal ? null : gameplayNewestId;
  const scrollFocusX = editable ? 0 : gameplayScene.scrollFocusX;

  const isDadMoon = variant === 'dad';
  const showGround =
    editable || (isDadMoon ? completedCount > 0 : layers.grass || activeLevel >= 1);

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
    }
  }, [completedCount, scrollSyncedForCount]);

  useEffect(() => {
    if (completedCount > prevCompletedCountRef.current) {
      setNewestSizeReady(false);
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount]);

  const handleFocusScrollReady = useCallback(() => {
    if (editable) return;
    setScrollSyncedForCount(completedCount);
  }, [editable, completedCount]);

  const handleNewestDisplaySizeReady = useCallback(() => {
    setNewestSizeReady(true);
  }, []);

  const sceneStyle = {
    '--garden-headroom-px': `${gardenHeadroomPx(bandHeight, gardenConfig.designHeight)}px`,
  } as CSSProperties;

  return (
    <div
      className={`garden-scene${editable ? ' garden-scene--editable' : ''}${isDadMoon ? ' garden-scene--moon' : ''}`}
      style={sceneStyle}
      aria-hidden={!editable}
    >
      <div className="garden-scene__sky" />

      {showGround && (
        <div
          className={`garden-layer ${isDadMoon ? 'garden-layer--moon' : 'garden-layer--grass'} stage-${stage}`}
        />
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
            designWidth={gardenConfig.designWidth}
            designHeight={gardenConfig.designHeight}
            stageHeight={gardenConfig.stageHeight}
            newestId={newestId}
            awaitingNewestReveal={awaitingNewestReveal}
            gameplayNewestId={editable ? null : gameplayNewestId}
            editable={editable}
            placementStars={isDadMoon && !editable}
            selectedId={selectedId}
            levelMoveLevel={levelMoveLevel}
            onSelectElement={onSelectElement}
            onElementDrag={onElementDrag}
            onNewestDisplaySizeReady={handleNewestDisplaySizeReady}
          />
        </GardenFlowerStrip>
      </div>

      {!editable && elements.length === 0 && (
        <p className="garden-scene__hint">
          {isDadMoon
            ? 'Complete tasks to explore the moon…'
            : 'Complete tasks to plant your garden…'}
        </p>
      )}
    </div>
  );
}
