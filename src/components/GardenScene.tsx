import { useMemo } from 'react';
import { GardenFlowerStrip, type GardenFlowerItem } from './GardenFlowerStrip';
import { getSeedForGardenLevel, type GardenSeedChoices } from '../lib/gardenSeed';
import { getGardenLayers, getSceneMilestoneCount } from '../lib/gardenProgress';
import {
  getCompletedGardenLevels,
  getMaxGrowthStageForLevel,
  moonSunHasFullPetalBloom,
  shouldShowActiveLevelGrower,
} from '../lib/gardenLevels';
import type { Level2Seed } from '../lib/level2Seed';
import type { Level3Seed } from '../lib/level3Seed';
import type { Level4Seed } from '../lib/level4Seed';
import type { GardenSeed } from '../lib/gardenSeed';
import type { Level5Seed } from '../lib/level5Seed';
import { getGardenCycleProgress, getGardenLevel } from '../lib/plantedGarden';
import { getSeedGrowthStage } from '../lib/seedGrowth';
import type { StartingSeed } from '../lib/startingSeed';
import { CssDoodle } from './CssDoodle';

interface GardenSceneProps {
  completedCount: number;
  startingSeed?: StartingSeed | null;
  level2Seed?: Level2Seed | null;
  level3Seed?: Level3Seed | null;
  level4Seed?: Level4Seed | null;
  level5Seed?: Level5Seed | null;
  level6Seed?: GardenSeed | null;
  muted?: boolean;
}

const GRASS_DOODLE = `
  :doodle {
    @grid: 24x3 / 100% 100%;
    background: linear-gradient(#b8e8a8 0%, #8ed98e 55%, #6bc96b 100%);
  }
  @size: 100%;
  background: @pn(
    radial-gradient(@wc(h) @wc(h) at @r(100%) @r(100%), #7dd87d 0%, transparent 70%),
    radial-gradient(@wc(h) @wc(h) at @r(100%) @r(100%), #a8f0a0 0%, transparent 65%)
  );
  opacity: @r(.35, .75);
`;

export function GardenScene({
  completedCount,
  startingSeed = null,
  level2Seed = null,
  level3Seed = null,
  level4Seed = null,
  level5Seed = null,
  level6Seed = null,
  muted = false,
}: GardenSceneProps) {
  const seedChoices: GardenSeedChoices = useMemo(
    () => ({
      starting: startingSeed,
      level2: level2Seed,
      level3: level3Seed,
      level4: level4Seed,
      level5: level5Seed,
      level6: level6Seed,
    }),
    [startingSeed, level2Seed, level3Seed, level4Seed, level5Seed, level6Seed],
  );
  const layers = useMemo(() => getGardenLayers(completedCount), [completedCount]);
  const stage = Math.min(getSceneMilestoneCount(completedCount), 12);
  const completedLevels = useMemo(
    () => getCompletedGardenLevels(completedCount),
    [completedCount],
  );
  const activeLevel = getGardenLevel(completedCount);
  const activeSeed = getSeedForGardenLevel(activeLevel, seedChoices);
  const showActiveGrower =
    activeSeed != null &&
    shouldShowActiveLevelGrower(completedCount, true);
  const activeGrowthStage = getSeedGrowthStage(completedCount);
  const cycleProgress = getGardenCycleProgress(completedCount);
  const showGrass = layers.grass || startingSeed != null;

  const flowers = useMemo(() => {
    const items: GardenFlowerItem[] = [];
    for (const level of completedLevels) {
      const seed = getSeedForGardenLevel(level, seedChoices);
      if (!seed) continue;
      items.push({
        key: `level-${level}`,
        seed,
        growthStage: getMaxGrowthStageForLevel(level),
        className: 'growing-seed--planted',
        fullPetalBloom: moonSunHasFullPetalBloom(seed, getMaxGrowthStageForLevel(level), {
          planted: true,
          gardenLevel: level,
        }),
      });
    }
    if (showActiveGrower && activeSeed) {
      items.push({
        key: 'active-level',
        seed: activeSeed,
        growthStage: activeGrowthStage,
        className: 'growing-seed--active',
        fullPetalBloom: moonSunHasFullPetalBloom(activeSeed, activeGrowthStage, {
          planted: false,
          gardenLevel: activeLevel,
        }),
      });
    }
    return items;
  }, [
    activeGrowthStage,
    activeSeed,
    completedLevels,
    seedChoices,
    showActiveGrower,
  ]);

  return (
    <div className="garden-scene" aria-hidden>
      <div className="garden-scene__sky" />

      {showGrass && (
        <div className={`garden-layer garden-layer--grass stage-${stage}`}>
          <CssDoodle className="garden-doodle garden-doodle--grass">{GRASS_DOODLE}</CssDoodle>
        </div>
      )}

      {layers.grassDetail && (
        <div className={`garden-layer garden-layer--tufts stage-${stage}`}>
          <span className="grass-tuft grass-tuft--1" />
          <span className="grass-tuft grass-tuft--2" />
          <span className="grass-tuft grass-tuft--3" />
          <span className="grass-tuft grass-tuft--4" />
        </div>
      )}

      <GardenFlowerStrip flowers={flowers} muted={muted} />

      {!startingSeed && (
        <p className="garden-scene__hint">Complete tasks to plant your garden…</p>
      )}

      {startingSeed && !level2Seed && activeLevel >= 2 && cycleProgress.planted === 0 && (
        <p className="garden-scene__hint garden-scene__hint--seed">
          Choose your level 2 flower seed…
        </p>
      )}

      {startingSeed &&
        level2Seed &&
        !level3Seed &&
        activeLevel >= 3 &&
        cycleProgress.planted === 0 && (
          <p className="garden-scene__hint garden-scene__hint--seed">
            Choose your level 3 flower seed…
          </p>
        )}

      {startingSeed &&
        level2Seed &&
        level3Seed &&
        !level4Seed &&
        activeLevel >= 4 &&
        cycleProgress.planted === 0 && (
          <p className="garden-scene__hint garden-scene__hint--seed">
            Choose your level 4 flower seed…
          </p>
        )}

      {startingSeed &&
        level2Seed &&
        level3Seed &&
        level4Seed &&
        !level5Seed &&
        activeLevel >= 5 &&
        cycleProgress.planted === 0 && (
          <p className="garden-scene__hint garden-scene__hint--seed">
            Choose your level 5 flower seed…
          </p>
        )}

      {startingSeed &&
        level2Seed &&
        level3Seed &&
        level4Seed &&
        level5Seed &&
        !level6Seed &&
        activeLevel >= 6 &&
        cycleProgress.planted === 0 && (
          <p className="garden-scene__hint garden-scene__hint--seed">
            Choose your level 6 flower seed…
          </p>
        )}

      {startingSeed &&
        level2Seed &&
        level3Seed &&
        level4Seed &&
        level5Seed &&
        level6Seed &&
        cycleProgress.planted === 0 &&
        completedLevels.length <= 5 && (
          <p className="garden-scene__hint garden-scene__hint--seed">
            Complete tasks to help your seed grow…
          </p>
        )}
    </div>
  );
}
