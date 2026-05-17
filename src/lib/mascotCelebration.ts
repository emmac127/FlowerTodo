export interface CelebrationOrigin {
  x: number;
  y: number;
  startRadius: number;
  maxRadius: number;
}

export const DEFAULT_CELEBRATION_ORIGIN: CelebrationOrigin = {
  x: 80,
  y: 120,
  startRadius: 52,
  maxRadius: 520,
};

function getViewportMaxRadius(x: number, y: number): number {
  if (typeof window === 'undefined') return DEFAULT_CELEBRATION_ORIGIN.maxRadius;
  const { innerWidth: w, innerHeight: h } = window;
  return (
    Math.max(
      Math.hypot(x, y),
      Math.hypot(w - x, y),
      Math.hypot(x, h - y),
      Math.hypot(w - x, h - y),
    ) * 1.1
  );
}

/** Viewport origin at mascot center; radii reach screen edges. */
export function measureScreenCelebrationOrigin(mascotEl: HTMLElement): CelebrationOrigin {
  const rect = mascotEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height * 0.42;
  const startRadius = Math.hypot(rect.width, rect.height) * 0.5;

  return {
    x,
    y,
    startRadius,
    maxRadius: getViewportMaxRadius(x, y),
  };
}
