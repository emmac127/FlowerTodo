import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GardenSeed } from '../lib/gardenSeed';
import {
  FLOWERS_PER_SCROLL_PAGE,
  gardenStripNeedsScroll,
} from '../lib/gardenFlowerStrip';
import {
  FLOWER_HEIGHT_DVH,
  GARDEN_CELL_VIEW_HEIGHT,
  GARDEN_CELL_VIEW_WIDTH,
} from '../lib/plantedGarden';
import type { SeedGrowthStage } from '../lib/seedGrowth';
import { GrowingSeedPlant } from './GrowingSeedPlant';

export interface GardenFlowerItem {
  key: string;
  seed: GardenSeed;
  growthStage: SeedGrowthStage;
  className?: string;
  fullPetalBloom?: boolean;
}

interface GardenFlowerStripProps {
  flowers: GardenFlowerItem[];
  muted?: boolean;
}

type CellStyle = CSSProperties & { '--flower-h': number };

function getMaxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

export function GardenFlowerStrip({ flowers, muted = false }: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const savedScrollLeftRef = useRef(0);
  const hasScrolledToEndRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const needsScroll = gardenStripNeedsScroll(flowers.length);

  const updateScrollButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !needsScroll) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = getMaxScrollLeft(el);
    savedScrollLeftRef.current = el.scrollLeft;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2);
  }, [needsScroll]);

  const scrollViewportTo = useCallback(
    (left: number, smooth: boolean) => {
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
      savedScrollLeftRef.current = next;
      requestAnimationFrame(updateScrollButtons);
    },
    [updateScrollButtons],
  );

  const scrollToEnd = useCallback(
    (smooth: boolean) => {
      const el = viewportRef.current;
      if (!el) return;
      scrollViewportTo(getMaxScrollLeft(el), smooth);
    },
    [scrollViewportTo],
  );

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const el = viewportRef.current;
      if (!el || !needsScroll) return;
      const maxScroll = getMaxScrollLeft(el);
      if (maxScroll <= 0) return;

      const step = el.clientWidth / FLOWERS_PER_SCROLL_PAGE;
      const next = el.scrollLeft + step * direction;
      scrollViewportTo(next, true);
    },
    [needsScroll, scrollViewportTo],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      const maxScroll = getMaxScrollLeft(el);
      if (savedScrollLeftRef.current > 0 && maxScroll > 0) {
        el.scrollLeft = Math.min(savedScrollLeftRef.current, maxScroll);
      } else if (!hasScrolledToEndRef.current && needsScroll) {
        el.scrollLeft = maxScroll;
        hasScrolledToEndRef.current = true;
      }
      updateScrollButtons();
    });
    ro.observe(el);
    if (innerRef.current) ro.observe(innerRef.current);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [flowers.length, needsScroll, updateScrollButtons]);

  useEffect(() => {
    hasScrolledToEndRef.current = false;
    savedScrollLeftRef.current = 0;

    if (!needsScroll || flowers.length === 0) return;

    const scroll = () => scrollToEnd(false);
    scroll();
    requestAnimationFrame(scroll);
    const t1 = window.setTimeout(scroll, 80);
    const t2 = window.setTimeout(scroll, 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [flowers.length, needsScroll, scrollToEnd]);

  if (flowers.length === 0) return null;

  return (
    <div
      className={`garden-flower-strip${needsScroll ? ' garden-flower-strip--scrollable' : ''}`}
    >
      {needsScroll && (
        <button
          type="button"
          className="garden-flower-scroll-btn garden-flower-scroll-btn--left"
          onPointerDown={(e) => {
            e.preventDefault();
            scrollByPage(-1);
          }}
          disabled={!canScrollLeft}
          aria-label="Scroll garden flowers left"
        />
      )}

      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        <div ref={innerRef} className="garden-flower-scroll__inner">
          {flowers.map((flower) => {
            const cellStyle: CellStyle = {
              '--flower-h': FLOWER_HEIGHT_DVH[flower.seed],
            };
            return (
              <div key={flower.key} className="garden-flower-cell" style={cellStyle}>
                <svg
                  className="garden-flower-cell__svg"
                  viewBox={`0 0 ${GARDEN_CELL_VIEW_WIDTH} ${GARDEN_CELL_VIEW_HEIGHT}`}
                  preserveAspectRatio="xMidYMax meet"
                  overflow="visible"
                  aria-hidden
                >
                  <GrowingSeedPlant
                    seed={flower.seed}
                    growthStage={flower.growthStage}
                    x={GARDEN_CELL_VIEW_WIDTH / 2}
                    className={flower.className}
                    fullPetalBloom={flower.fullPetalBloom}
                    muted={muted}
                  />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {needsScroll && (
        <button
          type="button"
          className="garden-flower-scroll-btn garden-flower-scroll-btn--right"
          onPointerDown={(e) => {
            e.preventDefault();
            scrollByPage(1);
          }}
          disabled={!canScrollRight}
          aria-label="Scroll garden flowers right"
        />
      )}
    </div>
  );
}
