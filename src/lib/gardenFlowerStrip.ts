/** Flowers visible at once before horizontal scroll + arrows appear. */
export const FLOWERS_PER_SCROLL_PAGE = 3;

export function gardenStripNeedsScroll(total: number): boolean {
  return total > FLOWERS_PER_SCROLL_PAGE;
}
