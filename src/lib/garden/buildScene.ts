import {
  getGardenLevel,
  getInLevelScore,
  getLevelCompletionBudget,
  getScatterSlotCount,
  getTasksForGardenLevel,
} from '../plantedGarden';
import {
  defaultGardenConfig,
  type GardenConfig,
} from './loadConfig';
import { resolveGardenAsset } from './gardenAsset';
import type { ResolvedGardenAsset } from './gardenAsset';
import { resolveBirdBehavior } from './birdBehavior';
import type {
  BirdStageImage,
  ElementKind,
  GardenDefinition,
  GardenAssetRef,
  LayoutConfig,
  LayoutLevelConfig,
  PerCompletionImage,
  PlacedElement,
  PlacedElementAnimation,
  PositionEntry,
  StageImage,
} from './types';

/** Design-pixel heights per element kind (multiStage scales by stage). */
const HEIGHT_MULTISTAGE_FULL = 300;
const HEIGHT_SCATTER = 96;
const HEIGHT_PLANTER_BASE = 200;
const HEIGHT_PLANTER_FILL = 112;
const HEIGHT_BIRD = 120;
const HEIGHT_BIRD_PERCH = 160;

/** Growth ramp so early multi-stage stages render smaller than the full bloom. */
const MULTISTAGE_STAGE_SCALE = [0.3, 0.5, 0.68, 0.82, 0.92, 1.0];

/** Last-resort anchor when layout.yaml has no coordinates at all. */
const AUTO_FALLBACK_X = 0.5;
const AUTO_FALLBACK_Y = 0.94;

/** Horizontal spacing between auto-placed scatter / fill slots (normalized). */
const AUTO_SLOT_SPREAD_X = 0.045;

/** Vertical stagger for auto-placed scatter / fill slots (normalized). */
const AUTO_SLOT_STAGGER_Y = 0.04;

function isPositionedEntry(
  entry: PositionEntry | undefined,
): entry is PositionEntry {
  return (
    entry != null && typeof entry.x === 'number' && typeof entry.y === 'number'
  );
}

function averagePoint(
  points: { x: number; y: number }[],
): { x: number; y: number } | null {
  if (points.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function collectLevelLayoutPoints(
  levelLayout: LayoutLevelConfig | undefined,
): { x: number; y: number }[] {
  if (!levelLayout) return [];
  const points: { x: number; y: number }[] = [];

  const stages = levelLayout.multiStage?.stages;
  if (stages) {
    const list = Array.isArray(stages) ? stages : Object.values(stages);
    for (const stage of list) {
      if (isPositionedEntry(stage)) points.push({ x: stage.x, y: stage.y });
    }
  }

  for (const slot of levelLayout.scatter ?? []) {
    if (isPositionedEntry(slot)) points.push({ x: slot.x, y: slot.y });
  }

  const planter = levelLayout.planter;
  if (isPositionedEntry(planter?.base)) {
    points.push({ x: planter.base.x, y: planter.base.y });
  }
  for (const fill of planter?.fills ?? []) {
    if (isPositionedEntry(fill)) points.push({ x: fill.x, y: fill.y });
  }

  const birdPerch = levelLayout.birdPerch;
  if (isPositionedEntry(birdPerch?.perch)) {
    points.push({ x: birdPerch.perch.x, y: birdPerch.perch.y });
  }
  const perchStages = birdPerch?.stages;
  if (perchStages) {
    const list = Array.isArray(perchStages) ? perchStages : Object.values(perchStages);
    for (const stage of list) {
      if (isPositionedEntry(stage)) points.push({ x: stage.x, y: stage.y });
    }
  }

  const ambientStages = levelLayout.birdAmbient?.stages;
  if (ambientStages) {
    const list = Array.isArray(ambientStages)
      ? ambientStages
      : Object.values(ambientStages);
    for (const stage of list) {
      if (isPositionedEntry(stage)) points.push({ x: stage.x, y: stage.y });
    }
  }

  return points;
}

/** Positions already defined in layout.yaml for the same slot family on this level. */
function collectKindLayoutPoints(
  levelLayout: LayoutLevelConfig | undefined,
  kind: ElementKind,
): { x: number; y: number }[] {
  if (!levelLayout) return [];
  const points: { x: number; y: number }[] = [];

  if (kind === 'multiStage') {
    const stages = levelLayout.multiStage?.stages;
    if (stages) {
      const list = Array.isArray(stages) ? stages : Object.values(stages);
      for (const stage of list) {
        if (isPositionedEntry(stage)) points.push({ x: stage.x, y: stage.y });
      }
    }
    return points;
  }

  if (kind === 'scatter') {
    for (const slot of levelLayout.scatter ?? []) {
      if (isPositionedEntry(slot)) points.push({ x: slot.x, y: slot.y });
    }
    return points;
  }

  const planter = levelLayout.planter;
  if (kind === 'planterBase' && isPositionedEntry(planter?.base)) {
    points.push({ x: planter.base.x, y: planter.base.y });
  }
  for (const fill of planter?.fills ?? []) {
    if (isPositionedEntry(fill)) points.push({ x: fill.x, y: fill.y });
  }
  if (kind === 'birdPerchBase' && isPositionedEntry(levelLayout?.birdPerch?.perch)) {
    points.push({
      x: levelLayout.birdPerch!.perch!.x,
      y: levelLayout.birdPerch!.perch!.y,
    });
  }
  if (kind === 'birdPerchStage' || kind === 'birdAmbientStage') {
    const stages =
      kind === 'birdPerchStage'
        ? levelLayout?.birdPerch?.stages
        : levelLayout?.birdAmbient?.stages;
    if (stages) {
      const list = Array.isArray(stages) ? stages : Object.values(stages);
      for (const stage of list) {
        if (isPositionedEntry(stage)) points.push({ x: stage.x, y: stage.y });
      }
    }
  }
  return points;
}

function collectAllLayoutPoints(layout: LayoutConfig): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (const levelLayout of Object.values(layout.levels ?? {})) {
    points.push(...collectLevelLayoutPoints(levelLayout));
  }
  return points;
}

/**
 * Where to place a slot that is missing from layout.yaml: near siblings on the
 * same level, then near anything on that level, then near the whole garden.
 */
function resolveAutoAnchor(
  layout: LayoutConfig,
  level: number,
  kind: ElementKind,
): { x: number; y: number } {
  const levelLayout = layout.levels?.[String(level)];
  return (
    averagePoint(collectKindLayoutPoints(levelLayout, kind)) ??
    averagePoint(collectLevelLayoutPoints(levelLayout)) ??
    averagePoint(collectAllLayoutPoints(layout)) ?? {
      x: AUTO_FALLBACK_X,
      y: AUTO_FALLBACK_Y,
    }
  );
}

function multiStageHeight(stageIndex: number, scaleWithStage: boolean): number {
  return HEIGHT_MULTISTAGE_FULL * multiStageSizeRamp(stageIndex, scaleWithStage);
}

function multiStageSizeRamp(stageIndex: number, scaleWithStage: boolean): number {
  if (!scaleWithStage) return 1;
  return MULTISTAGE_STAGE_SCALE[
    Math.min(stageIndex, MULTISTAGE_STAGE_SCALE.length - 1)
  ]!;
}

function definitionScaleWithStage(def: GardenDefinition): boolean {
  return def.scaleWithStage !== false;
}

function isPersistentMultiStageStage(stage: StageImage): boolean {
  return stage.replace === false;
}

/**
 * Which multiStage indices to render at a given in-level stage (1 .. budget).
 * Stage N reveals stages[N-1]. Persistent stages (`replace: false`) stay once
 * reached; replaceable stages only show the latest reached slot in the chain.
 */
function visibleMultiStageIndices(
  stages: StageImage[],
  score: number,
  _config: GardenConfig,
): number[] {
  if (score <= 0) return [];

  const currentIndex = score - 1;
  const indices: number[] = [];

  for (let i = 0; i < stages.length; i++) {
    if (isPersistentMultiStageStage(stages[i]!) && score >= i + 1) {
      indices.push(i);
    }
  }

  const currentStage = stages[currentIndex];
  if (currentStage && !isPersistentMultiStageStage(currentStage)) {
    let latestReplace = -1;
    for (let i = 0; i <= currentIndex; i++) {
      if (!isPersistentMultiStageStage(stages[i]!)) {
        latestReplace = i;
      }
    }
    if (latestReplace >= 0 && !indices.includes(latestReplace)) {
      indices.push(latestReplace);
    }
  }

  return indices.sort((a, b) => a - b);
}

/** In-level stage (0 .. budget) for a level given the lifetime completion count. */
function scoreInLevel(
  level: number,
  completedCount: number,
  config: GardenConfig,
): number {
  return getInLevelScore(completedCount, level, config);
}

function definitionName(def: GardenDefinition, level: number): string {
  return def.name ?? `Level ${level}`;
}

/** Default draw order when layout.yaml omits zIndex. */
export function defaultZIndex(level: number, index: number): number {
  return level * 10 + index;
}

interface ResolvedSlot {
  x: number;
  y: number;
  anchor: string;
  zIndex: number;
  scale: number;
  flipX: boolean;
  animationLastFrameHold: number;
  hasLayout: boolean;
}

/** Small offsets around the garden center so slots do not stack on one pixel. */
function autoSlotOffset(index: number, slotCount: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(slotCount, index + 1))));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const xShift = (col - (cols - 1) / 2) * AUTO_SLOT_SPREAD_X;
  const yShift = row * AUTO_SLOT_STAGGER_Y;
  return { x: xShift, y: yShift };
}

function autoPlace(
  layout: LayoutConfig,
  level: number,
  kind: ElementKind,
  index: number,
  slotCount: number,
): Omit<ResolvedSlot, 'zIndex' | 'scale' | 'flipX' | 'animationLastFrameHold'> {
  const anchor = resolveAutoAnchor(layout, level, kind);

  if (kind === 'multiStage' || kind === 'planterBase' || kind === 'birdPerchBase') {
    return {
      x: anchor.x,
      y:
        kind === 'planterBase' || kind === 'birdPerchBase'
          ? anchor.y
          : Math.max(anchor.y, 0.85),
      anchor: 'bottomCenter',
      hasLayout: false,
    };
  }

  const { x: xShift, y: yShift } = autoSlotOffset(index, slotCount);

  if (kind === 'scatter') {
    return {
      x: anchor.x + xShift,
      y: anchor.y - yShift,
      anchor: 'bottomCenter',
      hasLayout: false,
    };
  }

  // planterFill — cluster around the planter anchor.
  const col = (index % 3) - 1;
  const row = Math.floor(index / 3);
  return {
    x: anchor.x + col * AUTO_SLOT_SPREAD_X,
    y: anchor.y - row * AUTO_SLOT_STAGGER_Y,
    anchor: 'bottomCenter',
    hasLayout: false,
  };
}

function readLayoutEntry(
  layout: LayoutConfig,
  level: number,
  kind: ElementKind,
  index: number,
): PositionEntry | undefined {
  const levelLayout = layout.levels?.[String(level)];
  if (kind === 'multiStage') {
    return (
      levelLayout?.multiStage?.stages?.[index] ??
      levelLayout?.multiStage?.stages?.[String(index)]
    );
  }
  if (kind === 'scatter') return levelLayout?.scatter?.[index];
  if (kind === 'planterBase') return levelLayout?.planter?.base;
  if (kind === 'planterFill') return levelLayout?.planter?.fills?.[index];
  if (kind === 'birdPerchBase') return levelLayout?.birdPerch?.perch;
  if (kind === 'birdPerchStage') {
    return (
      levelLayout?.birdPerch?.stages?.[index] ??
      levelLayout?.birdPerch?.stages?.[String(index)]
    );
  }
  if (kind === 'birdAmbientStage') {
    return (
      levelLayout?.birdAmbient?.stages?.[index] ??
      levelLayout?.birdAmbient?.stages?.[String(index)]
    );
  }
  return undefined;
}

function resolveSlot(
  layout: LayoutConfig,
  level: number,
  kind: ElementKind,
  index: number,
  slotCount: number,
): ResolvedSlot {
  const entry = readLayoutEntry(layout, level, kind, index);
  const auto = autoPlace(layout, level, kind, index, slotCount);
  const hasCoords =
    entry != null &&
    typeof entry.x === 'number' &&
    typeof entry.y === 'number';

  return {
    x: hasCoords ? entry.x : auto.x,
    y: hasCoords ? entry.y : auto.y,
    anchor: entry?.anchor ?? auto.anchor,
    zIndex:
      typeof entry?.zIndex === 'number'
        ? entry.zIndex
        : defaultZIndex(level, index),
    scale: typeof entry?.scale === 'number' && entry.scale > 0 ? entry.scale : 1,
    flipX: entry?.flipX === true,
    animationLastFrameHold: resolveLastFrameHold(entry?.animationLastFrameHold),
    hasLayout: hasCoords,
  };
}

function resolveLastFrameHold(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function placedAnimation(
  asset: ResolvedGardenAsset,
  lastFrameHold: number,
): PlacedElementAnimation | undefined {
  if (!asset.animation || asset.animation.frames.length < 2) return undefined;
  return {
    frames: asset.animation.frames,
    frameDuration: asset.animation.frameDuration,
    lastFrameHold,
  };
}

interface ElementSpec {
  level: number;
  kind: ElementKind;
  asset: ResolvedGardenAsset;
  name: string;
  stageIndex?: number;
  slotIndex?: number;
  /** birdAmbient: layout slot (defaults to stageIndex for multi-stage birds). */
  birdInstanceIndex?: number;
  heightDesign: number;
  sizeRamp?: number;
  birdBehavior?: PlacedElement['birdBehavior'];
  mascotDeliversElement?: boolean;
}

function birdLayoutIndex(spec: ElementSpec): number {
  if (spec.kind === 'birdAmbientStage') {
    return spec.birdInstanceIndex ?? spec.stageIndex ?? 0;
  }
  return spec.stageIndex ?? spec.slotIndex ?? 0;
}

function makeElement(
  layout: LayoutConfig,
  spec: ElementSpec,
  config: GardenConfig,
): PlacedElement {
  const index = birdLayoutIndex(spec);
  const slotCount =
    spec.kind === 'scatter'
      ? getScatterSlotCount(spec.level, config)
      : spec.kind === 'planterFill'
        ? getTasksForGardenLevel(spec.level)
        : 1;
  const slot = resolveSlot(layout, spec.level, spec.kind, index, slotCount);
  const layoutEntry = readLayoutEntry(layout, spec.level, spec.kind, index);

  const idSuffix =
    spec.kind === 'multiStage'
      ? `stage-${spec.stageIndex}`
      : spec.kind === 'scatter'
        ? `scatter-${spec.slotIndex}`
        : spec.kind === 'planterBase'
          ? 'planter-base'
          : spec.kind === 'planterFill'
            ? `planter-fill-${spec.slotIndex}`
            : spec.kind === 'birdPerchBase'
              ? 'bird-perch-base'
              : spec.kind === 'birdPerchStage'
                ? `bird-perch-${spec.stageIndex}`
                : `bird-ambient-${index}`;

  return {
    id: `L${spec.level}-${idSuffix}`,
    level: spec.level,
    kind: spec.kind,
    name: spec.name,
    src: spec.asset.src,
    stageIndex: spec.stageIndex,
    slotIndex: spec.slotIndex,
    x: slot.x,
    y: slot.y,
    anchor: slot.anchor,
    heightDesign: spec.heightDesign,
    sizeRamp: spec.sizeRamp,
    scale: slot.scale,
    flipX: slot.flipX,
    zIndex: slot.zIndex,
    hasLayout: slot.hasLayout,
    animation: placedAnimation(spec.asset, slot.animationLastFrameHold),
    birdBehavior: spec.birdBehavior,
    birdCollisionBox: layoutEntry?.collisionBox,
    mascotDeliversElement: spec.mascotDeliversElement !== false,
  };
}

function stageMascotDelivers(
  stage?: StageImage | PerCompletionImage,
): boolean {
  if (stage && 'mascotDeliversElement' in stage) {
    return stage.mascotDeliversElement !== false;
  }
  return true;
}

function resolvedFromStageImage(image: StageImage): ResolvedGardenAsset | null {
  return resolveGardenAsset(image);
}

function resolvedFromPerCompletion(
  image: PerCompletionImage | undefined,
): ResolvedGardenAsset | null {
  if (!image) return null;
  return resolveGardenAsset(image);
}

/** Asset for one scatter slot (per-slot list or shared `asset`). */
function scatterAssetForSlot(
  def: GardenDefinition,
  slotIndex: number,
): ResolvedGardenAsset | null {
  const list = def.scatterAssets;
  if (list && list.length > 0) {
    const entry = list[Math.min(slotIndex, list.length - 1)]!;
    return resolveGardenAsset(entry);
  }
  return resolveGardenAsset(def.asset as string | GardenAssetRef | undefined);
}

function isPlanterMode(mode: GardenDefinition['mode']): boolean {
  return mode === 'planter' || mode === 'planterSequence';
}

/** Max number of planter fills the definition allows for a level. */
function planterFillCount(def: GardenDefinition, level: number): number {
  if (def.mode === 'planterSequence') {
    return def.fills?.length ?? 0;
  }
  return def.perCompletion?.max ?? getTasksForGardenLevel(level);
}

function planterFillAsset(
  def: GardenDefinition,
  slotIndex: number,
): ResolvedGardenAsset | null {
  if (def.mode === 'planterSequence') {
    const fill = def.fills?.[slotIndex];
    return fill ? resolvedFromStageImage(fill) : null;
  }
  return resolvedFromPerCompletion(def.perCompletion);
}

function appendPlanterElements(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  score: number,
  elements: PlacedElement[],
  config: GardenConfig,
): void {
  // Stage 1 = onLevelStart (planter); stages 2+ = fills[0], fills[1], …
  const baseAsset = def.onLevelStart
    ? resolvedFromStageImage(def.onLevelStart)
    : null;
  if (baseAsset && score >= 1) {
    elements.push(
      makeElement(
        layout,
        {
          level,
          kind: 'planterBase',
          asset: baseAsset,
          name: `${name} planter`,
          heightDesign: HEIGHT_PLANTER_BASE,
          mascotDeliversElement: stageMascotDelivers(def.onLevelStart),
        },
        config,
      ),
    );
  }

  const maxFills = planterFillCount(def, level);
  const fillCount = Math.min(Math.max(0, score - 1), maxFills);
  for (let i = 0; i < fillCount; i++) {
    const asset = planterFillAsset(def, i);
    if (!asset) continue;
    const fillStage =
      def.mode === 'planterSequence' ? def.fills?.[i] : def.perCompletion;
    elements.push(
      makeElement(
        layout,
        {
          level,
          kind: 'planterFill',
          asset,
          name: `${name} flower ${i + 1}`,
          slotIndex: i,
          heightDesign: HEIGHT_PLANTER_FILL,
          mascotDeliversElement: stageMascotDelivers(fillStage),
        },
        config,
      ),
    );
  }
}

/** Which birdPerch stage indices are visible at a given score. */
function visibleBirdPerchStageIndices(
  stages: StageImage[],
  score: number,
): number[] {
  if (score <= 0) return [];
  let latest = -1;
  for (let i = 0; i < stages.length; i++) {
    if (i < score) latest = i;
  }
  return latest >= 0 ? [latest] : [];
}

function layoutEntryForBirdStage(
  layout: LayoutConfig,
  level: number,
  kind: 'birdPerchStage' | 'birdAmbientStage',
  index: number,
): PositionEntry | undefined {
  return readLayoutEntry(layout, level, kind, index);
}

function appendBirdPerchElements(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  score: number,
  elements: PlacedElement[],
  config: GardenConfig,
): void {
  // Stage 1 = onLevelStart (perch); later stages walk stages[].
  const perchAsset = def.onLevelStart
    ? resolvedFromStageImage(def.onLevelStart)
    : null;
  if (perchAsset && score >= 1) {
    elements.push(
      makeElement(
        layout,
        {
          level,
          kind: 'birdPerchBase',
          asset: perchAsset,
          name: `${name} perch`,
          heightDesign: HEIGHT_BIRD_PERCH,
          mascotDeliversElement: stageMascotDelivers(def.onLevelStart),
        },
        config,
      ),
    );
  }

  const stages = def.stages ?? [];
  // Fills use stages 2+ → pass score - 1 so index 0 unlocks at stage 2.
  for (const stageIndex of visibleBirdPerchStageIndices(
    stages,
    Math.max(0, score - 1),
  )) {
    const stage = stages[stageIndex]!;
    const asset = resolvedFromStageImage(stage);
    if (!asset) continue;
    elements.push(
      makeElement(
        layout,
        {
          level,
          kind: 'birdPerchStage',
          asset,
          name: `${name} — stage ${stageIndex}`,
          stageIndex,
          heightDesign: HEIGHT_BIRD,
          mascotDeliversElement: stageMascotDelivers(stage),
        },
        config,
      ),
    );
  }
}

function appendBirdAmbientInstance(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  growthStage: number,
  instanceIndex: number,
  elements: PlacedElement[],
  config: GardenConfig,
  completedCount: number,
): void {
  const stages = (def.stages ?? []) as BirdStageImage[];
  const stage = stages[growthStage];
  if (!stage) return;
  const asset = resolvedFromStageImage(stage);
  if (!asset) return;
  const layoutEntry = layoutEntryForBirdStage(
    layout,
    level,
    'birdAmbientStage',
    instanceIndex,
  );
  const birdBehavior = resolveBirdBehavior(
    def,
    stage,
    asset.src,
    layoutEntry?.hopSurfaceId,
    layoutEntry?.foodSurfaceId,
    config.surfacesConfig,
    completedCount,
    config,
  );
  elements.push(
    makeElement(
      layout,
      {
        level,
        kind: 'birdAmbientStage',
        asset,
        name: `${name} — stage ${growthStage}`,
        stageIndex: growthStage,
        birdInstanceIndex: instanceIndex,
        heightDesign: HEIGHT_BIRD,
        birdBehavior,
        mascotDeliversElement: stageMascotDelivers(stage),
      },
      config,
    ),
  );
}

function appendBirdAmbientElements(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  score: number,
  elements: PlacedElement[],
  config: GardenConfig,
  completedCount: number,
  instanceIndex?: number,
): void {
  const stages = (def.stages ?? []) as BirdStageImage[];
  if (stages.length === 0) return;
  const stageIndices = visibleMultiStageIndices(stages, score, config);
  if (stageIndices.length === 0) return;

  if (instanceIndex !== undefined) {
    // Multi-bird levels: one bird unlocked per in-level completion.
    if (score <= instanceIndex) return;

    const growthStage = stageIndices[stageIndices.length - 1]!;
    appendBirdAmbientInstance(
      layout,
      def,
      level,
      name,
      growthStage,
      instanceIndex,
      elements,
      config,
      completedCount,
    );
    return;
  }

  for (const stageIndex of stageIndices) {
    appendBirdAmbientInstance(
      layout,
      def,
      level,
      name,
      stageIndex,
      stageIndex,
      elements,
      config,
      completedCount,
    );
  }
}

function appendBirdPerchEditorEntries(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  elements: PlacedElement[],
  entries: EditorEntry[],
  config: GardenConfig,
): void {
  const perchAsset = def.onLevelStart
    ? resolvedFromStageImage(def.onLevelStart)
    : null;
  if (perchAsset) {
    const el = makeElement(
      layout,
      {
        level,
        kind: 'birdPerchBase',
        asset: perchAsset,
        name: `${name} perch`,
        heightDesign: HEIGHT_BIRD_PERCH,
        mascotDeliversElement: stageMascotDelivers(def.onLevelStart),
      },
      config,
    );
    elements.push(el);
    entries.push(editorEntryFromElement(el, `Level ${level} — ${name} perch`));
  }

  const stages = def.stages ?? [];
  for (let s = 0; s < stages.length; s++) {
    const stage = stages[s]!;
    const asset = resolvedFromStageImage(stage);
    if (!asset) continue;
    const el = makeElement(
      layout,
      {
        level,
        kind: 'birdPerchStage',
        asset,
        name: `${name} — stage ${s}`,
        stageIndex: s,
        heightDesign: HEIGHT_BIRD,
        mascotDeliversElement: stageMascotDelivers(stage),
      },
      config,
    );
    elements.push(el);
    entries.push(
      editorEntryFromElement(el, `Level ${level} — ${name} (stage ${s})`),
    );
  }
}

function appendBirdAmbientEditorEntries(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  elements: PlacedElement[],
  entries: EditorEntry[],
  config: GardenConfig,
  instanceIndex?: number,
): void {
  const stages = (def.stages ?? []) as BirdStageImage[];
  const stageCount = stages.length;
  if (stageCount === 0) return;

  const appendOne = (growthStage: number, layoutSlot: number, listName: string) => {
    const stage = stages[growthStage]!;
    const asset = resolvedFromStageImage(stage);
    if (!asset) return;
    const layoutEntry = layoutEntryForBirdStage(
      layout,
      level,
      'birdAmbientStage',
      layoutSlot,
    );
    const birdBehavior = resolveBirdBehavior(
      def,
      stage,
      asset.src,
      layoutEntry?.hopSurfaceId,
      layoutEntry?.foodSurfaceId,
      config.surfacesConfig,
    );
    const el = makeElement(
      layout,
      {
        level,
        kind: 'birdAmbientStage',
        asset,
        name: listName,
        stageIndex: growthStage,
        birdInstanceIndex: layoutSlot,
        heightDesign: HEIGHT_BIRD,
        birdBehavior,
        mascotDeliversElement: stageMascotDelivers(stage),
      },
      config,
    );
    elements.push(el);
    entries.push(editorEntryFromElement(el, listName));
  };

  if (instanceIndex !== undefined) {
    const growthStage = stageCount - 1;
    const suffix =
      instanceIndex > 0 ? ` (stage ${instanceIndex})` : '';
    appendOne(
      growthStage,
      instanceIndex,
      `Level ${level} — ${name}${suffix}`,
    );
    return;
  }

  for (let s = 0; s < stageCount; s++) {
    appendOne(s, s, `Level ${level} — ${name} (stage ${s})`);
  }
}

function appendPlanterEditorEntries(
  layout: LayoutConfig,
  def: GardenDefinition,
  level: number,
  name: string,
  elements: PlacedElement[],
  entries: EditorEntry[],
  config: GardenConfig,
): void {
  const baseAsset = def.onLevelStart
    ? resolvedFromStageImage(def.onLevelStart)
    : null;
  if (baseAsset) {
    const el = makeElement(
      layout,
      {
        level,
        kind: 'planterBase',
        asset: baseAsset,
        name: `${name} planter`,
        heightDesign: HEIGHT_PLANTER_BASE,
        mascotDeliversElement: stageMascotDelivers(def.onLevelStart),
      },
      config,
    );
    elements.push(el);
    entries.push(
      editorEntryFromElement(el, `Level ${level} — ${name} planter`),
    );
  }

  const maxFills = planterFillCount(def, level);
  for (let i = 0; i < maxFills; i++) {
    const asset = planterFillAsset(def, i);
    if (!asset) continue;
    const fillStage =
      def.mode === 'planterSequence' ? def.fills?.[i] : def.perCompletion;
    const el = makeElement(
      layout,
      {
        level,
        kind: 'planterFill',
        asset,
        name: `${name} flower ${i + 1}`,
        slotIndex: i,
        heightDesign: HEIGHT_PLANTER_FILL,
        mascotDeliversElement: stageMascotDelivers(fillStage),
      },
      config,
    );
    elements.push(el);
    entries.push(
      editorEntryFromElement(el, `Level ${level} — ${name} flower #${i + 1}`),
    );
  }
}

export interface GardenSceneInstances {
  elements: PlacedElement[];
  /** Id of the element added or advanced by the latest completion (pre–z-index sort). */
  newestId: string | null;
  /** Normalized x of that element for horizontal scroll focus. */
  scrollFocusX: number;
}

/**
 * Build the elements visible in the garden for a given lifetime completion
 * count. Levels render from 1 up to the active level; each level contributes
 * elements according to its YAML definition mode.
 */
export function buildGardenSceneInstances(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): GardenSceneInstances {
  const layout = config.layoutConfig;
  const activeLevel = getGardenLevel(completedCount, config);
  if (activeLevel < 1) {
    return { elements: [], newestId: null, scrollFocusX: 0 };
  }

  const elements: PlacedElement[] = [];

  for (let level = 1; level <= activeLevel; level++) {
    const score =
      level < activeLevel
        ? getLevelCompletionBudget(level, config)
        : scoreInLevel(level, completedCount, config);
    const birdInstances = config.getLevelBirdInstances(level);
    if (birdInstances) {
      for (const { def, instanceIndex } of birdInstances) {
        const name = definitionName(def, level);
        appendBirdAmbientElements(
          layout,
          def,
          level,
          name,
          score,
          elements,
          config,
          completedCount,
          instanceIndex,
        );
      }
      continue;
    }

    const def = config.getLevelDefinition(level);
    if (!def) continue;
    const name = definitionName(def, level);

    if (def.mode === 'multiStage') {
      const stages = def.stages ?? [];
      if (stages.length === 0) continue;
      const stageIndices = visibleMultiStageIndices(stages, score, config);
      for (const stageIndex of stageIndices) {
        const stage = stages[stageIndex]!;
        const asset = resolvedFromStageImage(stage);
        if (!asset) continue;
        elements.push(
          makeElement(
            layout,
            {
              level,
              kind: 'multiStage',
              asset,
              name: `${name} — stage ${stageIndex}`,
              stageIndex,
              heightDesign: multiStageHeight(
                stageIndex,
                definitionScaleWithStage(def),
              ),
              sizeRamp: multiStageSizeRamp(
                stageIndex,
                definitionScaleWithStage(def),
              ),
              mascotDeliversElement: stageMascotDelivers(stage),
            },
            config,
          ),
        );
      }
    } else if (def.mode === 'scatterPerCompletion') {
      for (let slot = 0; slot < score; slot++) {
        const asset = scatterAssetForSlot(def, slot);
        if (!asset) continue;
        elements.push(
          makeElement(
            layout,
            {
              level,
              kind: 'scatter',
              asset,
              name: `${name} ${slot + 1}`,
              slotIndex: slot,
              heightDesign: HEIGHT_SCATTER,
            },
            config,
          ),
        );
      }
    } else if (isPlanterMode(def.mode)) {
      appendPlanterElements(layout, def, level, name, score, elements, config);
    } else if (def.mode === 'birdPerch') {
      appendBirdPerchElements(layout, def, level, name, score, elements, config);
    } else if (def.mode === 'birdAmbient') {
      appendBirdAmbientElements(
        layout,
        def,
        level,
        name,
        score,
        elements,
        config,
        completedCount,
      );
    }
  }

  const newest = elements.length > 0 ? elements[elements.length - 1]! : null;
  elements.sort((a, b) => a.zIndex - b.zIndex);
  return {
    elements,
    newestId: newest?.id ?? null,
    scrollFocusX: newest?.x ?? 0,
  };
}

/**
 * Elements that appear when the active level reaches stage 1 (level start) but
 * were not visible at the previous completion count — hidden during the unlock
 * overlay, then delivered by the mascot when it dismisses.
 */
export function findLevelStartPendingElements(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): PlacedElement[] {
  if (completedCount <= 0) return [];
  const level = getGardenLevel(completedCount, config);
  if (level < 1) return [];
  // Level start plants stage 1 immediately; only then are "start" assets new.
  if (scoreInLevel(level, completedCount, config) !== 1) return [];

  const current = buildGardenSceneInstances(completedCount, config);
  const previous = buildGardenSceneInstances(completedCount - 1, config);
  const prevIds = new Set(previous.elements.map((e) => e.id));
  return current.elements.filter(
    (e) => e.level === level && !prevIds.has(e.id),
  );
}

/**
 * New element planted at stage 1 of the active level, if any.
 * Used for mascot delivery after the level-unlock overlay dismisses.
 */
export function findLevelStartDeliveryElement(
  completedCount: number,
  config: GardenConfig = defaultGardenConfig,
): PlacedElement | null {
  const pending = findLevelStartPendingElements(completedCount, config);
  return pending.length > 0 ? pending[pending.length - 1]! : null;
}

/** A selectable row in the Garden Editor's element list. */
export interface EditorEntry {
  /** Matches the rendered element id so selection drives the canvas halo. */
  id: string;
  level: number;
  kind: ElementKind | 'surface';
  name: string;
  /** Number of growth stages (>1 shows a stage dropdown). */
  stageCount: number;
  /** Currently displayed stage for multiStage entries. */
  currentStage?: number;
  zIndex: number;
  scale: number;
  flipX: boolean;
  /** Hop/food rectangle from surfaces.yaml (mode2 editor). */
  surfaceKind?: 'hop' | 'food';
  surfaceRect?: import('./types').SurfaceRect;
}

function multiStageStageCount(def: GardenDefinition): number {
  return def.stages?.length ?? 0;
}

/**
 * Build the editor view: every positionable element across all configured
 * levels (one entry per scatter/planter slot; one entry per multiStage plant
 * one list row per growth stage so each can be dragged independently.
 */
function editorEntryFromElement(el: PlacedElement, listName: string): EditorEntry {
  return {
    id: el.id,
    level: el.level,
    kind: el.kind,
    name: listName,
    stageCount: 1,
    currentStage: el.stageIndex,
    zIndex: el.zIndex,
    scale: el.scale,
    flipX: el.flipX,
  };
}

export function buildEditorScene(
  layout: LayoutConfig,
  config: GardenConfig = defaultGardenConfig,
): { entries: EditorEntry[]; elements: PlacedElement[] } {
  const entries: EditorEntry[] = [];
  const elements: PlacedElement[] = [];

  for (const level of config.getConfiguredLevels()) {
    const birdInstances = config.getLevelBirdInstances(level);
    if (birdInstances) {
      for (const { def, instanceIndex } of birdInstances) {
        const name = definitionName(def, level);
        appendBirdAmbientEditorEntries(
          layout,
          def,
          level,
          name,
          elements,
          entries,
          config,
          instanceIndex,
        );
      }
      continue;
    }

    const def = config.getLevelDefinition(level);
    if (!def) continue;
    const name = definitionName(def, level);
    if (def.mode === 'multiStage') {
      const stages = def.stages ?? [];
      const stageCount = multiStageStageCount(def);
      for (let s = 0; s < stageCount; s++) {
        const stage = stages[s]!;
        const asset = resolvedFromStageImage(stage);
        if (!asset) continue;
        const el = makeElement(
          layout,
          {
            level,
            kind: 'multiStage',
            asset,
            name: `${name} — stage ${s}`,
            stageIndex: s,
            heightDesign: multiStageHeight(s, definitionScaleWithStage(def)),
            sizeRamp: multiStageSizeRamp(s, definitionScaleWithStage(def)),
            mascotDeliversElement: stageMascotDelivers(stage),
          },
          config,
        );
        elements.push(el);
        entries.push(
          editorEntryFromElement(el, `Level ${level} — ${name} (stage ${s})`),
        );
      }
    } else if (def.mode === 'scatterPerCompletion') {
      if (!def.asset && !(def.scatterAssets?.length)) continue;
      const scatterSlots = getScatterSlotCount(level, config);
      for (let slot = 0; slot < scatterSlots; slot++) {
        const asset = scatterAssetForSlot(def, slot);
        if (!asset) continue;
        const el = makeElement(
          layout,
          {
            level,
            kind: 'scatter',
            asset,
            name: `${name} ${slot + 1}`,
            slotIndex: slot,
            heightDesign: HEIGHT_SCATTER,
          },
          config,
        );
        elements.push(el);
        entries.push(
          editorEntryFromElement(el, `Level ${level} — ${name} #${slot + 1}`),
        );
      }
    } else if (isPlanterMode(def.mode)) {
      appendPlanterEditorEntries(
        layout,
        def,
        level,
        name,
        elements,
        entries,
        config,
      );
    } else if (def.mode === 'birdPerch') {
      appendBirdPerchEditorEntries(
        layout,
        def,
        level,
        name,
        elements,
        entries,
        config,
      );
    } else if (def.mode === 'birdAmbient') {
      appendBirdAmbientEditorEntries(
        layout,
        def,
        level,
        name,
        elements,
        entries,
        config,
      );
    }
  }

  elements.sort((a, b) => a.zIndex - b.zIndex);
  return { entries, elements };
}
