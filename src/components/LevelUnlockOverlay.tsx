import { useCallback, useEffect, useState } from 'react';
import { StarBurst } from './StarBurst';
import { MODE2_UNLOCK_STRINGS } from '../lib/gardenUnlockStrings';
import { playUnlockBuildUpSound } from '../lib/sounds';

interface LevelUnlockOverlayProps {
  active: boolean;
  itemName: string;
  itemImage: string | null;
  muted: boolean;
  /** Optional text shown before the gift-box unlock (from mode2.yaml). */
  introText?: string | null;
  onDismiss: () => void;
}

export function LevelUnlockOverlay({
  active,
  itemName,
  itemImage,
  muted,
  introText = null,
  onDismiss,
}: LevelUnlockOverlayProps) {
  const [phase, setPhase] = useState<'intro' | 'buildup' | 'reveal'>(() =>
    introText ? 'intro' : 'buildup',
  );
  const [burstActive, setBurstActive] = useState(false);

  useEffect(() => {
    if (active) {
      setPhase(introText ? 'intro' : 'buildup');
      setBurstActive(false);
    }
  }, [active, itemName, introText]);

  const handleTap = useCallback(() => {
    if (phase === 'intro') {
      setPhase('buildup');
      return;
    }
    if (phase === 'buildup') {
      void playUnlockBuildUpSound(muted);
      setBurstActive(true);
      setPhase('reveal');
      return;
    }
    onDismiss();
  }, [phase, muted, onDismiss]);

  if (!active) return null;

  return (
    <div
      className="level-unlock-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleTap}
    >
      {phase === 'intro' && introText && (
        <div className="level-unlock-overlay__card level-unlock-overlay__card--intro">
          <p className="level-unlock-overlay__intro">{introText}</p>
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToContinue}</p>
        </div>
      )}

      {phase === 'buildup' && (
        <div className="level-unlock-overlay__card">
          <p className="level-unlock-overlay__prefix">
            {MODE2_UNLOCK_STRINGS.levelUnlockPrefix}
          </p>
          <div className="mode2-unlock__gift" aria-hidden />
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToOpen}</p>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="level-unlock-overlay__card level-unlock-overlay__card--reveal">
          <StarBurst
            active={burstActive}
            burstId={2}
            originX={window.innerWidth / 2}
            originY={window.innerHeight * 0.4}
            startRadius={16}
            maxRadius={160}
            onComplete={() => setBurstActive(false)}
          />
          <p className="level-unlock-overlay__name">{itemName}</p>
          {itemImage && (
            <img className="level-unlock-overlay__img" src={itemImage} alt="" />
          )}
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToDismiss}</p>
        </div>
      )}
    </div>
  );
}
