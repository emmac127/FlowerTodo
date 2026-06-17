import { parse } from 'yaml';
import type { AppVariant } from '../appVariant';
import defaultLevelsRaw from '../../garden/levels.yaml?raw';
import defaultLayoutRaw from '../../garden/layout.yaml?raw';
import dadLevelsRaw from '../../garden/dadLevels/levels.yaml?raw';
import dadLayoutRaw from '../../garden/dadLevels/layout.yaml?raw';
import type {
  GardenDefinition,
  LayoutConfig,
  LevelsConfig,
} from './types';

export const GARDEN_HEADROOM_TOP = 300;

function resolveLevelDefinition(
  levelsConfig: LevelsConfig,
  level: number,
): GardenDefinition | null {
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
      scatterAssets: entry.scatterAssets,
      onLevelStart: entry.onLevelStart,
      perCompletion: entry.perCompletion,
      fills: entry.fills,
    };
  }

  return null;
}

function configuredLevelsFrom(levelsConfig: LevelsConfig): number[] {
  const keys = Object.keys(levelsConfig.levels ?? {});
  return keys
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);
}

export interface GardenConfig {
  variant: AppVariant;
  levelsConfig: LevelsConfig;
  layoutConfig: LayoutConfig;
  designWidth: number;
  designHeight: number;
  stageHeight: number;
  getLevelDefinition(level: number): GardenDefinition | null;
  getConfiguredLevels(): number[];
}

function buildGardenConfig(
  variant: AppVariant,
  levelsRaw: string,
  layoutRaw: string,
): GardenConfig {
  const levelsConfig = parse(levelsRaw) as LevelsConfig;
  const layoutConfig = parse(layoutRaw) as LayoutConfig;
  const designWidth = layoutConfig.scene?.designWidth ?? 2400;
  const designHeight = layoutConfig.scene?.designHeight ?? 320;
  const stageHeight = designHeight + GARDEN_HEADROOM_TOP;

  return {
    variant,
    levelsConfig,
    layoutConfig,
    designWidth,
    designHeight,
    stageHeight,
    getLevelDefinition: (level: number) =>
      resolveLevelDefinition(levelsConfig, level),
    getConfiguredLevels: () => configuredLevelsFrom(levelsConfig),
  };
}

const configCache = new Map<AppVariant, GardenConfig>();

export function getGardenConfig(variant: AppVariant): GardenConfig {
  let config = configCache.get(variant);
  if (!config) {
    config =
      variant === 'dad'
        ? buildGardenConfig(variant, dadLevelsRaw, dadLayoutRaw)
        : buildGardenConfig(variant, defaultLevelsRaw, defaultLayoutRaw);
    configCache.set(variant, config);
  }
  return config;
}

export const defaultGardenConfig = getGardenConfig('default');

/** @deprecated Prefer `getGardenConfig(variant).layoutConfig` */
export const layoutConfig = defaultGardenConfig.layoutConfig;

/** @deprecated Prefer `getGardenConfig(variant).getLevelDefinition` */
export function getLevelDefinition(level: number): GardenDefinition | null {
  return defaultGardenConfig.getLevelDefinition(level);
}

/** @deprecated Prefer `getGardenConfig(variant).getConfiguredLevels` */
export function getConfiguredLevels(): number[] {
  return defaultGardenConfig.getConfiguredLevels();
}

export const DESIGN_WIDTH = defaultGardenConfig.designWidth;
export const DESIGN_HEIGHT = defaultGardenConfig.designHeight;
export const STAGE_HEIGHT = defaultGardenConfig.stageHeight;
