import { config } from '../data'
import { generateIsland } from '../world/islandGenerator'
import type { GameMap } from '../world/terrain'

export type { GameMap }

/** Bump when the GameState shape changes and add a migration in migrations.ts. */
export const CURRENT_SAVE_VERSION = 5

export type GameSpeed = number

export type ProductionStatusKind = 'producing' | 'waiting' | 'outputFull' | 'noRoad' | 'noHub' | 'inactive'

export interface ProductionStatus {
  kind: ProductionStatusKind
  /** For 'waiting': the good that is missing. */
  good?: string
}

/** Goods on their way between a producer and the island store. */
export interface Shipment {
  /** 'in' goes to the producer's input buffer, 'out' to the island store. */
  kind: 'in' | 'out'
  good: string
  amount: number
  /** Tick at which the shipment arrives. */
  arrive: number
}

export interface ProductionState {
  /** Ticks of the running cycle, 0 when no cycle is running. */
  progress: number
  inputs: Record<string, number>
  output: number
  status: ProductionStatus
  shipments: Shipment[]
}

export interface HouseState {
  tier: string
  residents: number
  /** Fulfilment per need id in percent. */
  needs: Record<string, number>
  /** Economy cycles in a row with a full house and all needs at 100 %. */
  upgradeTimer: number
  /** Economy cycles in a row in shortage. */
  shortageTimer: number
  /** An aristocrat house that collapsed. Only demolition helps. */
  ruin: boolean
  /** All upgrade conditions hold but the building materials are missing. */
  missingMaterials: boolean
}

export interface PlacedBuilding {
  id: number
  type: string
  /** Top-left tile of the footprint. */
  x: number
  y: number
  /** True if width and height of the building definition are swapped. */
  rotated: boolean
  /** Inactive buildings are shut down and cost less upkeep. */
  active: boolean
  /** Only for buildings that produce something. */
  production?: ProductionState
  /** Only for housing. */
  house?: HouseState
}

export interface GameState {
  version: number
  seed: number
  rngState: number
  tick: number
  speed: GameSpeed
  coins: number
  /** Goods in store, by good id. Later this moves to a store per island. */
  stock: Record<string, number>
  map: GameMap
  buildings: PlacedBuilding[]
  nextBuildingId: number
  /** Index in tiers.json of the highest civilisation tier ever reached. Unlocks buildings. */
  highestTier: number
  /** Per tile: id of the building covering it, 0 for none. Same indexing as map.tiles. */
  occupancy: number[]
  /** Per tile: 1 if a road lies there. */
  roads: number[]
}

export function createInitialState(seed: number = config.startSeed): GameState {
  const map = generateIsland(seed)
  return {
    version: CURRENT_SAVE_VERSION,
    seed,
    rngState: seed >>> 0,
    tick: 0,
    speed: config.defaultSpeed,
    coins: config.startCoins,
    stock: { ...config.startStock },
    map,
    buildings: [],
    nextBuildingId: 1,
    highestTier: 0,
    occupancy: new Array(map.tiles.length).fill(0),
    roads: new Array(map.tiles.length).fill(0),
  }
}
