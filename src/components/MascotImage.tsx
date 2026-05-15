import { useEffect, useId, useState } from 'react';
import mascotSrc from '../assets/kawaii-mascot.png';

interface MascotImageProps {
  className?: string;
}

/**
 * Renders the mascot PNG inside SVG so alpha/transparency is composited correctly.
 * (Plain <img> + CSS filters can mishandle PNG alpha in some cases.)
 */
export function MascotImage({ className }: MascotImageProps) {
  const shadowId = useId().replace(/:/g, '');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = mascotSrc;
    img.onload = () => {
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, []);

  if (!size) {
    return (
      <svg
        className={className}
        viewBox="0 0 100 160"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Kawaii helper character"
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
      aria-label="Kawaii helper character"
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
            floodColor="#ff8fab"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <image
        href={mascotSrc}
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
