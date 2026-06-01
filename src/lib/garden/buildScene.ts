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

interface ResolvedPosition {
  x: number;
  y: number;
  anchor: string;
  hasLayout: boolean;
}

function autoPlace(
  level: number,
  kind: ElementKind,
  index: number,
  slotCount: number,
): ResolvedPosition {
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

function resolvePosition(
  layout: LayoutConfig,
  level: number,
  kind: ElementKind,
  index: number,
  slotCount: number,
): ResolvedPosition {
  const levelLayout = layout.levels?.[String(level)];
  let entry: { x: number; y: number; anchor?: string } | undefined;

  if (kind === 'multiStage') {
    entry = levelLayout?.multiStage?.stages?.[index] ?? levelLayout?.multiStage?.stages?.[String(index)];
  } else if (kind === 'scatter') {
    entry = levelLayout?.scatter?.[index];
  } else if (kind === 'planterBase') {
    entry = levelLayout?.planter?.base;
  } else if (kind === 'planterFill') {
    entry = levelLayout?.planter?.fills?.[index];
  }

  if (entry && typeof entry.x === 'number' && typeof entry.y === 'number') {
    return {
      x: entry.x,
      y: entry.y,
      anchor: entry.anchor ?? 'bottomCenter',
      hasLayout: true,
    };
  }

  return autoPlace(level, kind, index, slotCount);
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
  const pos = resolvePosition(layout, spec.level, spec.kind, index, slotCount);

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
    x: pos.x,
    y: pos.y,
    anchor: pos.anchor,
    heightDesign: spec.heightDesign,
    hasLayout: pos.hasLayout,
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
        entries.push({
          id: el.id,
          level,
          kind: 'multiStage',
          name: `Level ${level} — ${name} (stage ${s})`,
          stageCount: 1,
          currentStage: s,
        });
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
        entries.push({
          id: el.id,
          level,
          kind: 'scatter',
          name: `Level ${level} — ${name} #${slot + 1}`,
          stageCount: 1,
        });
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
        entries.push({
          id: el.id,
          level,
          kind: 'planterBase',
          name: `Level ${level} — ${name} planter`,
          stageCount: 1,
        });
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
          entries.push({
            id: el.id,
            level,
            kind: 'planterFill',
            name: `Level ${level} — ${name} flower #${i + 1}`,
            stageCount: 1,
          });
        }
      }
    }
  }

  return { entries, elements };
}

export { DESIGN_WIDTH };
