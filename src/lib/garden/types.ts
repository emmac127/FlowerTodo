// Types for the YAML-driven garden scene.

export type GardenMode = 'multiStage' | 'scatterPerCompletion' | 'planter';

export interface StageImage {
  src: string;
  /** Whether this image replaces the previous stage on the same spot. */
  replace?: boolean;
}

export interface PerCompletionImage {
  src: string;
  replace?: boolean;
  /** Maximum number of fill flowers added across the level. */
  max?: number;
}

/** A reusable behavior template, or an inline level definition. */
export interface GardenDefinition {
  name?: string;
  mode: GardenMode;
  /** multiStage: one image per growth stage (index = in-level score). */
  stages?: StageImage[];
  /**
   * multiStage: when true (default), each stage renders taller via a built-in
   * growth ramp. Set false to keep the same design height at every stage.
   */
  scaleWithStage?: boolean;
  /** scatterPerCompletion: the single-stage asset placed once per completion. */
  asset?: string;
  /** planter: image shown when the level begins (score 0). */
  onLevelStart?: StageImage;
  /** planter: image added for each completion after the planter appears. */
  perCompletion?: PerCompletionImage;
}

/** A `levels:` entry — either references a definition or inlines one. */
export interface LevelEntry extends Partial<GardenDefinition> {
  use?: string;
}

export interface LevelsConfig {
  definitions: Record<string, GardenDefinition>;
  levels: Record<string, LevelEntry>;
}

export interface PositionEntry {
  x: number;
  y: number;
  anchor?: string;
  /**
   * Draw order (higher = in front). Defaults to level × 10 + slot/stage index.
   * Use a lower value (e.g. 5) to draw behind flowers on later levels.
   */
  zIndex?: number;
  /** Size multiplier applied to the element's design height (1 = default). */
  scale?: number;
}

export interface LayoutLevelConfig {
  multiStage?: { stages: Record<string | number, PositionEntry> };
  scatter?: PositionEntry[];
  planter?: { base?: PositionEntry; fills?: PositionEntry[] };
}

export interface LayoutConfig {
  scene: { designWidth: number; designHeight: number };
  levels: Record<string, LayoutLevelConfig>;
}

/** Identifies exactly which layout slot an element maps to. */
export type ElementKind = 'multiStage' | 'scatter' | 'planterBase' | 'planterFill';

/** A single drawable element resolved to a position on the design canvas. */
export interface PlacedElement {
  /** Stable id, e.g. "L7-stage-2", "L3-scatter-1", "L4-planter-base". */
  id: string;
  level: number;
  kind: ElementKind;
  /** Display label for the editor list. */
  name: string;
  /** Resolved image source. */
  src: string;
  /** multiStage stage index (also the in-level score that shows it). */
  stageIndex?: number;
  /** scatter / planterFill slot index (0-based). */
  slotIndex?: number;
  /** Normalized design-canvas position (0–1). */
  x: number;
  y: number;
  anchor: string;
  /** Base height in design-canvas pixels (before {@link scale}). */
  heightDesign: number;
  /** Size multiplier for width and height (default 1). */
  scale: number;
  /** Draw order (higher = in front). */
  zIndex: number;
  /** False when the position came from auto-placement (no layout entry). */
  hasLayout: boolean;
}
