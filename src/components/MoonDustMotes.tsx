import { useMemo } from 'react';

interface MoonDustMotesProps {
  /** Visible height of the moon texture strip (px), from the canvas bottom. */
  moonGroundHeight: number;
}

interface MoteConfig {
  id: number;
  left: number;
  bottomPx: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
  opacity: number;
}

const SURFACE_MOTE_COUNT = 6;
const MID_MOTE_COUNT = 6;
const VOID_MOTE_COUNT = 17;
/** High-tier motes float this far above the top of the moon strip (px). */
const VOID_FLOAT_PX = 100;

/** Deterministic 0..1 float — stable per id/channel, uncorrelated across channels. */
function moteHash(id: number, channel: number): number {
  const x = Math.sin(id * 12.9898 + channel * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function moteRange(
  id: number,
  channel: number,
  min: number,
  max: number,
): number {
  if (max <= min) return min;
  return min + moteHash(id, channel) * (max - min);
}

function buildMote(
  id: number,
  bottomMin: number,
  bottomMax: number,
  tier: 'surface' | 'mid' | 'void',
): MoteConfig {
  const bottomChannel = tier === 'surface' ? 2 : tier === 'mid' ? 3 : 4;

  return {
    id,
    left: 2 + moteHash(id, 1) * 96,
    bottomPx: moteRange(id, bottomChannel, bottomMin, bottomMax),
    size: 2.8 + moteHash(id, 5) * 3.4,
    delay: moteHash(id, 6) * 6,
    duration: 7 + moteHash(id, 7) * 8.4,
    driftX: -18 + moteHash(id, 8) * 36,
    driftY:
      tier === 'void'
        ? 8 + moteHash(id, 9) * 18
        : 5 + moteHash(id, 9) * 14,
    opacity: 0.35 + moteHash(id, 10) * 0.4,
  };
}

/** Silver dust drifting above the moon surface (dad route only). */
export function MoonDustMotes({ moonGroundHeight }: MoonDustMotesProps) {
  const motes = useMemo<MoteConfig[]>(() => {
    const moonTop = moonGroundHeight;
    const lowMax = Math.max(moonTop * 0.55, 24);
    const midMin = Math.max(moonTop * 0.5, 16);
    const midMax = Math.max(moonTop * 0.92, midMin + 12);
    const voidMin = moonTop + 8;
    const voidMax = moonTop + VOID_FLOAT_PX;

    const result: MoteConfig[] = [];
    let id = 0;

    for (let i = 0; i < SURFACE_MOTE_COUNT; i++) {
      result.push(buildMote(id++, 8, lowMax, 'surface'));
    }
    for (let i = 0; i < MID_MOTE_COUNT; i++) {
      result.push(buildMote(id++, midMin, midMax, 'mid'));
    }
    for (let i = 0; i < VOID_MOTE_COUNT; i++) {
      result.push(buildMote(id++, voidMin, voidMax, 'void'));
    }

    return result;
  }, [moonGroundHeight]);

  return (
    <div className="moon-dust-motes__layer" aria-hidden>
      {motes.map((mote) => (
        <span
          key={mote.id}
          className="moon-dust-motes__mote"
          style={{
            left: `${mote.left}%`,
            bottom: `${mote.bottomPx}px`,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            opacity: mote.opacity,
            animationDelay: `${mote.delay}s`,
            animationDuration: `${mote.duration}s`,
            ['--mote-drift-x' as string]: `${mote.driftX}px`,
            ['--mote-drift-y' as string]: `${mote.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}
