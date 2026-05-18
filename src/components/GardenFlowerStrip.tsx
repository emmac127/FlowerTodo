import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GardenSeed } from '../lib/gardenSeed';
import {
  FLOWERS_PER_SCROLL_PAGE,
  gardenStripNeedsScroll,
  getFlowerStripViewWidth,
  getFlowerStripX,
  SCROLL_SLOT_SPACING,
} from '../lib/gardenFlowerStrip';
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

export function GardenFlowerStrip({ flowers, muted = false }: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const needsScroll = gardenStripNeedsScroll(flowers.length);
  const stripWidth = getFlowerStripViewWidth(flowers.length);

  const updateScrollButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !needsScroll) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, [needsScroll]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      ro.disconnect();
    };
  }, [flowers.length, needsScroll, updateScrollButtons]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !needsScroll) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    requestAnimationFrame(updateScrollButtons);
  }, [flowers.length, needsScroll, updateScrollButtons]);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const el = viewportRef.current;
      if (!el) return;
      const step = Math.min(SCROLL_SLOT_SPACING, el.clientWidth / FLOWERS_PER_SCROLL_PAGE);
      el.scrollBy({ left: step * direction, behavior: 'smooth' });
    },
    [],
  );

  const innerMinWidth = useMemo(() => {
    if (!needsScroll) return undefined;
    return `${(flowers.length / FLOWERS_PER_SCROLL_PAGE) * 100}%`;
  }, [flowers.length, needsScroll]);

  if (flowers.length === 0) return null;

  return (
    <div
      className={`garden-flower-strip${needsScroll ? ' garden-flower-strip--scrollable' : ''}`}
    >
      {needsScroll && (
        <button
          type="button"
          className="garden-flower-scroll-btn garden-flower-scroll-btn--left"
          onClick={() => scrollByPage(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll garden flowers left"
        />
      )}

      <div ref={viewportRef} className="garden-flower-scroll__viewport">
        <div className="garden-flower-scroll__inner" style={{ minWidth: innerMinWidth }}>
          <svg
            className="garden-svg garden-svg--planted garden-svg--strip"
            viewBox={`0 0 ${stripWidth} 120`}
            preserveAspectRatio={needsScroll ? 'xMinYMax meet' : 'xMidYMax meet'}
            aria-hidden
          >
            <g className="garden-growing-seed">
              {flowers.map((flower, index) => (
                <GrowingSeedPlant
                  key={flower.key}
                  seed={flower.seed}
                  growthStage={flower.growthStage}
                  x={getFlowerStripX(index, flowers.length)}
                  className={flower.className}
                  fullPetalBloom={flower.fullPetalBloom}
                  muted={muted}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      {needsScroll && (
        <button
          type="button"
          className="garden-flower-scroll-btn garden-flower-scroll-btn--right"
          onClick={() => scrollByPage(1)}
          disabled={!canScrollRight}
          aria-label="Scroll garden flowers right"
        />
      )}
    </div>
  );
}
