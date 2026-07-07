// Types for the YAML-driven garden scene.

export type GardenMode =
  | 'multiStage'
  | 'scatterPerCompletion'
  | 'planter'
  | 'planterSequence'
  | 'birdPerch'
  | 'birdAmbient';

/** Which garden file drives the scene (default app only). */
export type GardenPhase = 'mode1' | 'mode2';

/** Frame sequence defined in levels.yaml for a single drawable asset. */
export interface AssetAnimationDef {
  /** PNG (or image) paths in playback order. */
  frames: string[];
  /** Seconds each frame is shown (default 0.15). */
  frameDuration?: number;
}

/** Asset entry in levels.yaml — static `src` and/or looping `animation`. */
export interface GardenAssetRef {
  src?: string;
  /** Whether this image replaces the previous stage on the same spot. */
  replace?: boolean;
  animation?: AssetAnimationDef;
}

export interface StageImage extends GardenAssetRef {
  /** Static image, or first frame when `animation.frames` is set. */
  src?: string;
  /**
   * When false, mascot delivery for this stage uses a generic flower token
   * instead of the stage asset. Default true.
   */
  mascotDeliversElement?: boolean;
}

/** birdAmbient: per-stage config including whether hopping is enabled. */
export interface BirdStageImage extends StageImage {
  /** When false, bird stays at layout anchor (e.g. egg stage). Default true. */
  hopEnabled?: boolean;
}

export interface PerCompletionImage extends GardenAssetRef {
  src?: string;
  /** Maximum number of fill flowers added across the level. */
  max?: number;
}

/** birdAmbient: named animation clips for idle / wingflap / peck. */
export interface BirdAnimationsDef {
  idle?: AssetAnimationDef;
  wingflap?: AssetAnimationDef;
  peck?: AssetAnimationDef;
}

/** birdAmbient: timing and probability for ambient behaviors. */
export interface BirdBehaviorDef {
  /** Seconds between idle action rolls (min–max range). */
  hopIntervalSec?: { min: number; max: number };
  /**
   * Hop travel speed in normalized design coords per second (0–1 canvas width).
   * Independent of bird scale/size.
   */
  hopNormPerSec?: number;
  /**
   * Relative weight for choosing a hop on each idle roll (0–1+). When omitted,
   * defaults to `max(0.15, 1 - wingflapChance)` for backward compatibility.
   */
  hopChance?: number;
  /** Relative weight for wingflap when an action is chosen (0–1). */
  wingflapChance?: number;
  /** Relative weight for peck when an action is chosen (0–1). */
  peckChance?: number;
  /**
   * When hopping, probability of picking a long-distance destination that uses
   * wingflap frames during the hop arc (0–1). When omitted, hop distance is
   * random and wingflap plays whenever the hop exceeds the bird's width.
   */
  flyChance?: number;
  /** Index into idle/wingflap frames for resting pose (default 0). */
  idleFrame?: number;
}

/** A reusable behavior template, or an inline level definition. */
export interface GardenDefinition {
  name?: string;
  mode: GardenMode;
  /** multiStage / birdAmbient: one image per growth stage (index = in-level score). */
  stages?: StageImage[] | BirdStageImage[];
  /**
   * multiStage: when true (default), each stage renders taller via a built-in
   * growth ramp. Set false to keep the same design height at every stage.
   */
  scaleWithStage?: boolean;
  /**
   * scatterPerCompletion: one asset for every scattered flower (path or object
   * with optional animation).
   */
  asset?: string | GardenAssetRef;
  /**
   * scatterPerCompletion: per-slot assets (slot 0, 1, …). When set, overrides
   * `asset`. Use for different art or animations per placement.
   */
  scatterAssets?: (string | GardenAssetRef)[];
  /** planter / birdPerch: image shown when the level begins (score 0). */
  onLevelStart?: StageImage;
  /** planter: image added for each completion after the planter appears. */
  perCompletion?: PerCompletionImage;
  /**
   * planterSequence: one image per fill slot, in completion order. Repeats are
   * allowed. Level length equals this list's length (capped by tasks per level).
   */
  fills?: StageImage[];
  /** birdAmbient: animation clips and idle frame index. */
  animations?: BirdAnimationsDef;
  /** birdAmbient: hop / wingflap / peck timing. */
  behavior?: BirdBehaviorDef;
  /** birdAmbient: legacy field (ignored); all hop surfaces in surfaces.yaml are used. */
  hopSurfaceId?: string;
  /** birdAmbient: legacy field (ignored); all food surfaces in surfaces.yaml are used. */
  foodSurfaceId?: string;
  /** Display image for unlock pop-ups (mode2 level-up). */
  unlockImage?: string;
}

/** A `levels:` entry — either references a definition or inlines one. */
export interface LevelEntry extends Partial<GardenDefinition> {
  use?: string;
  /** birdAmbient: multiple birds on one level — one bird per completion (layout slots "0", "1", …). */
  birds?: Array<{ use: string }>;
}

export interface LevelsConfig {
  definitions: Record<string, GardenDefinition>;
  levels: Record<string, LevelEntry>;
}

/** Collision box stored relative to a bird's layout anchor. */
export interface BirdCollisionBox {
  /** Left edge offset from anchor x (anchor is bottom-center). */
  offsetX: number;
  /** Top edge offset from anchor y. */
  offsetY: number;
  width: number;
  height: number;
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
  /** Mirror the asset horizontally (flip over the vertical axis). */
  flipX?: boolean;
  /**
   * Extra seconds to hold the last animation frame before looping (layout only).
   * Requires animation frames defined in levels.yaml for this slot.
   */
  animationLastFrameHold?: number;
  /** birdAmbient: override hop surface for this slot. */
  hopSurfaceId?: string;
  /** birdAmbient: override food surface for this slot. */
  foodSurfaceId?: string;
  /** birdAmbient: collision box offset from this slot's anchor (moves with the bird). */
  collisionBox?: BirdCollisionBox;
}

/** Normalized rectangle on the design canvas (0–1 coords). */
export interface SurfaceRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Garden level when this surface first appears (default 1). */
  unlockLevel?: number;
  /** In-level score at unlock (0 = level start). Persists on later levels. */
  unlockStage?: number;
}

export interface SurfacesConfig {
  hop: SurfaceRect[];
  food: SurfaceRect[];
}

/** Resolved looping animation passed to the garden canvas. */
export interface PlacedElementAnimation {
  frames: string[];
  frameDuration: number;
  lastFrameHold: number;
}

/** Runtime bird behavior resolved from yaml + surfaces. */
export interface PlacedBirdBehavior {
  hopEnabled: boolean;
  idleFrame: number;
  idleFrames: string[];
  wingflapFrames: string[];
  peckFrames: string[];
  wingflapFrameDuration: number;
  peckFrameDuration: number;
  hopIntervalMin: number;
  hopIntervalMax: number;
  hopNormPerSec: number;
  hopChance: number;
  wingflapChance: number;
  peckChance: number;
  /** When set, biases hop destinations toward fly hops at this rate. */
  flyChance?: number;
  hopSurfaces: SurfaceRect[];
  foodSurfaces: SurfaceRect[];
}

export interface LayoutLevelConfig {
  multiStage?: { stages: Record<string | number, PositionEntry> };
  scatter?: PositionEntry[];
  planter?: { base?: PositionEntry; fills?: PositionEntry[] };
  birdPerch?: {
    perch?: PositionEntry;
    stages?: Record<string | number, PositionEntry>;
  };
  birdAmbient?: { stages: Record<string | number, PositionEntry> };
}

export interface LayoutConfig {
  scene: { designWidth: number; designHeight: number };
  levels: Record<string, LayoutLevelConfig>;
}

/** Identifies exactly which layout slot an element maps to. */
export type ElementKind =
  | 'multiStage'
  | 'scatter'
  | 'planterBase'
  | 'planterFill'
  | 'birdPerchBase'
  | 'birdPerchStage'
  | 'birdAmbientStage';

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
  /** Normalized design-canvas x (0–1). y uses 1 as ground; may exceed 1 to clip at bottom. */
  x: number;
  y: number;
  anchor: string;
  /** Base height in design-canvas pixels (before {@link scale}); fallback until image loads. */
  heightDesign: number;
  /**
   * multiStage growth ramp (0–1), baked into {@link heightDesign} for display math.
   * @deprecated retained for editor metadata; sizing uses heightDesign.
   */
  sizeRamp?: number;
  /** Size multiplier for width and height (default 1). */
  scale: number;
  /** When true, mirror the asset horizontally (flip over the vertical axis). */
  flipX: boolean;
  /** Draw order (higher = in front). */
  zIndex: number;
  /** False when the position came from auto-placement (no layout entry). */
  hasLayout: boolean;
  /** When set, the canvas cycles through frames (from levels.yaml). */
  animation?: PlacedElementAnimation;
  /** birdAmbient: resolved ambient behavior config. */
  birdBehavior?: PlacedBirdBehavior;
  /** birdAmbient: collision box relative to anchor (from layout.yaml). */
  birdCollisionBox?: BirdCollisionBox;
  /**
   * When false, mascot delivery shows a generic flower cargo that disappears on
   * drop; the real asset is revealed at the anchor. Default true.
   */
  mascotDeliversElement?: boolean;
}
