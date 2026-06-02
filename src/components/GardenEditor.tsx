import type { EditorEntry } from '../lib/garden/buildScene';
import type { PlacedElement } from '../lib/garden/types';

interface GardenEditorProps {
  entries: EditorEntry[];
  selectedId: string | null;
  selectedElement: PlacedElement | null;
  onSelect: (id: string) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  onNudgeZIndex: (id: string, delta: number) => void;
  onScaleChange: (id: string, scale: number) => void;
  onSave: () => void;
  saving?: boolean;
  onClose: () => void;
}

export function GardenEditor({
  entries,
  selectedId,
  selectedElement,
  onSelect,
  onZIndexChange,
  onNudgeZIndex,
  onScaleChange,
  onSave,
  saving = false,
  onClose,
}: GardenEditorProps) {
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
        Lower <strong>zIndex</strong> draws behind other elements (e.g. a fence
        behind flowers). <strong>Scale</strong> multiplies the image size.
        Save writes directly to <code>src/garden/layout.yaml</code> (dev server
        only) and reloads the page.
      </p>

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
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedElement && selectedId && (
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
