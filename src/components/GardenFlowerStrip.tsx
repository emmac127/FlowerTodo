import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { snapScrollLeft } from '../lib/garden/gardenPixelSnap';

interface GardenFlowerStripProps {
  children: ReactNode;
  /** Editor: enable horizontal panning (ctrl+wheel) and scrollbar. */
  freeScroll?: boolean;
  /** Editor: list-selected flower — show crosshair and allow click-to-place. */
  placeMode?: boolean;
}

function getMaxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

/**
 * Wrapper for the garden canvas. Gameplay pins the viewport (no panning); the
 * editor can scroll horizontally to reach off-screen layout slots.
 */
export function GardenFlowerStrip({
  children,
  freeScroll = false,
  placeMode = false,
}: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (freeScroll) return;
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [freeScroll]);

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
      const next = snapScrollLeft(
        Math.max(0, Math.min(maxScroll, el.scrollLeft + delta)),
      );
      el.scrollLeft = next;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [freeScroll]);

  return (
    <div
      className={`garden-flower-strip${freeScroll ? ' garden-flower-strip--editing' : ' garden-flower-strip--fixed'}${placeMode ? ' garden-flower-strip--place-mode' : ''}`}
    >
      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        {children}
      </div>
    </div>
  );
}
