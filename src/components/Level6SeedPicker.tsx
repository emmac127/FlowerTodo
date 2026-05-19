import type { GardenSeed } from '../lib/gardenSeed';
import { SEED_CHOICE_CLASS, SEED_DISPLAY_NAMES } from '../lib/gardenSeedCatalog';
import { SeedChoiceIcon } from './SeedChoiceIcon';

interface Level6SeedPickerProps {
  options: [GardenSeed, GardenSeed];
  onSelect: (seed: GardenSeed) => void;
}

export function Level6SeedPicker({ options, onSelect }: Level6SeedPickerProps) {
  const [left, right] = options;

  return (
    <div
      className="starting-seed-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level6-seed-picker-title"
    >
      <p id="level6-seed-picker-title" className="starting-seed-picker__sr-only">
        Choose your level 6 flower from flowers you did not pick before
      </p>
      <div className="starting-seed-picker__choices">
        {[left, right].map((seed) => (
          <button
            key={seed}
            type="button"
            className={`seed-choice ${SEED_CHOICE_CLASS[seed]}`}
            onClick={() => onSelect(seed)}
          >
            <SeedChoiceIcon seed={seed} />
            <span className="seed-choice__label">{SEED_DISPLAY_NAMES[seed]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
