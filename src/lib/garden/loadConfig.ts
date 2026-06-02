import { parse } from 'yaml';
import levelsRaw from '../../garden/levels.yaml?raw';
import layoutRaw from '../../garden/layout.yaml?raw';
import type {
  GardenDefinition,
  LayoutConfig,
  LevelsConfig,
} from './types';

export const levelsConfig = parse(levelsRaw) as LevelsConfig;
export const layoutConfig = parse(layoutRaw) as LayoutConfig;

/**
 * Resolve the behavior definition for a garden level. A level entry either
 * references a shared template via `use:` or inlines the definition fields.
 */
export function getLevelDefinition(level: number): GardenDefinition | null {
  const entry = levelsConfig.levels?.[String(level)];
  if (!entry) return null;

  if (entry.use) {
    const def = levelsConfig.definitions?.[entry.use];
    if (!def) {
      if (import.meta.env.DEV) {
        console.warn(
          `[garden] level ${level} references unknown definition "${entry.use}"`,
        );
      }
      return null;
    }
    return def;
  }

  if (entry.mode) {
    return {
      name: entry.name,
      mode: entry.mode,
      stages: entry.stages,
      scaleWithStage: entry.scaleWithStage,
      asset: entry.asset,
      onLevelStart: entry.onLevelStart,
      perCompletion: entry.perCompletion,
    };
  }

  return null;
}

/** Highest level number that has a definition (for the editor catalog). */
export function getConfiguredLevels(): number[] {
  const keys = Object.keys(levelsConfig.levels ?? {});
  return keys
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);
}

export const DESIGN_WIDTH = layoutConfig.scene?.designWidth ?? 2400;
export const DESIGN_HEIGHT = layoutConfig.scene?.designHeight ?? 320;

/** Extra design space above the ground line so tall blooms are not clipped at y≈0. */
export const GARDEN_HEADROOM_TOP = 300;

/** Full stage height in design pixels (headroom + ground band). */
export const STAGE_HEIGHT = DESIGN_HEIGHT + GARDEN_HEADROOM_TOP;
