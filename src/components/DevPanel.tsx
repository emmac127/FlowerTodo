import { useMemo, useState } from 'react';
import {
  getCompletionsBeforeLevel,
  getTasksForGardenLevel,
  getGardenCycleProgress,
  getGardenLevel,
} from '../lib/plantedGarden';

interface DevPanelProps {
  open: boolean;
  currentGardenProgressCount: number;
  onClose: () => void;
  /**
   * Apply the dev reset. Implementations should set the garden progress count
   * and clear any seed choices for `clearSeedsFromLevel` and above.
   */
  onApply: (args: {
    completedCount: number;
    clearSeedsFromLevel: number;
  }) => void;
  onResetEverything: () => void;
}

const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function DevPanel({
  open,
  currentGardenProgressCount,
  onClose,
  onApply,
  onResetEverything,
}: DevPanelProps) {
  const currentLevel = getGardenLevel(currentGardenProgressCount);
  const currentScore = getGardenCycleProgress(currentGardenProgressCount).planted;

  const [level, setLevel] = useState<number>(Math.max(1, currentLevel || 1));
  const [score, setScore] = useState<number>(currentScore);

  const maxScore = useMemo(() => getTasksForGardenLevel(level), [level]);

  if (!open) return null;

  const handleLevelChange = (next: number) => {
    setLevel(next);
    const cap = getTasksForGardenLevel(next);
    if (score > cap) setScore(cap);
  };

  const handleScoreChange = (next: number) => {
    const clamped = Math.max(0, Math.min(next, maxScore));
    setScore(clamped);
  };

  const targetCount = getCompletionsBeforeLevel(level) + score;

  return (
    <div
      className="dev-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-panel-title"
    >
      <div className="dev-panel__card">
        <header className="dev-panel__header">
          <h2 id="dev-panel-title">Dev Tools</h2>
          <button
            type="button"
            className="dev-panel__close"
            onClick={onClose}
            aria-label="Close dev panel"
          >
            ×
          </button>
        </header>

        <div className="dev-panel__current">
          <strong>Current:</strong> level {currentLevel}, score {currentScore} (
          {currentGardenProgressCount} completions total)
        </div>

        <div className="dev-panel__field">
          <label htmlFor="dev-level">Garden level</label>
          <select
            id="dev-level"
            value={level}
            onChange={(e) => handleLevelChange(Number(e.target.value))}
          >
            {LEVEL_OPTIONS.map((lvl) => (
              <option key={lvl} value={lvl}>
                Level {lvl}
              </option>
            ))}
          </select>
        </div>

        <div className="dev-panel__field">
          <label htmlFor="dev-score">
            Score within level (0–{maxScore})
          </label>
          <input
            id="dev-score"
            type="number"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => handleScoreChange(Number(e.target.value))}
          />
        </div>

        <p className="dev-panel__preview">
          Will set total completions to <strong>{targetCount}</strong> and clear
          seed choices for level <strong>{level}</strong> and above so you can
          pick a different flower.
        </p>

        <div className="dev-panel__actions">
          <button
            type="button"
            className="dev-panel__btn dev-panel__btn--primary"
            onClick={() => {
              onApply({
                completedCount: targetCount,
                clearSeedsFromLevel: level,
              });
              onClose();
            }}
          >
            Apply
          </button>
          <button
            type="button"
            className="dev-panel__btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        <hr className="dev-panel__divider" />

        <div className="dev-panel__danger">
          <button
            type="button"
            className="dev-panel__btn dev-panel__btn--danger"
            onClick={() => {
              if (
                window.confirm(
                  'Reset ALL progress and seed choices? This cannot be undone.',
                )
              ) {
                onResetEverything();
                onClose();
              }
            }}
          >
            Reset everything (all levels)
          </button>
        </div>
      </div>
    </div>
  );
}
