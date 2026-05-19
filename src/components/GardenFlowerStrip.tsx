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

export function GardenFlowerStrip({ flowers, muted = false }: GardenFlowerStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollIndex, setScrollIndex] = useState(0);
  const needsScroll = gardenStripNeedsScroll(flowers.length);

  const scrollToCell = useCallback(
    (index: number, inline: ScrollLogicalPosition = 'nearest') => {
      const cell = cellRefs.current[index];
      if (!cell) return;
      try {
        cell.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline,
        });
      } catch {
        cell.scrollIntoView();
      }
    },
    [],
  );

  const syncScrollIndexFromViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !needsScroll) return;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.left + viewportRect.width / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    cellRefs.current.forEach((cell, index) => {
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const cellCenter = rect.left + rect.width / 2;
      const distance = Math.abs(cellCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setScrollIndex(closestIndex);
  }, [needsScroll]);

  useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, flowers.length);
  }, [flowers.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onScroll = () => syncScrollIndexFromViewport();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(viewport);

    return () => {
      viewport.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [flowers.length, needsScroll, syncScrollIndexFromViewport]);

  useEffect(() => {
    if (!needsScroll || flowers.length === 0) return;

    const endIndex = flowers.length - 1;
    setScrollIndex(endIndex);

    const scrollToEnd = () => scrollToCell(endIndex, 'end');
    scrollToEnd();
    requestAnimationFrame(scrollToEnd);
    const t1 = window.setTimeout(scrollToEnd, 80);
    const t2 = window.setTimeout(scrollToEnd, 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [flowers.length, needsScroll, scrollToCell]);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      if (!needsScroll) return;

      setScrollIndex((prev) => {
        const step = FLOWERS_PER_SCROLL_PAGE;
        const next = Math.max(
          0,
          Math.min(flowers.length - 1, prev + direction * step),
        );
        requestAnimationFrame(() => {
          scrollToCell(next, direction < 0 ? 'start' : 'end');
        });
        return next;
      });
    },
    [flowers.length, needsScroll, scrollToCell],
  );

  const canScrollLeft = needsScroll && scrollIndex > 0;
  const canScrollRight = needsScroll && scrollIndex < flowers.length - 1;

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
        <div className="garden-flower-scroll__inner">
          {flowers.map((flower, index) => {
            const cellStyle: CellStyle = {
              '--flower-h': FLOWER_HEIGHT_DVH[flower.seed],
            };
            return (
              <div
                key={flower.key}
                ref={(el) => {
                  cellRefs.current[index] = el;
                }}
                className="garden-flower-cell"
                style={cellStyle}
              >
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
