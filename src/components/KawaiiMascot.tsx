import { forwardRef } from 'react';
import defaultHeaderTitleSrc from '../assets/header-title.png';
import { useAppVariant } from '../context/AppVariantContext';
import { GardenProgressMeter } from './GardenProgressMeter';
import { MascotImage } from './MascotImage';
import { MuteToggleButton } from './MuteToggleButton';
import { ViewGardenButton } from './ViewGardenButton';

interface KawaiiMascotProps {
  message: string | null;
  visible: boolean;
  dancing?: boolean;
  gardenLevel: number;
  gardenCyclePlanted: number;
  gardenCycleMax: number;
  muted: boolean;
  onToggleMute: () => void;
  onViewGarden?: () => void;
  gardenViewOpen?: boolean;
  onPickRandom?: () => void;
  pickDisabled?: boolean;
  onResetGarden?: () => void;
  resetGardenDisabled?: boolean;
}

export const KawaiiMascot = forwardRef<HTMLDivElement, KawaiiMascotProps>(
  function KawaiiMascot(
    {
      message,
      visible,
      dancing = false,
      gardenLevel,
      gardenCyclePlanted,
      gardenCycleMax,
      muted,
      onToggleMute,
      onViewGarden,
      gardenViewOpen = false,
      onPickRandom,
      pickDisabled = false,
      onResetGarden,
      resetGardenDisabled = false,
    },
    ref,
  ) {
    const variant = useAppVariant();
    const isDad = variant === 'dad';
    const headerTitleSrc = isDad
      ? '/garden/assets/Dad/Ciderimages/titlecard.png'
      : defaultHeaderTitleSrc;
    const mascotClass = [
      'mascot',
      visible ? 'mascot--cheering' : '',
      dancing ? 'mascot--dancing' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="kawaii-header">
        <div className="kawaii-header__inner">
          <div className="kawaii-header__main-row">
            <div ref={ref} className={mascotClass}>
              {message && (
                <div
                  className={`mascot-speech mascot-speech--beside ${visible ? 'mascot-speech--visible' : ''}`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="mascot-speech__text">{message}</p>
                </div>
              )}
              <MascotImage className="mascot__render" variant={variant} />
            </div>

            <img
              src={headerTitleSrc}
              alt={isDad ? 'To Do List for MEN' : 'Flower To Do'}
              className="app-header-logo"
              decoding="async"
            />

            <div className="garden-level-block">
              <div
                className="garden-level"
                aria-label={`${isDad ? 'Moon' : 'Garden'} level ${gardenLevel}`}
              >
                <span className="garden-level__label">
                  {isDad ? 'Moon Level' : 'Garden Level'}
                </span>
                <span className="garden-level__value" aria-hidden>
                  {gardenLevel}
                </span>
              </div>
              <GardenProgressMeter
                planted={gardenCyclePlanted}
                max={gardenCycleMax}
              />
              {onResetGarden && (
                <button
                  type="button"
                  className="reset-garden-btn"
                  onClick={onResetGarden}
                  disabled={resetGardenDisabled}
                  title="Start your garden over at level 0; tasks stay on your list"
                >
                  Reset garden
                </button>
              )}
            </div>
          </div>

          <div className="kawaii-header__actions-row">
            {onPickRandom && (
              <button
                type="button"
                className="pick-task-btn pick-task-btn--header"
                onClick={onPickRandom}
                disabled={pickDisabled}
              >
                I&apos;ll pick your next task!
              </button>
            )}
            <div className="kawaii-header__icon-actions">
              {onViewGarden && (
                <ViewGardenButton
                  onClick={onViewGarden}
                  active={gardenViewOpen}
                />
              )}
              <MuteToggleButton muted={muted} onClick={onToggleMute} />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
