import {
  getPaletteByIndex,
  getPlantedFlowerPetalCount,
  getPlantedFlowerScale,
  getPlantedFlowerStemHeight,
  getGardenGroundY,
} from '../lib/plantedGarden';
import type { PlantedFlowerSpec } from '../lib/plantedGarden';

interface PlantedFlowerProps {
  spec: PlantedFlowerSpec;
  isNew?: boolean;
}

export function PlantedFlower({ spec, isNew = false }: PlantedFlowerProps) {
  const palette = getPaletteByIndex(spec.paletteIndex);
  const scale = getPlantedFlowerScale(spec.growthAge, spec.completionIndex);
  const petalCount = getPlantedFlowerPetalCount(spec.growthAge, spec.completionIndex);
  const stemH = getPlantedFlowerStemHeight(spec.growthAge, spec.completionIndex);
  const groundY = getGardenGroundY();
  const angles = Array.from({ length: petalCount }, (_, i) => (360 / petalCount) * i);

  return (
    <g
      className={`planted-flower${isNew ? ' planted-flower--new' : ''}`}
      transform={`translate(${spec.x} ${groundY})`}
    >
      <g className="planted-flower__growth" transform={`scale(${scale})`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-stemH}
          stroke={palette.stem}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <ellipse cx={-4} cy={-stemH + 4} rx={5} ry={3} fill={palette.leaf} opacity={0.9} />
        <ellipse cx={5} cy={-stemH + 6} rx={4} ry={2.5} fill={palette.leaf} opacity={0.85} />
        <g transform={`translate(0 ${-stemH})`}>
          {angles.map((angle) => (
            <ellipse
              key={angle}
              cx={0}
              cy={-6}
              rx={5}
              ry={7}
              fill={palette.petals}
              stroke="#fff"
              strokeWidth={0.8}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r={4} fill={palette.center} stroke="#fff" strokeWidth={0.8} />
        </g>
      </g>
    </g>
  );
}
