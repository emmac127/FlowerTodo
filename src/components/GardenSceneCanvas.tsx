import { useCallback, useRef, Fragment } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  defaultGardenConfig,
  GARDEN_HEADROOM_TOP,
} from '../lib/garden/loadConfig';
import type { PlacedElement } from '../lib/garden/types';
import { GardenCanvasElement } from './GardenCanvasElement';
import { GardenPlacementStars } from './GardenPlacementStars';

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
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
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
  onSelectElement,
  onElementDrag,
}: GardenSceneCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const scale =
    bandReady && bandHeight > 0 ? bandHeight / designHeight : 0;
  const innerWidth = designWidth * scale;
  const showElements = editable || (bandReady && scale > 0);

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
      if (!editable) return;
      if (levelMoveLevel != null) {
        const level = Number(id.match(/^L(\d+)-/)?.[1]);
        if (level !== levelMoveLevel) return;
      }
      event.stopPropagation();
      event.preventDefault();
      draggingIdRef.current = id;
      onSelectElement?.(id);
      canvasRef.current?.setPointerCapture(event.pointerId);
    },
    [editable, levelMoveLevel, onSelectElement],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent) => {
      if (!editable || draggingIdRef.current == null) return;
      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return;
      onElementDrag?.(draggingIdRef.current, norm.x, norm.y);
    },
    [editable, onElementDrag, pointerToNorm],
  );

  const endDrag = useCallback((event: ReactPointerEvent) => {
    if (draggingIdRef.current == null) return;
    canvasRef.current?.releasePointerCapture(event.pointerId);
    draggingIdRef.current = null;
  }, []);

  const placeMode =
    editable && selectedId != null && levelMoveLevel == null;

  /** Individual mode: place the list-selected flower at the click point. */
  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!placeMode) return;
      const target = event.target as HTMLElement;
      if (target.closest('.garden-canvas__el')) return;
      const norm = pointerToNorm(event.clientX, event.clientY);
      if (!norm) return;
      event.preventDefault();
      onElementDrag?.(selectedId!, norm.x, norm.y);
    },
    [placeMode, selectedId, pointerToNorm, onElementDrag],
  );

  const canvasStyle: CSSProperties = {
    width: `${innerWidth}px`,
    height: `${bandHeight}px`,
  };

  const stageStyle: CSSProperties = {
    width: `${designWidth}px`,
    height: `${stageHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'bottom left',
  };

  return (
    <div
      ref={canvasRef}
      className={`garden-canvas${editable ? ' garden-canvas--editable' : ''}${placeMode ? ' garden-canvas--place-mode' : ''}`}
      style={canvasStyle}
      onPointerDown={editable ? handleCanvasPointerDown : undefined}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
    >
      <div className="garden-canvas__stage" style={stageStyle}>
        {showElements &&
          [...elements]
            .filter((el) => editable || el.hasLayout)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => {
          const inLevelMove =
            editable && levelMoveLevel != null && el.level === levelMoveLevel;
          const isSelected =
            editable &&
            (inLevelMove || (levelMoveLevel == null && el.id === selectedId));
          const isPendingNewest =
            awaitingNewestReveal && el.id === gameplayNewestId;
          const isNew = !editable && el.id === newestId;
          const dimmed =
            editable &&
            (levelMoveLevel != null
              ? !inLevelMove
              : selectedId != null && el.id !== selectedId);
          const elStyle: CSSProperties = {
            left: `${el.x * designWidth}px`,
            bottom: `${(1 - el.y) * designHeight}px`,
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
                className={classes}
                style={elStyle}
                onPointerDown={
                  editable ? (e) => beginDrag(el.id, e) : undefined
                }
              />
            </Fragment>
          );
        })}
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
