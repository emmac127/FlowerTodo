import { forwardRef } from 'react';
import { KawaiiMascot } from './KawaiiMascot';

interface StickyKawaiiHeaderProps {
  message: string | null;
  visible: boolean;
  dancing?: boolean;
}

export const StickyKawaiiHeader = forwardRef<HTMLDivElement, StickyKawaiiHeaderProps>(
  function StickyKawaiiHeader({ message, visible, dancing }, ref) {
    const showSpeech = visible && Boolean(message);

    return (
      <header
        className={`sticky-kawaii-header${showSpeech ? ' sticky-kawaii-header--speech' : ''}`}
      >
        <KawaiiMascot
          ref={ref}
          message={message}
          visible={visible}
          dancing={dancing}
        />
      </header>
    );
  },
);
