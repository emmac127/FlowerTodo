import { useMemo, useState } from 'react';
import { useGardenConfig } from '../context/AppVariantContext';
import {
  getCompletionsBeforeLevel,
  getMaxInLevelScore,
  getGardenCycleProgress,
  getGardenLevel,
} from '../lib/plantedGarden';

interface DevPanelProps {
  open: boolean;
  currentGardenProgressCount: number;
  onClose: () => void;
  onApply: (args: { completedCount: number }) => void;
  onResetEverything: () => void;
}

export function DevPanel({
  open,
  currentGardenProgressCount,
  onClose,
  onApply,
  onResetEverything,
}: DevPanelProps) {
  const gardenConfig = useGardenConfig();
  const levelOptions = useMemo(
    () => gardenConfig.getConfiguredLevels(),
    [gardenConfig],
  );
  const minLevel = levelOptions[0] ?? 1;
  const maxLevel = levelOptions[levelOptions.length - 1] ?? minLevel;

  const currentLevel = getGardenLevel(currentGardenProgressCount, gardenConfig);
  const currentScore = getGardenCycleProgress(
    currentGardenProgressCount,
    gardenConfig,
  ).planted;

  const [level, setLevel] = useState<number>(Math.max(1, currentLevel || 1));
  const [score, setScore] = useState<number>(currentScore);

  const maxScore = useMemo(
    () => getMaxInLevelScore(level, gardenConfig),
    [level, gardenConfig],
  );

  if (!open) return null;

  const handleLevelChange = (next: number) => {
    const clamped = Math.max(
      minLevel,
      Math.min(maxLevel, Math.round(next) || minLevel),
    );
    setLevel(clamped);
    const cap = getMaxInLevelScore(clamped, gardenConfig);
    if (score > cap) setScore(cap);
  };

  const handleScoreChange = (next: number) => {
    setScore(Math.max(0, Math.min(next, maxScore)));
  };

  const targetCount = getCompletionsBeforeLevel(level, gardenConfig) + score;

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
          <label htmlFor="dev-level">
            Garden level ({minLevel}–{maxLevel})
          </label>
          <div className="dev-panel__level-controls">
            <button
              type="button"
              className="dev-panel__step-btn"
              onClick={() => handleLevelChange(level - 1)}
              disabled={level <= minLevel}
              aria-label="Previous level"
            >
              −
            </button>
            <input
              id="dev-level"
              type="number"
              min={minLevel}
              max={maxLevel}
              step={1}
              value={level}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
            />
            <button
              type="button"
              className="dev-panel__step-btn"
              onClick={() => handleLevelChange(level + 1)}
              disabled={level >= maxLevel}
              aria-label="Next level"
            >
              +
            </button>
          </div>
        </div>

        <div className="dev-panel__field">
          <label htmlFor="dev-score">Score within level (0–{maxScore})</label>
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
          Will set total completions to <strong>{targetCount}</strong>.
        </p>

        <div className="dev-panel__actions">
          <button
            type="button"
            className="dev-panel__btn dev-panel__btn--primary"
            onClick={() => {
              onApply({ completedCount: targetCount });
              onClose();
            }}
          >
            Apply
          </button>
          <button type="button" className="dev-panel__btn" onClick={onClose}>
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
                window.confirm('Reset ALL progress? This cannot be undone.')
              ) {
                onResetEverything();
                onClose();
              }
            }}
          >
            Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}
