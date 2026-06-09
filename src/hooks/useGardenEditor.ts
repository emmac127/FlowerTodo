import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildEditorScene } from '../lib/garden/buildScene';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  getConfiguredLevels,
} from '../lib/garden/loadConfig';
import {
  cloneLayout,
  saveLayoutYaml,
  layoutFromPlacedElements,
  layoutIndexForElement,
  parseElementId,
  setLayoutPosition,
  setLayoutScale,
  setLayoutAnimationLastFrameHold,
  setLayoutFlipX,
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
  const [saving, setSaving] = useState(false);
  /** When set, dragging any asset in this level moves every asset in the level. */
  const [levelMoveLevel, setLevelMoveLevel] = useState<number | null>(null);

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

  const handleDrag = useCallback(
    (id: string, x: number, y: number) => {
      setWorkingLayout((prev) => {
        const { elements: sceneElements } = buildEditorScene(prev);
        const dragged = sceneElements.find((el) => el.id === id);
        if (!dragged) return prev;

        const parsed = parseElementId(id);
        if (
          levelMoveLevel != null &&
          parsed?.level === levelMoveLevel
        ) {
          const deltaX = x - dragged.x;
          const deltaY = y - dragged.y;
          if (deltaX === 0 && deltaY === 0) return prev;

          let next = prev;
          for (const el of sceneElements.filter((e) => e.level === levelMoveLevel)) {
            next = setLayoutPosition(
              next,
              el.id,
              layoutIndexForElement(el),
              el.x + deltaX,
              el.y + deltaY,
            );
          }
          return next;
        }

        return setLayoutPosition(prev, id, stageForId(id), x, y);
      });
    },
    [levelMoveLevel, stageForId],
  );

  const offsetLevel = useCallback((level: number, deltaX: number, deltaY: number) => {
    if (deltaX === 0 && deltaY === 0) return;
    setWorkingLayout((prev) => {
      const { elements: sceneElements } = buildEditorScene(prev);
      let next = prev;
      for (const el of sceneElements.filter((e) => e.level === level)) {
        next = setLayoutPosition(
          next,
          el.id,
          layoutIndexForElement(el),
          el.x + deltaX,
          el.y + deltaY,
        );
      }
      return next;
    });
  }, []);

  const scaleLevel = useCallback((level: number, factor: number) => {
    if (factor === 1 || !Number.isFinite(factor) || factor <= 0) return;
    setWorkingLayout((prev) => {
      const { elements: sceneElements } = buildEditorScene(prev);
      let next = prev;
      for (const el of sceneElements.filter((e) => e.level === level)) {
        const scaled = Math.max(0.05, Math.min(10, el.scale * factor));
        next = setLayoutScale(
          next,
          el.id,
          layoutIndexForElement(el),
          scaled,
        );
      }
      return next;
    });
  }, []);

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

  const setFlipX = useCallback(
    (id: string, flipX: boolean) => {
      setWorkingLayout((prev) =>
        setLayoutFlipX(prev, id, stageForId(id), flipX),
      );
    },
    [stageForId],
  );

  const toggleFlipX = useCallback(
    (id: string) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      setFlipX(id, !el.flipX);
    },
    [elements, setFlipX],
  );

  const setAnimationLastFrameHold = useCallback(
    (id: string, seconds: number) => {
      setWorkingLayout((prev) =>
        setLayoutAnimationLastFrameHold(prev, id, stageForId(id), seconds),
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

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const layout = layoutFromPlacedElements(workingLayout, elements);
      const result = await saveLayoutYaml(layout);
      if (result.ok) {
        window.location.reload();
        return;
      }
      window.alert(result.error);
    } finally {
      setSaving(false);
    }
  }, [workingLayout, elements]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
    setSelectedId(null);
    setLevelMoveLevel(null);
  }, []);

  const configuredLevels = useMemo(() => getConfiguredLevels(), []);

  const nudgeSelectedByPixels = useCallback(
    (deltaXPx: number, deltaYPx: number) => {
      if (deltaXPx === 0 && deltaYPx === 0) return;
      const deltaX = deltaXPx / DESIGN_WIDTH;
      const deltaY = deltaYPx / DESIGN_HEIGHT;

      if (levelMoveLevel != null) {
        offsetLevel(levelMoveLevel, deltaX, deltaY);
        return;
      }

      if (!selectedId) return;
      const el = elements.find((e) => e.id === selectedId);
      if (!el) return;

      setWorkingLayout((prev) =>
        setLayoutPosition(
          prev,
          selectedId,
          stageForId(selectedId),
          el.x + deltaX,
          el.y + deltaY,
        ),
      );
    },
    [elements, levelMoveLevel, offsetLevel, selectedId, stageForId],
  );

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (levelMoveLevel == null && !selectedId) return;

      let deltaXPx = 0;
      let deltaYPx = 0;
      switch (event.key) {
        case 'ArrowLeft':
          deltaXPx = -1;
          break;
        case 'ArrowRight':
          deltaXPx = 1;
          break;
        case 'ArrowUp':
          deltaYPx = -1;
          break;
        case 'ArrowDown':
          deltaYPx = 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      nudgeSelectedByPixels(deltaXPx, deltaYPx);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, levelMoveLevel, nudgeSelectedByPixels, selectedId]);

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
    setFlipX,
    toggleFlipX,
    setAnimationLastFrameHold,
    nudgeZIndex,
    save,
    saving,
    levelMoveLevel,
    setLevelMoveLevel,
    offsetLevel,
    scaleLevel,
    configuredLevels,
  };
}
