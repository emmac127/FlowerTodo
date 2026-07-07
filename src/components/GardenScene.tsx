import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GardenFlowerStrip } from './GardenFlowerStrip';
import { GardenSceneCanvas, gardenHeadroomPx } from './GardenSceneCanvas';
import { buildGardenSceneInstances, findLevelStartDeliveryElement, findLevelStartPendingElements } from '../lib/garden/buildScene';
import { useAppVariant, useGardenConfig } from '../context/AppVariantContext';
import { filterSurfacesForProgress } from '../lib/garden/surfaces';
import { isSurfaceEditorId } from '../lib/garden/surfaceEditorIds';
import { getGardenLayers, getSceneMilestoneCount } from '../lib/gardenProgress';
import { getGardenLevel } from '../lib/plantedGarden';
import type { PlacedElement } from '../lib/garden/types';

interface GardenSceneProps {
  completedCount: number;
  /** Override config for mode1/mode2 phase switching. */
  gardenConfigOverride?: import('../lib/garden/loadConfig').GardenConfig;
  /** Fade transition during mode2 unlock. */
  gardenFadePhase?: 'mode1' | 'mode2' | 'none';
  /** Editor: hop/food surface rectangles. */
  editorSurfaces?: import('../lib/garden/types').SurfacesConfig;
  surfaceTool?: 'hop' | 'food' | null;
  onAddSurfaceRect?: (
    kind: 'hop' | 'food',
    rect: import('../lib/garden/types').SurfaceRect,
  ) => void;
  onUpdateSurfaceRect?: (
    kind: 'hop' | 'food',
    id: string,
    rect: import('../lib/garden/types').SurfaceRect,
  ) => void;
  selectedSurface?: { kind: 'hop' | 'food'; id: string } | null;
  onSelectSurface?: (surface: { kind: 'hop' | 'food'; id: string } | null) => void;
  collisionBoxTool?: boolean;
  onSetCollisionBox?: (birdId: string, box: import('../lib/garden/types').BirdCollisionBox) => void;
  /** Editor: render this element list instead of the gameplay scene. */
  elementsOverride?: PlacedElement[] | null;
  /** Editor: enable selection + dragging on the canvas. */
  editable?: boolean;
  selectedId?: string | null;
  levelMoveLevel?: number | null;
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
  /** Hide mascot carry-in during unlock overlays (level-up gift box, mode2 onboarding). */
  suppressMascotDelivery?: boolean;
  /** True while the per-level unlock gift-box overlay is showing. */
  levelUnlockActive?: boolean;
}

export function GardenScene({
  completedCount,
  gardenConfigOverride,
  gardenFadePhase = 'none',
  editorSurfaces,
  surfaceTool = null,
  onAddSurfaceRect,
  onUpdateSurfaceRect,
  selectedSurface = null,
  onSelectSurface,
  collisionBoxTool = false,
  onSetCollisionBox,
  elementsOverride = null,
  editable = false,
  selectedId = null,
  levelMoveLevel = null,
  onSelectElement,
  onElementDrag,
  suppressMascotDelivery = false,
  levelUnlockActive = false,
}: GardenSceneProps) {
  const variant = useAppVariant();
  const contextConfig = useGardenConfig();
  const gardenConfig = gardenConfigOverride ?? contextConfig;
  const bandRef = useRef<HTMLDivElement>(null);
  const [bandHeight, setBandHeight] = useState(0);
  const [bandReady, setBandReady] = useState(false);
  /** Completion count through which scroll has been synced (hides newest until caught up). */
  const [scrollSyncedForCount, setScrollSyncedForCount] =
    useState(completedCount);
  /** Completion count for which the newest asset display size is known. */
  const [sizeReadyForCount, setSizeReadyForCount] = useState(completedCount);
  const prevCompletedCountRef = useRef(completedCount);
  const prevLevelUnlockActiveRef = useRef(levelUnlockActive);
  const [dadDeliveryId, setDadDeliveryId] = useState<string | null>(null);
  const [dadDeliveryDropped, setDadDeliveryDropped] = useState(false);

  const gameplaySurfaces = useMemo(() => {
    if (editable || !gardenConfig.surfacesConfig) return undefined;
    return filterSurfacesForProgress(
      gardenConfig.surfacesConfig,
      completedCount,
      gardenConfig,
    );
  }, [editable, gardenConfig, completedCount]);

  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = getSceneMilestoneCount(completedCount);
  const activeLevel = getGardenLevel(completedCount, gardenConfig);

  const gameplayScene = useMemo(
    () => buildGardenSceneInstances(completedCount, gardenConfig),
    [completedCount, gardenConfig],
  );
  const elements = elementsOverride ?? gameplayScene.elements;
  const gameplayNewestId = gameplayScene.newestId;
  const newestElement = gameplayNewestId
    ? gameplayScene.elements.find((el) => el.id === gameplayNewestId)
    : null;
  const newestIsBird = newestElement?.birdBehavior != null;
  const isDadMoon = variant === 'dad';
  const isMode2Garden = !isDadMoon && gardenConfig.phase === 'mode2';
  const pinViewport = isDadMoon && !editable;
  const awaitingNewestReveal =
    !editable &&
    gameplayNewestId != null &&
    (!bandReady ||
      (!pinViewport && scrollSyncedForCount < completedCount) ||
      (!newestIsBird && sizeReadyForCount < completedCount));
  const dadDeliveryActive =
    !editable &&
    dadDeliveryId != null &&
    elements.some((el) => el.id === dadDeliveryId);
  const dadDeliveryAwaitingDrop = dadDeliveryActive && !dadDeliveryDropped;
  const awaitingReveal =
    awaitingNewestReveal || dadDeliveryAwaitingDrop;
  const newestId =
    editable || awaitingReveal ? null : gameplayNewestId;
  const deliveryFocusElement = dadDeliveryActive
    ? elements.find((el) => el.id === dadDeliveryId)
    : null;
  const scrollFocusX = editable
    ? 0
    : (deliveryFocusElement?.x ?? gameplayScene.scrollFocusX);

  const deliveryHeldElements = useMemo(() => {
    if (!dadDeliveryAwaitingDrop || completedCount <= 0 || elementsOverride) {
      return [];
    }
    const prev = buildGardenSceneInstances(completedCount - 1, gardenConfig);
    const currentIds = new Set(gameplayScene.elements.map((el) => el.id));
    return prev.elements.filter((el) => !currentIds.has(el.id));
  }, [
    dadDeliveryAwaitingDrop,
    completedCount,
    elementsOverride,
    gardenConfig,
    gameplayScene.elements,
  ]);

  const levelUnlockHiddenIds = useMemo(() => {
    if (!levelUnlockActive || editable || elementsOverride) return null;
    const pending = findLevelStartPendingElements(completedCount, gardenConfig);
    if (pending.length === 0) return null;
    return new Set(pending.map((el) => el.id));
  }, [
    levelUnlockActive,
    editable,
    elementsOverride,
    completedCount,
    gardenConfig,
  ]);

  const canvasElements = useMemo(() => {
    if (elementsOverride) return elements;
    let list = elements;
    if (levelUnlockHiddenIds) {
      list = list.filter((el) => !levelUnlockHiddenIds.has(el.id));
    }
    if (deliveryHeldElements.length === 0) return list;
    return [...list, ...deliveryHeldElements].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
  }, [elements, elementsOverride, deliveryHeldElements, levelUnlockHiddenIds]);

  const showGround =
    editable || (isDadMoon ? completedCount > 0 : layers.grass || activeLevel >= 1);

  useLayoutEffect(() => {
    if (pinViewport) {
      setScrollSyncedForCount(completedCount);
    }
  }, [pinViewport, completedCount]);

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
    if (completedCount < sizeReadyForCount) {
      setSizeReadyForCount(completedCount);
    }
  }, [completedCount, sizeReadyForCount]);

  useEffect(() => {
    if (suppressMascotDelivery) {
      setDadDeliveryId(null);
      setDadDeliveryDropped(false);
    }
  }, [suppressMascotDelivery]);

  useEffect(() => {
    const wasActive = prevLevelUnlockActiveRef.current;
    prevLevelUnlockActiveRef.current = levelUnlockActive;
    if (wasActive && !levelUnlockActive && !editable) {
      const levelStart = findLevelStartDeliveryElement(
        completedCount,
        gardenConfig,
      );
      if (levelStart) {
        setDadDeliveryId(levelStart.id);
        setDadDeliveryDropped(false);
      }
    }
  }, [levelUnlockActive, editable, completedCount, gardenConfig]);

  useLayoutEffect(() => {
    if (completedCount > prevCompletedCountRef.current) {
      if (!editable && !suppressMascotDelivery && gameplayNewestId) {
        const newest = gameplayScene.elements.find(
          (el) => el.id === gameplayNewestId,
        );
        const skipDelivery = isDadMoon && newest != null && newest.level <= 1;
        if (newest && !skipDelivery) {
          setDadDeliveryId(gameplayNewestId);
          setDadDeliveryDropped(false);
        }
      }
    }
    if (completedCount < prevCompletedCountRef.current) {
      setDadDeliveryId(null);
      setDadDeliveryDropped(false);
    }
    prevCompletedCountRef.current = completedCount;
  }, [
    completedCount,
    editable,
    suppressMascotDelivery,
    gameplayNewestId,
    gameplayScene.elements,
    isDadMoon,
  ]);

  const handleDadDeliveryDrop = useCallback(() => {
    setDadDeliveryDropped(true);
  }, []);

  const handleDadDeliveryComplete = useCallback(() => {
    setDadDeliveryId(null);
    setDadDeliveryDropped(false);
  }, []);

  const handleFocusScrollReady = useCallback(() => {
    if (editable) return;
    setScrollSyncedForCount(completedCount);
  }, [editable, completedCount]);

  const handleNewestDisplaySizeReady = useCallback(() => {
    setSizeReadyForCount(completedCount);
  }, [completedCount]);

  const sceneStyle = {
    '--garden-headroom-px': `${gardenHeadroomPx(bandHeight, gardenConfig.designHeight)}px`,
  } as CSSProperties;

  return (
    <div
      className={`garden-scene${editable ? ' garden-scene--editable' : ''}${isDadMoon ? ' garden-scene--moon' : ''}${isMode2Garden ? ' garden-scene--mode2' : ''}${gardenFadePhase === 'mode1' ? ' garden-scene--fade-out' : ''}${gardenFadePhase === 'mode2' ? ' garden-scene--fade-in' : ''}`}
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
          lockScrollLeft={pinViewport}
          placeMode={
            editable &&
            selectedId != null &&
            !isSurfaceEditorId(selectedId) &&
            levelMoveLevel == null
          }
          onFocusScrollReady={handleFocusScrollReady}
        >
          <GardenSceneCanvas
            elements={canvasElements}
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
            moonGround={isDadMoon && showGround}
            dustMotes={isDadMoon}
            lockScrollLeft={pinViewport}
            dadDeliveryElement={
              dadDeliveryActive
                ? canvasElements.find((el) => el.id === dadDeliveryId) ?? null
                : null
            }
            dadDeliveryAwaitingDrop={dadDeliveryAwaitingDrop}
            onDadDeliveryDrop={handleDadDeliveryDrop}
            onDadDeliveryComplete={handleDadDeliveryComplete}
            selectedId={selectedId}
            levelMoveLevel={levelMoveLevel}
            onSelectElement={onSelectElement}
            onElementDrag={onElementDrag}
            onNewestDisplaySizeReady={handleNewestDisplaySizeReady}
            editorSurfaces={editorSurfaces}
            gameplaySurfaces={gameplaySurfaces}
            surfaceTool={surfaceTool}
            onAddSurfaceRect={onAddSurfaceRect}
            onUpdateSurfaceRect={onUpdateSurfaceRect}
            selectedSurface={selectedSurface}
            onSelectSurface={onSelectSurface}
            collisionBoxTool={collisionBoxTool}
            onSetCollisionBox={onSetCollisionBox}
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
