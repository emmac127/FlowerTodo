/** Default seconds each animation frame is shown. */
export const DEFAULT_FRAME_DURATION_SEC = 0.15;

export interface ResolvedElementAnimation {
  frames: string[];
  frameDuration: number;
  /** Extra seconds to hold the last frame before the loop restarts. */
  lastFrameHold: number;
}

/** One cycle length in seconds (each frame + extra hold on the last). */
export function animationCycleDurationSec(anim: ResolvedElementAnimation): number {
  const n = anim.frames.length;
  if (n <= 0) return 0;
  return n * anim.frameDuration + anim.lastFrameHold;
}

/**
 * Frame index for a looping animation. Each frame shows for `frameDuration`;
 * the last frame stays for `frameDuration + lastFrameHold` before restarting.
 */
export function animationFrameIndexAt(
  elapsedSec: number,
  anim: ResolvedElementAnimation,
): number {
  const n = anim.frames.length;
  if (n <= 0) return 0;
  if (n === 1) return 0;

  const cycle = animationCycleDurationSec(anim);
  if (cycle <= 0) return 0;

  const t = ((elapsedSec % cycle) + cycle) % cycle;
  const lastStart = (n - 1) * anim.frameDuration;
  if (t >= lastStart) return n - 1;
  return Math.min(n - 1, Math.floor(t / anim.frameDuration));
}
