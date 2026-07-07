import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { PlacedBirdBehavior, PlacedElement } from '../lib/garden/types';
import {
  canPeckAtPosition,
  nearestNearbyFoodCenter,
} from '../lib/garden/birdBehavior';
import { randomHopPointAvoidingCollisions } from '../lib/garden/birdCollision';
import type { SurfaceRect } from '../lib/garden/types';
import {
  cacheNaturalHeight,
  elementFallbackPixelHeight,
  elementMeasureKey,
  elementPixelHeightFromNatural,
  getCachedNaturalHeight,
} from '../lib/garden/elementDisplaySize';
import {
  snapAnchorDesignPx,
  snapDesignLength,
  snapNormalizedPosition,
} from '../lib/garden/gardenPixelSnap';

type BirdState = 'idle' | 'hop' | 'wingflap' | 'peck';

interface HopAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startMs: number;
  durationMs: number;
  /** Loop wingflap frames for the full hop (long-distance hops). */
  loopWingflap: boolean;
}

const MIN_HOP_DURATION_MS = 150;

function hopDistanceNorm(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function idleDisplayWidthNorm(
  idleNatural: { width: number; height: number } | null,
  layoutNaturalHeight: number | null,
  element: PlacedElement,
  designWidth: number,
): number {
  const naturalH =
    layoutNaturalHeight ?? idleNatural?.height ?? 0;
  const displayH =
    naturalH > 0
      ? elementPixelHeightFromNatural(naturalH, element)
      : elementFallbackPixelHeight(element);
  const aspect =
    idleNatural && idleNatural.height > 0
      ? idleNatural.width / idleNatural.height
      : 1;
  return (displayH * aspect) / designWidth;
}

function hopDurationMs(distanceNorm: number, hopNormPerSec: number): number {
  if (hopNormPerSec <= 0) return MIN_HOP_DURATION_MS;
  return Math.max(MIN_HOP_DURATION_MS, (distanceNorm / hopNormPerSec) * 1000);
}

interface BirdCanvasElementProps {
  element: PlacedElement;
  behavior: PlacedBirdBehavior;
  designWidth: number;
  designHeight: number;
  /** Stage scale (bandHeight / designHeight), snapped to device pixels. */
  gardenScale: number;
  style: CSSProperties;
  className: string;
  /** Other birds' collision boxes in world space (excludes this bird). */
  otherBirdCollisionRects?: SurfaceRect[];
  onPositionChange?: (x: number, y: number) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLImageElement>) => void;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Snap resting position only — not while hopping between surfaces. */
function shouldSnapBirdPosition(state: BirdState): boolean {
  return state === 'idle' || state === 'wingflap' || state === 'peck';
}

function pickIdleAction(
  behavior: PlacedBirdBehavior,
  x: number,
  y: number,
): 'hop' | 'wingflap' | 'peck' | 'wait' {
  const wingWeight =
    behavior.wingflapFrames.length > 1 ? behavior.wingflapChance : 0;
  const peckWeight = canPeckAtPosition(behavior, x, y) ? behavior.peckChance : 0;
  const hopWeight = behavior.hopEnabled ? behavior.hopChance : 0;
  const total = hopWeight + wingWeight + peckWeight;
  if (total <= 0) return 'wait';
  const roll = Math.random() * total;
  if (roll < hopWeight) return 'hop';
  if (roll < hopWeight + wingWeight) return 'wingflap';
  if (peckWeight > 0) return 'peck';
  return 'wait';
}

const HOP_TARGET_ATTEMPTS = 16;

function pickHopTarget(
  behavior: PlacedBirdBehavior,
  fromX: number,
  fromY: number,
  idleWidthNorm: number,
  collisionBox: PlacedElement['birdCollisionBox'],
  otherRects: SurfaceRect[],
  preferFly: boolean | null,
): { x: number; y: number } | null {
  let fallback: { x: number; y: number } | null = null;
  for (let attempt = 0; attempt < HOP_TARGET_ATTEMPTS; attempt++) {
    const candidate = randomPointOnSurface(
      behavior.hopSurfaces,
      collisionBox,
      otherRects,
    );
    if (!candidate) continue;
    fallback = candidate;
    if (preferFly == null) return candidate;
    const isLong =
      hopDistanceNorm(fromX, fromY, candidate.x, candidate.y) >
      idleWidthNorm;
    if (preferFly === isLong) return candidate;
  }
  return fallback;
}

function randomPointOnSurface(
  surfaces: PlacedBirdBehavior['hopSurfaces'],
  collisionBox: PlacedElement['birdCollisionBox'],
  otherRects: SurfaceRect[],
): { x: number; y: number } | null {
  const avoided = randomHopPointAvoidingCollisions(
    surfaces,
    collisionBox,
    otherRects,
  );
  if (avoided) return avoided;
  if (surfaces.length === 0) return null;
  const surface = surfaces[Math.floor(Math.random() * surfaces.length)]!;
  return {
    x: surface.x + Math.random() * surface.width,
    y: surface.y + Math.random() * surface.height,
  };
}

export function BirdCanvasElement({
  element,
  behavior,
  designWidth,
  designHeight,
  gardenScale,
  style,
  className,
  otherBirdCollisionRects = [],
  onPositionChange,
  onPointerDown,
}: BirdCanvasElementProps) {
  const [state, setState] = useState<BirdState>('idle');
  const [posX, setPosX] = useState(element.x);
  const [posY, setPosY] = useState(element.y);
  const [flipX, setFlipX] = useState(element.flipX);
  const [frameIndex, setFrameIndex] = useState(behavior.idleFrame);
  const [hopAnim, setHopAnim] = useState<HopAnim | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopRafRef = useRef(0);
  const animGenRef = useRef(0);
  const posRef = useRef({ x: element.x, y: element.y });
  const behaviorRef = useRef(behavior);
  const otherRectsRef = useRef(otherBirdCollisionRects);
  const elementRef = useRef(element);
  const onPositionChangeRef = useRef(onPositionChange);
  const idleNaturalRef = useRef<{ width: number; height: number } | null>(null);

  const idleFrameUrl =
    behavior.idleFrames[behavior.idleFrame] ??
    behavior.idleFrames[0] ??
    element.src;

  behaviorRef.current = behavior;
  otherRectsRef.current = otherBirdCollisionRects;
  elementRef.current = element;
  onPositionChangeRef.current = onPositionChange;

  useEffect(() => {
    idleNaturalRef.current = null;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        idleNaturalRef.current = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      }
    };
    img.src = idleFrameUrl;
  }, [idleFrameUrl]);

  useEffect(() => {
    posRef.current = { x: element.x, y: element.y };
    setPosX(element.x);
    setPosY(element.y);
  }, [element.x, element.y]);

  const syncPosition = useCallback((x: number, y: number) => {
    posRef.current = { x, y };
    setPosX(x);
    setPosY(y);
    onPositionChangeRef.current?.(x, y);
  }, []);

  const snapRestPosition = useCallback(
    (x: number, y: number) => {
      if (gardenScale <= 0) return { x, y };
      return snapNormalizedPosition(
        x,
        y,
        designWidth,
        designHeight,
        gardenScale,
      );
    },
    [gardenScale, designWidth, designHeight],
  );

  const syncRestPosition = useCallback(
    (x: number, y: number) => {
      const snapped = snapRestPosition(x, y);
      syncPosition(snapped.x, snapped.y);
      return snapped;
    },
    [snapRestPosition, syncPosition],
  );

  const idleSrc =
    behavior.idleFrames[behavior.idleFrame] ??
    behavior.idleFrames[0] ??
    element.src;

  const measureKey = elementMeasureKey(element);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(() =>
    getCachedNaturalHeight(measureKey),
  );

  useEffect(() => {
    setNaturalHeight(getCachedNaturalHeight(measureKey));
  }, [measureKey]);

  const clearTimers = useCallback(() => {
    animGenRef.current += 1;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (hopRafRef.current) {
      cancelAnimationFrame(hopRafRef.current);
      hopRafRef.current = 0;
    }
  }, []);

  const resetToIdlePose = useCallback(() => {
    const b = behaviorRef.current;
    setState('idle');
    setFrameIndex(b.idleFrame);
    setHopAnim(null);
  }, []);

  const startHopWingflapLoop = useCallback((gen: number) => {
    const b = behaviorRef.current;
    if (b.wingflapFrames.length < 2) return;
    let fi = 0;
    const step = () => {
      if (gen !== animGenRef.current) return;
      setFrameIndex(fi % b.wingflapFrames.length);
      fi += 1;
      animTimerRef.current = setTimeout(
        step,
        b.wingflapFrameDuration * 1000,
      );
    };
    step();
  }, []);

  const scheduleIdle = useCallback(() => {
    clearTimers();
    resetToIdlePose();
    const b = behaviorRef.current;
    const delay =
      randomBetween(b.hopIntervalMin, b.hopIntervalMax) * 1000;
    idleTimerRef.current = setTimeout(() => {
      const b = behaviorRef.current;
      const el = elementRef.current;
      const { x, y } = posRef.current;
      const action = pickIdleAction(b, x, y);
      if (action === 'hop') {
        const from = posRef.current;
        const idleWidthNorm = idleDisplayWidthNorm(
          idleNaturalRef.current,
          naturalHeight,
          el,
          designWidth,
        );
        const preferFly =
          b.flyChance == null ? null : Math.random() < b.flyChance;
        const target = pickHopTarget(
          b,
          from.x,
          from.y,
          idleWidthNorm,
          el.birdCollisionBox,
          otherRectsRef.current,
          preferFly,
        );
        if (target) {
          const distanceNorm = hopDistanceNorm(
            from.x,
            from.y,
            target.x,
            target.y,
          );
          const loopWingflap =
            distanceNorm > idleWidthNorm && b.wingflapFrames.length > 1;
          const durationMs = hopDurationMs(distanceNorm, b.hopNormPerSec);
          setFlipX(target.x < from.x);
          const hopGen = animGenRef.current;
          setHopAnim({
            fromX: from.x,
            fromY: from.y,
            toX: target.x,
            toY: target.y,
            startMs: performance.now(),
            durationMs,
            loopWingflap,
          });
          setState('hop');
          if (loopWingflap) {
            startHopWingflapLoop(hopGen);
          }
          return;
        }
      }
      if (action === 'wingflap' && b.wingflapFrames.length > 1) {
        setState('wingflap');
        const gen = animGenRef.current;
        let fi = 0;
        const step = () => {
          if (gen !== animGenRef.current) return;
          setFrameIndex(fi);
          fi += 1;
          if (fi < b.wingflapFrames.length) {
            animTimerRef.current = setTimeout(
              step,
              b.wingflapFrameDuration * 1000,
            );
          } else {
            setFrameIndex(b.idleFrame);
            setState('idle');
            syncRestPosition(posRef.current.x, posRef.current.y);
            scheduleIdle();
          }
        };
        step();
        return;
      }
      if (action === 'peck' && canPeckAtPosition(b, x, y)) {
        const food = nearestNearbyFoodCenter(x, y, b.foodSurfaces);
        if (food) setFlipX(food.x < x);
        setState('peck');
        const gen = animGenRef.current;
        let fi = 0;
        const step = () => {
          if (gen !== animGenRef.current) return;
          setFrameIndex(fi);
          fi += 1;
          if (fi < b.peckFrames.length) {
            animTimerRef.current = setTimeout(
              step,
              b.peckFrameDuration * 1000,
            );
          } else {
            setFrameIndex(b.idleFrame);
            setState('idle');
            syncRestPosition(posRef.current.x, posRef.current.y);
            scheduleIdle();
          }
        };
        step();
        return;
      }
      scheduleIdle();
    }, delay);
  }, [
    clearTimers,
    resetToIdlePose,
    designWidth,
    naturalHeight,
    startHopWingflapLoop,
    syncRestPosition,
  ]);

  useEffect(() => {
    if (!behavior.hopEnabled) return;
    scheduleIdle();
    return clearTimers;
  }, [behavior.hopEnabled, scheduleIdle, clearTimers]);

  useEffect(() => {
    if (state !== 'hop' || !hopAnim) return;
    const b = behaviorRef.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - hopAnim.startMs) / hopAnim.durationMs);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = hopAnim.fromX + (hopAnim.toX - hopAnim.fromX) * ease;
      const baseY = hopAnim.fromY + (hopAnim.toY - hopAnim.fromY) * ease;
      const arc = Math.sin(Math.PI * t) * 0.04;
      const y = baseY - arc;
      syncPosition(x, y);
      if (t < 1) {
        hopRafRef.current = requestAnimationFrame(tick);
      } else {
        if (animTimerRef.current) {
          clearTimeout(animTimerRef.current);
          animTimerRef.current = null;
        }
        setFrameIndex(b.idleFrame);
        setHopAnim(null);
        syncRestPosition(hopAnim.toX, hopAnim.toY);
        setState('idle');
        scheduleIdle();
      }
    };
    hopRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (hopRafRef.current) cancelAnimationFrame(hopRafRef.current);
    };
  }, [state, hopAnim, scheduleIdle, syncPosition, syncRestPosition]);

  const src =
    state === 'wingflap' || (state === 'hop' && hopAnim?.loopWingflap)
      ? (behavior.wingflapFrames[frameIndex] ?? idleSrc)
      : state === 'peck'
        ? (behavior.peckFrames[frameIndex] ?? idleSrc)
        : (behavior.idleFrames[behavior.idleFrame] ?? idleSrc);

  const rawHeight = naturalHeight
    ? elementPixelHeightFromNatural(naturalHeight, element)
    : elementFallbackPixelHeight(element);
  const displayHeight =
    gardenScale > 0 ? snapDesignLength(rawHeight, gardenScale) : rawHeight;

  const snapPosition = shouldSnapBirdPosition(state) && gardenScale > 0;
  const anchor = snapPosition
    ? snapAnchorDesignPx(posX, posY, designWidth, designHeight, gardenScale)
    : {
        left: posX * designWidth,
        bottom: (1 - posY) * designHeight,
      };

  const dynamicStyle: CSSProperties = {
    ...style,
    left: `${anchor.left}px`,
    bottom: `${anchor.bottom}px`,
    height: `${displayHeight}px`,
    '--garden-el-flip-x': flipX ? -1 : 1,
  } as CSSProperties;

  return (
    <img
      ref={imgRef}
      className={className}
      style={dynamicStyle}
      src={src}
      alt=""
      draggable={false}
      onPointerDown={onPointerDown}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalHeight > 0) {
          setNaturalHeight(cacheNaturalHeight(measureKey, img.naturalHeight));
        }
      }}
    />
  );
}
