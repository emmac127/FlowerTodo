export interface FlowerPalette {
  petals: string;
  center: string;
  stem: string;
  leaf: string;
  name: string;
}

export const FLOWER_PALETTES: FlowerPalette[] = [
  { name: 'sakura', petals: '#ffb7d5', center: '#ffe566', stem: '#6bc96b', leaf: '#8ed98e' },
  { name: 'daisy', petals: '#fff4a3', center: '#ff9f43', stem: '#5cb85c', leaf: '#7dd87d' },
  { name: 'lavender', petals: '#d4b5ff', center: '#ffe566', stem: '#6bc96b', leaf: '#8ed98e' },
  { name: 'mint', petals: '#a8f0d4', center: '#ffb7d5', stem: '#5cb85c', leaf: '#7dd87d' },
  { name: 'peach', petals: '#ffc9a8', center: '#ff8fab', stem: '#6bc96b', leaf: '#8ed98e' },
];

export interface GrowthTier {
  stemWidth: number;
  flowerScale: number;
  petalCount: number;
  paletteIndex: number;
  growDurationMs: number;
}

export function getGrowthTier(completedCount: number): GrowthTier {
  return {
    stemWidth: 2 + Math.min(completedCount * 0.4, 4),
    flowerScale: 0.6 + Math.min(completedCount * 0.08, 1.2),
    petalCount: completedCount < 3 ? 5 : completedCount < 8 ? 6 : 8,
    paletteIndex: completedCount % FLOWER_PALETTES.length,
    growDurationMs: 400 + Math.min(completedCount * 20, 200),
  };
}
