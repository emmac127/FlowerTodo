import { getGardenFlowerScale } from './plantedGarden';

/** Flowers visible at once before horizontal scroll + arrows appear. */
export const FLOWERS_PER_SCROLL_PAGE = 3;

const STRIP_VIEW_WIDTH = 400;
const STRIP_MIN_X = 104;
const STRIP_MAX_X = 296;
const flowerScale = getGardenFlowerScale();
const SCROLL_SLOT_START = 56 * flowerScale;
export const SCROLL_SLOT_SPACING = 96 * flowerScale;
const SCROLL_END_PADDING = 56 * flowerScale;

/** Left-to-right X in the garden SVG for flower at index (0-based). */
export function getFlowerStripX(index: number, total: number): number {
  if (total <= 1) return STRIP_VIEW_WIDTH / 2;
  if (total <= FLOWERS_PER_SCROLL_PAGE) {
    return STRIP_MIN_X + (index / (total - 1)) * (STRIP_MAX_X - STRIP_MIN_X);
  }
  return SCROLL_SLOT_START + index * SCROLL_SLOT_SPACING;
}

export function getFlowerStripViewWidth(total: number): number {
  if (total <= FLOWERS_PER_SCROLL_PAGE) return STRIP_VIEW_WIDTH;
  return SCROLL_SLOT_START + total * SCROLL_SLOT_SPACING + SCROLL_END_PADDING;
}

export function gardenStripNeedsScroll(total: number): boolean {
  return total > FLOWERS_PER_SCROLL_PAGE;
}
