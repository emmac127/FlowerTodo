import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { animationFrameIndexAt } from '../lib/garden/gardenAnimation';
import {
  cacheNaturalHeight,
  elementFallbackPixelHeight,
  elementMeasureKey,
  elementPixelHeightFromNatural,
  getCachedNaturalHeight,
} from '../lib/garden/elementDisplaySize';
import type { PlacedElement } from '../lib/garden/types';

interface GardenCanvasElementProps {
  element: PlacedElement;
  style: CSSProperties;
  className: string;
  onPointerDown?: (event: ReactPointerEvent<HTMLImageElement>) => void;
}

export function GardenCanvasElement({
  element,
  style,
  className,
  onPointerDown,
}: GardenCanvasElementProps) {
  const anim = element.animation;
  const [frameIndex, setFrameIndex] = useState(0);
  const indexRef = useRef(0);

  const animationFrameKey = anim?.frames.join('\0') ?? '';
  const animTimingKey = anim
    ? `${anim.frameDuration}\0${anim.lastFrameHold}`
    : '';

  useEffect(() => {
    if (!anim || anim.frames.length < 2) {
      setFrameIndex(0);
      indexRef.current = 0;
      return;
    }

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const next = animationFrameIndexAt(elapsed, anim);
      if (next !== indexRef.current) {
        indexRef.current = next;
        setFrameIndex(next);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animationFrameKey, animTimingKey]);

  const src =
    anim && anim.frames.length > 0
      ? anim.frames[frameIndex] ?? element.src
      : element.src;

  const measureKey = elementMeasureKey(element);

  const [naturalHeight, setNaturalHeight] = useState<number | null>(() =>
    getCachedNaturalHeight(measureKey),
  );

  // Swap cached measurement when the asset changes — never clear on layout edits.
  useEffect(() => {
    setNaturalHeight(getCachedNaturalHeight(measureKey));
  }, [measureKey]);

  const displayHeight =
    naturalHeight != null
      ? elementPixelHeightFromNatural(naturalHeight, element)
      : elementFallbackPixelHeight(element);

  return (
    <img
      className={className}
      style={{ ...style, height: `${displayHeight}px` }}
      src={src}
      alt=""
      draggable={false}
      aria-hidden
      onLoad={(event) => {
        const height = event.currentTarget.naturalHeight;
        if (height <= 0) return;
        // Keep the tallest frame so animated sprites never shrink mid-loop.
        const cached = cacheNaturalHeight(measureKey, height);
        setNaturalHeight(cached);
      }}
      onPointerDown={onPointerDown}
    />
  );
}
