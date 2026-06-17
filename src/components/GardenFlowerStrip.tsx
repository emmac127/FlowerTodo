import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface GardenFlowerStripProps {
  children: ReactNode;
  /**
   * Changing this value scrolls the strip to keep the focused element in view.
   * Pass the live completion count during gameplay.
   */
  autoScrollKey?: number;
  /**
   * Normalized horizontal position (0–1) on the design canvas for the element
   * to keep in view — usually the newest or active garden element.
   */
  scrollFocusX?: number;
  /** Disable auto-scroll (used by the editor for free panning). */
  freeScroll?: boolean;
  /** Editor: list-selected flower — show crosshair and allow click-to-place. */
  placeMode?: boolean;
  /** Fired after the viewport is synced to scrollFocusX (before paint). */
  onFocusScrollReady?: () => void;
}

function getMaxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

/** Scroll so `focusXNorm` (0–1 across the canvas) sits centered in the viewport. */
function scrollToDesignFocus(
  viewport: HTMLElement,
  focusXNorm: number,
  smooth: boolean,
): boolean {
  const canvas = viewport.querySelector<HTMLElement>('.garden-canvas');
  if (!canvas || canvas.offsetWidth <= 0) return false;

  const focusPx = focusXNorm * canvas.offsetWidth;
  const maxScroll = getMaxScrollLeft(viewport);
  const target = focusPx - viewport.clientWidth * 0.5;
  const left = Math.max(0, Math.min(maxScroll, target));

  if (smooth) {
    try {
      viewport.scrollTo({ left, behavior: 'smooth' });
    } catch {
      viewport.scrollLeft = left;
    }
    return true;
  }

  // CSS `scroll-behavior: smooth` would still animate a direct scrollLeft assignment.
  const prevBehavior = viewport.style.scrollBehavior;
  viewport.style.scrollBehavior = 'auto';
  viewport.scrollLeft = left;
  viewport.style.scrollBehavior = prevBehavior;
  return true;
}

/**
 * Horizontal-scroll shell for the garden. It only owns scrolling: the actual
 * scene is rendered by its children (a GardenSceneCanvas).
 */
export function GardenFlowerStrip({
  children,
  autoScrollKey = 0,
  scrollFocusX = 0,
  freeScroll = false,
  placeMode = false,
  onFocusScrollReady,
}: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  const scrollViewportTo = useCallback((left: number, smooth: boolean) => {
    const el = viewportRef.current;
    if (!el) return;
    const maxScroll = getMaxScrollLeft(el);
    const next = Math.max(0, Math.min(maxScroll, left));
    if (smooth) {
      try {
        el.scrollTo({ left: next, behavior: 'smooth' });
      } catch {
        el.scrollLeft = next;
      }
    } else {
      el.scrollLeft = next;
    }
  }, []);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const el = viewportRef.current;
      if (!el) return;
      const step = el.clientWidth * 0.6;
      scrollViewportTo(el.scrollLeft + step * direction, true);
    },
    [scrollViewportTo],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      setNeedsScroll(getMaxScrollLeft(el) > 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    if (!freeScroll) return;
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;

      const maxScroll = getMaxScrollLeft(el);
      if (maxScroll <= 0) return;

      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (delta === 0) return;

      e.preventDefault();
      scrollViewportTo(el.scrollLeft + delta, false);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [freeScroll, scrollViewportTo]);

  /** Snap scroll before paint when focus changes so new flowers are not shown mid-pan. */
  useLayoutEffect(() => {
    if (freeScroll) return;
    const el = viewportRef.current;
    if (!el) return;

    const syncScroll = () => scrollToDesignFocus(el, scrollFocusX, false);

    if (syncScroll()) {
      onFocusScrollReady?.();
    }

    const ro = new ResizeObserver(() => {
      if (syncScroll()) {
        onFocusScrollReady?.();
      }
    });
    ro.observe(el);
    const canvas = el.querySelector<HTMLElement>('.garden-canvas');
    if (canvas) ro.observe(canvas);

    return () => ro.disconnect();
  }, [autoScrollKey, scrollFocusX, freeScroll, onFocusScrollReady]);

  return (
    <div
      className={`garden-flower-strip${needsScroll ? ' garden-flower-strip--scrollable' : ''}${freeScroll ? ' garden-flower-strip--editing' : ''}${placeMode ? ' garden-flower-strip--place-mode' : ''}`}
    >
      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        {children}
      </div>

      {needsScroll && !freeScroll && (
        <>
          <button
            type="button"
            className="garden-flower-scroll-zone garden-flower-scroll-zone--left"
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll garden left"
          />
          <button
            type="button"
            className="garden-flower-scroll-zone garden-flower-scroll-zone--right"
            onClick={() => scrollByPage(1)}
            aria-label="Scroll garden right"
          />
        </>
      )}

    </div>
  );
}
