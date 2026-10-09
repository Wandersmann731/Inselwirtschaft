import { config, getBuilding, goods } from '../data'
import type { BuildingCost, BuildingDef } from '../data'
import { Terrain } from '../world/terrain'
import { addTo, cloneLedger } from './ledger'
import { createProduction } from './productionState'
import { createHouse, isTierUnlocked } from './tiers'
import type { IslandState, PlacedBuilding } from './state'

export type PlacementErrorCode =
  | 'outOfMap'
  | 'water'
  | 'mountain'
  | 'notMountain'
  | 'occupied'
  | 'notCoast'
  | 'funds'
  | 'locked'
  | 'debt'
  | 'notOwned'
  | 'noFertility'
  | 'noDeposit'

export interface PlacementError {
  code: PlacementErrorCode
  /** For 'funds': the good (or 'coins') that is missing. For 'noFertility' and 'noDeposit': what the island lacks. */
  missing?: string
}

/** Width and height of a building as placed, taking rotation into account. */
export function footprint(def: BuildingDef, rotated: boolean): { w: number; h: number } {
  const [w, h] = def.size
  return rotated ? { w: h, h: w } : { w, h }
}

/** Returns the first good (or 'coins') the state cannot pay for, or null if everything is covered. */
export function missingResource(state: IslandState, cost: BuildingCost): string | null {
  if (state.coins < cost.coins) return 'coins'
  for (const good of goods) {
    const needed = cost[good.id as keyof BuildingCost] ?? 0
    if (needed > (state.stock[good.id] ?? 0)) return good.id
  }
  return null
}

function terrainAt(state: IslandState, x: number, y: number): number | null {
  const { width, height, tiles } = state.map
  if (x < 0 || y < 0 || x >= width || y >= height) return null
  return tiles[y * width + x]
}

/** Why a single tile cannot hold a building or road of this placement rule, or null if it can. */
function tileError(state: IslandState, def: BuildingDef, x: number, y: number): PlacementError | null {
  const terrain = terrainAt(state, x, y)
  if (terrain === null) return { code: 'outOfMap' }
  if (terrain === Terrain.Water) return { code: 'water' }
  if (def.placement === 'mountain') {
    if (terrain !== Terrain.Mountain) return { code: 'notMountain' }
  } else if (terrain === Terrain.Mountain) {
    return { code: 'mountain' }
  }
  const index = y * state.map.width + x
  if (state.occupancy[index] !== 0 || state.roads[index] !== 0) return { code: 'occupied' }
  return null
}

function touchesWater(state: IslandState, x: number, y: number, w: number, h: number): boolean {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      const inside = dx >= 0 && dy >= 0 && dx < w && dy < h
      const corner = (dx === -1 || dx === w) && (dy === -1 || dy === h)
      if (inside || corner) continue
      if (terrainAt(state, x + dx, y + dy) === Terrain.Water) return true
    }
  }
  return false
}

/**
 * Reasons that have nothing to do with the spot: the island is not yours, you are in debt, the
 * building is not unlocked yet, or the island lacks the fertility or deposit it needs.
 */
export function buildingBlocker(state: IslandState, def: BuildingDef): PlacementError | null {
  if (!state.owned) return { code: 'notOwned' }
  if (state.coins < 0) return { code: 'debt' }
  if (!isTierUnlocked(state, def.unlockTier)) return { code: 'locked' }
  if (def.requiresFertility && !state.fertilities.includes(def.requiresFertility)) {
    return { code: 'noFertility', missing: def.requiresFertility }
  }
  if (def.requiresDeposit && !state.deposits.includes(def.requiresDeposit)) {
    return { code: 'noDeposit', missing: def.requiresDeposit }
  }
  return null
}

/** Checks the terrain, occupancy and cost rules for placing a building. Null means it can be built. */
export function checkPlacement(
  state: IslandState,
  typeId: string,
  x: number,
  y: number,
  rotated: boolean,
): PlacementError | null {
  const def = getBuilding(typeId)
  const blocked = buildingBlocker(state, def)
  if (blocked) return blocked
  const { w, h } = footprint(def, rotated)
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      const error = tileError(state, def, tx, ty)
      if (error) return error
    }
  }
  if (def.placement === 'coast' && !touchesWater(state, x, y, w, h)) return { code: 'notCoast' }
  const missing = missingResource(state, def.cost)
  if (missing) return { code: 'funds', missing }
  return null
}

function pay(state: IslandState, cost: BuildingCost): Pick<IslandState, 'coins' | 'stock' | 'economy'> {
  const stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  for (const good of goods) {
    const needed = cost[good.id as keyof BuildingCost] ?? 0
    if (needed > 0) {
      stock[good.id] = (stock[good.id] ?? 0) - needed
      addTo(ledger.consumed, good.id, needed)
    }
  }
  return { coins: state.coins - cost.coins, stock, economy: { ...state.economy, current: ledger } }
}

/** Builds a non-road building and pays for it. Returns the same state if the placement is invalid. */
export function placeBuilding(
  state: IslandState,
  typeId: string,
  x: number,
  y: number,
  rotated: boolean,
): IslandState {
  const def = getBuilding(typeId)
  if (def.kind === 'road' || checkPlacement(state, typeId, x, y, rotated)) return state
  const { w, h } = footprint(def, rotated)
  const building: PlacedBuilding = { id: state.nextBuildingId, type: typeId, x, y, rotated, active: true }
  if (def.output) building.production = createProduction()
  if (def.houseTier) building.house = createHouse(def.houseTier)
  const occupancy = state.occupancy.slice()
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) occupancy[ty * state.map.width + tx] = building.id
  }
  return {
    ...state,
    ...pay(state, def.cost),
    buildings: [...state.buildings, building],
    nextBuildingId: state.nextBuildingId + 1,
    occupancy,
  }
}

const roadDef = (): BuildingDef => {
  const def = getBuilding('road')
  if (def.kind !== 'road') throw new Error('The road building must have kind "road"')
  return def
}

/** Checks one road tile: terrain, occupancy and cost. Null means a road can be laid there. */
export function checkRoad(state: IslandState, x: number, y: number): PlacementError | null {
  const def = roadDef()
  if (!state.owned) return { code: 'notOwned' }
  if (state.coins < 0) return { code: 'debt' }
  const error = tileError(state, def, x, y)
  if (error) return error
  const missing = missingResource(state, def.cost)
  return missing ? { code: 'funds', missing } : null
}

/** Lays roads on all given tiles that allow it, in order, until the money runs out. */
export function placeRoads(state: IslandState, tiles: { x: number; y: number }[]): IslandState {
  const def = roadDef()
  let next = state
  let roads: number[] | null = null
  for (const { x, y } of tiles) {
    if (checkRoad(next, x, y)) continue
    roads ??= state.roads.slice()
    roads[y * state.map.width + x] = 1
    next = { ...next, ...pay(next, def.cost), roads }
  }
  return next
}

function refund(state: IslandState, cost: BuildingCost): Pick<IslandState, 'coins' | 'stock'> {
  const stock = { ...state.stock }
  for (const good of goods) {
    const paid = cost[good.id as keyof BuildingCost] ?? 0
    if (paid > 0) stock[good.id] = (stock[good.id] ?? 0) + Math.floor(paid * config.refundRate)
  }
  return { coins: state.coins + Math.floor(cost.coins * config.refundRate), stock }
}

/** Removes the building or road on a tile and pays back part of its cost. No-op on empty tiles. */
export function demolishAt(state: IslandState, x: number, y: number): IslandState {
  if (terrainAt(state, x, y) === null) return state
  const index = y * state.map.width + x
  const buildingId = state.occupancy[index]
  if (buildingId !== 0) {
    const building = state.buildings.find((b) => b.id === buildingId)
    if (!building) return state
    return {
      ...state,
      ...refund(state, getBuilding(building.type).cost),
      buildings: state.buildings.filter((b) => b.id !== buildingId),
      occupancy: state.occupancy.map((id) => (id === buildingId ? 0 : id)),
    }
  }
  if (state.roads[index] !== 0) {
    const roads = state.roads.slice()
    roads[index] = 0
    return { ...state, ...refund(state, roadDef().cost), roads }
  }
  return state
}

/** Demolishes everything on the given tiles. */
export function demolishTiles(state: IslandState, tiles: { x: number; y: number }[]): IslandState {
  return tiles.reduce((current, { x, y }) => demolishAt(current, x, y), state)
}
