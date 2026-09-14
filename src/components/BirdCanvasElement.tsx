import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { PlacedBirdBehavior, PlacedElement } from '../lib/garden/types';
import {
  canPeckAtPosition,
  nearestNearbyFoodCenter,
} from '../lib/garden/birdBehavior';
import { randomHopPointAvoidingCollisions, hopAnchorOverlapsOthers } from '../lib/garden/birdCollision';
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

type BirdState = 'idle' | 'hop' | 'wingflap' | 'peck' | 'transit';

export type BirdTransitMode = 'depart' | 'arrive';

interface HopAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startMs: number;
  durationMs: number;
  /** Loop wingflap frames for the full hop (long-distance hops). */
  loopWingflap: boolean;
  /** When set, invoke after the hop finishes (fly-off / fly-in). */
  onComplete?: () => void;
}

const MIN_HOP_DURATION_MS = 150;
/** Extra normalized margin so the full sprite clears the viewport. */
const OFFSCREEN_MARGIN = 0.04;
/** Slightly brisker than normal hops for enter/exit flights. */
const TRANSIT_NORM_PER_SEC = 0.18;

/**
 * Path length in design-width units (same units as hopNormPerSec).
 * Y is scaled by designHeight/designWidth so screen travel matches duration —
 * the canvas is much wider than tall, so raw hypot(dx, dy) would understate
 * horizontal hops and overstate vertical ones.
 */
function hopDistanceWidthUnits(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  designWidth: number,
  designHeight: number,
): number {
  const dx = toX - fromX;
  const dy = (toY - fromY) * (designHeight / designWidth);
  return Math.hypot(dx, dy);
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

/** Travel time for a constant speed of hopNormPerSec (width-units / sec). */
function hopDurationMs(distanceWidthUnits: number, hopNormPerSec: number): number {
  if (hopNormPerSec <= 0) return MIN_HOP_DURATION_MS;
  return Math.max(
    MIN_HOP_DURATION_MS,
    (distanceWidthUnits / hopNormPerSec) * 1000,
  );
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
  /**
   * Latest blocked footprints for other birds (current pose + hop destinations).
   * Prefer {@link getBlockedCollisionRects} at hop-pick time for sync claims.
   */
  otherBirdCollisionRects?: SurfaceRect[];
  /** Sync read of blocked rects (includes other birds' reserved hop targets). */
  getBlockedCollisionRects?: () => SurfaceRect[];
  /**
   * Reserve a hop landing spot so other birds cannot claim the same place.
   * Returns false if the spot became blocked (caller should pick again).
   * Pass `force: true` for scripted transit landings that must proceed.
   */
  onClaimHopTarget?: (
    x: number,
    y: number,
    flipX: boolean,
    options?: { force?: boolean },
  ) => boolean;
  /** Clear this bird's reserved hop landing spot. */
  onReleaseHopTarget?: () => void;
  onPositionChange?: (x: number, y: number, flipX: boolean) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLImageElement>) => void;
  /** Mode2 pool: fly fully off-screen (depart) or in from off-screen (arrive). */
  transit?: BirdTransitMode | null;
  onTransitComplete?: () => void;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Snap resting position only — not while hopping between surfaces. */
function shouldSnapBirdPosition(state: BirdState): boolean {
  return state === 'idle' || state === 'wingflap' || state === 'peck';
}

function halfWidthNorm(
  idleNatural: { width: number; height: number } | null,
  layoutNaturalHeight: number | null,
  element: PlacedElement,
  designWidth: number,
): number {
  return (
    idleDisplayWidthNorm(
      idleNatural,
      layoutNaturalHeight,
      element,
      designWidth,
    ) / 2
  );
}

/** Target x so the full sprite (bottom-center anchor) clears the viewport. */
function offscreenX(
  side: 'left' | 'right',
  halfW: number,
): number {
  if (side === 'left') return -halfW - OFFSCREEN_MARGIN;
  return 1 + halfW + OFFSCREEN_MARGIN;
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

const HOP_TARGET_ATTEMPTS = 48;

function pickHopTarget(
  behavior: PlacedBirdBehavior,
  fromX: number,
  fromY: number,
  idleWidthNorm: number,
  collisionBox: PlacedElement['birdCollisionBox'],
  otherRects: SurfaceRect[],
  preferFly: boolean | null,
  designWidth: number,
  designHeight: number,
  claimTarget?: (x: number, y: number, flipX: boolean) => boolean,
): { x: number; y: number } | null {
  let fallback: { x: number; y: number } | null = null;
  for (let attempt = 0; attempt < HOP_TARGET_ATTEMPTS; attempt++) {
    const candidate = randomHopPointAvoidingCollisions(
      behavior.hopSurfaces,
      collisionBox,
      otherRects,
      fromX,
    );
    if (!candidate) continue;

    const tryClaim = () => {
      if (!claimTarget) return true;
      return claimTarget(candidate.x, candidate.y, candidate.x < fromX);
    };

    if (preferFly == null) {
      if (!tryClaim()) continue;
      return candidate;
    }

    const isLong =
      hopDistanceWidthUnits(
        fromX,
        fromY,
        candidate.x,
        candidate.y,
        designWidth,
        designHeight,
      ) > idleWidthNorm;
    if (preferFly === isLong) {
      if (!tryClaim()) continue;
      return candidate;
    }
    if (!fallback) fallback = candidate;
  }

  if (!fallback) return null;
  if (
    claimTarget &&
    !claimTarget(fallback.x, fallback.y, fallback.x < fromX)
  ) {
    return null;
  }
  return fallback;
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
  getBlockedCollisionRects,
  onClaimHopTarget,
  onReleaseHopTarget,
  onPositionChange,
  onPointerDown,
  transit = null,
  onTransitComplete,
}: BirdCanvasElementProps) {
  const [state, setState] = useState<BirdState>('idle');
  const [posX, setPosX] = useState(element.x);
  const [posY, setPosY] = useState(element.y);
  const [flipX, setFlipX] = useState(element.flipX);
  const flipRef = useRef(element.flipX);
  const [frameIndex, setFrameIndex] = useState(behavior.idleFrame);
  const [hopAnim, setHopAnim] = useState<HopAnim | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopRafRef = useRef(0);
  const animGenRef = useRef(0);
  const posRef = useRef({ x: element.x, y: element.y });
  const behaviorRef = useRef(behavior);
  const otherRectsRef = useRef(otherBirdCollisionRects);
  const getBlockedRectsRef = useRef(getBlockedCollisionRects);
  const onClaimHopTargetRef = useRef(onClaimHopTarget);
  const onReleaseHopTargetRef = useRef(onReleaseHopTarget);
  const elementRef = useRef(element);
  const onPositionChangeRef = useRef(onPositionChange);
  const onTransitCompleteRef = useRef(onTransitComplete);
  const idleNaturalRef = useRef<{ width: number; height: number } | null>(null);
  const transitStartedRef = useRef<BirdTransitMode | null>(null);
  const hopTargetClaimedRef = useRef(false);

  const idleFrameUrl =
    behavior.idleFrames[behavior.idleFrame] ??
    behavior.idleFrames[0] ??
    element.src;

  behaviorRef.current = behavior;
  otherRectsRef.current = otherBirdCollisionRects;
  getBlockedRectsRef.current = getBlockedCollisionRects;
  onClaimHopTargetRef.current = onClaimHopTarget;
  onReleaseHopTargetRef.current = onReleaseHopTarget;
  elementRef.current = element;
  onPositionChangeRef.current = onPositionChange;
  onTransitCompleteRef.current = onTransitComplete;

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
    if (transit) return;
    posRef.current = { x: element.x, y: element.y };
    setPosX(element.x);
    setPosY(element.y);
  }, [element.x, element.y, transit]);

  useEffect(() => {
    flipRef.current = element.flipX;
    setFlipX(element.flipX);
  }, [element.flipX]);

  useEffect(() => {
    onPositionChangeRef.current?.(element.x, element.y, element.flipX);
  }, [element.id, element.x, element.y, element.flipX]);

  const syncPosition = useCallback((x: number, y: number) => {
    posRef.current = { x, y };
    setPosX(x);
    setPosY(y);
    onPositionChangeRef.current?.(x, y, flipRef.current);
  }, []);

  const setFacing = useCallback((nextFlipX: boolean) => {
    flipRef.current = nextFlipX;
    setFlipX(nextFlipX);
    onPositionChangeRef.current?.(posRef.current.x, posRef.current.y, nextFlipX);
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

  const releaseHopTarget = useCallback(() => {
    if (!hopTargetClaimedRef.current) return;
    hopTargetClaimedRef.current = false;
    onReleaseHopTargetRef.current?.();
  }, []);

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
    releaseHopTarget();
  }, [releaseHopTarget]);

  const blockedRectsNow = useCallback((): SurfaceRect[] => {
    return getBlockedRectsRef.current?.() ?? otherRectsRef.current;
  }, []);

  const claimHopTarget = useCallback(
    (
      x: number,
      y: number,
      facingFlipX: boolean,
      options?: { force?: boolean },
    ): boolean => {
      const claim = onClaimHopTargetRef.current;
      if (!claim) {
        hopTargetClaimedRef.current = true;
        return true;
      }
      if (!claim(x, y, facingFlipX, options)) return false;
      hopTargetClaimedRef.current = true;
      return true;
    },
    [],
  );

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
      const blocked = blockedRectsNow();
      const overlaps = hopAnchorOverlapsOthers(
        x,
        y,
        el.birdCollisionBox,
        blocked,
        flipRef.current,
      );
      const action =
        overlaps && b.hopEnabled && b.hopSurfaces.length > 0
          ? 'hop'
          : pickIdleAction(b, x, y);
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
          blockedRectsNow(),
          preferFly,
          designWidth,
          designHeight,
          claimHopTarget,
        );
        if (target) {
          const distanceWidthUnits = hopDistanceWidthUnits(
            from.x,
            from.y,
            target.x,
            target.y,
            designWidth,
            designHeight,
          );
          const loopWingflap =
            distanceWidthUnits > idleWidthNorm && b.wingflapFrames.length > 1;
          const durationMs = hopDurationMs(distanceWidthUnits, b.hopNormPerSec);
          setFacing(target.x < from.x);
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
        if (overlaps) {
          scheduleIdle();
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
        if (food) setFacing(food.x < x);
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
    designHeight,
    naturalHeight,
    startHopWingflapLoop,
    syncRestPosition,
    blockedRectsNow,
    claimHopTarget,
  ]);

  useEffect(() => {
    if (!behavior.hopEnabled || transit) return;
    scheduleIdle();
    return clearTimers;
  }, [behavior.hopEnabled, scheduleIdle, clearTimers, transit]);

  // Mode2 pool: fly fully off-screen or in from off-screen.
  useEffect(() => {
    if (!transit) {
      transitStartedRef.current = null;
      return;
    }
    if (transitStartedRef.current === transit) return;
    transitStartedRef.current = transit;

    clearTimers();
    const el = elementRef.current;
    const halfW = halfWidthNorm(
      idleNaturalRef.current,
      naturalHeight,
      el,
      designWidth,
    );
    const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    const offX = offscreenX(side, Math.max(halfW, 0.06));
    const from = posRef.current;
    let fromX = from.x;
    let fromY = from.y;
    let toX = from.x;
    let toY = from.y;

    if (transit === 'depart') {
      toX = offX;
      toY = Math.max(0.15, from.y - 0.12);
      setFacing(toX < fromX);
    } else {
      fromX = offX;
      fromY = Math.max(0.15, el.y - 0.08);
      toX = el.x;
      toY = el.y;
      posRef.current = { x: fromX, y: fromY };
      setPosX(fromX);
      setPosY(fromY);
      setFacing(toX < fromX);
    }

    // Reserve the landing (or exit) so other birds do not claim it mid-flight.
    claimHopTarget(toX, toY, toX < fromX, { force: true });

    const distanceWidthUnits = hopDistanceWidthUnits(
      fromX,
      fromY,
      toX,
      toY,
      designWidth,
      designHeight,
    );
    const durationMs = hopDurationMs(distanceWidthUnits, TRANSIT_NORM_PER_SEC);
    const hopGen = animGenRef.current;
    setHopAnim({
      fromX,
      fromY,
      toX,
      toY,
      startMs: performance.now(),
      durationMs,
      loopWingflap: behaviorRef.current.wingflapFrames.length > 1,
      onComplete: () => onTransitCompleteRef.current?.(),
    });
    setState('transit');
    if (behaviorRef.current.wingflapFrames.length > 1) {
      startHopWingflapLoop(hopGen);
    }
  }, [
    transit,
    clearTimers,
    designWidth,
    designHeight,
    naturalHeight,
    setFacing,
    startHopWingflapLoop,
    claimHopTarget,
    releaseHopTarget,
  ]);

  useEffect(() => {
    if ((state !== 'hop' && state !== 'transit') || !hopAnim) return;
    const b = behaviorRef.current;
    const tick = (now: number) => {
      // Linear progress → constant travel speed (duration already ∝ distance).
      const t = Math.min(1, (now - hopAnim.startMs) / hopAnim.durationMs);
      const x = hopAnim.fromX + (hopAnim.toX - hopAnim.fromX) * t;
      const baseY = hopAnim.fromY + (hopAnim.toY - hopAnim.fromY) * t;
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
        const done = hopAnim.onComplete;
        setHopAnim(null);
        releaseHopTarget();
        if (done) {
          setFrameIndex(b.idleFrame);
          syncRestPosition(hopAnim.toX, hopAnim.toY);
          setState('idle');
          done();
          if (transitStartedRef.current === 'arrive') {
            scheduleIdle();
          }
          return;
        }
        setFrameIndex(b.idleFrame);
        syncRestPosition(hopAnim.toX, hopAnim.toY);
        setState('idle');
        scheduleIdle();
      }
    };
    hopRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (hopRafRef.current) cancelAnimationFrame(hopRafRef.current);
    };
  }, [
    state,
    hopAnim,
    scheduleIdle,
    syncPosition,
    syncRestPosition,
    releaseHopTarget,
  ]);

  const src =
    state === 'wingflap' ||
    ((state === 'hop' || state === 'transit') && hopAnim?.loopWingflap)
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
