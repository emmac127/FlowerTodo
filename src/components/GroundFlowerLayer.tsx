import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildGroundFlowerPlacements, type GroundFlowerPlacement } from '../lib/groundFlowers';
import { GroundFlower } from './GroundFlower';

interface GroundFlowerLayerProps {
  completedCount: number;
  innerRef: React.RefObject<HTMLDivElement | null>;
  mainFlowerCount: number;
}

export function GroundFlowerLayer({
  completedCount,
  innerRef,
  mainFlowerCount,
}: GroundFlowerLayerProps) {
  const [placements, setPlacements] = useState<GroundFlowerPlacement[]>([]);
  const prevCountRef = useRef(completedCount);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || completedCount <= 0) {
      setPlacements([]);
      return;
    }

    const update = () => {
      setPlacements(buildGroundFlowerPlacements(inner, completedCount));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(inner);
    for (const cell of inner.querySelectorAll('.garden-flower-cell')) {
      ro.observe(cell);
    }

    return () => ro.disconnect();
  }, [completedCount, innerRef, mainFlowerCount]);

  const newestIndex =
    completedCount > prevCountRef.current ? completedCount : null;

  useEffect(() => {
    prevCountRef.current = completedCount;
  }, [completedCount]);

  if (placements.length === 0) return null;

  return (
    <div className="garden-ground-flower-layer" aria-hidden>
      {placements.map((p) => (
        <div
          key={p.completionIndex}
          className="garden-ground-flower-slot"
          style={{ left: p.left, bottom: p.bottom }}
        >
          <GroundFlower
            appearance={p.appearance}
            isNew={p.completionIndex === newestIndex}
          />
        </div>
      ))}
    </div>
  );
}
