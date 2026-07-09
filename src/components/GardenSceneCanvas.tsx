import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  defaultGardenConfig,
  GARDEN_HEADROOM_TOP,
} from '../lib/garden/loadConfig';
import type { BirdCollisionBox, PlacedElement, SurfaceRect } from '../lib/garden/types';
import { surfaceUnlockLevel } from '../lib/garden/surfaces';
import {
  collisionBoxFromWorldRect,
  worldBirdCollisionRect,
} from '../lib/garden/birdCollision';
import { isSurfaceEditorId } from '../lib/garden/surfaceEditorIds';
import {
  hitCornerHandle,
  hitSurfaceAt,
  isRectLargeEnough,
  moveSurfaceRect,
  rectFromPoints,
  resizeSurfaceRect,
  type SurfaceCorner,
  type SurfaceKind,
} from '../lib/garden/surfaceEditorInteraction';
import { GardenCanvasElement } from './GardenCanvasElement';
import { BirdCanvasElement } from './BirdCanvasElement';
import { DadMascotDelivery } from './DadMascotDelivery';
import { useAppVariant } from '../context/AppVariantContext';
import { GardenPlacementStars } from './GardenPlacementStars';
import { MoonDustMotes } from './MoonDustMotes';
import { snapGardenScale, snapAnchorDesignPx, snapScreenPx } from '../lib/garden/gardenPixelSnap';

interface GardenSceneCanvasProps {
  elements: PlacedElement[];
  /** Height of the garden band in CSS pixels. */
  bandHeight: number;
  designWidth?: number;
  designHeight?: number;
  stageHeight?: number;
  /** False until the garden band has been measured (avoids scale jump). */
  bandReady?: boolean;
  /** Id of the element with the newest reveal (for a small pop-in). */
  newestId?: string | null;
  /** Hide the newest flower until scroll is synced to its layout position. */
  awaitingNewestReveal?: boolean;
  gameplayNewestId?: string | null;
  /** Editor: id of the currently selected element. */
  selectedId?: string | null;
  /** Editor: when set, all assets in this level move together and are highlighted. */
  levelMoveLevel?: number | null;
  /** Editor: enables click-to-select and drag-to-move. */
  editable?: boolean;
  /** Dad route: small star burst when a new element is revealed. */
  placementStars?: boolean;
  /** Dad route: scrollable moon surface (craters) behind placed assets. */
  moonGround?: boolean;
  /** Dad route: silver dust motes above the moon surface. */
  dustMotes?: boolean;
  /** Gameplay: viewport pinned left — dust motes only fill the visible width. */
  lockScrollLeft?: boolean;
  /** Dad route: mascot carries this element in before it is revealed. */
  dadDeliveryElement?: PlacedElement | null;
  /** Hide the incoming asset until the mascot sets it down. */
  dadDeliveryAwaitingDrop?: boolean;
  onDadDeliveryDrop?: () => void;
  onDadDeliveryComplete?: () => void;
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
  onNewestDisplaySizeReady?: () => void;
  /** Editor: all hop/food rectangles (including locked). */
  editorSurfaces?: import('../lib/garden/types').SurfacesConfig;
  /** Gameplay: hop/food rectangles unlocked at the current progress. */
  gameplaySurfaces?: import('../lib/garden/types').SurfacesConfig;
  surfaceTool?: 'hop' | 'food' | null;
  onAddSurfaceRect?: (
    kind: 'hop' | 'food',
    rect: SurfaceRect,
  ) => void;
  onUpdateSurfaceRect?: (
    kind: 'hop' | 'food',
    id: string,
    rect: SurfaceRect,
  ) => void;
  selectedSurface?: { kind: 'hop' | 'food'; id: string } | null;
  onSelectSurface?: (surface: { kind: 'hop' | 'food'; id: string } | null) => void;
  /** Editor: draw/edit bird collision boxes on the selected bird. */
  collisionBoxTool?: boolean;
  onSetCollisionBox?: (birdId: string, box: BirdCollisionBox) => void;
}

/** Normalized layout distance — nearby elements count as misclicks while placing. */
const EDITOR_NEAR_ELEMENT_THRESHOLD = 0.12;

function birdWorldCollisionRect(el: PlacedElement): SurfaceRect | null {
  if (!el.birdCollisionBox) return null;
  const world = worldBirdCollisionRect(
    el.x,
    el.y,
    el.birdCollisionBox,
    el.flipX,
  );
  return { ...world, id: el.id };
}

function elementsAreCloseInEditor(
  a: PlacedElement,
  b: PlacedElement,
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < EDITOR_NEAR_ELEMENT_THRESHOLD;
}

/** Normalized x: 0 (left) .. 1 (right) in gameplay; editor allows off-canvas placement. */
function clampLayoutX(value: number, editable: boolean): number {
  if (editable) return value;
  return Math.max(0, Math.min(1, value));
}

/**
 * Normalized y: 0 (top of grass band) .. 1 (ground line). Values above 1 place
 * the anchor below the band so art can be clipped at the screen bottom.
 */
function clampLayoutY(value: number, editable: boolean): number {
  if (editable) return value;
  return Math.max(0, Math.min(1, value));
}

export function GardenSceneCanvas({
  elements,
  bandHeight,
  bandReady = true,
  designWidth = defaultGardenConfig.designWidth,
  designHeight = defaultGardenConfig.designHeight,
  stageHeight = defaultGardenConfig.stageHeight,
  newestId = null,
  awaitingNewestReveal = false,
  gameplayNewestId = null,
  selectedId = null,
  levelMoveLevel = null,
  editable = false,
  placementStars = false,
  moonGround = false,
  dustMotes = false,
  lockScrollLeft = false,
  dadDeliveryElement = null,
  dadDeliveryAwaitingDrop = false,
  onDadDeliveryDrop,
  onDadDeliveryComplete,
  onSelectElement,
  onElementDrag,
  onNewestDisplaySizeReady,
  editorSurfaces,
  gameplaySurfaces,
  surfaceTool = null,
  onAddSurfaceRect,
  onUpdateSurfaceRect,
  selectedSurface = null,
  onSelectSurface,
  collisionBoxTool = false,
  onSetCollisionBox,
}: GardenSceneCanvasProps) {
  const variant = useAppVariant();
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [birdPositions, setBirdPositions] = useState<
    Record<string, { x: number; y: number; flipX: boolean }>
  >({});
  const surfaceSessionRef = useRef<
    | {
        mode: 'draw';
        kind: SurfaceKind;
        startX: number;
        startY: number;
      }
    | {
        mode: 'move';
        kind: SurfaceKind;
        id: string;
        grabOffsetX: number;
        grabOffsetY: number;
      }
    | {
        mode: 'resize';
        kind: SurfaceKind;
        id: string;
        handle: SurfaceCorner;
        anchorRect: SurfaceRect;
      }
    | null
  >(null);
  const collisionSessionRef = useRef<
    | {
        mode: 'draw';
        birdId: string;
        anchorX: number;
        anchorY: number;
        startX: number;
        startY: number;
      }
    | {
        mode: 'move';
        birdId: string;
        anchorX: number;
        anchorY: number;
        grabOffsetX: number;
        grabOffsetY: number;
      }
    | {
        mode: 'resize';
        birdId: string;
        anchorX: number;
        anchorY: number;
        handle: SurfaceCorner;
        anchorRect: SurfaceRect;
      }
    | null
  >(null);
  const [draftCollisionRect, setDraftCollisionRect] = useState<SurfaceRect | null>(
    null,
  );
  const [draftSurfaceRect, setDraftSurfaceRect] = useState<SurfaceRect | null>(
    null,
  );
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportScrollLeft, setViewportScrollLeft] = useState(0);

  const visibleSurfaces = editable ? editorSurfaces : gameplaySurfaces;
  const hasSurfaceLayer =
    visibleSurfaces != null &&
    (visibleSurfaces.hop.length > 0 || visibleSurfaces.food.length > 0);

  const birdElements = useMemo(
    () => elements.filter((el) => el.birdBehavior && el.hasLayout),
    [elements],
  );

  useEffect(() => {
    if (editable) return;
    setBirdPositions((prev) => {
      const next: Record<string, { x: number; y: number; flipX: boolean }> =
        {};
      for (const el of birdElements) {
        next[el.id] = prev[el.id] ?? {
          x: el.x,
          y: el.y,
          flipX: el.flipX,
        };
      }
      return next;
    });
  }, [birdElements, editable]);

  const selectedBird = useMemo(() => {
    if (!editable || !selectedId) return null;
    return elements.find((el) => el.id === selectedId && el.kind === 'birdAmbientStage') ?? null;
  }, [editable, elements, selectedId]);

  const handleBirdPositionChange = useCallback(
    (id: string, x: number, y: number, flipX: boolean) => {
      setBirdPositions((prev) => ({ ...prev, [id]: { x, y, flipX } }));
    },
    [],
  );

  useLayoutEffect(() => {
    if (!bandReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = canvas.closest<HTMLElement>(
      '.garden-flower-scroll__viewport',
    );
    if (!viewport) return;

    const update = () => {
      const w = viewport.clientWidth;
      if (w > 0) setViewportWidth(w);
      setViewportScrollLeft(viewport.scrollLeft);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    viewport.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      viewport.removeEventListener('scroll', update);
    };
  }, [bandReady, dustMotes, dadDeliveryElement, hasSurfaceLayer]);

  const scale =
    bandReady && bandHeight > 0
      ? snapGardenScale(bandHeight, designHeight, designWidth)
      : 0;
  const renderedBandHeight =
    scale > 0 ? designHeight * scale : bandHeight;
  const innerWidth =
    scale > 0 ? snapScreenPx(designWidth * scale) : designWidth * scale;
  const visibleDesignWidth =
    scale > 0 && viewportWidth > 0
      ? viewportWidth / scale
      : designWidth;
  const viewportLeftDesign =
    scale > 0 ? viewportScrollLeft / scale : 0;
  const showElements = editable || (bandReady && scale > 0);
  const moonGroundHeight =
    renderedBandHeight > 0 ? snapScreenPx(renderedBandHeight * 0.825) : 0; /* --garden-grass-ratio */
  const headroomPx = gardenHeadroomPx(renderedBandHeight, designHeight);
  const dustLayerHeight = renderedBandHeight + headroomPx;
  const moonAtmosphereHeight =
    moonGroundHeight > 0
      ? Math.min(112, Math.max(72, headroomPx + (renderedBandHeight - moonGroundHeight) * 0.55))
      : 0;
  const dustLayerWidth = lockScrollLeft
    ? viewportWidth
    : innerWidth;

  const pointerToNorm = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: clampLayoutX((clientX - rect.left) / rect.width, editable),
        y: clampLayoutY((clientY - rect.top) / rect.height, editable),
      };
    },
    [editable],
  );

  const beginDrag = useCallback(
    (id: string, event: ReactPointerEvent) => {
      if (!editable || surfaceTool || selectedSurface || collisionBoxTool) return;
      if (levelMoveLevel != null) {
        const level = Number(id.match(/^L(\d+)-/)?.[1]);
        if (level !== levelMoveLevel) return;
      }
      event.stopPropagation();
      event.preventDefault();

      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return;

      // With something selected, a click on a nearby element repositions the
      // selection instead of switching (avoids accidental selection).
      if (
        editable &&
        selectedId != null &&
        levelMoveLevel == null &&
        id !== selectedId
      ) {
        const selected = elements.find((el) => el.id === selectedId);
        const clicked = elements.find((el) => el.id === id);
        if (
          selected &&
          clicked &&
          elementsAreCloseInEditor(selected, clicked)
        ) {
          onElementDrag?.(selectedId, norm.x, norm.y);
          draggingIdRef.current = selectedId;
          canvasRef.current?.setPointerCapture(event.pointerId);
          return;
        }
      }

      draggingIdRef.current = id;
      onSelectElement?.(id);
      canvasRef.current?.setPointerCapture(event.pointerId);
    },
    [
      editable,
      elements,
      levelMoveLevel,
      onElementDrag,
      onSelectElement,
      pointerToNorm,
      selectedId,
      surfaceTool,
      selectedSurface,
      collisionBoxTool,
    ],
  );

  const findSurfaceRect = useCallback(
    (kind: SurfaceKind, id: string): SurfaceRect | null => {
      if (!editorSurfaces) return null;
      return editorSurfaces[kind].find((r) => r.id === id) ?? null;
    },
    [editorSurfaces],
  );

  const handleSurfacePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      const activeKind = surfaceTool ?? selectedSurface?.kind;
      if (!editable || !activeKind || !editorSurfaces) return false;

      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return false;

      const surfaces = editorSurfaces[activeKind];

      if (selectedSurface?.kind === activeKind) {
        const selectedRect = findSurfaceRect(activeKind, selectedSurface.id);
        if (selectedRect) {
          const handle = hitCornerHandle(
            selectedRect,
            norm.x,
            norm.y,
            designWidth,
            designHeight,
          );
          if (handle) {
            event.preventDefault();
            event.stopPropagation();
            surfaceSessionRef.current = {
              mode: 'resize',
              kind: activeKind,
              id: selectedRect.id,
              handle,
              anchorRect: { ...selectedRect },
            };
            canvasRef.current?.setPointerCapture(event.pointerId);
            return true;
          }
        }
      }

      const hit = hitSurfaceAt(surfaces, norm.x, norm.y);
      if (hit) {
        event.preventDefault();
        event.stopPropagation();
        onSelectSurface?.({ kind: activeKind, id: hit.id });
        surfaceSessionRef.current = {
          mode: 'move',
          kind: activeKind,
          id: hit.id,
          grabOffsetX: norm.x - hit.x,
          grabOffsetY: norm.y - hit.y,
        };
        canvasRef.current?.setPointerCapture(event.pointerId);
        return true;
      }

      if (!surfaceTool) return false;

      event.preventDefault();
      event.stopPropagation();
      onSelectSurface?.(null);
      surfaceSessionRef.current = {
        mode: 'draw',
        kind: surfaceTool,
        startX: norm.x,
        startY: norm.y,
      };
      setDraftSurfaceRect({
        id: 'draft',
        x: norm.x,
        y: norm.y,
        width: 0,
        height: 0,
      });
      canvasRef.current?.setPointerCapture(event.pointerId);
      return true;
    },
    [
      editable,
      surfaceTool,
      selectedSurface,
      editorSurfaces,
      pointerToNorm,
      findSurfaceRect,
      designWidth,
      designHeight,
      onSelectSurface,
    ],
  );

  const handleSurfacePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const session = surfaceSessionRef.current;
      if (!session || !editorSurfaces) return false;

      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return false;

      event.preventDefault();

      if (session.mode === 'draw') {
        const next = rectFromPoints(
          session.startX,
          session.startY,
          norm.x,
          norm.y,
        );
        setDraftSurfaceRect({
          id: 'draft',
          ...next,
        });
        return true;
      }

      const current = findSurfaceRect(session.kind, session.id);
      if (!current || !onUpdateSurfaceRect) return true;

      if (session.mode === 'move') {
        onUpdateSurfaceRect(
          session.kind,
          session.id,
          moveSurfaceRect(
            current,
            norm.x,
            norm.y,
            session.grabOffsetX,
            session.grabOffsetY,
          ),
        );
        return true;
      }

      onUpdateSurfaceRect(
        session.kind,
        session.id,
        resizeSurfaceRect(session.anchorRect, session.handle, norm.x, norm.y),
      );
      return true;
    },
    [editorSurfaces, pointerToNorm, findSurfaceRect, onUpdateSurfaceRect],
  );

  const handleSurfacePointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const session = surfaceSessionRef.current;
      if (!session) return false;

      event.preventDefault();
      canvasRef.current?.releasePointerCapture(event.pointerId);

      if (session.mode === 'draw' && onAddSurfaceRect) {
        const norm = pointerToNorm(event.clientX, event.clientY);
        if (norm) {
          const next = rectFromPoints(
            session.startX,
            session.startY,
            norm.x,
            norm.y,
          );
          if (isRectLargeEnough(next)) {
            onAddSurfaceRect(session.kind, {
              ...next,
              id: `${session.kind}_${Date.now()}`,
            });
          }
        }
      }

      surfaceSessionRef.current = null;
      setDraftSurfaceRect(null);
      return true;
    },
    [onAddSurfaceRect, pointerToNorm],
  );

  const findBirdCollisionRect = useCallback(
    (birdId: string): SurfaceRect | null => {
      const el = elements.find((item) => item.id === birdId);
      if (!el?.birdCollisionBox) return null;
      return birdWorldCollisionRect(el);
    },
    [elements],
  );

  const commitCollisionWorldRect = useCallback(
    (birdId: string, anchorX: number, anchorY: number, rect: SurfaceRect) => {
      if (!onSetCollisionBox) return;
      onSetCollisionBox(
        birdId,
        collisionBoxFromWorldRect(anchorX, anchorY, rect),
      );
    },
    [onSetCollisionBox],
  );

  const handleCollisionPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (!editable || !onSetCollisionBox || levelMoveLevel != null) return false;
      if (surfaceTool || selectedSurface) return false;

      const bird = selectedBird;
      if (!bird) return false;

      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return false;

      const existing = bird.birdCollisionBox
        ? birdWorldCollisionRect(bird)
        : null;

      if (existing && !collisionBoxTool) {
        const handle = hitCornerHandle(
          existing,
          norm.x,
          norm.y,
          designWidth,
          designHeight,
        );
        if (handle) {
          event.preventDefault();
          event.stopPropagation();
          collisionSessionRef.current = {
            mode: 'resize',
            birdId: bird.id,
            anchorX: bird.x,
            anchorY: bird.y,
            handle,
            anchorRect: { ...existing },
          };
          canvasRef.current?.setPointerCapture(event.pointerId);
          return true;
        }
        if (
          norm.x >= existing.x &&
          norm.x <= existing.x + existing.width &&
          norm.y >= existing.y &&
          norm.y <= existing.y + existing.height
        ) {
          event.preventDefault();
          event.stopPropagation();
          collisionSessionRef.current = {
            mode: 'move',
            birdId: bird.id,
            anchorX: bird.x,
            anchorY: bird.y,
            grabOffsetX: norm.x - existing.x,
            grabOffsetY: norm.y - existing.y,
          };
          canvasRef.current?.setPointerCapture(event.pointerId);
          return true;
        }
      }

      if (!collisionBoxTool) return false;

      event.preventDefault();
      event.stopPropagation();
      collisionSessionRef.current = {
        mode: 'draw',
        birdId: bird.id,
        anchorX: bird.x,
        anchorY: bird.y,
        startX: norm.x,
        startY: norm.y,
      };
      setDraftCollisionRect({
        id: 'draft-collision',
        x: norm.x,
        y: norm.y,
        width: 0,
        height: 0,
      });
      canvasRef.current?.setPointerCapture(event.pointerId);
      return true;
    },
    [
      editable,
      onSetCollisionBox,
      levelMoveLevel,
      surfaceTool,
      selectedSurface,
      collisionBoxTool,
      selectedBird,
      pointerToNorm,
      designWidth,
      designHeight,
    ],
  );

  const handleCollisionPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const session = collisionSessionRef.current;
      if (!session || !onSetCollisionBox) return false;

      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return false;

      event.preventDefault();

      if (session.mode === 'draw') {
        const next = rectFromPoints(
          session.startX,
          session.startY,
          norm.x,
          norm.y,
        );
        setDraftCollisionRect({ id: 'draft-collision', ...next });
        return true;
      }

      const current = findBirdCollisionRect(session.birdId);
      if (!current) return true;

      if (session.mode === 'move') {
        const moved = moveSurfaceRect(
          current,
          norm.x,
          norm.y,
          session.grabOffsetX,
          session.grabOffsetY,
        );
        commitCollisionWorldRect(
          session.birdId,
          session.anchorX,
          session.anchorY,
          moved,
        );
        return true;
      }

      const resized = resizeSurfaceRect(
        session.anchorRect,
        session.handle,
        norm.x,
        norm.y,
      );
      commitCollisionWorldRect(
        session.birdId,
        session.anchorX,
        session.anchorY,
        resized,
      );
      return true;
    },
    [
      pointerToNorm,
      onSetCollisionBox,
      findBirdCollisionRect,
      commitCollisionWorldRect,
    ],
  );

  const handleCollisionPointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const session = collisionSessionRef.current;
      if (!session) return false;

      event.preventDefault();
      canvasRef.current?.releasePointerCapture(event.pointerId);

      if (session.mode === 'draw') {
        const norm = pointerToNorm(event.clientX, event.clientY);
        if (norm) {
          const next = rectFromPoints(
            session.startX,
            session.startY,
            norm.x,
            norm.y,
          );
          if (isRectLargeEnough(next)) {
            commitCollisionWorldRect(
              session.birdId,
              session.anchorX,
              session.anchorY,
              { id: session.birdId, ...next },
            );
          }
        }
      }

      collisionSessionRef.current = null;
      setDraftCollisionRect(null);
      return true;
    },
    [pointerToNorm, commitCollisionWorldRect],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent) => {
      if (handleCollisionPointerMove(event)) return;
      if (handleSurfacePointerMove(event)) return;
      if (!editable || draggingIdRef.current == null) return;
      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return;
      onElementDrag?.(draggingIdRef.current, norm.x, norm.y);
    },
    [editable, handleCollisionPointerMove, handleSurfacePointerMove, onElementDrag, pointerToNorm],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent) => {
      if (handleCollisionPointerUp(event)) return;
      if (handleSurfacePointerUp(event)) return;
      if (draggingIdRef.current == null) return;
      canvasRef.current?.releasePointerCapture(event.pointerId);
      draggingIdRef.current = null;
    },
    [handleCollisionPointerUp, handleSurfacePointerUp],
  );

  const placeMode =
    editable &&
    selectedId != null &&
    !isSurfaceEditorId(selectedId) &&
    levelMoveLevel == null &&
    !surfaceTool &&
    !collisionBoxTool;

  /** Individual mode: place the list-selected flower at the click point. */
  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!placeMode) return;
      const target = event.target as HTMLElement;
      if (target.closest('.garden-canvas__el')) return;
      if (target.closest('.garden-collision-rect')) return;
      if (target.closest('.garden-surface-rect')) return;
      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return;
      event.preventDefault();
      onElementDrag?.(selectedId!, norm.x, norm.y);
    },
    [placeMode, selectedId, pointerToNorm, onElementDrag],
  );

  const surfaceEditActive = Boolean(
    surfaceTool || (selectedSurface && levelMoveLevel == null),
  );

  const collisionEditActive = Boolean(
    editable &&
      levelMoveLevel == null &&
      !placeMode &&
      (collisionBoxTool ||
        (selectedBird?.birdCollisionBox && !surfaceTool && !selectedSurface)),
  );

  const handleCanvasPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (placeMode || levelMoveLevel != null) return;
      if (collisionEditActive && handleCollisionPointerDown(event)) {
        event.stopPropagation();
        return;
      }
      if (!surfaceTool && !selectedSurface) return;
      if (handleSurfacePointerDown(event)) {
        event.stopPropagation();
      }
    },
    [
      placeMode,
      levelMoveLevel,
      collisionEditActive,
      handleCollisionPointerDown,
      surfaceTool,
      selectedSurface,
      handleSurfacePointerDown,
    ],
  );

  const renderSurfaceRect = (
    r: SurfaceRect,
    kind: SurfaceKind,
    options?: {
      selected?: boolean;
      draft?: boolean;
      runtime?: boolean;
      levelMove?: boolean;
    },
  ) => {
    const selected = options?.selected ?? false;
    const draft = options?.draft ?? false;
    const runtime = options?.runtime ?? false;
    const levelMove = options?.levelMove ?? false;
    const className = [
      'garden-surface-rect',
      kind === 'hop'
        ? 'garden-surface-rect--hop'
        : 'garden-surface-rect--food',
      runtime ? 'garden-surface-rect--runtime' : '',
      surfaceTool === kind ? 'garden-surface-rect--interactive' : '',
      selected ? 'garden-surface-rect--selected' : '',
      draft ? 'garden-surface-rect--draft' : '',
      levelMove ? 'garden-surface-rect--level-move' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const style: CSSProperties = {
      left: `${r.x * designWidth}px`,
      bottom: `${(1 - r.y - r.height) * designHeight}px`,
      width: `${r.width * designWidth}px`,
      height: `${r.height * designHeight}px`,
    };

    const handles: SurfaceCorner[] = ['nw', 'ne', 'sw', 'se'];
    const handleStyle = (corner: SurfaceCorner): CSSProperties => {
      const base: CSSProperties = {
        left:
          corner === 'nw' || corner === 'sw'
            ? '-5px'
            : 'calc(100% - 5px)',
        top:
          corner === 'nw' || corner === 'ne'
            ? '-5px'
            : 'calc(100% - 5px)',
      };
      return base;
    };

    return (
      <div key={r.id} className={className} style={style} aria-hidden>
        {selected &&
          (surfaceTool === kind || selectedSurface?.kind === kind) &&
          handles.map((corner) => (
            <span
              key={corner}
              className={`garden-surface-handle garden-surface-handle--${corner}`}
              style={handleStyle(corner)}
            />
          ))}
      </div>
    );
  };

  const renderCollisionRect = (
    r: SurfaceRect,
    options?: { selected?: boolean; draft?: boolean },
  ) => {
    const selected = options?.selected ?? false;
    const draft = options?.draft ?? false;
    const className = [
      'garden-collision-rect',
      collisionBoxTool ? 'garden-collision-rect--interactive' : '',
      selected ? 'garden-collision-rect--selected' : '',
      draft ? 'garden-collision-rect--draft' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const style: CSSProperties = {
      left: `${r.x * designWidth}px`,
      bottom: `${(1 - r.y - r.height) * designHeight}px`,
      width: `${r.width * designWidth}px`,
      height: `${r.height * designHeight}px`,
    };

    const handles: SurfaceCorner[] = ['nw', 'ne', 'sw', 'se'];
    const handleStyle = (corner: SurfaceCorner): CSSProperties => ({
      left:
        corner === 'nw' || corner === 'sw' ? '-5px' : 'calc(100% - 5px)',
      top:
        corner === 'nw' || corner === 'ne' ? '-5px' : 'calc(100% - 5px)',
    });

    return (
      <div key={r.id} className={className} style={style} aria-hidden>
        {selected &&
          handles.map((corner) => (
            <span
              key={corner}
              className={`garden-surface-handle garden-surface-handle--${corner}`}
              style={handleStyle(corner)}
            />
          ))}
      </div>
    );
  };

  const canvasStyle: CSSProperties = {
    width: `${innerWidth}px`,
    height: `${renderedBandHeight}px`,
  };

  const stageStyle: CSSProperties = {
    width: `${designWidth}px`,
    height: `${stageHeight}px`,
    transform: `scale(${scale}) translateZ(0)`,
    transformOrigin: 'bottom left',
  };

  return (
    <div
      ref={canvasRef}
      className={`garden-canvas${editable ? ' garden-canvas--editable' : ''}${placeMode ? ' garden-canvas--place-mode' : ''}${surfaceTool ? ` garden-canvas--surface-tool garden-canvas--surface-tool-${surfaceTool}` : ''}${collisionBoxTool ? ' garden-canvas--collision-tool' : ''}${surfaceEditActive ? ' garden-canvas--surface-edit' : ''}${collisionEditActive ? ' garden-canvas--collision-edit' : ''}`}
      style={canvasStyle}
      onPointerDownCapture={
        editable && (surfaceEditActive || collisionEditActive)
          ? handleCanvasPointerDownCapture
          : undefined
      }
      onPointerDown={editable ? handleCanvasPointerDown : undefined}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
    >
      {moonGround && moonGroundHeight > 0 && innerWidth > 0 && (
        <img
          className="garden-canvas__moon-ground"
          src="/garden/moontex.png"
          alt=""
          draggable={false}
          aria-hidden
          style={{
            width: `${innerWidth}px`,
            height: `${moonGroundHeight}px`,
          }}
        />
      )}
      {moonGround && moonAtmosphereHeight > 0 && innerWidth > 0 && (
        <div
          className="garden-canvas__moon-atmosphere"
          aria-hidden
          style={{
            width: `${innerWidth}px`,
            bottom: `${moonGroundHeight}px`,
            height: `${moonAtmosphereHeight}px`,
          }}
        />
      )}
      {dustMotes && dustLayerHeight > 0 && dustLayerWidth > 0 && (
        <div
          className="moon-dust-motes moon-dust-motes--canvas"
          style={{ width: `${dustLayerWidth}px`, height: `${dustLayerHeight}px` }}
        >
          <MoonDustMotes moonGroundHeight={moonGroundHeight} />
        </div>
      )}
      <div className="garden-canvas__stage" style={stageStyle}>
        {showElements &&
          [...elements]
            .filter(
              (el) =>
                (editable || el.hasLayout) &&
                (!el.birdBehavior || editable),
            )
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => {
          const inLevelMove =
            editable && levelMoveLevel != null && el.level === levelMoveLevel;
          const isSelected =
            editable &&
            (inLevelMove || (levelMoveLevel == null && el.id === selectedId));
          const isPendingNewest =
            (awaitingNewestReveal && el.id === gameplayNewestId) ||
            (dadDeliveryAwaitingDrop && el.id === dadDeliveryElement?.id);
          const isNew = !editable && el.id === newestId;
          const dimmed =
            editable &&
            (levelMoveLevel != null
              ? !inLevelMove
              : selectedId != null && el.id !== selectedId);
          const snapAnchor =
            scale > 0 &&
            levelMoveLevel == null &&
            (!editable || draggingIdRef.current !== el.id);
          const anchor = snapAnchor
            ? snapAnchorDesignPx(el.x, el.y, designWidth, designHeight, scale)
            : {
                left: el.x * designWidth,
                bottom: (1 - el.y) * designHeight,
              };
          const elStyle: CSSProperties = {
            left: `${anchor.left}px`,
            bottom: `${anchor.bottom}px`,
            height: `${el.heightDesign * el.scale}px`,
            zIndex: isSelected ? el.zIndex + 10000 : el.zIndex,
            opacity: dimmed ? 0.35 : isPendingNewest ? 0 : 1,
            visibility: isPendingNewest ? 'hidden' : 'visible',
            '--garden-el-flip-x': el.flipX ? -1 : 1,
          } as CSSProperties;
          const classes = [
            'garden-canvas__el',
            isSelected ? 'garden-canvas__el--selected' : '',
            inLevelMove ? 'garden-canvas__el--level-move' : '',
            isNew ? 'garden-canvas__el--new' : '',
            editable ? 'garden-canvas__el--editable' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <Fragment key={el.id}>
              {isNew && placementStars && (
                <GardenPlacementStars
                  designX={el.x * designWidth}
                  designY={
                    (1 - el.y) * designHeight +
                    (el.heightDesign * el.scale) * 0.45
                  }
                />
              )}
              <GardenCanvasElement
                element={el}
                gardenScale={scale}
                className={classes}
                style={elStyle}
                onDisplaySizeReady={
                  !editable && el.id === gameplayNewestId
                    ? onNewestDisplaySizeReady
                    : undefined
                }
                onPointerDown={
                  editable ? (e) => beginDrag(el.id, e) : undefined
                }
              />
            </Fragment>
          );
        })}
        {editable && editorSurfaces && (
          <div className="garden-surface-layer" aria-hidden>
            {editorSurfaces.hop.map((r) =>
              renderSurfaceRect(r, 'hop', {
                selected:
                  selectedSurface?.kind === 'hop' &&
                  selectedSurface.id === r.id,
                levelMove:
                  levelMoveLevel != null &&
                  surfaceUnlockLevel(r) === levelMoveLevel,
              }),
            )}
            {editorSurfaces.food.map((r) =>
              renderSurfaceRect(r, 'food', {
                selected:
                  selectedSurface?.kind === 'food' &&
                  selectedSurface.id === r.id,
                levelMove:
                  levelMoveLevel != null &&
                  surfaceUnlockLevel(r) === levelMoveLevel,
              }),
            )}
            {draftSurfaceRect &&
              surfaceTool &&
              renderSurfaceRect(draftSurfaceRect, surfaceTool, { draft: true })}
          </div>
        )}
        {import.meta.env.DEV &&
          !editable &&
          gameplaySurfaces &&
          hasSurfaceLayer && (
          <div className="garden-surface-layer garden-surface-layer--runtime" aria-hidden>
            {gameplaySurfaces.hop.map((r) =>
              renderSurfaceRect(r, 'hop', { runtime: true }),
            )}
            {gameplaySurfaces.food.map((r) =>
              renderSurfaceRect(r, 'food', { runtime: true }),
            )}
          </div>
        )}
        {editable && (
          <div className="garden-collision-layer" aria-hidden>
            {elements
              .filter((el) => el.kind === 'birdAmbientStage' && el.birdCollisionBox)
              .map((el) => {
                const world = birdWorldCollisionRect(el);
                if (!world) return null;
                return renderCollisionRect(world, {
                  selected: el.id === selectedId,
                });
              })}
            {draftCollisionRect &&
              renderCollisionRect(draftCollisionRect, { draft: true })}
          </div>
        )}
        {showElements &&
          !editable &&
          birdElements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => {
              if (!el.birdBehavior) return null;
              const isPendingDelivery =
                dadDeliveryAwaitingDrop && el.id === dadDeliveryElement?.id;
              if (isPendingDelivery) return null;
              const otherRects = birdElements
                .filter((other) => other.id !== el.id && other.birdCollisionBox)
                .map((other) => {
                  const otherPos = birdPositions[other.id] ?? {
                    x: other.x,
                    y: other.y,
                    flipX: other.flipX,
                  };
                  const world = worldBirdCollisionRect(
                    otherPos.x,
                    otherPos.y,
                    other.birdCollisionBox!,
                    otherPos.flipX,
                  );
                  return { ...world, id: other.id };
                });
              const elStyle: CSSProperties = {
                left: `${el.x * designWidth}px`,
                bottom: `${(1 - el.y) * designHeight}px`,
                height: `${el.heightDesign * el.scale}px`,
                zIndex: el.zIndex + 5000,
                '--garden-el-flip-x': el.flipX ? -1 : 1,
              } as CSSProperties;
              return (
                <BirdCanvasElement
                  key={`bird-${el.id}`}
                  element={el}
                  behavior={el.birdBehavior}
                  designWidth={designWidth}
                  designHeight={designHeight}
                  gardenScale={scale}
                  className="garden-canvas__el garden-canvas__el--bird"
                  style={elStyle}
                  otherBirdCollisionRects={otherRects}
                  onPositionChange={(x, y, flipX) =>
                    handleBirdPositionChange(el.id, x, y, flipX)
                  }
                />
              );
            })}
        {dadDeliveryElement && onDadDeliveryComplete && (
          <DadMascotDelivery
            element={dadDeliveryElement}
            designWidth={designWidth}
            designHeight={designHeight}
            gardenScale={scale}
            visibleDesignWidth={visibleDesignWidth}
            viewportLeftDesign={viewportLeftDesign}
            variant={variant}
            onDrop={onDadDeliveryDrop}
            onComplete={onDadDeliveryComplete}
          />
        )}
      </div>
    </div>
  );
}

/** Scaled headroom in CSS px (space above the grass band for tall blooms). */
export function gardenHeadroomPx(
  bandHeight: number,
  designHeight: number = defaultGardenConfig.designHeight,
): number {
  return bandHeight > 0 ? (GARDEN_HEADROOM_TOP / designHeight) * bandHeight : 0;
}
