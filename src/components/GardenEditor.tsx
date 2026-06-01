import type { EditorEntry } from '../lib/garden/buildScene';

interface GardenEditorProps {
  entries: EditorEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDownload: () => void;
  onClose: () => void;
}

export function GardenEditor({
  entries,
  selectedId,
  onSelect,
  onDownload,
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
        Select any flower, planter, or growth stage in the list, then drag it in
        the garden (or drag on the garden after selecting). Download saves every
        position into <code>layout.yaml</code> — paste that file over{' '}
        <code>src/garden/layout.yaml</code> and reload to apply in the app.
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
                {entry.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="garden-editor__actions">
        <button
          type="button"
          className="garden-editor__btn garden-editor__btn--primary"
          onClick={onDownload}
        >
          Download layout.yaml
        </button>
      </div>
    </div>
  );
}
