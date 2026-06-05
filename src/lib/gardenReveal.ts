import { getGardenCycleProgress, getGardenLevel } from './plantedGarden';

/** True when this completion advances the bottom garden (grow or new permanent flower). */
export function shouldRevealGardenForCompletion(
  completionIndex: number,
  previousGardenCount: number,
): boolean {
  if (completionIndex <= previousGardenCount) return false;

  if (getGardenLevel(completionIndex) > getGardenLevel(previousGardenCount)) {
    return true;
  }

  const { planted } = getGardenCycleProgress(completionIndex);
  return planted > 0;
}

export function getGardenRevealScrollTop(): number {
  const garden = document.querySelector<HTMLElement>('.garden-scene');
  if (!garden) return 0;

  const rect = garden.getBoundingClientRect();
  const lift = Math.min(window.innerHeight * 0.42, 360);
  const target = window.scrollY + rect.top - lift;
  return Math.max(0, target);
}

/** Matches `venetianBlindLift` duration in index.css. */
export const GARDEN_REVEAL_ANIM_MS = 680;
export const GARDEN_REVEAL_STAGGER_MS = 58;
/** Pause after the garden is visible before auto-returning to the task list. */
export const GARDEN_REVEAL_AUTO_RETURN_MS = 2000;
/** Matches `.growing-seed__*` transition in index.css. */
export const GARDEN_SEED_GROW_TRANSITION_MS = 600;
/** Pause after venetian lift before the bottom garden growth animation begins. */
export const GARDEN_REVEAL_GROWTH_DELAY_AFTER_LIFT_MS = 100;

export function getGardenRevealLiftDurationMs(
  blindSlatCount: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const stagger = Math.max(0, blindSlatCount - 1) * GARDEN_REVEAL_STAGGER_MS;
  return GARDEN_REVEAL_ANIM_MS + stagger;
}

/** Delay from reveal start until the garden flower growth step should run. */
export function getGardenRevealGrowthStartDelayMs(
  blindSlatCount: number,
  reducedMotion: boolean,
): number {
  return (
    getGardenRevealLiftDurationMs(blindSlatCount, reducedMotion) +
    GARDEN_REVEAL_GROWTH_DELAY_AFTER_LIFT_MS
  );
}

/** Delay from reveal start until auto "back to tasks" (lift, growth, then 2s). */
export function getGardenAutoReturnDelayMs(
  blindSlatCount: number,
  reducedMotion: boolean,
): number {
  const growthStart = getGardenRevealGrowthStartDelayMs(blindSlatCount, reducedMotion);
  const growthMs = reducedMotion ? 0 : GARDEN_SEED_GROW_TRANSITION_MS;
  return growthStart + growthMs + GARDEN_REVEAL_AUTO_RETURN_MS;
}
