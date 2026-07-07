import { parse } from 'yaml';
import type { AppVariant } from '../appVariant';
import defaultLevelsRaw from '../../garden/levels.yaml?raw';
import defaultLayoutRaw from '../../garden/layout.yaml?raw';
import dadLevelsRaw from '../../garden/dadLevels/levels.yaml?raw';
import dadLayoutRaw from '../../garden/dadLevels/layout.yaml?raw';
import mode2LevelsRaw from '../../garden/mode2/mode2.yaml?raw';
import mode2LayoutRaw from '../../garden/mode2/layout.yaml?raw';
import mode2SurfacesRaw from '../../garden/mode2/surfaces.yaml?raw';
import type {
  GardenDefinition,
  GardenPhase,
  LayoutConfig,
  LevelsConfig,
  SurfacesConfig,
} from './types';

export type { GardenPhase };

export interface LevelBirdInstance {
  def: GardenDefinition;
  instanceIndex: number;
}

export const GARDEN_HEADROOM_TOP = 300;

function resolveDefinitionByUse(
  levelsConfig: LevelsConfig,
  use: string,
): GardenDefinition | null {
  const def = levelsConfig.definitions?.[use];
  if (!def) {
    if (import.meta.env.DEV) {
      console.warn(`[garden] unknown definition "${use}"`);
    }
    return null;
  }
  return def;
}

function resolveLevelDefinition(
  levelsConfig: LevelsConfig,
  level: number,
): GardenDefinition | null {
  const entry = levelsConfig.levels?.[String(level)];
  if (!entry) return null;

  if (entry.birds?.length) {
    return resolveDefinitionByUse(levelsConfig, entry.birds[0]!.use);
  }

  if (entry.use) {
    return resolveDefinitionByUse(levelsConfig, entry.use);
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
      animations: entry.animations,
      behavior: entry.behavior,
      hopSurfaceId: entry.hopSurfaceId,
      foodSurfaceId: entry.foodSurfaceId,
      unlockImage: entry.unlockImage,
    };
  }

  return null;
}

/** Ambient bird instances for a level (one or many per layout slot). */
export function getLevelBirdInstances(
  levelsConfig: LevelsConfig,
  level: number,
): LevelBirdInstance[] | null {
  const entry = levelsConfig.levels?.[String(level)];
  if (!entry) return null;

  if (entry.birds?.length) {
    const instances: LevelBirdInstance[] = [];
    entry.birds.forEach((bird, index) => {
      const def = resolveDefinitionByUse(levelsConfig, bird.use);
      if (def?.mode === 'birdAmbient') {
        instances.push({ def, instanceIndex: index });
      }
    });
    return instances.length > 0 ? instances : null;
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
  phase?: GardenPhase;
  levelsConfig: LevelsConfig;
  layoutConfig: LayoutConfig;
  surfacesConfig?: SurfacesConfig;
  designWidth: number;
  designHeight: number;
  stageHeight: number;
  getLevelDefinition(level: number): GardenDefinition | null;
  getLevelBirdInstances(level: number): LevelBirdInstance[] | null;
  getConfiguredLevels(): number[];
}

function buildGardenConfig(
  variant: AppVariant,
  levelsRaw: string,
  layoutRaw: string,
  phase?: GardenPhase,
  surfacesRaw?: string,
): GardenConfig {
  const levelsConfig = parse(levelsRaw) as LevelsConfig;
  const layoutConfig = parse(layoutRaw) as LayoutConfig;
  const surfacesConfig = surfacesRaw
    ? (parse(surfacesRaw) as SurfacesConfig)
    : undefined;
  const designWidth = layoutConfig.scene?.designWidth ?? 2400;
  const designHeight = layoutConfig.scene?.designHeight ?? 320;
  const stageHeight = designHeight + GARDEN_HEADROOM_TOP;

  return {
    variant,
    phase,
    levelsConfig,
    layoutConfig,
    surfacesConfig,
    designWidth,
    designHeight,
    stageHeight,
    getLevelDefinition: (level: number) =>
      resolveLevelDefinition(levelsConfig, level),
    getLevelBirdInstances: (level: number) =>
      getLevelBirdInstances(levelsConfig, level),
    getConfiguredLevels: () => configuredLevelsFrom(levelsConfig),
  };
}

const configCache = new Map<string, GardenConfig>();

function cacheKey(variant: AppVariant, phase?: GardenPhase): string {
  return phase ? `${variant}:${phase}` : variant;
}

export function getGardenConfig(variant: AppVariant): GardenConfig {
  const key = cacheKey(variant);
  let config = configCache.get(key);
  if (!config) {
    config =
      variant === 'dad'
        ? buildGardenConfig(variant, dadLevelsRaw, dadLayoutRaw)
        : buildGardenConfig(variant, defaultLevelsRaw, defaultLayoutRaw, 'mode1');
    configCache.set(key, config);
  }
  return config;
}

/** Mode1 uses levels.yaml; mode2 uses mode2/mode2.yaml (default app only). */
export function getGardenConfigForPhase(phase: GardenPhase): GardenConfig {
  const key = cacheKey('default', phase);
  let config = configCache.get(key);
  if (!config) {
    config =
      phase === 'mode2'
        ? buildGardenConfig(
            'default',
            mode2LevelsRaw,
            mode2LayoutRaw,
            'mode2',
            mode2SurfacesRaw,
          )
        : buildGardenConfig('default', defaultLevelsRaw, defaultLayoutRaw, 'mode1');
    configCache.set(key, config);
  }
  return config;
}

export const defaultGardenConfig = getGardenConfig('default');
export const mode1GardenConfig = getGardenConfigForPhase('mode1');
export const mode2GardenConfig = getGardenConfigForPhase('mode2');

/** Clear cached configs after editor save so the next load reads fresh YAML. */
export function clearGardenConfigCache(): void {
  configCache.clear();
}

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
