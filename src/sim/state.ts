import { config } from '../data'
import { generateWorld } from '../world/worldGenerator'
import type { IslandRole } from '../data'
import type { GameMap } from '../world/terrain'

export type { GameMap }

/** Bump when the GameState shape changes and add a migration in migrations.ts. */
export const CURRENT_SAVE_VERSION = 9

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
  /** Ticks spent producing in the current economy cycle. */
  busyTicks: number
  /** Share of the last economy cycle spent producing, in percent. */
  utilization: number
  inputs: Record<string, number>
  output: number
  status: ProductionStatus
  shipments: Shipment[]
}

/** What happened in one economy cycle: money earned and spent, goods made and used. */
export interface CycleLedger {
  /** Coins paid by residents at market stands. */
  income: number
  /** Upkeep of all buildings. Set when the cycle is settled. */
  upkeep: number
  produced: Record<string, number>
  consumed: Record<string, number>
}

export interface Economy {
  /** The running cycle. */
  current: CycleLedger
  /** The last settled cycle, null before the first one ends. */
  last: CycleLedger | null
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

/** What the Kontor of an island does with a good when the trader visits. Missing or 0 means off. */
export interface TradeLimit {
  /** Buy up to this amount when the store holds less. */
  buyBelow?: number
  /** Sell everything above this amount. */
  sellAbove?: number
}

/** Everything that belongs to one island. Each island has its own store (its Kontor) and its own books. */
export interface Island {
  id: number
  name: string
  climate: string
  /** What can be grown here, from the climate zone. */
  fertilities: string[]
  /** Minerals in the mountains. */
  deposits: string[]
  /** The home island and colonies founded by the player. */
  owned: boolean
  role: IslandRole
  map: GameMap
  buildings: PlacedBuilding[]
  nextBuildingId: number
  /** Per tile: id of the building covering it, 0 for none. Same indexing as map.tiles. */
  occupancy: number[]
  /** Per tile: 1 if a road lies there. */
  roads: number[]
  /** Goods in the island store, by good id. */
  stock: Record<string, number>
  economy: Economy
  /** Kontor trade settings by good id. */
  trade: Record<string, TradeLimit>
}

/** Where an island lies on the world map. Sizes are in world map cells. */
export interface IslandPlacement {
  id: number
  x: number
  y: number
  w: number
  h: number
}

export interface WorldChart {
  width: number
  height: number
  /** Per cell: 0 for sea, otherwise island id + 1. Ships can only sail on sea cells. */
  cells: number[]
  placements: IslandPlacement[]
}

/** A position on the world map in cells, with decimals while a ship is between two cells. */
export interface SeaPoint {
  x: number
  y: number
}

export interface Ship {
  id: number
  name: string
  /** Tons of cargo. */
  capacity: number
  cargo: Record<string, number>
  /** The island the ship lies at, null while it sails. */
  island: number | null
  x: number
  y: number
  /** Waypoints still to sail, in order. */
  path: SeaPoint[]
  /** The island the ship sails to, null while docked. */
  destination: number | null
  /** The trade route the ship follows, null if it takes orders one by one. */
  routeId: number | null
  /** Index of the stop of the route the ship is at or on its way to. */
  stopIndex: number
}

/** Load goods from the island store onto the ship or unload them from the ship into the store. */
export interface RouteOrder {
  good: string
  amount: number
  mode: 'load' | 'unload'
}

export interface RouteStop {
  island: number
  orders: RouteOrder[]
}

export interface Route {
  id: number
  name: string
  stops: RouteStop[]
}

export interface GameState {
  version: number
  seed: number
  rngState: number
  tick: number
  speed: GameSpeed
  coins: number
  /** Index in tiers.json of the highest civilisation tier ever reached. Unlocks buildings. */
  highestTier: number
  islands: Island[]
  world: WorldChart
  ships: Ship[]
  routes: Route[]
  nextShipId: number
  nextRouteId: number
}

/**
 * The game as seen from one island: the global state with the fields of that island on top.
 * All rules that work on a single island (build, produce, trade with residents) take this.
 */
export type IslandState = GameState & Island

/** Game with the given islands. The first island is the home island. */
export function createStateWith(seed: number, islands: Island[], world: WorldChart): GameState {
  return {
    version: CURRENT_SAVE_VERSION,
    seed,
    rngState: seed >>> 0,
    tick: 0,
    speed: config.defaultSpeed,
    coins: config.startCoins,
    highestTier: 0,
    islands,
    world,
    ships: [],
    routes: [],
    nextShipId: 1,
    nextRouteId: 1,
  }
}

export function createInitialState(seed: number = config.startSeed): GameState {
  const { islands, world } = generateWorld(seed)
  return createStateWith(seed, islands, world)
}
