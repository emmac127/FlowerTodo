import { useCallback, useMemo, useState } from 'react';
import { buildEditorScene } from '../lib/garden/buildScene';
import {
  cloneLayout,
  downloadLayoutYaml,
  layoutFromPlacedElements,
  parseElementId,
  setLayoutPosition,
} from '../lib/garden/editorLayout';
import type { LayoutConfig } from '../lib/garden/types';

/** State + actions for the DEV-only Garden Editor. */
export function useGardenEditor() {
  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workingLayout, setWorkingLayout] = useState<LayoutConfig>(() =>
    cloneLayout(),
  );

  const { entries, elements } = useMemo(
    () => buildEditorScene(workingLayout),
    [workingLayout],
  );

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    const parsed = parseElementId(id);
    const stage = parsed?.kind === 'multiStage' ? parsed.index : 0;
    setWorkingLayout((prev) => setLayoutPosition(prev, id, stage, x, y));
  }, []);

  const download = useCallback(() => {
    const layout = layoutFromPlacedElements(workingLayout, elements);
    downloadLayoutYaml(layout);
  }, [workingLayout, elements]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
    setSelectedId(null);
  }, []);

  return {
    enabled,
    toggle,
    selectedId,
    setSelectedId,
    entries,
    elements,
    handleDrag,
    download,
  };
}
