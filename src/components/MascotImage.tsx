import { useEffect, useId, useState } from 'react';
import type { AppVariant } from '../lib/appVariant';
import mascotSrc from '../assets/kawaii-mascot.png';

const DAD_MASCOT_SRC = '/garden/clipboardalien.png';

interface MascotImageProps {
  className?: string;
  variant?: AppVariant;
}

/**
 * Renders the mascot PNG inside SVG so alpha/transparency is composited correctly.
 */
export function MascotImage({
  className,
  variant = 'default',
}: MascotImageProps) {
  const shadowId = useId().replace(/:/g, '');
  const isDad = variant === 'dad';
  const imageSrc = isDad ? DAD_MASCOT_SRC : mascotSrc;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [imageSrc]);

  const ariaLabel = isDad ? 'Space helper character' : 'Kawaii helper character';

  if (!size) {
    return (
      <svg
        className={className}
        viewBox="0 0 100 160"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
        aria-busy="true"
      />
    );
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <filter
          id={`mascot-shadow-${shadowId}`}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            floodColor={isDad ? '#7a9fd4' : '#ff8fab'}
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <image
        href={imageSrc}
        x="0"
        y="0"
        width={size.w}
        height={size.h}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#mascot-shadow-${shadowId})`}
      />
    </svg>
  );
}
