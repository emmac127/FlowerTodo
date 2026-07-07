import type { SurfaceRect } from './types';

export type SurfaceKind = 'hop' | 'food';
export type SurfaceCorner = 'nw' | 'ne' | 'sw' | 'se';

const MIN_RECT_SIZE = 0.008;

/** Build a normalized rect from two pointer positions (top-left origin). */
export function rectFromPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Pick<SurfaceRect, 'x' | 'y' | 'width' | 'height'> {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { x, y, width, height };
}

export function isRectLargeEnough(
  rect: Pick<SurfaceRect, 'width' | 'height'>,
): boolean {
  return rect.width >= MIN_RECT_SIZE && rect.height >= MIN_RECT_SIZE;
}

/** Top-most surface under the pointer (last in list wins). */
export function hitSurfaceAt(
  surfaces: SurfaceRect[],
  x: number,
  y: number,
): SurfaceRect | null {
  for (let i = surfaces.length - 1; i >= 0; i--) {
    const r = surfaces[i]!;
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
      return r;
    }
  }
  return null;
}

function handleTolerance(designWidth: number, designHeight: number): {
  x: number;
  y: number;
} {
  const px = 10;
  return { x: px / designWidth, y: px / designHeight };
}

export function hitCornerHandle(
  rect: SurfaceRect,
  x: number,
  y: number,
  designWidth: number,
  designHeight: number,
): SurfaceCorner | null {
  const tol = handleTolerance(designWidth, designHeight);
  const corners: { corner: SurfaceCorner; cx: number; cy: number }[] = [
    { corner: 'nw', cx: rect.x, cy: rect.y },
    { corner: 'ne', cx: rect.x + rect.width, cy: rect.y },
    { corner: 'sw', cx: rect.x, cy: rect.y + rect.height },
    { corner: 'se', cx: rect.x + rect.width, cy: rect.y + rect.height },
  ];
  for (const { corner, cx, cy } of corners) {
    if (Math.abs(x - cx) <= tol.x && Math.abs(y - cy) <= tol.y) {
      return corner;
    }
  }
  return null;
}

export function resizeSurfaceRect(
  rect: SurfaceRect,
  corner: SurfaceCorner,
  x: number,
  y: number,
): SurfaceRect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (corner === 'nw' || corner === 'sw') left = x;
  if (corner === 'ne' || corner === 'se') right = x;
  if (corner === 'nw' || corner === 'ne') top = y;
  if (corner === 'sw' || corner === 'se') bottom = y;

  if (right - left < MIN_RECT_SIZE) {
    if (corner === 'nw' || corner === 'sw') {
      left = right - MIN_RECT_SIZE;
    } else {
      right = left + MIN_RECT_SIZE;
    }
  }
  if (bottom - top < MIN_RECT_SIZE) {
    if (corner === 'nw' || corner === 'ne') {
      top = bottom - MIN_RECT_SIZE;
    } else {
      bottom = top + MIN_RECT_SIZE;
    }
  }

  return {
    ...rect,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function moveSurfaceRect(
  rect: SurfaceRect,
  x: number,
  y: number,
  grabOffsetX: number,
  grabOffsetY: number,
): SurfaceRect {
  return {
    ...rect,
    x: x - grabOffsetX,
    y: y - grabOffsetY,
  };
}
