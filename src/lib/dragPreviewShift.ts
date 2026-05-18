/** TranslateY (px) for a list row during drag preview. */
export function getDragShiftY(
  rowIndex: number,
  fromIndex: number,
  insertIndex: number,
  slideStepPx: number,
): number {
  if (rowIndex === fromIndex || fromIndex === insertIndex) return 0;

  if (fromIndex < insertIndex) {
    if (rowIndex > fromIndex && rowIndex <= insertIndex) return -slideStepPx;
  } else if (fromIndex > insertIndex) {
    if (rowIndex >= insertIndex && rowIndex < fromIndex) return slideStepPx;
  }

  return 0;
}

/** List index where the dragged item would land (DOM order, includes gap row). */
export function getPreviewInsertIndex(
  clientY: number,
  incompleteIds: string[],
  activeId: string,
): number {
  if (incompleteIds.length === 0) return 0;

  for (let i = 0; i < incompleteIds.length; i++) {
    const id = incompleteIds[i];
    const el =
      id === activeId
        ? document.querySelector<HTMLElement>(`[data-drag-placeholder="${activeId}"]`)
        : document.querySelector<HTMLElement>(
            `[data-task-id="${id}"]:not([data-drag-floating])`,
          );

    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (clientY < mid) return i;
  }

  return incompleteIds.length - 1;
}

export function measureDragSlideStepPx(rowEl: HTMLElement): number {
  const rowRect = rowEl.getBoundingClientRect();
  const list = rowEl.closest('.task-list');
  if (!list) return rowRect.height + 10;

  const gap = Number.parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap);
  return rowRect.height + (Number.isFinite(gap) ? gap : 10);
}
