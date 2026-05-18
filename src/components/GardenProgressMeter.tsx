import { FLOWERS_PER_GARDEN_LEVEL } from '../lib/plantedGarden';

interface GardenProgressMeterProps {
  planted: number;
  max?: number;
}

export function GardenProgressMeter({
  planted,
  max = FLOWERS_PER_GARDEN_LEVEL,
}: GardenProgressMeterProps) {
  const filled = Math.min(Math.max(0, planted), max);

  return (
    <div
      className="garden-progress"
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${filled} of ${max} flowers planted toward next garden level`}
    >
      <span className="garden-progress__label">Next level</span>
      <div className="garden-progress__track">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`garden-progress__pip${i < filled ? ' garden-progress__pip--filled' : ''}`}
            aria-hidden
          />
        ))}
      </div>
      <span className="garden-progress__count" aria-hidden>
        {filled}/{max}
      </span>
    </div>
  );
}
