import { useCallback, useMemo, useState } from 'react';
import { buildEditorScene } from '../lib/garden/buildScene';
import {
  cloneLayout,
  downloadLayoutYaml,
  layoutFromPlacedElements,
  parseElementId,
  setLayoutPosition,
  setLayoutScale,
  setLayoutZIndex,
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

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const stageForId = useCallback((id: string) => {
    const parsed = parseElementId(id);
    return parsed?.kind === 'multiStage' ? parsed.index : 0;
  }, []);

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setWorkingLayout((prev) =>
      setLayoutPosition(prev, id, stageForId(id), x, y),
    );
  }, [stageForId]);

  const setZIndex = useCallback(
    (id: string, zIndex: number) => {
      setWorkingLayout((prev) =>
        setLayoutZIndex(prev, id, stageForId(id), zIndex),
      );
    },
    [stageForId],
  );

  const setScale = useCallback(
    (id: string, scale: number) => {
      setWorkingLayout((prev) =>
        setLayoutScale(prev, id, stageForId(id), scale),
      );
    },
    [stageForId],
  );

  const nudgeZIndex = useCallback(
    (id: string, delta: number) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      setZIndex(id, el.zIndex + delta);
    },
    [elements, setZIndex],
  );

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
    selectedElement,
    entries,
    elements,
    handleDrag,
    setZIndex,
    setScale,
    nudgeZIndex,
    download,
  };
}
