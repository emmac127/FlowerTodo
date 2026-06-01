import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { KawaiiMascot } from './KawaiiMascot';
import type { GardenRevealPhase } from './TaskList';

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
  gardenRevealPhase?: GardenRevealPhase;
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
      gardenRevealPhase = 'idle',
    },
    ref,
  ) {
    const revealActive = gardenRevealPhase === 'active';
    const revealExit = gardenRevealPhase === 'exit';

    return (
      <header
        className={[
          'sticky-kawaii-header',
          revealActive ? 'sticky-kawaii-header--garden-reveal garden-reveal-slat' : '',
          revealExit ? 'sticky-kawaii-header--garden-reveal-exit garden-reveal-slat' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          gardenRevealPhase !== 'idle'
            ? ({ '--blind-index': 0 } as CSSProperties)
            : undefined
        }
      >
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
        />
      </header>
    );
  },
);
