import { forwardRef } from 'react';
import { MascotImage } from './MascotImage';

interface KawaiiMascotProps {
  message: string | null;
  visible: boolean;
  dancing?: boolean;
}

export const KawaiiMascot = forwardRef<HTMLDivElement, KawaiiMascotProps>(
  function KawaiiMascot({ message, visible, dancing = false }, ref) {
    const mascotClass = [
      'mascot',
      visible ? 'mascot--cheering' : '',
      dancing ? 'mascot--dancing' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <header className="kawaii-header">
        <div className="kawaii-header__inner">
          <div ref={ref} className={mascotClass}>
            <MascotImage className="mascot__render" />
          </div>

          <div className="kawaii-header__text">
            <div
              className={`mascot-speech ${visible && message ? 'mascot-speech--visible' : ''}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {message && <p className="mascot-speech__text">{message}</p>}
            </div>
            <h1 className="app-title">Kawaii To-Do</h1>
            <p className="app-subtitle">Complete tasks — grow your garden ✿</p>
          </div>
        </div>
      </header>
    );
  },
);
