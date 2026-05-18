import { useEffect, useRef, useState } from 'react';
import { HeldFlower } from './HeldFlower';
import { MascotImage } from './MascotImage';
import { getPaletteByIndex, slotXToPercent } from '../lib/plantedGarden';

export interface PlantingRequest {
  id: number;
  completionIndex: number;
  paletteIndex: number;
  slotX: number;
}

export type PlantPhase = 'idle' | 'enter' | 'walk' | 'drop' | 'exit';

interface GardenPlantingShowProps {
  request: PlantingRequest | null;
  reducedMotion: boolean;
  /** Fired when the drop phase finishes — permanent flower should appear in the garden. */
  onDropComplete: (completionIndex: number) => void;
  /** Fired when the mascot has left after planting. */
  onComplete: (completionIndex: number) => void;
  onPhaseChange?: (phase: PlantPhase) => void;
}

const PHASE_MS: Record<Exclude<PlantPhase, 'idle'>, number> = {
  enter: 700,
  walk: 900,
  drop: 650,
  exit: 750,
};

export function GardenPlantingShow({
  request,
  reducedMotion,
  onDropComplete,
  onComplete,
  onPhaseChange,
}: GardenPlantingShowProps) {
  const [phase, setPhase] = useState<PlantPhase>('idle');
  const [active, setActive] = useState<PlantingRequest | null>(null);
  const onDropCompleteRef = useRef(onDropComplete);
  onDropCompleteRef.current = onDropComplete;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  useEffect(() => {
    if (!request) return;

    if (reducedMotion) {
      onDropCompleteRef.current(request.completionIndex);
      onCompleteRef.current(request.completionIndex);
      return;
    }

    setActive(request);
    setPhase('enter');

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (next: PlantPhase, delay: number) => {
      timers.push(setTimeout(() => setPhase(next), delay));
    };

    let t = PHASE_MS.enter;
    schedule('walk', t);
    t += PHASE_MS.walk;
    schedule('drop', t);
    t += PHASE_MS.drop;
    timers.push(
      setTimeout(() => {
        onDropCompleteRef.current(request.completionIndex);
      }, t),
    );
    schedule('exit', t);
    t += PHASE_MS.exit;
    timers.push(
      setTimeout(() => {
        setPhase('idle');
        setActive(null);
        onCompleteRef.current(request.completionIndex);
      }, t),
    );

    return () => timers.forEach(clearTimeout);
  }, [request?.id, request, reducedMotion]);

  if (!active || phase === 'idle') return null;

  const targetPercent = slotXToPercent(active.slotX);
  const palette = getPaletteByIndex(active.paletteIndex);

  return (
    <div
      className={`garden-planting-show garden-planting-show--${phase}`}
      style={{ ['--plant-target-x' as string]: `${targetPercent}%` }}
      aria-hidden
    >
      <div
        className="garden-planting-show__mascot-wrap"
        style={{ ['--plant-target-x' as string]: `${targetPercent}%` }}
      >
        <MascotImage className="garden-planting-show__mascot" />
        <div className="garden-planting-show__held-flower">
          <HeldFlower paletteIndex={active.paletteIndex} size={44} />
        </div>
      </div>

      <div
        className="garden-planting-show__falling-flower"
        style={
          {
            ['--flower-petal' as string]: palette.petals,
            ['--flower-center' as string]: palette.center,
          } as React.CSSProperties
        }
      >
        <HeldFlower paletteIndex={active.paletteIndex} size={32} />
      </div>
    </div>
  );
}
