import type { EditorEntry } from '../lib/garden/buildScene';
import { getLevelDefinition } from '../lib/garden/loadConfig';
import type { PlacedElement } from '../lib/garden/types';

const LEVEL_OFFSET_STEP = 0.01;

interface GardenEditorProps {
  entries: EditorEntry[];
  selectedId: string | null;
  selectedElement: PlacedElement | null;
  configuredLevels: number[];
  levelMoveLevel: number | null;
  onLevelMoveLevelChange: (level: number | null) => void;
  onOffsetLevel: (level: number, deltaX: number, deltaY: number) => void;
  onSelect: (id: string) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  onNudgeZIndex: (id: string, delta: number) => void;
  onScaleChange: (id: string, scale: number) => void;
  onFlipXChange: (id: string, flipX: boolean) => void;
  onAnimationLastFrameHoldChange: (id: string, seconds: number) => void;
  onSave: () => void;
  saving?: boolean;
  onClose: () => void;
}

function levelLabel(level: number): string {
  const def = getLevelDefinition(level);
  return def?.name ? `Level ${level} — ${def.name}` : `Level ${level}`;
}

export function GardenEditor({
  entries,
  selectedId,
  selectedElement,
  configuredLevels,
  levelMoveLevel,
  onLevelMoveLevelChange,
  onOffsetLevel,
  onSelect,
  onZIndexChange,
  onNudgeZIndex,
  onScaleChange,
  onFlipXChange,
  onAnimationLastFrameHoldChange,
  onSave,
  saving = false,
  onClose,
}: GardenEditorProps) {
  const wholeLevelMode = levelMoveLevel != null;
  const activeLevelMove =
    levelMoveLevel ?? configuredLevels[0] ?? 1;

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

      <p className="garden-editor__hint">
        Select an element, drag to move, then adjust layer and size below.
        Use <strong>whole level</strong> mode to shift every asset on a level
        together. Lower <strong>zIndex</strong> draws behind other elements
        (e.g. a fence behind flowers). <strong>Scale</strong> multiplies the
        image size. Save writes directly to{' '}
        <code>src/garden/layout.yaml</code> (dev server only) and reloads the
        page.
      </p>

      <div className="garden-editor__level-move">
        <h3 className="garden-editor__level-move-title">Move mode</h3>
        <div className="garden-editor__mode-toggle" role="group" aria-label="Move mode">
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

        {wholeLevelMode && (
          <>
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
                  {levelLabel(level)}
                </option>
              ))}
            </select>

            <p className="garden-editor__level-move-hint">
              Drag any highlighted asset in the garden, or nudge the whole level
              with the buttons below.
            </p>

            <div className="garden-editor__prop-row">
              <span className="garden-editor__prop-label">Offset X</span>
              <div className="garden-editor__prop-controls">
                <button
                  type="button"
                  className="garden-editor__prop-btn"
                  onClick={() =>
                    onOffsetLevel(activeLevelMove, -LEVEL_OFFSET_STEP, 0)
                  }
                  aria-label="Move level left"
                >
                  ← Left
                </button>
                <button
                  type="button"
                  className="garden-editor__prop-btn"
                  onClick={() =>
                    onOffsetLevel(activeLevelMove, LEVEL_OFFSET_STEP, 0)
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
                    onOffsetLevel(activeLevelMove, 0, -LEVEL_OFFSET_STEP)
                  }
                  aria-label="Move level up"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  className="garden-editor__prop-btn"
                  onClick={() =>
                    onOffsetLevel(activeLevelMove, 0, LEVEL_OFFSET_STEP)
                  }
                  aria-label="Move level down"
                >
                  Down ↓
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ul className="garden-editor__list">
        {entries.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <li
              key={entry.id}
              className={`garden-editor__item${selected ? ' garden-editor__item--selected' : ''}`}
            >
              <button
                type="button"
                className="garden-editor__item-btn"
                onClick={() => onSelect(entry.id)}
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

      {selectedElement && selectedId && !wholeLevelMode && (
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
              <p className="garden-editor__level-move-hint">
                Extra pause on the final frame before the loop repeats (
                {selectedElement.animation.frames.length} frames @{' '}
                {selectedElement.animation.frameDuration}s each).
              </p>
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
          {saving ? 'Saving…' : 'Save layout.yaml'}
        </button>
      </div>
    </div>
  );
}
