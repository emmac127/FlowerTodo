import type { GardenPhase } from './garden/types';

/** Persisted garden phase state (default app only). */
export interface GardenPhaseState {
  mode2Unlocked: boolean;
  activeGardenPhase: GardenPhase;
  mode2ProgressCount: number;
  mode1FrozenProgressCount: number;
  viewingNostalgicMode1: boolean;
  mode2OnboardingComplete: boolean;
}

export const DEFAULT_GARDEN_PHASE_STATE: GardenPhaseState = {
  mode2Unlocked: false,
  activeGardenPhase: 'mode1',
  mode2ProgressCount: 0,
  mode1FrozenProgressCount: 0,
  viewingNostalgicMode1: false,
  mode2OnboardingComplete: false,
};

export interface SceneProgressInput {
  gardenProgressCount: number;
  mode2Unlocked: boolean;
  mode2ProgressCount: number;
  mode1FrozenProgressCount: number;
  viewingNostalgicMode1: boolean;
}

/** Which completion count drives the visible garden scene. */
export function getSceneProgressCount(input: SceneProgressInput): number {
  if (input.viewingNostalgicMode1 && input.mode2Unlocked) {
    return input.mode1FrozenProgressCount;
  }
  if (input.mode2Unlocked) {
    return input.mode2ProgressCount;
  }
  return input.gardenProgressCount;
}

/** Which garden phase config to load for the scene. */
export function getSceneGardenPhase(input: SceneProgressInput): GardenPhase {
  if (input.viewingNostalgicMode1 && input.mode2Unlocked) {
    return 'mode1';
  }
  if (input.mode2Unlocked) {
    return 'mode2';
  }
  return 'mode1';
}
