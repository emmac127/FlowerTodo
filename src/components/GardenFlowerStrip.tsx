import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface GardenFlowerStripProps {
  children: ReactNode;
  /**
   * Changing this value scrolls the strip to the far right (newest element).
   * Pass the live completion count during gameplay; omit in the editor.
   */
  autoScrollKey?: number;
  /** Disable auto-scroll-to-end (used by the editor for free panning). */
  freeScroll?: boolean;
}

function getMaxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

/**
 * Horizontal-scroll shell for the garden. It only owns scrolling: the actual
 * scene is rendered by its children (a GardenSceneCanvas).
 */
export function GardenFlowerStrip({
  children,
  autoScrollKey = 0,
  freeScroll = false,
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
    if (freeScroll) return;
    const el = viewportRef.current;
    if (!el) return;
    const scroll = () => scrollViewportTo(getMaxScrollLeft(el), true);
    scroll();
    const raf = requestAnimationFrame(scroll);
    const t1 = window.setTimeout(scroll, 120);
    const t2 = window.setTimeout(scroll, 350);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [autoScrollKey, freeScroll, scrollViewportTo]);

  return (
    <div
      className={`garden-flower-strip${needsScroll ? ' garden-flower-strip--scrollable' : ''}${freeScroll ? ' garden-flower-strip--editing' : ''}`}
    >
      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        {children}
      </div>

      {needsScroll && (
        <>
          <button
            type="button"
            className="garden-flower-scroll-btn garden-flower-scroll-btn--left"
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll garden left"
          />
          <button
            type="button"
            className="garden-flower-scroll-btn garden-flower-scroll-btn--right"
            onClick={() => scrollByPage(1)}
            aria-label="Scroll garden right"
          />
        </>
      )}
    </div>
  );
}
