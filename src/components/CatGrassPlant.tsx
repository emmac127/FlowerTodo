import { useEffect, useRef } from 'react';
import { getGardenGroundY } from '../lib/plantedGarden';
import { getSeedGrowthMetrics, type SeedGrowthStage } from '../lib/seedGrowth';
import { playMeowSound } from '../lib/sounds';

const BLADES = [
  { x: -10, lean: -8, h: 0.85 },
  { x: -4, lean: -4, h: 1 },
  { x: 3, lean: 2, h: 1.05 },
  { x: 9, lean: 6, h: 0.9 },
  { x: 0, lean: 0, h: 1.15 },
] as const;

interface CatGrassPlantProps {
  growthStage: SeedGrowthStage;
  x?: number;
  className?: string;
  muted?: boolean;
}

export function CatGrassPlant({
  growthStage,
  x = 200,
  className = '',
  muted = false,
}: CatGrassPlantProps) {
  const metrics = getSeedGrowthMetrics(growthStage);
  const groundY = getGardenGroundY();
  const prevStage = useRef(growthStage);
  const mature = growthStage >= 3;
  const visibleBlades = Math.min(BLADES.length, Math.max(1, growthStage + 1));
  const bladeHeight = 10 + metrics.stemHeight * 0.55;

  useEffect(() => {
    if (growthStage > prevStage.current && growthStage > 0) {
      void playMeowSound(muted);
    }
    prevStage.current = growthStage;
  }, [growthStage, muted]);

  return (
    <g
      className={`growing-seed growing-seed--catgrass${mature ? ' growing-seed--catgrass-mature' : ''}${className ? ` ${className}` : ''}`}
      transform={`translate(${x} ${groundY})`}
      aria-hidden
    >
      <g
        className="growing-seed__plant"
        style={{ transform: `scale(${metrics.scale})`, transformOrigin: '0px 0px' }}
      >
        <g className="growing-seed__plant--catgrass">
        {BLADES.slice(0, visibleBlades).map((blade, i) => {
          const h = bladeHeight * blade.h;
          return (
            <path
              key={i}
              className="growing-seed__grass-blade"
              d={`M ${blade.x} 0 Q ${blade.x + blade.lean} ${-h * 0.5} ${blade.x + blade.lean * 0.6} ${-h}`}
              fill="#8ed98e"
              stroke="#5cb85c"
              strokeWidth={1.1}
              strokeLinecap="round"
            />
          );
        })}
        {mature && (
          <g className="growing-seed__cat-face" transform={`translate(0 ${-bladeHeight - 4})`}>
            <ellipse cx={-3} cy={0} rx={2} ry={2.5} fill="#ffe566" stroke="#e8b830" strokeWidth={0.6} />
            <ellipse cx={3} cy={0} rx={2} ry={2.5} fill="#ffe566" stroke="#e8b830" strokeWidth={0.6} />
            <path
              d="M -4 -5 L -2 -8 L 0 -5"
              fill="#8ed98e"
              stroke="#5cb85c"
              strokeWidth={0.6}
            />
            <path
              d="M 4 -5 L 2 -8 L 0 -5"
              fill="#8ed98e"
              stroke="#5cb85c"
              strokeWidth={0.6}
            />
          </g>
        )}
        </g>
      </g>
    </g>
  );
}
