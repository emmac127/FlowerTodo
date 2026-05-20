import { getGardenPlantRootTransform } from '../lib/plantedGarden';

import {

  getSeedGrowthMetrics,

  SEED_PALETTES,

  type SeedGrowthStage,

} from '../lib/seedGrowth';

import type { GardenSeed } from '../lib/gardenSeed';

import { CatGrassPlant } from './CatGrassPlant';
import { FireFlowerPlant } from './FireFlowerPlant';
import { PinwheelFlowerPlant } from './PinwheelFlowerPlant';
import { PuppyPoppyPlant } from './PuppyPoppyPlant';
import { TulipPlant } from './TulipPlant';
import { WiggleWisteriaPlant } from './WiggleWisteriaPlant';
import { ToastFlowerPlant } from './ToastFlowerPlant';
import { JamFlowerPlant } from './JamFlowerPlant';



const MAX_STEM_HEIGHT = 52;

const MAX_PETALS = 8;



interface GrowingSeedPlantProps {

  seed: GardenSeed;

  growthStage: SeedGrowthStage;

  x?: number;

  className?: string;

  fullPetalBloom?: boolean;

  muted?: boolean;

}



export function GrowingSeedPlant({

  seed,

  growthStage,

  x = 200,

  className = '',

  fullPetalBloom = false,

  muted = false,

}: GrowingSeedPlantProps) {

  if (seed === 'tulip') {
    return <TulipPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'catgrass') {
    return (
      <CatGrassPlant
        growthStage={growthStage}
        x={x}
        className={className}
        muted={muted}
      />
    );
  }

  if (seed === 'puppypoppy') {
    return <PuppyPoppyPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'wigglewisteria') {
    return <WiggleWisteriaPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'pinwheelflower') {
    return <PinwheelFlowerPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'fireflower') {
    return <FireFlowerPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'toastflower') {
    return <ToastFlowerPlant growthStage={growthStage} x={x} className={className} />;
  }

  if (seed === 'jamflower') {
    return <JamFlowerPlant growthStage={growthStage} x={x} className={className} />;
  }

  const palette = SEED_PALETTES[seed];

  const metrics = getSeedGrowthMetrics(growthStage);
  const visiblePetalCount = fullPetalBloom ? MAX_PETALS : metrics.petalCount;

  const stemTop = -metrics.stemHeight;

  const stemScaleY = metrics.stemHeight / MAX_STEM_HEIGHT;



  const leafOffset = 5 * metrics.leafSpread;

  const leafW = 4 * metrics.leafSpread;

  const leafH = 2.5 * metrics.leafSpread;

  const isStar = seed === 'starflower';

  const isSaturn = seed === 'saturnflower';

  const bloomPetalSlots = isStar ? 5 : MAX_PETALS;

  const petalAngles = Array.from(

    { length: bloomPetalSlots },

    (_, i) => (360 / bloomPetalSlots) * i,

  );



  return (

    <g

      className={`growing-seed${className ? ` ${className}` : ''}`}

      transform={getGardenPlantRootTransform(x)}

      aria-hidden

    >

      <g

        className="growing-seed__plant"

        style={{ transform: `scale(${metrics.scale})`, transformOrigin: '0px 0px' }}

      >

        <g

          className="growing-seed__stem"

          style={{

            transform: `scaleY(${stemScaleY})`,

            transformOrigin: '0px 0px',

          }}

        >

          <line

            x1={0}

            y1={0}

            x2={0}

            y2={-MAX_STEM_HEIGHT}

            stroke={palette.stem}

            strokeWidth={metrics.stemWidth}

            strokeLinecap="round"

          />

        </g>



        <g

          className="growing-seed__leaves"

          style={{

            transform: `translateY(${stemTop}px)`,

            transformOrigin: '0px 0px',

          }}

        >

          <ellipse

            className="growing-seed__leaf growing-seed__leaf--left"

            cx={-leafOffset}

            cy={10}

            rx={leafW}

            ry={leafH}

            fill={palette.leaf}

            opacity={0.92}

            transform={`rotate(-28 ${-leafOffset} 10)`}

          />

          <ellipse

            className="growing-seed__leaf growing-seed__leaf--right"

            cx={leafOffset}

            cy={12}

            rx={leafW * 0.9}

            ry={leafH * 0.9}

            fill={palette.leaf}

            opacity={0.88}

            transform={`rotate(24 ${leafOffset} 12)`}

          />

        </g>



        <g

          className="growing-seed__bud"

          style={{ opacity: metrics.showBloom ? 0 : 1 }}

          transform={`translate(0 ${stemTop - 2})`}

        >

          <ellipse

            cx={0}

            cy={0}

            rx={3 + growthStage * 0.4}

            ry={4 + growthStage * 0.5}

            fill={palette.bud}

            stroke={palette.budStroke}

            strokeWidth={0.8}

          />

        </g>



        <g

          className="growing-seed__bloom"

          style={{ opacity: metrics.showBloom ? 1 : 0 }}

          transform={`translate(0 ${stemTop})`}

        >

          {isSaturn && (

            <ellipse

              cx={0}

              cy={1}

              rx={16}

              ry={5}

              fill="none"

              stroke={palette.budStroke}

              strokeWidth={1.3}

              opacity={0.8}

            />

          )}

          {petalAngles.map((angle, i) => (

            <ellipse

              key={angle}

              cx={0}

              cy={-6}

              rx={isStar ? 4 : 5}

              ry={isStar ? 9 : 7}

              fill={palette.petals}

              stroke="#fff"

              strokeWidth={0.8}

              style={{ opacity: i < visiblePetalCount ? 1 : 0 }}

              transform={`rotate(${angle})`}

            />

          ))}

          <circle r={4.5} fill={palette.center} stroke="#fff" strokeWidth={0.8} />

          {seed === 'moonflower' && growthStage >= 5 && (

            <circle cx={1} cy={-1} r={2.2} fill={palette.budStroke} opacity={0.35} />

          )}

          {isStar && growthStage >= 4 && (

            <>

              <circle cx={-8} cy={-10} r={1.2} fill={palette.center} opacity={0.85} />

              <circle cx={9} cy={-8} r={1} fill={palette.center} opacity={0.75} />

            </>

          )}

        </g>

      </g>

    </g>

  );

}


