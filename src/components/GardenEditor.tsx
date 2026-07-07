import type { EditorEntry } from '../lib/garden/buildScene';
import { isSurfaceEditorId, parseSurfaceEditorId } from '../lib/garden/surfaceEditorIds';
import { useAppVariant } from '../context/AppVariantContext';
import type { GardenConfig } from '../lib/garden/loadConfig';
import { maxUnlockStageForLevel } from '../lib/garden/surfaces';
import type { GardenPhase, PlacedElement, SurfaceRect } from '../lib/garden/types';

/** Normalized X step (~6 px on the default 2400-wide design canvas). */
const LEVEL_OFFSET_STEP_X = 0.0025;
const LEVEL_SCALE_FACTOR = 1.05;

interface GardenEditorProps {
  entries: EditorEntry[];
  selectedId: string | null;
  selectedElement: PlacedElement | null;
  /** Config for the selected editor phase (mode1 or mode2 yaml). */
  gardenConfig: GardenConfig;
  configuredLevels: number[];
  levelMoveLevel: number | null;
  onLevelMoveLevelChange: (level: number | null) => void;
  onOffsetLevel: (level: number, deltaX: number, deltaY: number) => void;
  onScaleLevel: (level: number, factor: number) => void;
  onSelect: (id: string | null) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  onNudgeZIndex: (id: string, delta: number) => void;
  onScaleChange: (id: string, scale: number) => void;
  onFlipXChange: (id: string, flipX: boolean) => void;
  onAnimationLastFrameHoldChange: (id: string, seconds: number) => void;
  onSave: () => void;
  saving?: boolean;
  onClose: () => void;
  editorPhase?: GardenPhase;
  onEditorPhaseChange?: (phase: GardenPhase) => void;
  surfaceTool?: 'hop' | 'food' | null;
  onSurfaceToolChange?: (tool: 'hop' | 'food' | null) => void;
  selectedSurfaceRect?: SurfaceRect | null;
  onUpdateSurfaceRect?: (kind: 'hop' | 'food', id: string, rect: SurfaceRect) => void;
  onDeleteSurface?: (kind: 'hop' | 'food', id: string) => void;
  collisionBoxTool?: boolean;
  onCollisionBoxToolChange?: (active: boolean) => void;
  onClearCollisionBox?: (id: string) => void;
}

function levelLabel(level: number, gardenConfig: GardenConfig): string {
  const def = gardenConfig.getLevelDefinition(level);
  return def?.name ? `Level ${level} — ${def.name}` : `Level ${level}`;
}

export function GardenEditor({
  entries,
  selectedId,
  selectedElement,
  gardenConfig,
  configuredLevels,
  levelMoveLevel,
  onLevelMoveLevelChange,
  onOffsetLevel,
  onScaleLevel,
  onSelect,
  onZIndexChange,
  onNudgeZIndex,
  onScaleChange,
  onFlipXChange,
  onAnimationLastFrameHoldChange,
  onSave,
  saving = false,
  onClose,
  editorPhase = 'mode1',
  onEditorPhaseChange,
  surfaceTool = null,
  onSurfaceToolChange,
  selectedSurfaceRect = null,
  onUpdateSurfaceRect,
  onDeleteSurface,
  collisionBoxTool = false,
  onCollisionBoxToolChange,
  onClearCollisionBox,
}: GardenEditorProps) {
  const variant = useAppVariant();
  // Match X step in design pixels — the canvas is much wider than it is tall.
  const levelOffsetStepY =
    LEVEL_OFFSET_STEP_X *
    (gardenConfig.designWidth / gardenConfig.designHeight);
  const layoutSaveLabel =
    variant === 'dad'
      ? 'Save dadLevels/layout.yaml'
      : editorPhase === 'mode2'
        ? 'Save mode2/layout.yaml + surfaces.yaml'
        : 'Save layout.yaml';
  const wholeLevelMode = levelMoveLevel != null;
  const activeLevelMove =
    levelMoveLevel ?? configuredLevels[0] ?? 1;
  const elementEntries = entries.filter((entry) => entry.kind !== 'surface');
  const surfaceListEntries = entries.filter((entry) => entry.kind === 'surface');
  const selectedIsSurface = isSurfaceEditorId(selectedId);

  return (
    <div className="garden-editor" role="dialog" aria-label="Garden editor">
      <header className="garden-editor__header">
        <h2>Garden Editor</h2>
        <button
          type="button"
          className="garden-editor__close"
          onClick={onClose}
          aria-label="Close garden editor"
        >
          ×
        </button>
      </header>

      {variant === 'default' && onEditorPhaseChange && (
        <div className="garden-editor__field">
          <label htmlFor="editor-garden-phase">Garden mode</label>
          <select
            id="editor-garden-phase"
            value={editorPhase}
            onChange={(e) =>
              onEditorPhaseChange(e.target.value as GardenPhase)
            }
          >
            <option value="mode1">Mode 1</option>
            <option value="mode2">Mode 2</option>
          </select>
        </div>
      )}

      {editorPhase === 'mode2' && onSurfaceToolChange && (
        <div className="garden-editor__field">
          <span>Surface tool</span>
          <div className="garden-editor__mode-toggle" role="group">
            <button
              type="button"
              className={`garden-editor__mode-btn${surfaceTool === 'hop' ? ' garden-editor__mode-btn--active' : ''}`}
              onClick={() =>
                onSurfaceToolChange(surfaceTool === 'hop' ? null : 'hop')
              }
            >
              Draw hop
            </button>
            <button
              type="button"
              className={`garden-editor__mode-btn${surfaceTool === 'food' ? ' garden-editor__mode-btn--active' : ''}`}
              onClick={() =>
                onSurfaceToolChange(surfaceTool === 'food' ? null : 'food')
              }
            >
              Draw food
            </button>
          </div>
        </div>
      )}

      {editorPhase === 'mode2' &&
        onCollisionBoxToolChange &&
        selectedElement?.kind === 'birdAmbientStage' &&
        !wholeLevelMode && (
          <div className="garden-editor__field">
            <span>Bird collision box</span>
            <div className="garden-editor__mode-toggle" role="group">
              <button
                type="button"
                className={`garden-editor__mode-btn${collisionBoxTool ? ' garden-editor__mode-btn--active' : ''}`}
                onClick={() => onCollisionBoxToolChange(!collisionBoxTool)}
              >
                Draw collision box
              </button>
              {selectedElement.birdCollisionBox && onClearCollisionBox && selectedId && (
                <button
                  type="button"
                  className="garden-editor__mode-btn"
                  onClick={() => onClearCollisionBox(selectedId)}
                >
                  Clear
                </button>
              )}
            </div>
            <p className="garden-editor__hint">
              Select a bird, then drag on the canvas to draw its box. The box
              moves with the bird and other birds avoid overlapping it when
              hopping.
            </p>
          </div>
        )}

      <div className="garden-editor__mode-toggle" role="group" aria-label="Editor mode">
        <button
          type="button"
          className={`garden-editor__mode-btn${!wholeLevelMode ? ' garden-editor__mode-btn--active' : ''}`}
          onClick={() => onLevelMoveLevelChange(null)}
          aria-pressed={!wholeLevelMode}
        >
          Individual
        </button>
        <button
          type="button"
          className={`garden-editor__mode-btn${wholeLevelMode ? ' garden-editor__mode-btn--active' : ''}`}
          onClick={() =>
            onLevelMoveLevelChange(
              selectedElement?.level ?? configuredLevels[0] ?? 1,
            )
          }
          aria-pressed={wholeLevelMode}
        >
          Whole level
        </button>
      </div>

      <ul className="garden-editor__list">
        {elementEntries.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <li
              key={entry.id}
              className={`garden-editor__item${selected ? ' garden-editor__item--selected' : ''}`}
            >
              <button
                type="button"
                className="garden-editor__item-btn"
                onClick={() => onSelect(selected ? null : entry.id)}
              >
                <span className="garden-editor__item-label">{entry.name}</span>
                <span className="garden-editor__item-meta">
                  z{entry.zIndex} · ×{entry.scale}
                  {entry.flipX ? ' · ↔' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {editorPhase === 'mode2' && surfaceListEntries.length > 0 && (
        <>
          <h3 className="garden-editor__section-title">Surfaces</h3>
          <ul className="garden-editor__list garden-editor__list--surfaces">
            {surfaceListEntries.map((entry) => {
              const selected = entry.id === selectedId;
              const rect = entry.surfaceRect;
              return (
                <li
                  key={entry.id}
                  className={`garden-editor__item garden-editor__item--surface${selected ? ' garden-editor__item--selected' : ''}${entry.surfaceKind === 'hop' ? ' garden-editor__item--surface-hop' : ' garden-editor__item--surface-food'}`}
                >
                  <button
                    type="button"
                    className="garden-editor__item-btn"
                    onClick={() => onSelect(selected ? null : entry.id)}
                  >
                    <span className="garden-editor__item-label">{entry.name}</span>
                    {rect && (
                      <span className="garden-editor__item-meta">
                        x{rect.x.toFixed(2)} y{rect.y.toFixed(2)} · w
                        {rect.width.toFixed(2)} h{rect.height.toFixed(2)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {wholeLevelMode && (
        <div className="garden-editor__level-move">
          <label className="garden-editor__level-move-label" htmlFor="garden-level-move">
            Level
          </label>
          <select
            id="garden-level-move"
            className="garden-editor__level-move-select"
            value={activeLevelMove}
            onChange={(e) => onLevelMoveLevelChange(Number(e.target.value))}
          >
            {configuredLevels.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level, gardenConfig)}
              </option>
            ))}
          </select>

          <div className="garden-editor__prop-row">
            <span className="garden-editor__prop-label">Scale all</span>
            <div className="garden-editor__prop-controls">
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onScaleLevel(activeLevelMove, 1 / LEVEL_SCALE_FACTOR)
                }
                aria-label="Scale level smaller"
              >
                − Smaller
              </button>
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onScaleLevel(activeLevelMove, LEVEL_SCALE_FACTOR)
                }
                aria-label="Scale level larger"
              >
                Larger +
              </button>
            </div>
          </div>

          <div className="garden-editor__prop-row">
            <span className="garden-editor__prop-label">Offset X</span>
            <div className="garden-editor__prop-controls">
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onOffsetLevel(activeLevelMove, -LEVEL_OFFSET_STEP_X, 0)
                }
                aria-label="Move level left"
              >
                ← Left
              </button>
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onOffsetLevel(activeLevelMove, LEVEL_OFFSET_STEP_X, 0)
                }
                aria-label="Move level right"
              >
                Right →
              </button>
            </div>
          </div>

          <div className="garden-editor__prop-row">
            <span className="garden-editor__prop-label">Offset Y</span>
            <div className="garden-editor__prop-controls">
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onOffsetLevel(activeLevelMove, 0, -levelOffsetStepY)
                }
                aria-label="Move level up"
              >
                ↑ Up
              </button>
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() =>
                  onOffsetLevel(activeLevelMove, 0, levelOffsetStepY)
                }
                aria-label="Move level down"
              >
                Down ↓
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIsSurface && selectedSurfaceRect && !wholeLevelMode && (
        <div className="garden-editor__props">
          <h3 className="garden-editor__props-title">Selected surface</h3>
          <p className="garden-editor__surface-summary">
            {selectedSurfaceRect.id} · x{selectedSurfaceRect.x.toFixed(3)} y
            {selectedSurfaceRect.y.toFixed(3)} · w
            {selectedSurfaceRect.width.toFixed(3)} h
            {selectedSurfaceRect.height.toFixed(3)}
          </p>

          {onUpdateSurfaceRect && (
            <>
              <div className="garden-editor__field">
                <label htmlFor="surface-unlock-level">Unlock at level</label>
                <select
                  id="surface-unlock-level"
                  value={selectedSurfaceRect.unlockLevel ?? 1}
                  onChange={(e) => {
                    const parsed = parseSurfaceEditorId(selectedId);
                    if (!parsed) return;
                    const unlockLevel = Number(e.target.value);
                    onUpdateSurfaceRect(parsed.kind, parsed.id, {
                      ...selectedSurfaceRect,
                      unlockLevel,
                      unlockStage: Math.min(
                        selectedSurfaceRect.unlockStage ?? 0,
                        maxUnlockStageForLevel(unlockLevel, gardenConfig),
                      ),
                    });
                  }}
                >
                  {configuredLevels.map((level) => {
                    const def = gardenConfig.getLevelDefinition(level);
                    const label = def?.name
                      ? `Level ${level} — ${def.name}`
                      : `Level ${level}`;
                    return (
                      <option key={level} value={level}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="garden-editor__field">
                <label htmlFor="surface-unlock-stage">Unlock at stage</label>
                <input
                  id="surface-unlock-stage"
                  className="garden-editor__prop-input"
                  type="number"
                  min={0}
                  max={maxUnlockStageForLevel(
                    selectedSurfaceRect.unlockLevel ?? 1,
                    gardenConfig,
                  )}
                  step={1}
                  value={selectedSurfaceRect.unlockStage ?? 0}
                  onChange={(e) => {
                    const parsed = parseSurfaceEditorId(selectedId);
                    if (!parsed) return;
                    const unlockLevel = selectedSurfaceRect.unlockLevel ?? 1;
                    const maxStage = maxUnlockStageForLevel(
                      unlockLevel,
                      gardenConfig,
                    );
                    const unlockStage = Math.max(
                      0,
                      Math.min(maxStage, Number(e.target.value)),
                    );
                    onUpdateSurfaceRect(parsed.kind, parsed.id, {
                      ...selectedSurfaceRect,
                      unlockStage,
                    });
                  }}
                />
                <p className="garden-editor__hint">
                  Stage 0 = level start. Surface stays once unlocked.
                </p>
              </div>
            </>
          )}

          {onDeleteSurface && (
            <div className="garden-editor__prop-row">
              <button
                type="button"
                className="garden-editor__btn garden-editor__btn--danger"
                onClick={() => {
                  const parsed = parseSurfaceEditorId(selectedId);
                  if (!parsed) return;
                  if (
                    window.confirm(
                      `Delete ${parsed.kind} surface "${parsed.id}"?`,
                    )
                  ) {
                    onDeleteSurface(parsed.kind, parsed.id);
                  }
                }}
              >
                Delete surface
              </button>
            </div>
          )}
        </div>
      )}

      {selectedElement && selectedId && !wholeLevelMode && !selectedIsSurface && (
        <div className="garden-editor__props">
          <h3 className="garden-editor__props-title">Selected element</h3>

          <div className="garden-editor__prop-row">
            <span className="garden-editor__prop-label">Layer (zIndex)</span>
            <div className="garden-editor__prop-controls">
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() => onNudgeZIndex(selectedId, -1)}
                aria-label="Send backward"
                title="Send backward"
              >
                ↓ Back
              </button>
              <input
                type="number"
                className="garden-editor__prop-input"
                value={selectedElement.zIndex}
                step={1}
                onChange={(e) =>
                  onZIndexChange(selectedId, Number(e.target.value))
                }
              />
              <button
                type="button"
                className="garden-editor__prop-btn"
                onClick={() => onNudgeZIndex(selectedId, 1)}
                aria-label="Bring forward"
                title="Bring forward"
              >
                ↑ Front
              </button>
            </div>
          </div>

          <div className="garden-editor__prop-row">
            <label className="garden-editor__prop-label" htmlFor="garden-el-scale">
              Scale
            </label>
            <input
              id="garden-el-scale"
              type="number"
              className="garden-editor__prop-input garden-editor__prop-input--wide"
              value={selectedElement.scale}
              min={0.05}
              max={10}
              step={0.05}
              onChange={(e) =>
                onScaleChange(selectedId, Number(e.target.value))
              }
            />
          </div>

          {selectedElement.animation && (
            <div className="garden-editor__prop-row">
              <label
                className="garden-editor__prop-label"
                htmlFor="garden-el-anim-hold"
              >
                Last frame hold (sec)
              </label>
              <input
                id="garden-el-anim-hold"
                type="number"
                className="garden-editor__prop-input garden-editor__prop-input--wide"
                value={selectedElement.animation.lastFrameHold}
                min={0}
                max={60}
                step={0.1}
                onChange={(e) =>
                  onAnimationLastFrameHoldChange(
                    selectedId,
                    Number(e.target.value),
                  )
                }
              />
            </div>
          )}

          <div className="garden-editor__prop-row">
            <span className="garden-editor__prop-label">Mirror (flip horizontally)</span>
            <div className="garden-editor__prop-controls">
              <button
                type="button"
                className={`garden-editor__mode-btn garden-editor__mode-btn--compact${selectedElement.flipX ? ' garden-editor__mode-btn--active' : ''}`}
                onClick={() => onFlipXChange(selectedId, !selectedElement.flipX)}
                aria-pressed={selectedElement.flipX}
                title="Mirror the asset over the vertical axis"
              >
                {selectedElement.flipX ? 'Mirrored ↔' : 'Mirror ↔'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="garden-editor__actions">
        <button
          type="button"
          className="garden-editor__btn garden-editor__btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : layoutSaveLabel}
        </button>
      </div>
    </div>
  );
}
