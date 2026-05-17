import { forwardRef } from 'react';
import { KawaiiMascot } from './KawaiiMascot';

interface StickyKawaiiHeaderProps {
  message: string | null;
  visible: boolean;
  dancing?: boolean;
  gardenLevel: number;
  muted: boolean;
  onToggleMute: () => void;
  onPickRandom?: () => void;
  pickDisabled?: boolean;
}

export const StickyKawaiiHeader = forwardRef<HTMLDivElement, StickyKawaiiHeaderProps>(
  function StickyKawaiiHeader(
    {
      message,
      visible,
      dancing,
      gardenLevel,
      muted,
      onToggleMute,
      onPickRandom,
      pickDisabled,
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
          muted={muted}
          onToggleMute={onToggleMute}
          onPickRandom={onPickRandom}
          pickDisabled={pickDisabled}
        />
      </header>
    );
  },
);
