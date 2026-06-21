import { useEffect, useRef, useCallback } from 'react';
import type { AnimationEvent, CSSProperties } from 'react';
import { elementFallbackPixelHeight } from '../lib/garden/elementDisplaySize';
import type { PlacedElement } from '../lib/garden/types';

const DAD_MASCOT_SRC = '/garden/clipboardalien.png';
const DELIVERY_MS = 2400;
/** Matches 54% keyframe in `dadMascotDeliveryCargo` — cargo set down on the anchor. */
export const DELIVERY_DROP_MS = Math.round(DELIVERY_MS * 0.54);

interface DadMascotDeliveryProps {
  element: PlacedElement;
  designWidth: number;
  designHeight: number;
  /** Width of the visible canvas in design pixels (pinned viewport on /dad). */
  visibleDesignWidth: number;
  /** Fired when the mascot sets the cargo down (before exit). */
  onDrop?: () => void;
  onComplete: () => void;
}

/** Tiny alien mascot carries a new moon asset in and sets it down at the anchor. */
export function DadMascotDelivery({
  element,
  designWidth,
  designHeight,
  visibleDesignWidth,
  onDrop,
  onComplete,
}: DadMascotDeliveryProps) {
  const completedRef = useRef(false);
  const droppedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onDropRef = useRef(onDrop);
  onCompleteRef.current = onComplete;
  onDropRef.current = onDrop;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    onDropRef.current?.();
  }, []);

  useEffect(() => {
    completedRef.current = false;
    droppedRef.current = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drop();
      finish();
      return;
    }
    const dropTimer = window.setTimeout(drop, DELIVERY_DROP_MS);
    const finishTimer = window.setTimeout(finish, DELIVERY_MS + 80);
    return () => {
      window.clearTimeout(dropTimer);
      window.clearTimeout(finishTimer);
    };
  }, [element.id, drop, finish]);

  const anchorX = element.x * designWidth;
  const anchorBottom = (1 - element.y) * designHeight;
  const cargoSrc =
    element.animation?.frames[0] ?? element.src;
  const cargoHeight = elementFallbackPixelHeight(element);
  const enterFromRight = anchorX < visibleDesignWidth / 2;
  const enterOffset = enterFromRight
    ? visibleDesignWidth - anchorX + 96
    : anchorX + 96;

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (
      event.animationName === 'dadMascotDeliveryRun' ||
      event.animationName === 'dadMascotDeliveryRunFromRight'
    ) {
      finish();
    }
  };

  const style = {
    left: `${anchorX}px`,
    bottom: `${anchorBottom}px`,
    '--delivery-enter-from': enterFromRight
      ? `${enterOffset}px`
      : `calc(-1 * ${enterOffset}px)`,
    '--garden-el-flip-x': element.flipX ? -1 : 1,
  } as CSSProperties;

  return (
    <div
      className={`dad-mascot-delivery${enterFromRight ? ' dad-mascot-delivery--from-right' : ''}`}
      style={style}
      aria-hidden
    >
      <div
        className="dad-mascot-delivery__runner"
        onAnimationEnd={handleAnimationEnd}
      >
        <img
          className="dad-mascot-delivery__mascot"
          src={DAD_MASCOT_SRC}
          alt=""
          draggable={false}
        />
        <img
          className="dad-mascot-delivery__cargo"
          src={cargoSrc}
          alt=""
          draggable={false}
          style={{ height: `${cargoHeight}px` }}
        />
      </div>
    </div>
  );
}
