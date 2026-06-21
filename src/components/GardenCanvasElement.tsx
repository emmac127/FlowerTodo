import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Fired once the asset's display height is known (cache hit or image load). */
  onDisplaySizeReady?: () => void;
}

export function GardenCanvasElement({
  element,
  style,
  className,
  onPointerDown,
  onDisplaySizeReady,
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
  const imgRef = useRef<HTMLImageElement>(null);
  const displaySizeReadyRef = useRef(false);

  const [naturalHeight, setNaturalHeight] = useState<number | null>(() =>
    getCachedNaturalHeight(measureKey),
  );

  const notifyDisplaySizeReady = useCallback(() => {
    if (displaySizeReadyRef.current) return;
    displaySizeReadyRef.current = true;
    onDisplaySizeReady?.();
  }, [onDisplaySizeReady]);

  useEffect(() => {
    displaySizeReadyRef.current = false;
    setNaturalHeight(getCachedNaturalHeight(measureKey));
  }, [measureKey]);

  useLayoutEffect(() => {
    const cached = getCachedNaturalHeight(measureKey);
    if (cached != null) {
      setNaturalHeight(cached);
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalHeight > 0) {
      setNaturalHeight(cacheNaturalHeight(measureKey, img.naturalHeight));
    }
  }, [measureKey, src]);

  useEffect(() => {
    if (naturalHeight == null) return;
    notifyDisplaySizeReady();
  }, [naturalHeight, notifyDisplaySizeReady]);

  const sizeReady = naturalHeight != null;
  const displayHeight = sizeReady
    ? elementPixelHeightFromNatural(naturalHeight, element)
    : elementFallbackPixelHeight(element);

  return (
    <img
      ref={imgRef}
      className={className}
      style={{
        ...style,
        height: `${displayHeight}px`,
        opacity: sizeReady ? (style.opacity ?? 1) : 0,
        visibility: sizeReady ? (style.visibility ?? 'visible') : 'hidden',
      }}
      src={src}
      alt=""
      draggable={false}
      aria-hidden
      onLoad={(event) => {
        const height = event.currentTarget.naturalHeight;
        if (height <= 0) return;
        setNaturalHeight(cacheNaturalHeight(measureKey, height));
      }}
      onPointerDown={onPointerDown}
    />
  );
}
