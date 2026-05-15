/** Core scene (grass, pond, tree, bridge) finishes by this many completed tasks. */
export const GARDEN_CORE_COMPLETE_AT = 6;

export interface GardenLayers {
  grass: boolean;
  grassDetail: boolean;
  pond: boolean;
  treeTrunk: boolean;
  treeBlossoms: boolean;
  treeBlossomsFull: boolean;
  bridgePiers: boolean;
  bridgeDeck: boolean;
  lanterns: boolean;
  /** Embellishments (after core is complete) */
  petals: boolean;
  groundFlowers: number;
  bushLeft: boolean;
  bushRight: boolean;
  extraLanterns: boolean;
  sceneComplete: boolean;
}

export function getGardenLayers(completedCount: number): GardenLayers {
  const n = Math.max(0, completedCount);

  return {
    grass: n >= 1,
    grassDetail: n >= 2,
    pond: n >= 3,
    treeTrunk: n >= 4,
    treeBlossoms: n >= 4,
    treeBlossomsFull: n >= 5,
    bridgePiers: n >= 5,
    bridgeDeck: n >= 6,
    lanterns: n >= 6,
    sceneComplete: n >= GARDEN_CORE_COMPLETE_AT,
    petals: n >= 7,
    groundFlowers: n >= 7 ? Math.min(n - 6, 6) : 0,
    bushLeft: n >= 9,
    bushRight: n >= 10,
    extraLanterns: n >= 11,
  };
}
