import { useCallback, useEffect, useRef } from 'react';
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
  gardenFlowerNeedsCellClip,
} from '../lib/plantedGarden';
import type { SeedGrowthStage } from '../lib/seedGrowth';
import { GroundFlowerLayer } from './GroundFlowerLayer';
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
  completedCount?: number;
  muted?: boolean;
}

type CellStyle = CSSProperties & { '--flower-h': number };

function getMaxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

export function GardenFlowerStrip({
  flowers,
  completedCount = 0,
  muted = false,
}: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const savedScrollLeftRef = useRef(0);
  const hasScrolledToEndRef = useRef(false);
  const needsScroll = gardenStripNeedsScroll(flowers.length);

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
    },
    [],
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

    const onScroll = () => {
      savedScrollLeftRef.current = el.scrollLeft;
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      const maxScroll = getMaxScrollLeft(el);
      if (savedScrollLeftRef.current > 0 && maxScroll > 0) {
        el.scrollLeft = Math.min(savedScrollLeftRef.current, maxScroll);
      } else if (!hasScrolledToEndRef.current && needsScroll) {
        el.scrollLeft = maxScroll;
        hasScrolledToEndRef.current = true;
      }
      savedScrollLeftRef.current = el.scrollLeft;
    });
    ro.observe(el);
    if (innerRef.current) ro.observe(innerRef.current);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [flowers.length, needsScroll]);

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
      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        <div ref={innerRef} className="garden-flower-scroll__inner">
          {flowers.map((flower) => {
            const cellStyle: CellStyle = {
              '--flower-h': FLOWER_HEIGHT_DVH[flower.seed],
            };
            const clipCell = gardenFlowerNeedsCellClip(flower.seed);
            return (
              <div
                key={flower.key}
                className={`garden-flower-cell${clipCell ? ' garden-flower-cell--clip' : ''}`}
                style={cellStyle}
              >
                <svg
                  className="garden-flower-cell__svg"
                  viewBox={`0 0 ${GARDEN_CELL_VIEW_WIDTH} ${GARDEN_CELL_VIEW_HEIGHT}`}
                  preserveAspectRatio="xMidYMax meet"
                  overflow={clipCell ? 'hidden' : 'visible'}
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
          <GroundFlowerLayer
            completedCount={completedCount}
            innerRef={innerRef}
            mainFlowerCount={flowers.length}
          />
        </div>
      </div>

      {needsScroll && (
        <>
          <button
            type="button"
            className="garden-flower-scroll-btn garden-flower-scroll-btn--left"
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll garden flowers left"
          />
          <button
            type="button"
            className="garden-flower-scroll-btn garden-flower-scroll-btn--right"
            onClick={() => scrollByPage(1)}
            aria-label="Scroll garden flowers right"
          />
        </>
      )}
    </div>
  );
}
