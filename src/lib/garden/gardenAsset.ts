import { DEFAULT_FRAME_DURATION_SEC } from './gardenAnimation';
import type { AssetAnimationDef, GardenAssetRef } from './types';

export interface ResolvedGardenAsset {
  src: string;
  animation?: {
    frames: string[];
    frameDuration: number;
  };
}

function normalizeFrames(frames: string[]): string[] {
  return frames.filter((f) => typeof f === 'string' && f.length > 0);
}

/** Parse a levels.yaml asset (string path or object with optional animation). */
export function resolveGardenAsset(
  input: string | GardenAssetRef | undefined,
): ResolvedGardenAsset | null {
  if (input == null) return null;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed ? { src: trimmed } : null;
  }

  const frames = normalizeFrames(input.animation?.frames ?? []);
  if (frames.length > 0) {
    const frameDuration =
      typeof input.animation?.frameDuration === 'number' &&
      input.animation.frameDuration > 0
        ? input.animation.frameDuration
        : DEFAULT_FRAME_DURATION_SEC;
    return {
      src: input.src?.trim() || frames[0]!,
      animation: { frames, frameDuration },
    };
  }

  const src = input.src?.trim();
  return src ? { src } : null;
}

export function animationFromDef(
  def: AssetAnimationDef | undefined,
): ResolvedGardenAsset['animation'] | undefined {
  if (!def) return undefined;
  const frames = normalizeFrames(def.frames);
  if (frames.length === 0) return undefined;
  return {
    frames,
    frameDuration:
      typeof def.frameDuration === 'number' && def.frameDuration > 0
        ? def.frameDuration
        : DEFAULT_FRAME_DURATION_SEC,
  };
}
