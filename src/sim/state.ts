import { config } from '../data'
import { generateIsland } from '../world/islandGenerator'
import type { GameMap } from '../world/terrain'

export type { GameMap }

/** Bump when the GameState shape changes and add a migration in migrations.ts. */
export const CURRENT_SAVE_VERSION = 3

export type GameSpeed = number

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
    occupancy: new Array(map.tiles.length).fill(0),
    roads: new Array(map.tiles.length).fill(0),
  }
}
