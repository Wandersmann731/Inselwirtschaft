export interface GameConfig {
  startCoins: number
  startSeed: number
  speeds: number[]
  defaultSpeed: number
  tickMillis: number
  loopIntervalMs: number
  maxTicksPerUpdate: number
  economyCycleTicks: number
  autosaveSeconds: number
  startStock: Record<string, number>
  /** Share of the building cost paid back on demolition. */
  refundRate: number
  production: {
    /** Input buffer of a producer, in multiples of what one cycle needs. */
    inputBufferCycles: number
    /** Output buffer of a producer, in goods. */
    outputBufferAmount: number
    /** Delivery time per road tile between producer and market house or Kontor. */
    ticksPerRoadTile: number
    /** Most of one good the island store accepts from producers. */
    stockCapacity: number
  }
}

export interface GoodDef {
  id: string
  name: string
}

export interface BuildingInput {
  good: string
  amount: number
  alternatives?: string[]
}

export type BuildingCategory = 'housing' | 'public' | 'production' | 'infrastructure'

/** Where a building may stand: any buildable land, only on mountain tiles, or at the shore. */
export type PlacementRule = 'land' | 'mountain' | 'coast'

export interface BuildingCost {
  tools: number
  wood: number
  bricks: number
  marble: number
  coins: number
}

export interface BuildingDef {
  id: string
  name: string
  category: BuildingCategory
  size: [number, number]
  cost: BuildingCost
  upkeep: { active: number; idle: number }
  unlockTier: string
  placement: PlacementRule
  /** Placeholder colour until real sprites exist. */
  color: string
  /** Supply radius in tiles, measured from the building edge. */
  radius?: number
  /** Market houses and Kontore: producers within this many tiles of the edge deliver to them. */
  catchment?: number
  /** Roads are stored in the road layer instead of as buildings. */
  kind?: 'road'
  inputs?: BuildingInput[]
  output?: { good: string; amount: number }
  cycleTicks?: number
  needsRoad?: boolean
}

export interface TierDef {
  id: string
  name: string
  residents: number
  size: [number, number]
  needs: string[]
}

export interface ClimateDef {
  id: string
  name: string
  fertilities: string[]
}

export interface WorldConfig {
  tileWidth: number
  tileHeight: number
  chunkSize: number
  maxCachedChunks: number
  minZoom: number
  maxZoom: number
  input: { tapSlopPx: number; tapMaxMs: number; wheelZoomSpeed: number }
  island: {
    minSize: number
    maxSize: number
    noiseCells: number[]
    noiseWeights: number[]
    noiseShare: number
    falloffPower: number
    seaLevel: number
    mountainFraction: number
    forestCell: number
    forestThreshold: number
    beachWidth: number
  }
}
