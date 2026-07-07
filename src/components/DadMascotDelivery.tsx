import { useEffect, useRef, useCallback } from 'react';
import type { AnimationEvent, CSSProperties } from 'react';
import type { AppVariant } from '../lib/appVariant';
import mascotSrc from '../assets/kawaii-mascot.png';
import {
  elementFallbackPixelHeight,
  elementMeasureKey,
  elementPixelHeightFromNatural,
  getCachedNaturalHeight,
} from '../lib/garden/elementDisplaySize';
import type { PlacedElement } from '../lib/garden/types';
import {
  snapAnchorDesignPx,
  snapDesignLength,
} from '../lib/garden/gardenPixelSnap';

const DAD_MASCOT_SRC = '/garden/clipboardalien.png';
/** Generic flower token when the stage's `mascotDeliversElement` is false. */
const GENERIC_MASCOT_CARGO_SRC = '/garden/assets/Bluepetunia.png';
const GENERIC_CARGO_HEIGHT_DESIGN = 96;
const DELIVERY_MS = 2400;
/** Matches 54% keyframe in `dadMascotDeliveryCargo` — cargo set down on the anchor. */
export const DELIVERY_DROP_MS = Math.round(DELIVERY_MS * 0.54);

interface DadMascotDeliveryProps {
  element: PlacedElement;
  designWidth: number;
  designHeight: number;
  /** Stage scale (bandHeight / designHeight), snapped to device pixels. */
  gardenScale?: number;
  /** Width of the visible canvas in design pixels. */
  visibleDesignWidth: number;
  /** Left edge of the visible viewport in design pixels (for scrollable gardens). */
  viewportLeftDesign?: number;
  variant?: AppVariant;
  /** Fired when the mascot sets the cargo down (before exit). */
  onDrop?: () => void;
  onComplete: () => void;
}

/** Mascot carries a new garden asset in and sets it down at the anchor. */
export function DadMascotDelivery({
  element,
  designWidth,
  designHeight,
  gardenScale = 0,
  visibleDesignWidth,
  viewportLeftDesign = 0,
  variant = 'default',
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

  const anchor =
    gardenScale > 0
      ? snapAnchorDesignPx(
          element.x,
          element.y,
          designWidth,
          designHeight,
          gardenScale,
        )
      : {
          left: element.x * designWidth,
          bottom: (1 - element.y) * designHeight,
        };
  const anchorX = anchor.left;
  const anchorBottom = anchor.bottom;
  const mascotDeliversReal = element.mascotDeliversElement !== false;
  const cargoSrc = mascotDeliversReal
    ? (element.animation?.frames[0] ?? element.src)
    : GENERIC_MASCOT_CARGO_SRC;
  const cargoMeasureKey = mascotDeliversReal
    ? elementMeasureKey(element)
    : GENERIC_MASCOT_CARGO_SRC;
  const cargoNaturalHeight = getCachedNaturalHeight(cargoMeasureKey);
  const cargoHeightRaw = mascotDeliversReal
    ? cargoNaturalHeight
      ? elementPixelHeightFromNatural(cargoNaturalHeight, element)
      : elementFallbackPixelHeight(element)
    : cargoNaturalHeight
      ? elementPixelHeightFromNatural(cargoNaturalHeight, {
          ...element,
          heightDesign: GENERIC_CARGO_HEIGHT_DESIGN,
        })
      : elementFallbackPixelHeight({
          ...element,
          heightDesign: GENERIC_CARGO_HEIGHT_DESIGN,
        });
  const cargoHeight =
    gardenScale > 0
      ? snapDesignLength(cargoHeightRaw, gardenScale)
      : cargoHeightRaw;
  const anchorInView = anchorX - viewportLeftDesign;
  const enterFromRight = anchorInView < visibleDesignWidth / 2;
  const enterOffset = enterFromRight
    ? visibleDesignWidth - anchorInView + 96
    : anchorInView + 96;
  const isDad = variant === 'dad';
  const mascotImageSrc = isDad ? DAD_MASCOT_SRC : mascotSrc;
  const mascotHeightPx =
    gardenScale > 0 ? snapDesignLength(isDad ? 96 : 112, gardenScale) : isDad ? 96 : 112;

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
          src={mascotImageSrc}
          alt=""
          draggable={false}
          style={{ height: `${mascotHeightPx}px` }}
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
