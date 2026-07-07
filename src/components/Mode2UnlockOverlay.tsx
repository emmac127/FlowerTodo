import { useCallback, useEffect, useState } from 'react';
import { StarBurst } from './StarBurst';
import {
  MODE2_UNLOCK_BIRD_IMAGE,
  MODE2_UNLOCK_STRINGS,
} from '../lib/gardenUnlockStrings';
import { playUnlockBuildUpSound } from '../lib/sounds';

export type Mode2UnlockStep =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

interface Mode2UnlockOverlayProps {
  active: boolean;
  muted: boolean;
  showFlowerButton: boolean;
  onShowFlowerButton: () => void;
  onTransitionToMode2: () => void;
  onComplete: () => void;
}

export function Mode2UnlockOverlay({
  active,
  muted,
  showFlowerButton,
  onShowFlowerButton,
  onTransitionToMode2,
  onComplete,
}: Mode2UnlockOverlayProps) {
  const [step, setStep] = useState<Mode2UnlockStep>(1);
  const [giftOpen, setGiftOpen] = useState(false);
  const [burstActive, setBurstActive] = useState(false);
  const [textAtBottom, setTextAtBottom] = useState(false);
  const [arrowVisible, setArrowVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setStep(1);
      setGiftOpen(false);
      setBurstActive(false);
      setTextAtBottom(false);
      setArrowVisible(false);
    }
  }, [active]);

  const advance = useCallback(() => {
    setStep((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) {
        void playUnlockBuildUpSound(muted);
        return 3;
      }
      if (prev === 3) {
        setGiftOpen(true);
        setBurstActive(true);
        return 4;
      }
      if (prev === 4) {
        setTextAtBottom(true);
        onTransitionToMode2();
        return 5;
      }
      if (prev === 5) return 6;
      if (prev === 6) {
        onShowFlowerButton();
        setArrowVisible(true);
        return 7;
      }
      if (prev === 7) {
        setArrowVisible(false);
        setTextAtBottom(false);
        return 8;
      }
      if (prev === 8) return 9;
      if (prev === 9) {
        onComplete();
        return 10;
      }
      return prev;
    });
  }, [muted, onComplete, onShowFlowerButton, onTransitionToMode2]);

  if (!active || step >= 10) return null;

  const showGift = step === 3;
  const showGardenFade = step >= 5;
  const bottomClass = textAtBottom ? ' mode2-unlock--text-bottom' : '';
  const gardenClass = showGardenFade ? ' mode2-unlock--garden-visible' : '';

  return (
    <div
      className={`mode2-unlock${bottomClass}${gardenClass}`}
      role="dialog"
      aria-modal="true"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') advance();
      }}
    >
      {step === 1 && (
        <div className="mode2-unlock__card">
          <p className="mode2-unlock__headline">
            {MODE2_UNLOCK_STRINGS.congratsFirstGarden}
          </p>
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToContinue}</p>
        </div>
      )}

      {step === 2 && (
        <div className="mode2-unlock__card">
          <p className="mode2-unlock__headline">
            {MODE2_UNLOCK_STRINGS.unlockedPrefix}
          </p>
        </div>
      )}

      {showGift && (
        <div className="mode2-unlock__gift-wrap">
          <div
            className={`mode2-unlock__gift${giftOpen ? ' mode2-unlock__gift--open' : ''}`}
            aria-hidden
          />
          {!giftOpen && (
            <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToOpen}</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="mode2-unlock__card mode2-unlock__card--reveal">
          <StarBurst
            active={burstActive}
            burstId={1}
            originX={window.innerWidth / 2}
            originY={window.innerHeight * 0.42}
            startRadius={20}
            maxRadius={180}
            onComplete={() => setBurstActive(false)}
          />
          <p className="mode2-unlock__headline mode2-unlock__headline--big">
            {MODE2_UNLOCK_STRINGS.birdGardenName}
          </p>
          <img
            className="mode2-unlock__bird-img"
            src={MODE2_UNLOCK_BIRD_IMAGE}
            alt=""
          />
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToDismiss}</p>
        </div>
      )}

      {step === 5 && (
        <div className="mode2-unlock__card mode2-unlock__card--peek">
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToContinue}</p>
        </div>
      )}

      {(step === 6 || step === 7) && (
        <div className="mode2-unlock__card mode2-unlock__card--with-arrow">
          <p className="mode2-unlock__body">{MODE2_UNLOCK_STRINGS.nostalgicHint}</p>
          {arrowVisible && showFlowerButton && (
            <div className="mode2-unlock__arrow" aria-hidden>
              →
            </div>
          )}
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToContinue}</p>
        </div>
      )}

      {step === 8 && (
        <div className="mode2-unlock__card">
          <p className="mode2-unlock__headline">{MODE2_UNLOCK_STRINGS.enjoyGarden}</p>
          <p className="mode2-unlock__hint">{MODE2_UNLOCK_STRINGS.tapToDismiss}</p>
        </div>
      )}
    </div>
  );
}
