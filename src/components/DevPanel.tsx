import { useEffect, useMemo, useState } from 'react';
import { useGardenConfig } from '../context/AppVariantContext';
import {
  getCompletionsBeforeLevel,
  getMaxInLevelScore,
  getGardenCycleProgress,
  getGardenStageMeterMax,
  getGardenLevel,
} from '../lib/plantedGarden';
import {
  getGardenConfigForPhase,
  type GardenPhase,
} from '../lib/garden/loadConfig';
import type { GardenPhaseState } from '../lib/gardenPhase';

interface DevPanelProps {
  open: boolean;
  variant: 'default' | 'dad';
  currentGardenProgressCount: number;
  phaseState: GardenPhaseState;
  onClose: () => void;
  onApply: (args: { completedCount: number; devPhase?: GardenPhase }) => void;
  onResetEverything: () => void;
}

export function DevPanel({
  open,
  variant,
  currentGardenProgressCount,
  phaseState,
  onClose,
  onApply,
  onResetEverything,
}: DevPanelProps) {
  const defaultConfig = useGardenConfig();
  const [devPhase, setDevPhase] = useState<GardenPhase>(
    phaseState.mode2Unlocked ? 'mode2' : 'mode1',
  );

  const gardenConfig = useMemo(
    () =>
      variant === 'dad'
        ? defaultConfig
        : getGardenConfigForPhase(devPhase),
    [variant, defaultConfig, devPhase],
  );

  const activeCount =
    devPhase === 'mode2' && phaseState.mode2Unlocked
      ? phaseState.mode2ProgressCount
      : currentGardenProgressCount;

  const levelOptions = useMemo(
    () => gardenConfig.getConfiguredLevels(),
    [gardenConfig],
  );
  const minLevel = levelOptions[0] ?? 1;
  const maxLevel = levelOptions[levelOptions.length - 1] ?? minLevel;

  const currentLevel = getGardenLevel(activeCount, gardenConfig);
  const currentScore = getGardenCycleProgress(activeCount, gardenConfig).planted;

  const [level, setLevel] = useState<number>(Math.max(1, currentLevel || 1));
  const [score, setScore] = useState<number>(currentScore);

  useEffect(() => {
    if (!open) return;
    const phase = phaseState.mode2Unlocked ? 'mode2' : 'mode1';
    setDevPhase(phase);
    const config =
      variant === 'dad' ? defaultConfig : getGardenConfigForPhase(phase);
    const count =
      phase === 'mode2' && phaseState.mode2Unlocked
        ? phaseState.mode2ProgressCount
        : currentGardenProgressCount;
    const lvl = getGardenLevel(count, config);
    const scr = getGardenCycleProgress(count, config).planted;
    setLevel(Math.max(1, lvl || 1));
    setScore(scr);
  }, [
    open,
    variant,
    defaultConfig,
    phaseState.mode2Unlocked,
    phaseState.mode2ProgressCount,
    currentGardenProgressCount,
  ]);

  const maxScore = useMemo(
    () => getGardenStageMeterMax(level, gardenConfig),
    [level, gardenConfig],
  );

  if (!open) return null;

  const handleLevelChange = (next: number) => {
    const clamped = Math.max(
      minLevel,
      Math.min(maxLevel, Math.round(next) || minLevel),
    );
    setLevel(clamped);
    const cap = getGardenStageMeterMax(clamped, gardenConfig);
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

        {variant === 'default' && (
          <div className="dev-panel__field">
            <label htmlFor="dev-garden-phase">Garden mode</label>
            <select
              id="dev-garden-phase"
              value={devPhase}
              onChange={(e) => setDevPhase(e.target.value as GardenPhase)}
            >
              <option value="mode1">Mode 1 (flower garden)</option>
              <option value="mode2">Mode 2 (bird garden)</option>
            </select>
          </div>
        )}

        <div className="dev-panel__current">
          <strong>Current:</strong> level {currentLevel}, score {currentScore} (
          {activeCount} completions in {devPhase})
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
              onApply({
                completedCount: targetCount,
                devPhase: variant === 'default' ? devPhase : undefined,
              });
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
