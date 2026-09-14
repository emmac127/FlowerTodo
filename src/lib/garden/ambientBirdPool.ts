import type { GardenConfig } from './loadConfig';
import type { AmbientBirdPoolConfig, PlacedElement } from './types';

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 4;
const DEFAULT_DEPART_MIN = 40;
const DEFAULT_DEPART_MAX = 100;
const DEFAULT_ARRIVE_MIN = 25;
const DEFAULT_ARRIVE_MAX = 80;

/** Normalize / clamp ambientBirds block from mode2.yaml. */
export function parseAmbientBirdPoolConfig(
  raw: unknown,
): AmbientBirdPoolConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;

  const maxAmbientBirds = positiveInt(o.maxAmbientBirds, DEFAULT_MAX);
  let minAmbientBirds = nonNegativeInt(o.minAmbientBirds, DEFAULT_MIN);
  minAmbientBirds = Math.min(minAmbientBirds, maxAmbientBirds);
  let minDepartureWait = positiveNumber(o.minDepartureWait, DEFAULT_DEPART_MIN);
  let maxDepartureWait = positiveNumber(o.maxDepartureWait, DEFAULT_DEPART_MAX);
  if (maxDepartureWait < minDepartureWait) {
    [minDepartureWait, maxDepartureWait] = [maxDepartureWait, minDepartureWait];
  }
  let minArrivalWait = positiveNumber(o.minArrivalWait, DEFAULT_ARRIVE_MIN);
  let maxArrivalWait = positiveNumber(o.maxArrivalWait, DEFAULT_ARRIVE_MAX);
  if (maxArrivalWait < minArrivalWait) {
    [minArrivalWait, maxArrivalWait] = [maxArrivalWait, minArrivalWait];
  }

  const introPopupLevel =
    o.introPopupLevel != null ? positiveInt(o.introPopupLevel, 0) : undefined;
  const introPopupText =
    typeof o.introPopupText === 'string' && o.introPopupText.trim()
      ? o.introPopupText.trim()
      : undefined;

  return {
    minAmbientBirds,
    maxAmbientBirds,
    minDepartureWait,
    maxDepartureWait,
    minArrivalWait,
    maxArrivalWait,
    ...(introPopupLevel && introPopupLevel > 0 ? { introPopupLevel } : {}),
    ...(introPopupText ? { introPopupText } : {}),
  };
}

function positiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function nonNegativeInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function positiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function randomWaitSeconds(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Fisher–Yates shuffle (copy). */
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Inclusive random integer in [min, max]. */
function randomIntInclusive(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** How many ambient bird slots a level defines (birds: list length, or 1). */
export function ambientBirdSlotCountForLevel(
  level: number,
  config: GardenConfig,
): number {
  const entry = config.levelsConfig.levels?.[String(level)];
  if (!entry) return 0;
  if (entry.birds?.length) {
    return entry.birds.filter((b) => {
      const def = config.levelsConfig.definitions?.[b.use];
      return def?.mode === 'birdAmbient';
    }).length;
  }
  const def = config.getLevelDefinition(level);
  return def?.mode === 'birdAmbient' ? 1 : 0;
}

/** Ambient birds currently present in a built scene. */
export function listAmbientBirds(elements: PlacedElement[]): PlacedElement[] {
  return elements.filter(
    (el) => el.kind === 'birdAmbientStage' && el.birdBehavior != null,
  );
}

/**
 * Candidates for timed fly-in: unlocked, not currently active, not from the
 * current level, and under that level's defined ambient slot count on-screen.
 */
export function pickArrivalCandidate(args: {
  unlocked: PlacedElement[];
  activeIds: ReadonlySet<string>;
  currentLevel: number;
  config: GardenConfig;
}): PlacedElement | null {
  const { unlocked, activeIds, currentLevel, config } = args;
  const activeByLevel = new Map<number, number>();
  for (const el of unlocked) {
    if (!activeIds.has(el.id)) continue;
    activeByLevel.set(el.level, (activeByLevel.get(el.level) ?? 0) + 1);
  }

  const candidates = unlocked.filter((el) => {
    if (activeIds.has(el.id)) return false;
    if (el.level === currentLevel) return false;
    const onScreen = activeByLevel.get(el.level) ?? 0;
    const cap = ambientBirdSlotCountForLevel(el.level, config);
    return onScreen < cap;
  });

  return pickRandom(candidates);
}

/** True when flying one bird away would not drop below the configured minimum. */
export function canDepartAmbientBird(
  activeCount: number,
  minAmbientBirds: number,
): boolean {
  return activeCount > minAmbientBirds;
}

/** Non-current-level birds currently active (eligible to fly away). */
export function pickDepartureCandidate(args: {
  unlocked: PlacedElement[];
  activeIds: ReadonlySet<string>;
  currentLevel: number;
  minAmbientBirds: number;
  /** Prefer excluding these (e.g. the bird that just arrived). */
  excludeIds?: ReadonlySet<string>;
}): PlacedElement | null {
  const { unlocked, activeIds, currentLevel, minAmbientBirds, excludeIds } =
    args;
  if (!canDepartAmbientBird(activeIds.size, minAmbientBirds)) return null;
  const candidates = unlocked.filter((el) => {
    if (!activeIds.has(el.id)) return false;
    if (el.level === currentLevel) return false;
    if (excludeIds?.has(el.id)) return false;
    return true;
  });
  return pickRandom(candidates);
}

/**
 * Initial active set on first load / pool enable:
 * - Always includes every unlocked bird from the current level.
 * - Randomly fills from earlier unlocked levels so the on-screen count is
 *   between minAmbientBirds and maxAmbientBirds (when enough birds exist).
 * - If current-level birds alone exceed max, all of them still show.
 */
export function initialActiveAmbientIds(
  unlocked: PlacedElement[],
  currentLevel: number,
  minAmbientBirds: number,
  maxAmbientBirds: number,
): Set<string> {
  if (unlocked.length === 0) return new Set();

  const current = unlocked.filter((el) => el.level === currentLevel);
  const earlier = shuffled(
    unlocked.filter((el) => el.level !== currentLevel),
  );

  const available = unlocked.length;
  // Current-level birds always show, even if that exceeds max.
  const floor = Math.min(
    available,
    Math.max(minAmbientBirds, current.length),
  );
  const ceiling = Math.min(
    available,
    Math.max(maxAmbientBirds, current.length),
  );
  const target = randomIntInclusive(floor, ceiling);

  const chosen: string[] = current.map((el) => el.id);
  for (const el of earlier) {
    if (chosen.length >= target) break;
    chosen.push(el.id);
  }
  return new Set(chosen);
}
