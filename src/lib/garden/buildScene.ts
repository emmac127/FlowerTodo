import {
  getCompletionsBeforeLevel,
  getGardenLevel,
  getTasksForGardenLevel,
} from '../plantedGarden';
import {
  DESIGN_WIDTH,
  getConfiguredLevels,
  getLevelDefinition,
  layoutConfig as defaultLayout,
} from './loadConfig';
import type {
  ElementKind,
  GardenDefinition,
  LayoutConfig,
  PlacedElement,
  PositionEntry,
} from './types';

/** Design-pixel heights per element kind (multiStage scales by stage). */
const HEIGHT_MULTISTAGE_FULL = 300;
const HEIGHT_SCATTER = 96;
const HEIGHT_PLANTER_BASE = 200;
const HEIGHT_PLANTER_FILL = 112;

/** Growth ramp so early multi-stage stages render smaller than the full bloom. */
const MULTISTAGE_STAGE_SCALE = [0.3, 0.5, 0.68, 0.82, 0.92, 1.0];

/** Number of horizontal "columns" used for auto-placement fallback. */
const AUTO_COLUMNS = 8;

function multiStageHeight(stageIndex: number): number {
  const scale =
    MULTISTAGE_STAGE_SCALE[Math.min(stageIndex, MULTISTAGE_STAGE_SCALE.length - 1)]!;
  return HEIGHT_MULTISTAGE_FULL * scale;
}

/** In-level score (0..max) for a level given the lifetime completion count. */
function scoreInLevel(level: number, completedCount: number): number {
  const raw = completedCount - getCompletionsBeforeLevel(level);
  return Math.max(0, Math.min(raw, getTasksForGardenLevel(level)));
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
  hasLayout: boolean;
}

function autoPlace(
  level: number,
  kind: ElementKind,
  index: number,
  slotCount: number,
): Omit<ResolvedSlot, 'zIndex' | 'scale'> {
  const bandStart = (level - 1) / AUTO_COLUMNS;
  const bandWidth = 1 / AUTO_COLUMNS;
  const center = bandStart + bandWidth / 2;

  if (kind === 'multiStage' || kind === 'planterBase') {
    return { x: center, y: 1.0, anchor: 'bottomCenter', hasLayout: false };
  }

  if (kind === 'scatter') {
    const frac = slotCount > 0 ? (index + 0.5) / slotCount : 0.5;
    return {
      x: bandStart + bandWidth * frac,
      y: 0.94 - (index % 2) * 0.05,
      anchor: 'bottomCenter',
      hasLayout: false,
    };
  }

  // planterFill — cluster around the planter center.
  const col = (index % 3) - 1;
  const row = Math.floor(index / 3);
  return {
    x: center + col * bandWidth * 0.3,
    y: 0.9 - row * 0.05,
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
  const auto = autoPlace(level, kind, index, slotCount);
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
    hasLayout: hasCoords,
  };
}

interface ElementSpec {
  level: number;
  kind: ElementKind;
  src: string;
  name: string;
  stageIndex?: number;
  slotIndex?: number;
  heightDesign: number;
}

function makeElement(layout: LayoutConfig, spec: ElementSpec): PlacedElement {
  const index = spec.stageIndex ?? spec.slotIndex ?? 0;
  const slotCount =
    spec.kind === 'scatter' || spec.kind === 'planterFill'
      ? getTasksForGardenLevel(spec.level)
      : 1;
  const slot = resolveSlot(layout, spec.level, spec.kind, index, slotCount);

  const idSuffix =
    spec.kind === 'multiStage'
      ? `stage-${spec.stageIndex}`
      : spec.kind === 'scatter'
        ? `scatter-${spec.slotIndex}`
        : spec.kind === 'planterBase'
          ? 'planter-base'
          : `planter-fill-${spec.slotIndex}`;

  return {
    id: `L${spec.level}-${idSuffix}`,
    level: spec.level,
    kind: spec.kind,
    name: spec.name,
    src: spec.src,
    stageIndex: spec.stageIndex,
    slotIndex: spec.slotIndex,
    x: slot.x,
    y: slot.y,
    anchor: slot.anchor,
    heightDesign: spec.heightDesign,
    scale: slot.scale,
    zIndex: slot.zIndex,
    hasLayout: slot.hasLayout,
  };
}

/** Max number of planter fills the definition allows for a level. */
function planterFillCount(def: GardenDefinition, level: number): number {
  const tasks = getTasksForGardenLevel(level);
  const max = def.perCompletion?.max ?? tasks;
  return Math.min(max, tasks);
}

/**
 * Build the elements visible in the garden for a given lifetime completion
 * count. Levels render from 1 up to the active level; each level contributes
 * elements according to its YAML definition mode.
 */
export function buildGardenSceneInstances(
  completedCount: number,
  layout: LayoutConfig = defaultLayout,
): PlacedElement[] {
  const activeLevel = getGardenLevel(completedCount);
  if (activeLevel < 1) return [];

  const elements: PlacedElement[] = [];

  for (let level = 1; level <= activeLevel; level++) {
    const def = getLevelDefinition(level);
    if (!def) continue;
    const score = scoreInLevel(level, completedCount);
    const name = definitionName(def, level);

    if (def.mode === 'multiStage') {
      const stages = def.stages ?? [];
      if (stages.length === 0) continue;
      const stageIndex = Math.min(score, stages.length - 1);
      const stage = stages[stageIndex]!;
      elements.push(
        makeElement(layout, {
          level,
          kind: 'multiStage',
          src: stage.src,
          name: `${name} — stage ${stageIndex}`,
          stageIndex,
          heightDesign: multiStageHeight(stageIndex),
        }),
      );
    } else if (def.mode === 'scatterPerCompletion') {
      if (!def.asset) continue;
      for (let slot = 0; slot < score; slot++) {
        elements.push(
          makeElement(layout, {
            level,
            kind: 'scatter',
            src: def.asset,
            name: `${name} ${slot + 1}`,
            slotIndex: slot,
            heightDesign: HEIGHT_SCATTER,
          }),
        );
      }
    } else if (def.mode === 'planter') {
      if (def.onLevelStart) {
        elements.push(
          makeElement(layout, {
            level,
            kind: 'planterBase',
            src: def.onLevelStart.src,
            name: `${name} planter`,
            heightDesign: HEIGHT_PLANTER_BASE,
          }),
        );
      }
      const maxFills = planterFillCount(def, level);
      const fills = Math.min(score, maxFills);
      if (def.perCompletion) {
        for (let i = 0; i < fills; i++) {
          elements.push(
            makeElement(layout, {
              level,
              kind: 'planterFill',
              src: def.perCompletion.src,
              name: `${name} flower ${i + 1}`,
              slotIndex: i,
              heightDesign: HEIGHT_PLANTER_FILL,
            }),
          );
        }
      }
    }
  }

  elements.sort((a, b) => a.zIndex - b.zIndex);
  return elements;
}

/** A selectable row in the Garden Editor's element list. */
export interface EditorEntry {
  /** Matches the rendered element id so selection drives the canvas halo. */
  id: string;
  level: number;
  kind: ElementKind;
  name: string;
  /** Number of growth stages (>1 shows a stage dropdown). */
  stageCount: number;
  /** Currently displayed stage for multiStage entries. */
  currentStage?: number;
  zIndex: number;
  scale: number;
}

function multiStageStageCount(def: GardenDefinition, level: number): number {
  const stages = def.stages ?? [];
  return Math.min(stages.length, getTasksForGardenLevel(level) + 1);
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
  };
}

export function buildEditorScene(
  layout: LayoutConfig,
): { entries: EditorEntry[]; elements: PlacedElement[] } {
  const entries: EditorEntry[] = [];
  const elements: PlacedElement[] = [];

  for (const level of getConfiguredLevels()) {
    const def = getLevelDefinition(level);
    if (!def) continue;
    const name = definitionName(def, level);
    const tasks = getTasksForGardenLevel(level);

    if (def.mode === 'multiStage') {
      const stages = def.stages ?? [];
      const stageCount = multiStageStageCount(def, level);
      for (let s = 0; s < stageCount; s++) {
        const el = makeElement(layout, {
          level,
          kind: 'multiStage',
          src: stages[s]!.src,
          name: `${name} — stage ${s}`,
          stageIndex: s,
          heightDesign: multiStageHeight(s),
        });
        elements.push(el);
        entries.push(
          editorEntryFromElement(el, `Level ${level} — ${name} (stage ${s})`),
        );
      }
    } else if (def.mode === 'scatterPerCompletion' && def.asset) {
      for (let slot = 0; slot < tasks; slot++) {
        const el = makeElement(layout, {
          level,
          kind: 'scatter',
          src: def.asset,
          name: `${name} ${slot + 1}`,
          slotIndex: slot,
          heightDesign: HEIGHT_SCATTER,
        });
        elements.push(el);
        entries.push(
          editorEntryFromElement(el, `Level ${level} — ${name} #${slot + 1}`),
        );
      }
    } else if (def.mode === 'planter') {
      if (def.onLevelStart) {
        const el = makeElement(layout, {
          level,
          kind: 'planterBase',
          src: def.onLevelStart.src,
          name: `${name} planter`,
          heightDesign: HEIGHT_PLANTER_BASE,
        });
        elements.push(el);
        entries.push(
          editorEntryFromElement(el, `Level ${level} — ${name} planter`),
        );
      }
      if (def.perCompletion) {
        const maxFills = planterFillCount(def, level);
        for (let i = 0; i < maxFills; i++) {
          const el = makeElement(layout, {
            level,
            kind: 'planterFill',
            src: def.perCompletion.src,
            name: `${name} flower ${i + 1}`,
            slotIndex: i,
            heightDesign: HEIGHT_PLANTER_FILL,
          });
          elements.push(el);
          entries.push(
            editorEntryFromElement(
              el,
              `Level ${level} — ${name} flower #${i + 1}`,
            ),
          );
        }
      }
    }
  }

  elements.sort((a, b) => a.zIndex - b.zIndex);
  return { entries, elements };
}

export { DESIGN_WIDTH };
