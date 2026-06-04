import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { animationFrameIndexAt } from '../lib/garden/gardenAnimation';
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
  }, [anim]);

  const src =
    anim && anim.frames.length > 0
      ? anim.frames[frameIndex] ?? element.src
      : element.src;

  return (
    <img
      className={className}
      style={style}
      src={src}
      alt=""
      draggable={false}
      aria-hidden
      onPointerDown={onPointerDown}
    />
  );
}
