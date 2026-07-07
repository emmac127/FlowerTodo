import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppVariant } from '../lib/appVariant';
import type { GardenPhase } from '../lib/garden/types';
import { getGardenConfigForPhase, clearGardenConfigCache, type GardenConfig } from '../lib/garden/loadConfig';
import { buildEditorScene } from '../lib/garden/buildScene';
import {
  cloneLayout,
  saveLayoutYaml,
  saveSurfacesYaml,
  layoutFromPlacedElements,
  layoutIndexForElement,
  parseElementId,
  applyLevelOffset,
  setLayoutPosition,
  setLayoutScale,
  setLayoutAnimationLastFrameHold,
  setLayoutFlipX,
  setLayoutZIndex,
  setLayoutCollisionBox,
} from '../lib/garden/editorLayout';
import type { BirdCollisionBox, LayoutConfig, SurfacesConfig, SurfaceRect } from '../lib/garden/types';
import {
  buildSurfaceEditorEntries,
  isSurfaceEditorId,
  parseSurfaceEditorId,
  surfaceEditorId,
} from '../lib/garden/surfaceEditorIds';

/** State + actions for the DEV-only Garden Editor. */
export function useGardenEditor(
  gardenConfig: GardenConfig,
  variant: AppVariant = 'default',
  editorPhase: GardenPhase = 'mode1',
) {
  const activeConfig = useMemo(
    () =>
      variant === 'dad'
        ? gardenConfig
        : getGardenConfigForPhase(editorPhase),
    [variant, gardenConfig, editorPhase],
  );

  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workingLayout, setWorkingLayout] = useState<LayoutConfig>(() =>
    cloneLayout(activeConfig.layoutConfig),
  );
  const [workingSurfaces, setWorkingSurfaces] = useState<SurfacesConfig>(() =>
    structuredClone(activeConfig.surfacesConfig ?? { hop: [], food: [] }),
  );
  const [surfaceTool, setSurfaceTool] = useState<'hop' | 'food' | null>(null);
  const [collisionBoxTool, setCollisionBoxTool] = useState(false);
  const [saving, setSaving] = useState(false);
  /** When set, dragging any asset in this level moves every asset in the level. */
  const [levelMoveLevel, setLevelMoveLevel] = useState<number | null>(null);

  const workingLayoutRef = useRef(workingLayout);
  const workingSurfacesRef = useRef(workingSurfaces);
  workingLayoutRef.current = workingLayout;
  workingSurfacesRef.current = workingSurfaces;

  const commitLevelOffset = useCallback(
    (level: number, deltaX: number, deltaY: number) => {
      const { layout, surfaces } = applyLevelOffset(
        workingLayoutRef.current,
        workingSurfacesRef.current,
        level,
        deltaX,
        deltaY,
        activeConfig,
      );
      workingLayoutRef.current = layout;
      workingSurfacesRef.current = surfaces;
      setWorkingLayout(layout);
      setWorkingSurfaces(surfaces);
    },
    [activeConfig],
  );

  const { entries: elementEntries, elements } = useMemo(
    () => buildEditorScene(workingLayout, activeConfig),
    [workingLayout, activeConfig],
  );

  const surfaceEntries = useMemo(
    () => buildSurfaceEditorEntries(workingSurfaces, activeConfig),
    [workingSurfaces, activeConfig],
  );

  const entries = useMemo(
    () => [...elementEntries, ...surfaceEntries],
    [elementEntries, surfaceEntries],
  );

  const selectedSurface = useMemo(
    () => parseSurfaceEditorId(selectedId),
    [selectedId],
  );

  const selectedSurfaceRect = useMemo(() => {
    if (!selectedSurface) return null;
    return (
      workingSurfaces[selectedSurface.kind].find(
        (r) => r.id === selectedSurface.id,
      ) ?? null
    );
  }, [selectedSurface, workingSurfaces]);

  const selectedElement = useMemo(
    () =>
      selectedId && !isSurfaceEditorId(selectedId)
        ? (elements.find((el) => el.id === selectedId) ?? null)
        : null,
    [elements, selectedId],
  );

  const stageForId = useCallback((id: string) => {
    const parsed = parseElementId(id);
    if (
      parsed?.kind === 'multiStage' ||
      parsed?.kind === 'birdPerchBase' ||
      parsed?.kind === 'birdPerchStage' ||
      parsed?.kind === 'birdAmbientStage'
    ) {
      return parsed.index;
    }
    return 0;
  }, []);

  const handleDrag = useCallback(
    (id: string, x: number, y: number) => {
      if (levelMoveLevel != null) {
        const { elements: sceneElements } = buildEditorScene(
          workingLayoutRef.current,
          activeConfig,
        );
        const dragged = sceneElements.find((el) => el.id === id);
        if (!dragged) return;

        const parsed = parseElementId(id);
        if (parsed?.level !== levelMoveLevel) return;

        const deltaX = x - dragged.x;
        const deltaY = y - dragged.y;
        if (deltaX === 0 && deltaY === 0) return;

        commitLevelOffset(levelMoveLevel, deltaX, deltaY);
        return;
      }

      setWorkingLayout((prev) =>
        setLayoutPosition(prev, id, stageForId(id), x, y),
      );
    },
    [levelMoveLevel, stageForId, activeConfig, commitLevelOffset],
  );

  const offsetLevel = useCallback(
    (level: number, deltaX: number, deltaY: number) => {
      commitLevelOffset(level, deltaX, deltaY);
    },
    [commitLevelOffset],
  );

  const scaleLevel = useCallback((level: number, factor: number) => {
    if (factor === 1 || !Number.isFinite(factor) || factor <= 0) return;
    setWorkingLayout((prev) => {
      const { elements: sceneElements } = buildEditorScene(prev, activeConfig);
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
  }, [activeConfig]);

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

  const setCollisionBox = useCallback(
    (id: string, collisionBox: BirdCollisionBox | undefined) => {
      setWorkingLayout((prev) =>
        setLayoutCollisionBox(prev, id, stageForId(id), collisionBox),
      );
    },
    [stageForId],
  );

  const clearCollisionBox = useCallback(
    (id: string) => {
      setCollisionBox(id, undefined);
    },
    [setCollisionBox],
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
      const { elements: sceneElements } = buildEditorScene(
        workingLayout,
        activeConfig,
      );
      const layout = layoutFromPlacedElements(workingLayout, sceneElements);
      const layoutResult = await saveLayoutYaml(
        layout,
        variant,
        variant === 'default' ? editorPhase : undefined,
      );
      if (!layoutResult.ok) {
        window.alert(layoutResult.error);
        return;
      }
      if (editorPhase === 'mode2') {
        const surfacesResult = await saveSurfacesYaml(workingSurfaces);
        if (!surfacesResult.ok) {
          window.alert(surfacesResult.error);
          return;
        }
      }
      clearGardenConfigCache();
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }, [workingLayout, activeConfig, variant, editorPhase, workingSurfaces]);

  useEffect(() => {
    setWorkingLayout(cloneLayout(activeConfig.layoutConfig));
    setWorkingSurfaces(
      structuredClone(activeConfig.surfacesConfig ?? { hop: [], food: [] }),
    );
    setSelectedId(null);
    setSurfaceTool(null);
    setCollisionBoxTool(false);
  }, [activeConfig, editorPhase]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
    setSelectedId(null);
    setSurfaceTool(null);
    setCollisionBoxTool(false);
    setLevelMoveLevel(null);
  }, []);

  const configuredLevels = useMemo(
    () => activeConfig.getConfiguredLevels(),
    [activeConfig],
  );

  const addSurfaceRect = useCallback(
    (kind: 'hop' | 'food', rect: SurfaceRect) => {
      setWorkingSurfaces((prev) => ({
        ...prev,
        [kind]: [
          ...prev[kind],
          {
            ...rect,
            unlockLevel: rect.unlockLevel ?? 1,
            unlockStage: rect.unlockStage ?? 0,
          },
        ],
      }));
      setSelectedId(surfaceEditorId(kind, rect.id));
      setSurfaceTool(kind);
    },
    [],
  );

  const updateSurfaceRect = useCallback(
    (kind: 'hop' | 'food', id: string, rect: SurfaceRect) => {
      setWorkingSurfaces((prev) => ({
        ...prev,
        [kind]: prev[kind].map((r) => (r.id === id ? rect : r)),
      }));
    },
    [],
  );

  const deleteSurfaceRect = useCallback(
    (kind: 'hop' | 'food', id: string) => {
      setWorkingSurfaces((prev) => ({
        ...prev,
        [kind]: prev[kind].filter((r) => r.id !== id),
      }));
      if (selectedId === surfaceEditorId(kind, id)) {
        setSelectedId(null);
        setSurfaceTool(null);
      }
    },
    [selectedId],
  );

  const selectEditorItem = useCallback((id: string | null) => {
    setSelectedId(id);
    const surface = parseSurfaceEditorId(id);
    if (surface) {
      setSurfaceTool(surface.kind);
      setCollisionBoxTool(false);
      setLevelMoveLevel(null);
    } else if (id) {
      setSurfaceTool(null);
    }
  }, []);

  const setSurfaceToolMode = useCallback((tool: 'hop' | 'food' | null) => {
    setSurfaceTool(tool);
    if (tool) {
      setSelectedId(null);
      setCollisionBoxTool(false);
      setLevelMoveLevel(null);
    }
  }, []);

  const setCollisionBoxToolMode = useCallback((active: boolean) => {
    setCollisionBoxTool(active);
    if (active) {
      setSurfaceTool(null);
      setLevelMoveLevel(null);
    }
  }, []);

  const selectSurfaceOnCanvas = useCallback(
    (surface: { kind: 'hop' | 'food'; id: string } | null) => {
      if (!surface) {
        if (isSurfaceEditorId(selectedId)) setSelectedId(null);
        return;
      }
      setSelectedId(surfaceEditorId(surface.kind, surface.id));
      setSurfaceTool(surface.kind);
      setCollisionBoxTool(false);
      setLevelMoveLevel(null);
    },
    [selectedId],
  );

  const nudgeSelectedByPixels = useCallback(
    (deltaXPx: number, deltaYPx: number) => {
      if (deltaXPx === 0 && deltaYPx === 0) return;
      const deltaX = deltaXPx / activeConfig.designWidth;
      const deltaY = deltaYPx / activeConfig.designHeight;

      if (levelMoveLevel != null) {
        offsetLevel(levelMoveLevel, deltaX, deltaY);
        return;
      }

      if (!selectedId) return;
      if (isSurfaceEditorId(selectedId)) {
        if (!selectedSurface || !selectedSurfaceRect) return;
        updateSurfaceRect(selectedSurface.kind, selectedSurface.id, {
          ...selectedSurfaceRect,
          x: selectedSurfaceRect.x + deltaX,
          y: selectedSurfaceRect.y + deltaY,
        });
        return;
      }
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
    [
      elements,
      activeConfig.designHeight,
      activeConfig.designWidth,
      levelMoveLevel,
      offsetLevel,
      selectedId,
      selectedSurface,
      selectedSurfaceRect,
      stageForId,
      updateSurfaceRect,
    ],
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

      if (levelMoveLevel == null && !selectedId && !selectedSurface) return;

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
  }, [enabled, levelMoveLevel, nudgeSelectedByPixels, selectedId, selectedSurface]);

  return {
    enabled,
    toggle,
    selectedId,
    setSelectedId: selectEditorItem,
    selectedElement,
    selectedSurface,
    selectedSurfaceRect,
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
    editorPhase,
    activeConfig,
    workingSurfaces,
    surfaceTool,
    setSurfaceTool: setSurfaceToolMode,
    collisionBoxTool,
    setCollisionBoxTool: setCollisionBoxToolMode,
    setCollisionBox,
    clearCollisionBox,
    addSurfaceRect,
    updateSurfaceRect,
    deleteSurfaceRect,
    selectSurfaceOnCanvas,
  };
}
