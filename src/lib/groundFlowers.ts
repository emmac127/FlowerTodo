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

/** Horizontal gaps between main flower cells (plus side margins), in inner-local px. */
export function collectGroundFlowerGaps(inner: HTMLElement): GroundFlowerGap[] {
  const innerRect = inner.getBoundingClientRect();
  const cells = inner.querySelectorAll<HTMLElement>('.garden-flower-cell');
  const gaps: GroundFlowerGap[] = [];

  if (cells.length === 0) {
    return [{ left: innerRect.width * 0.15, width: innerRect.width * 0.7 }];
  }

  if (cells.length >= 2) {
    for (let i = 0; i < cells.length - 1; i++) {
      const a = cells[i]!.getBoundingClientRect();
      const b = cells[i + 1]!.getBoundingClientRect();
      const left = a.right - innerRect.left;
      const width = b.left - innerRect.left - left;
      if (width > 6) gaps.push({ left, width });
    }
  }

  const first = cells[0]!.getBoundingClientRect();
  const last = cells[cells.length - 1]!.getBoundingClientRect();
  const leftMargin = first.left - innerRect.left;
  if (leftMargin > 10) gaps.push({ left: 0, width: leftMargin });

  const rightStart = last.right - innerRect.left;
  const rightWidth = innerRect.width - rightStart;
  if (rightWidth > 10) gaps.push({ left: rightStart, width: rightWidth });

  if (gaps.length === 0) {
    gaps.push({ left: innerRect.width * 0.2, width: innerRect.width * 0.6 });
  }

  return gaps;
}

export interface GroundFlowerPlacement {
  completionIndex: number;
  left: number;
  bottom: number;
  appearance: GroundFlowerAppearance;
}

/** Minimum center-to-center spacing between small ground flowers (px). */
const MIN_GROUND_FLOWER_H_SPACING = 26;
const MIN_GROUND_FLOWER_V_SPACING = 14;

export function buildGroundFlowerPlacements(
  inner: HTMLElement,
  completedCount: number,
): GroundFlowerPlacement[] {
  if (completedCount <= 0) return [];

  const gaps = collectGroundFlowerGaps(inner);
  const innerHeight = inner.getBoundingClientRect().height;
  const maxBottom = Math.min(Math.max(innerHeight * 0.38, 28), 56);
  const minBottom = 2;

  const byGap: number[][] = gaps.map(() => []);
  for (let k = 1; k <= completedCount; k++) {
    byGap[(k - 1) % gaps.length]!.push(k);
  }

  const placements: GroundFlowerPlacement[] = [];

  for (let g = 0; g < gaps.length; g++) {
    const gap = gaps[g]!;
    const indices = byGap[g]!;
    const n = indices.length;
    if (n === 0) continue;

    const maxCols = Math.max(1, Math.floor(gap.width / MIN_GROUND_FLOWER_H_SPACING));
    const cols = Math.min(n, maxCols);
    const rows = Math.ceil(n / cols);
    const hPad = Math.min(Math.max(gap.width * 0.1, 6), 14);
    const usableW = Math.max(gap.width - hPad * 2, MIN_GROUND_FLOWER_H_SPACING);
    const rowStep =
      rows <= 1
        ? 0
        : Math.min(
            MIN_GROUND_FLOWER_V_SPACING + 6,
            (maxBottom - minBottom) / Math.max(rows - 1, 1),
          );

    indices.forEach((completionIndex, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rand = mulberry32(completionIndex * 9973);
      const jitterX = (rand() - 0.5) * 6;
      const jitterY = (rand() - 0.5) * 4;

      const left =
        gap.left +
        hPad +
        ((col + 0.5) / cols) * usableW +
        jitterX +
        (row % 2 === 1 ? MIN_GROUND_FLOWER_H_SPACING * 0.18 : 0);

      const bottom =
        minBottom +
        row * rowStep +
        (col % 2 === 1 ? MIN_GROUND_FLOWER_V_SPACING * 0.25 : 0) +
        jitterY;

      placements.push({
        completionIndex,
        left,
        bottom: Math.min(bottom, maxBottom),
        appearance: getGroundFlowerAppearance(completionIndex),
      });
    });
  }

  placements.sort((a, b) => a.completionIndex - b.completionIndex);
  return placements;
}
