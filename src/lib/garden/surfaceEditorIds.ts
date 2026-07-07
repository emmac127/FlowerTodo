import type { EditorEntry } from './buildScene';
import type { GardenConfig } from './loadConfig';
import { surfaceUnlockLabel } from './surfaces';
import type { SurfaceRect, SurfacesConfig } from './types';

export type SurfaceKind = 'hop' | 'food';

const PREFIX = 'surface:';

export function surfaceEditorId(kind: SurfaceKind, id: string): string {
  return `${PREFIX}${kind}:${id}`;
}

export function parseSurfaceEditorId(
  editorId: string | null | undefined,
): { kind: SurfaceKind; id: string } | null {
  if (!editorId?.startsWith(PREFIX)) return null;
  const rest = editorId.slice(PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  const kind = rest.slice(0, colon);
  if (kind !== 'hop' && kind !== 'food') return null;
  const id = rest.slice(colon + 1);
  if (!id) return null;
  return { kind, id };
}

export function isSurfaceEditorId(editorId: string | null | undefined): boolean {
  return parseSurfaceEditorId(editorId) != null;
}

export function buildSurfaceEditorEntries(
  surfaces: SurfacesConfig,
  config?: GardenConfig,
): EditorEntry[] {
  const entries: EditorEntry[] = [];
  for (const rect of surfaces.hop) {
    entries.push(surfaceEntryFromRect('hop', rect, config));
  }
  for (const rect of surfaces.food) {
    entries.push(surfaceEntryFromRect('food', rect, config));
  }
  return entries;
}

function surfaceEntryFromRect(
  kind: SurfaceKind,
  rect: SurfaceRect,
  config?: GardenConfig,
): EditorEntry {
  const label = kind === 'hop' ? 'Hop surface' : 'Food surface';
  const unlock = config ? ` · ${surfaceUnlockLabel(rect, config)}` : '';
  return {
    id: surfaceEditorId(kind, rect.id),
    level: 0,
    kind: 'surface',
    name: `${label} — ${rect.id}${unlock}`,
    stageCount: 0,
    zIndex: 0,
    scale: 1,
    flipX: false,
    surfaceKind: kind,
    surfaceRect: rect,
  };
}
