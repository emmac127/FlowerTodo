import { forwardRef } from 'react';
import { KawaiiMascot } from './KawaiiMascot';

interface StickyKawaiiHeaderProps {
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

export const StickyKawaiiHeader = forwardRef<HTMLDivElement, StickyKawaiiHeaderProps>(
  function StickyKawaiiHeader(
    {
      message,
      visible,
      dancing,
      gardenLevel,
      gardenCyclePlanted,
      gardenCycleMax,
      muted,
      onToggleMute,
      onViewGarden,
      gardenViewOpen,
      onPickRandom,
      pickDisabled,
      onResetGarden,
      resetGardenDisabled,
    },
    ref,
  ) {
    return (
      <header className="sticky-kawaii-header">
        <KawaiiMascot
          ref={ref}
          message={message}
          visible={visible}
          dancing={dancing}
          gardenLevel={gardenLevel}
          gardenCyclePlanted={gardenCyclePlanted}
          gardenCycleMax={gardenCycleMax}
          muted={muted}
          onToggleMute={onToggleMute}
          onViewGarden={onViewGarden}
          gardenViewOpen={gardenViewOpen}
          onPickRandom={onPickRandom}
          pickDisabled={pickDisabled}
          onResetGarden={onResetGarden}
          resetGardenDisabled={resetGardenDisabled}
        />
      </header>
    );
  },
);
