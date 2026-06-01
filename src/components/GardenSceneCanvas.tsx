import { useCallback, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GARDEN_HEADROOM_TOP,
  STAGE_HEIGHT,
} from '../lib/garden/loadConfig';
import type { PlacedElement } from '../lib/garden/types';

interface GardenSceneCanvasProps {
  elements: PlacedElement[];
  /** Height of the garden band in CSS pixels. */
  bandHeight: number;
  /** Id of the element with the newest reveal (for a small pop-in). */
  newestId?: string | null;
  /** Editor: id of the currently selected element. */
  selectedId?: string | null;
  /** Editor: enables click-to-select and drag-to-move. */
  editable?: boolean;
  onSelectElement?: (id: string) => void;
  onElementDrag?: (id: string, x: number, y: number) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function GardenSceneCanvas({
  elements,
  bandHeight,
  newestId = null,
  selectedId = null,
  editable = false,
  onSelectElement,
  onElementDrag,
}: GardenSceneCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const scale = bandHeight > 0 ? bandHeight / DESIGN_HEIGHT : 1;
  const innerWidth = DESIGN_WIDTH * scale;

  const pointerToNorm = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }, []);

  const beginDrag = useCallback(
    (id: string, event: ReactPointerEvent) => {
      if (!editable) return;
      event.preventDefault();
      draggingIdRef.current = id;
      onSelectElement?.(id);
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [editable, onSelectElement],
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
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    draggingIdRef.current = null;
  }, []);

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!editable || selectedId == null) return;
      beginDrag(selectedId, event);
    },
    [editable, selectedId, beginDrag],
  );

  const canvasStyle: CSSProperties = {
    width: `${innerWidth}px`,
    height: `${bandHeight}px`,
  };

  const stageStyle: CSSProperties = {
    width: `${DESIGN_WIDTH}px`,
    height: `${STAGE_HEIGHT}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'bottom left',
  };

  return (
    <div
      ref={canvasRef}
      className={`garden-canvas${editable ? ' garden-canvas--editable' : ''}`}
      style={canvasStyle}
      onPointerDown={editable ? handleCanvasPointerDown : undefined}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
    >
      <div className="garden-canvas__stage" style={stageStyle}>
        {elements.map((el) => {
          const isSelected = editable && el.id === selectedId;
          const isNew = !editable && el.id === newestId;
          const dimmed = editable && selectedId != null && !isSelected;
          const elStyle: CSSProperties = {
            left: `${el.x * DESIGN_WIDTH}px`,
            bottom: `${(1 - el.y) * DESIGN_HEIGHT}px`,
            height: `${el.heightDesign}px`,
            zIndex: isSelected ? 200 : el.level * 10 + (el.slotIndex ?? el.stageIndex ?? 0),
            opacity: dimmed ? 0.35 : 1,
          };
          const classes = [
            'garden-canvas__el',
            isSelected ? 'garden-canvas__el--selected' : '',
            isNew ? 'garden-canvas__el--new' : '',
            editable ? 'garden-canvas__el--editable' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <img
              key={el.id}
              className={classes}
              style={elStyle}
              src={el.src}
              alt=""
              draggable={false}
              aria-hidden
              onPointerDown={
                editable ? (e) => beginDrag(el.id, e) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/** Scaled headroom in CSS px (space above the grass band for tall blooms). */
export function gardenHeadroomPx(bandHeight: number): number {
  return bandHeight > 0 ? (GARDEN_HEADROOM_TOP / DESIGN_HEIGHT) * bandHeight : 0;
}
