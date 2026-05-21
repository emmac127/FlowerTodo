import { FLOWER_PALETTES, type FlowerPalette } from './growthTier';

/** Deterministic PRNG — stable colors/positions per completion index. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GroundFlowerAppearance {
  palette: FlowerPalette;
  scale: number;
  petalCount: number;
  rotation: number;
}

export function getGroundFlowerAppearance(completionIndex: number): GroundFlowerAppearance {
  const rand = mulberry32(completionIndex * 7919);
  const palette = FLOWER_PALETTES[Math.floor(rand() * FLOWER_PALETTES.length)]!;
  return {
    palette,
    scale: 0.6 + rand() * 0.45,
    petalCount: 5 + Math.floor(rand() * 4),
    rotation: rand() * 24 - 12,
  };
}

export interface GroundFlowerGap {
  left: number;
  width: number;
}

/**
 * Fraction of each cell width on either side of the stem reserved for the
 * main flower (its bloom + leaves). Ground flowers are kept out of this zone
 * but free to scatter through everything else.
 */
const STEM_SAFE_ZONE_FRACTION = 0.18;
const MIN_GAP_WIDTH = 8;

/**
 * Horizontal regions available for ground flowers, in inner-local px.
 *
 * Gaps are defined as the inner-row width minus a "safe zone" around each
 * main flower's stem center, NOT the literal CSS gap between cells. This
 * keeps the layout naturally spread out whether the strip is centered
 * (few cells) or scrollable (many cells, `width: max-content`).
 */
export function collectGroundFlowerGaps(inner: HTMLElement): GroundFlowerGap[] {
  const innerRect = inner.getBoundingClientRect();
  const cells = Array.from(
    inner.querySelectorAll<HTMLElement>('.garden-flower-cell'),
  );

  if (cells.length === 0) {
    return [{ left: innerRect.width * 0.1, width: innerRect.width * 0.8 }];
  }

  // Safe (forbidden) zones around each stem center, sorted left-to-right.
  const safeZones = cells
    .map((cell) => {
      const r = cell.getBoundingClientRect();
      const center = (r.left + r.right) / 2 - innerRect.left;
      const radius = r.width * STEM_SAFE_ZONE_FRACTION;
      return { start: center - radius, end: center + radius };
    })
    .sort((a, b) => a.start - b.start);

  // Walk left to right, building gaps from any non-forbidden span.
  const gaps: GroundFlowerGap[] = [];
  let cursor = 0;
  for (const zone of safeZones) {
    const gapEnd = Math.max(cursor, zone.start);
    if (gapEnd - cursor > MIN_GAP_WIDTH) {
      gaps.push({ left: cursor, width: gapEnd - cursor });
    }
    cursor = Math.max(cursor, zone.end);
  }
  if (innerRect.width - cursor > MIN_GAP_WIDTH) {
    gaps.push({ left: cursor, width: innerRect.width - cursor });
  }

  if (gaps.length === 0) {
    gaps.push({ left: innerRect.width * 0.15, width: innerRect.width * 0.7 });
  }

  return gaps;
}

export interface GroundFlowerPlacement {
  completionIndex: number;
  left: number;
  bottom: number;
  appearance: GroundFlowerAppearance;
}

/** Minimum center-to-center distance between ground flowers (px). */
const MIN_GROUND_FLOWER_SEPARATION = 20;
const MIN_SEPARATION_SQ =
  MIN_GROUND_FLOWER_SEPARATION * MIN_GROUND_FLOWER_SEPARATION;

/** How many random positions to try before falling back to the best-so-far. */
const PLACEMENT_ATTEMPTS = 32;

interface GapPlan {
  gap: GroundFlowerGap;
  indices: number[];
  hPad: number;
  usableLeft: number;
  usableWidth: number;
}

/**
 * Distribute completion indices across gaps weighted by usable width, so wider
 * areas get proportionally more flowers (and we don't pile them into narrow
 * side margins).
 */
function planGaps(
  gaps: GroundFlowerGap[],
  completedCount: number,
): GapPlan[] {
  const plans: GapPlan[] = gaps.map((gap) => {
    const hPad = Math.min(Math.max(gap.width * 0.08, 4), 12);
    const usableWidth = Math.max(gap.width - hPad * 2, 1);
    return {
      gap,
      indices: [] as number[],
      hPad,
      usableLeft: gap.left + hPad,
      usableWidth,
    };
  });

  const totalUsable = plans.reduce((sum, p) => sum + p.usableWidth, 0) || 1;
  // Running fractional accumulator — assigns each new flower to whichever gap
  // is currently "behind" its weight share, giving a balanced spread.
  const desired = plans.map(() => 0);

  for (let k = 1; k <= completedCount; k++) {
    for (let i = 0; i < plans.length; i++) {
      desired[i]! += plans[i]!.usableWidth / totalUsable;
    }
    let pick = 0;
    let best = -Infinity;
    for (let i = 0; i < plans.length; i++) {
      const shortfall = desired[i]! - plans[i]!.indices.length;
      if (shortfall > best) {
        best = shortfall;
        pick = i;
      }
    }
    plans[pick]!.indices.push(k);
  }

  return plans;
}

export function buildGroundFlowerPlacements(
  inner: HTMLElement,
  completedCount: number,
): GroundFlowerPlacement[] {
  if (completedCount <= 0) return [];

  const gaps = collectGroundFlowerGaps(inner);
  const innerHeight = inner.getBoundingClientRect().height;
  const maxBottom = Math.min(Math.max(innerHeight * 0.42, 32), 64);
  const minBottom = 2;
  const yRange = maxBottom - minBottom;

  const plans = planGaps(gaps, completedCount);
  const placements: GroundFlowerPlacement[] = [];

  for (const plan of plans) {
    if (plan.indices.length === 0) continue;
    // Per-gap list lets rejection sampling check only nearby neighbors.
    const placedInGap: { left: number; bottom: number }[] = [];

    for (const completionIndex of plan.indices) {
      const rand = mulberry32(completionIndex * 9973);

      let bestLeft = 0;
      let bestBottom = 0;
      let bestDistSq = -Infinity;
      let accepted = false;

      for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
        const candidateLeft =
          plan.usableLeft + rand() * plan.usableWidth;
        const candidateBottom = minBottom + rand() * yRange;

        let nearestSq = Infinity;
        for (const placed of placedInGap) {
          const dx = placed.left - candidateLeft;
          const dy = placed.bottom - candidateBottom;
          const dSq = dx * dx + dy * dy;
          if (dSq < nearestSq) nearestSq = dSq;
          if (dSq < MIN_SEPARATION_SQ) break;
        }

        if (placedInGap.length === 0 || nearestSq >= MIN_SEPARATION_SQ) {
          bestLeft = candidateLeft;
          bestBottom = candidateBottom;
          accepted = true;
          break;
        }

        if (nearestSq > bestDistSq) {
          bestDistSq = nearestSq;
          bestLeft = candidateLeft;
          bestBottom = candidateBottom;
        }
      }

      if (!accepted && placedInGap.length === 0) {
        // First flower in gap — center is fine as a fallback.
        bestLeft = plan.usableLeft + plan.usableWidth * 0.5;
        bestBottom = minBottom + yRange * 0.5;
      }

      placedInGap.push({ left: bestLeft, bottom: bestBottom });
      placements.push({
        completionIndex,
        left: bestLeft,
        bottom: bestBottom,
        appearance: getGroundFlowerAppearance(completionIndex),
      });
    }
  }

  placements.sort((a, b) => a.completionIndex - b.completionIndex);
  return placements;
}
