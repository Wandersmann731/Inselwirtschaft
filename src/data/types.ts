export interface GameConfig {
  startCoins: number
  startSeed: number
  speeds: number[]
  defaultSpeed: number
  tickMillis: number
  loopIntervalMs: number
  maxTicksPerUpdate: number
  economyCycleTicks: number
  /** Land tax: the share of the full tax that houses pay even when none of their needs is met. */
  tax: { base: number }
  /** Start money choices in the new game menu. */
  startCoinOptions: number[]
  /** Extra speeds for testing and balancing, only offered in debug mode. */
  debugSpeeds: number[]
  /** Manual save slots next to the autosave. */
  saveSlots: number
  /** The start view looks for a grass area of size x size tiles, at most this far from the sea. */
  startSite: { size: number; maxCoastDistance: number }
  autosaveSeconds: number
  startStock: Record<string, number>
  /** Share of the building cost paid back on demolition. */
  refundRate: number
  population: {
    /** Residents moving into a house with all needs met, per economy cycle. */
    moveInPerCycle: number
    /** Residents leaving a house in shortage, per economy cycle. */
    moveOutPerCycle: number
    /** Cycles with all needs at 100 % (and full house) before a house rises a tier. */
    upgradeCycles: number
    /** Cycles in shortage before a house falls back one tier. */
    downgradeCycles: number
    /** Cycles in shortage before an aristocrat house turns into a ruin. */
    ruinCycles: number
    /** A need below this percentage counts as shortage. */
    shortageBelow: number
  }
  production: {
    /** Input buffer of a producer, in multiples of what one cycle needs. */
    inputBufferCycles: number
    /** Output buffer of a producer, in goods. */
    outputBufferAmount: number
    /** Delivery time per road tile between producer and market house or Kontor. */
    ticksPerRoadTile: number
    /** Most of one good the island store holds with one Kontor or market house. */
    stockCapacity: number
    /** Room added by each further Kontor or market house: the listed steps, then `then` each, up to `max`. */
    stockGrowth: { steps: number[]; then: number; max: number }
  }
}

export interface GoodDef {
  id: string
  name: string
  /** Base price in trade between islands. The trader buys below and sells above it. */
  tradePrice: number
  /** Coins paid by residents for one unit at a market stand. */
  price?: number
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
  /** Also needs this many residents in houses of `tier` or a higher tier across the realm (original thresholds). */
  unlock?: { tier: string; residents: number }
  placement: PlacementRule
  /** Placeholder colour until real sprites exist. */
  color: string
  /** Supply radius in tiles, measured from the building edge. */
  radius?: number
  /** Market houses and Kontore: producers within this many tiles of the edge deliver to them. */
  catchment?: number
  /** Shows a column of smoke while the building produces. Where the chimney opens, as a share of the picture: [from left, from top]. */
  smoke?: [number, number]
  /** The island must have this fertility (from its climate zone). */
  requiresFertility?: string
  /** The island must have this mineral deposit; the building stands on the mountains. */
  requiresDeposit?: string
  /** Market stand: the goods residents can buy here, within `radius`. */
  sells?: string[]
  /** Housing: the civilisation tier a new house starts in. */
  houseTier?: string
  /** Roads are stored in the road layer instead of as buildings. */
  kind?: 'road'
  /** Not offered in the build menu any more (kept so old saves can be read). */
  hidden?: boolean
  inputs?: BuildingInput[]
  output?: { good: string; amount: number }
  /** Goods that come out in addition to the output each cycle (the butcher also makes hides). */
  byproducts?: { good: string; amount: number }[]
  cycleTicks?: number
  needsRoad?: boolean
}

/** One need of a civilisation tier: either a good bought at stands or a public building nearby. */
export interface TierNeed {
  id: string
  /** Good bought at market stands. */
  good?: string
  /** Units per resident and economy cycle. */
  rate?: number
  /** Goods that count the same as `good`. */
  alternatives?: string[]
  /** Goods that replace `good` if it is missing, e.g. salt. */
  substitutes?: string[]
  /** Public building type that must cover the house instead of a good. */
  building?: string
  /** A bonus: it raises the tax but is not needed to stay or to rise (jewelry and wine for aristocrats). */
  optional?: boolean
  /** Only needed to rise into the next tier: missing it does not make residents move out (chapel for pioneers). */
  forRise?: boolean
}

export interface TierDef {
  id: string
  name: string
  residents: number
  size: [number, number]
  color: string
  /** Needs this tier adds to those of the tiers below. */
  needs: TierNeed[]
  /** Building materials taken from the store when a house rises into this tier. */
  upgradeCost?: BuildingCost
  /** Land tax per resident and economy cycle when all needs are met. */
  tax: number
  /** Houses of this tier can only be built once enough residents of `tier` live in the realm. */
  unlock?: { tier: string; residents: number }
}

/** A production chain as the build menu shows it: its buildings from raw material to the finished good. */
export interface ChainDef {
  id: string
  name: string
  /** What the chain delivers; used to tell who needs it. */
  goods: string[]
  /** Buildings in order, raw material first. */
  buildings: string[]
}

export interface ClimateDef {
  id: string
  name: string
  /** Colour of the island on the world map. */
  color: string
  fertilities: string[]
}

export type IslandRole = 'home' | 'colony' | 'trader'

/** One island of the archipelago as it is generated at the start of a game. */
export interface IslandSpec {
  role: IslandRole
  name: string
  climate: string
  /** Edge length in tiles: min and max. */
  size: [number, number]
  /** Minerals that can be mined on the mountains: stone, ore, salt, gold, gems. */
  deposits: string[]
}

export interface WorldConfig {
  tileWidth: number
  tileHeight: number
  chunkSize: number
  maxCachedChunks: number
  minZoom: number
  maxZoom: number
  input: { tapSlopPx: number; tapMaxMs: number; wheelZoomSpeed: number; longPressMs: number; doubleTapMs: number }
  /** Worn earth around houses, so a group of houses looks like a grown village and not like single plots. */
  settlement: {
    color: [number, number, number]
    /** How strongly the earth colour replaces the ground at its strongest. */
    strength: number
    /** Reach in tiles around a house tile. */
    radius: number
    /** Strength at distance 0, 1, 2 ... tiles from a house tile. */
    falloff: number[]
    /** Tufts and flowers are left out where the yard is stronger than this. */
    decorHideAbove: number
  }
  /** How the area tool lays out houses so they look grown, not set out on a grid. */
  settlementPlanner: {
    /** Most houses side by side in one block (one shared yard), across and down. */
    blockHouses: number
    /** Free tiles between two blocks. */
    laneTiles: number
    /** Most houses one drag may place. */
    maxHouses: number
  }
  roadPlanner: {
    /** Path cost of a free tile that needs a new road. */
    newTileCost: number
    /** Path cost of a tile that already has a road (reusing it is free of charge). */
    roadTileCost: number
    /** Extra cost of clearing a forest tile. */
    forestExtraCost: number
    /** Extra cost per turn, so routes prefer long straight lines. */
    turnPenalty: number
    /** How close (in tiles) a touch has to be to the route or a handle to grab it. */
    grabRadius: number
  }
  sea: {
    /** Island tiles per cell of the world map. */
    cellTiles: number
    width: number
    height: number
    /** Free cells kept between islands. */
    islandGap: number
  }
  archipelago: IslandSpec[]
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

export interface NamedId {
  id: string
  name: string
}

/** Names of the fertilities and mineral deposits an island can have. */
export interface LandNames {
  fertilities: NamedId[]
  deposits: NamedId[]
}

export interface TradeConfig {
  ship: {
    name: string
    /** Tons of cargo. */
    capacity: number
    /** World map cells per tick. */
    speed: number
    cost: BuildingCost
  }
  trader: {
    /** The trader sells at base price times this. */
    sellMultiplier: number
    /** The trader buys at base price times this. */
    buyMultiplier: number
    /** Most of one good the trader moves per Kontor and economy cycle. */
    visitCapacity: number
    /** Goods the trader has to sell. He buys everything. */
    sells: string[]
  }
  /** Amounts offered in the route editor. The last one stands for "all". */
  orderAmounts: number[]
}
