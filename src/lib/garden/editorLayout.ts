import { stringify } from 'yaml';
import { defaultZIndex } from './buildScene';
import { layoutConfig } from './loadConfig';
import type {
  LayoutConfig,
  LayoutLevelConfig,
  PlacedElement,
  PositionEntry,
} from './types';

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Deep clone the committed layout so the editor can mutate a draft copy. */
export function cloneLayout(source: LayoutConfig = layoutConfig): LayoutConfig {
  return structuredClone(source);
}

interface ParsedId {
  level: number;
  kind: 'multiStage' | 'scatter' | 'planterBase' | 'planterFill';
  index: number;
}

/** Parse an element/entry id like "L7-stage-2", "L3-scatter-2", "L4-planter-fill-1". */
export function parseElementId(id: string): ParsedId | null {
  const levelMatch = id.match(/^L(\d+)-(.+)$/);
  if (!levelMatch) return null;
  const level = Number(levelMatch[1]);
  const rest = levelMatch[2]!;

  const stage = rest.match(/^stage-(\d+)$/);
  if (stage) return { level, kind: 'multiStage', index: Number(stage[1]) };

  if (rest === 'multi') return { level, kind: 'multiStage', index: 0 };
  if (rest === 'planter-base') return { level, kind: 'planterBase', index: 0 };

  const scatter = rest.match(/^scatter-(\d+)$/);
  if (scatter) return { level, kind: 'scatter', index: Number(scatter[1]) };

  const fill = rest.match(/^planter-fill-(\d+)$/);
  if (fill) return { level, kind: 'planterFill', index: Number(fill[1]) };

  return null;
}

function writeArrayIndex<T>(arr: T[] | undefined, index: number, value: T): T[] {
  const next = arr ? [...arr] : [];
  if (index >= next.length) next.length = index + 1;
  next[index] = value;
  return next;
}

function ensureLevel(layout: LayoutConfig, level: number): LayoutLevelConfig {
  if (!layout.levels) layout.levels = {};
  const key = String(level);
  if (!layout.levels[key]) layout.levels[key] = {};
  return layout.levels[key]!;
}

function getLayoutEntry(
  layout: LayoutConfig,
  parsed: ParsedId,
  stage: number,
): PositionEntry | undefined {
  const levelCfg = layout.levels?.[String(parsed.level)];
  if (parsed.kind === 'multiStage') {
    return (
      levelCfg?.multiStage?.stages?.[stage] ??
      levelCfg?.multiStage?.stages?.[String(stage)]
    );
  }
  if (parsed.kind === 'scatter') return levelCfg?.scatter?.[parsed.index];
  if (parsed.kind === 'planterBase') return levelCfg?.planter?.base;
  if (parsed.kind === 'planterFill') return levelCfg?.planter?.fills?.[parsed.index];
  return undefined;
}

function writeLayoutEntry(
  levelCfg: LayoutLevelConfig,
  parsed: ParsedId,
  stage: number,
  entry: PositionEntry,
): void {
  if (parsed.kind === 'multiStage') {
    if (!levelCfg.multiStage) levelCfg.multiStage = { stages: {} };
    if (!levelCfg.multiStage.stages) levelCfg.multiStage.stages = {};
    levelCfg.multiStage.stages[String(stage)] = entry;
  } else if (parsed.kind === 'scatter') {
    levelCfg.scatter = writeArrayIndex(levelCfg.scatter, parsed.index, entry);
  } else if (parsed.kind === 'planterBase') {
    if (!levelCfg.planter) levelCfg.planter = {};
    levelCfg.planter.base = entry;
  } else if (parsed.kind === 'planterFill') {
    if (!levelCfg.planter) levelCfg.planter = {};
    levelCfg.planter.fills = writeArrayIndex(
      levelCfg.planter.fills,
      parsed.index,
      entry,
    );
  }
}

function mergeEntry(
  layout: LayoutConfig,
  id: string,
  stage: number,
  patch: Partial<PositionEntry>,
  fallbackX: number,
  fallbackY: number,
): LayoutConfig {
  const parsed = parseElementId(id);
  if (!parsed) return layout;

  const next = cloneLayout(layout);
  const levelCfg = ensureLevel(next, parsed.level);
  const existing = getLayoutEntry(next, parsed, stage);
  const index =
    parsed.kind === 'multiStage' ? stage : parsed.index;

  const entry: PositionEntry = {
    x: round(patch.x ?? existing?.x ?? fallbackX),
    y: round(patch.y ?? existing?.y ?? fallbackY),
    anchor: existing?.anchor,
    zIndex:
      patch.zIndex ??
      existing?.zIndex ??
      defaultZIndex(parsed.level, index),
    scale:
      patch.scale ??
      (typeof existing?.scale === 'number' && existing.scale > 0
        ? existing.scale
        : 1),
  };

  writeLayoutEntry(levelCfg, parsed, stage, entry);
  return next;
}

/**
 * Return a new layout with the given element's position updated. For
 * multiStage elements, `stage` selects which stage slot to write.
 */
export function setLayoutPosition(
  layout: LayoutConfig,
  id: string,
  stage: number,
  x: number,
  y: number,
): LayoutConfig {
  return mergeEntry(layout, id, stage, { x, y }, x, y);
}

export function setLayoutZIndex(
  layout: LayoutConfig,
  id: string,
  stage: number,
  zIndex: number,
): LayoutConfig {
  const parsed = parseElementId(id);
  if (!parsed) return layout;
  const existing = getLayoutEntry(layout, parsed, stage);
  return mergeEntry(
    layout,
    id,
    stage,
    { zIndex: Math.round(zIndex) },
    existing?.x ?? 0.5,
    existing?.y ?? 1,
  );
}

export function setLayoutScale(
  layout: LayoutConfig,
  id: string,
  stage: number,
  scale: number,
): LayoutConfig {
  const parsed = parseElementId(id);
  if (!parsed) return layout;
  const existing = getLayoutEntry(layout, parsed, stage);
  const safe = Math.max(0.05, Math.min(10, scale));
  return mergeEntry(
    layout,
    id,
    stage,
    { scale: round(safe) },
    existing?.x ?? 0.5,
    existing?.y ?? 1,
  );
}

/** Stage index for a placed element (multiStage stage or scatter/planter slot). */
export function layoutIndexForElement(el: PlacedElement): number {
  if (el.kind === 'multiStage') return el.stageIndex ?? 0;
  if (el.kind === 'scatter' || el.kind === 'planterFill') return el.slotIndex ?? 0;
  return 0;
}

/**
 * Merge every placed element's layout fields into a config for YAML export.
 */
export function layoutFromPlacedElements(
  base: LayoutConfig,
  elements: PlacedElement[],
): LayoutConfig {
  let layout = cloneLayout(base);
  for (const el of elements) {
    const stage = layoutIndexForElement(el);
    layout = mergeEntry(layout, el.id, stage, {
      x: el.x,
      y: el.y,
      zIndex: el.zIndex,
      scale: el.scale,
    }, el.x, el.y);
  }
  return layout;
}

const LAYOUT_HEADER = `# Garden layout (generated by the Garden Editor).
# Paste this over src/garden/layout.yaml and reload.
# Coordinates: x/y are normalized 0..1 (y=1 is the ground line).
# Optional per slot: zIndex (higher = in front), scale (size multiplier, default 1).
`;

/** Serialize a layout to YAML text. */
export function layoutToYaml(layout: LayoutConfig): string {
  return LAYOUT_HEADER + stringify(layout, { indent: 2 });
}

/** Trigger a browser download of the layout as layout.yaml. */
export function downloadLayoutYaml(layout: LayoutConfig): void {
  const blob = new Blob([layoutToYaml(layout)], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'layout.yaml';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
