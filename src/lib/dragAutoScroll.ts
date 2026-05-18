/** How close to the safe-zone edge (px) before pointer-driven scroll kicks in. */
export const DRAG_SCROLL_EDGE_PX = 72;

/** Max scroll speed (px per animation frame) from pointer position. */
export const DRAG_SCROLL_MAX_SPEED_PX = 22;

/** Extra scroll allowed when the dragged row is clipped out of the safe zone. */
export const DRAG_ROW_CORRECT_MAX_PX = 36;

export interface ScrollSafeZone {
  top: number;
  bottom: number;
}

export function getScrollSafeZone(): ScrollSafeZone {
  if (typeof window === 'undefined') {
    return { top: 80, bottom: 720 };
  }

  const header = document.querySelector<HTMLElement>('.sticky-kawaii-header');
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(12, headerBottom + 12);
  const bottom = window.innerHeight - 16;
  return { top, bottom };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Scroll amount from pointer sitting in the top/bottom edge bands. */
export function getPointerEdgeScrollDelta(
  clientY: number,
  safeZone: ScrollSafeZone,
  edgeZonePx = DRAG_SCROLL_EDGE_PX,
  maxSpeedPx = DRAG_SCROLL_MAX_SPEED_PX,
): number {
  if (clientY < safeZone.top + edgeZonePx) {
    const depth = safeZone.top + edgeZonePx - clientY;
    const intensity = clamp(depth / edgeZonePx, 0, 1);
    return -maxSpeedPx * intensity;
  }
  if (clientY > safeZone.bottom - edgeZonePx) {
    const depth = clientY - (safeZone.bottom - edgeZonePx);
    const intensity = clamp(depth / edgeZonePx, 0, 1);
    return maxSpeedPx * intensity;
  }
  return 0;
}

/** Scroll amount to keep the dragged row inside the safe zone. */
export function getRowVisibilityScrollDelta(
  rowRect: DOMRect | null,
  safeZone: ScrollSafeZone,
  maxCorrectPx = DRAG_ROW_CORRECT_MAX_PX,
): number {
  if (!rowRect) return 0;

  if (rowRect.top < safeZone.top) {
    return clamp(rowRect.top - safeZone.top, -maxCorrectPx, 0);
  }
  if (rowRect.bottom > safeZone.bottom) {
    return clamp(rowRect.bottom - safeZone.bottom, 0, maxCorrectPx);
  }
  return 0;
}

/** Combine pointer-edge and row-visibility scrolling. */
export function getCombinedDragScrollDelta(
  clientY: number,
  rowRect: DOMRect | null,
  safeZone: ScrollSafeZone,
): number {
  const pointerDelta = getPointerEdgeScrollDelta(clientY, safeZone);
  const rowDelta = getRowVisibilityScrollDelta(rowRect, safeZone);
  if (pointerDelta === 0) return rowDelta;
  if (rowDelta === 0) return pointerDelta;
  if (Math.sign(pointerDelta) === Math.sign(rowDelta)) {
    return clamp(pointerDelta + rowDelta, -DRAG_ROW_CORRECT_MAX_PX, DRAG_ROW_CORRECT_MAX_PX);
  }
  return Math.abs(rowDelta) > Math.abs(pointerDelta) ? rowDelta : pointerDelta;
}
