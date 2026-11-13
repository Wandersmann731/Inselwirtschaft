// Residents on the map: little people who walk from their house to the trading post or market house (where they
// fetch their goods), to the chapel or the tavern, and home again. Purely for the eye: where a walker is follows
// from the time alone, nothing is stored and nothing is simulated.

import { getBuilding } from '../data'
import { getSettings } from '../save/settings'
import { buildingRect } from '../sim/coverage'
import type { IslandState, PlacedBuilding } from '../sim/state'
import { hash2 } from '../world/noise2d'
import { Terrain } from '../world/terrain'
import type { TileRange } from './buildingRenderer'
import type { Mover } from './depth'
import { drawPerson, type PersonLook } from './figures'
import { tileToWorld } from './iso'
import type { TileRect } from './shapes'

/** How far a resident walks at most, in tiles. */
const MAX_WALK = 40
/** Tiles per tick. */
const SPEED = 1.1
/** No more than this many residents are drawn at once. */
const MAX_WALKERS = 90

/** Clothes by tier: plain at first, finer with every tier. */
const CLOTHES: Record<string, PersonLook[]> = {
  pioneers: [{ shirt: '#7d6647', top: '#5a4a36' }, { shirt: '#66704f', top: '#d8cdb0', skirt: true }],
  settlers: [{ shirt: '#5c7287', top: '#4a3a2a' }, { shirt: '#7d5a4a', top: '#e0d8c2', skirt: true }],
  citizens: [{ shirt: '#8f4e44', top: '#3b2c20' }, { shirt: '#48647c', top: '#e6dfcc', skirt: true }],
  merchants: [{ shirt: '#5f4a72', top: '#2e251e' }, { shirt: '#3a6258', top: '#efe8d6', skirt: true }],
  aristocrats: [{ shirt: '#c9bfa4', top: '#6e3a36' }, { shirt: '#9c5a6a', top: '#f2ecdc', skirt: true }],
}

/** True if a resident can walk over the tile: free land, and forest only where a road runs through it. */
function walkable(state: IslandState, index: number): boolean {
  if (state.occupancy[index] !== 0) return false
  const terrain = state.map.tiles[index]
  if (terrain === Terrain.Water || terrain === Terrain.Mountain) return false
  return terrain !== Terrain.Forest || state.roads[index] === 1
}

/** The walkable tiles that share an edge with a building. */
function doorTiles(state: IslandState, rect: TileRect): number[] {
  const { width, height } = state.map
  const found: number[] = []
  const check = (x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < width && y < height && walkable(state, y * width + x)) found.push(y * width + x)
  }
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    check(x, rect.y - 1)
    check(x, rect.y + rect.h)
  }
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    check(rect.x - 1, y)
    check(rect.x + rect.w, y)
  }
  return found
}

/** Steps on foot from the building to every tile around it, up to MAX_WALK. -1 where nobody gets on foot. */
export function walkField(state: IslandState, rect: TileRect): Int16Array {
  const { width, height } = state.map
  const dist = new Int16Array(width * height).fill(-1)
  const queue = doorTiles(state, rect)
  for (const index of queue) dist[index] = 0
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    if (dist[index] >= MAX_WALK) continue
    const x = index % width
    for (const next of [index - 1, index + 1, index - width, index + width]) {
      if (next < 0 || next >= dist.length || Math.abs((next % width) - x) > 1) continue
      if (dist[next] !== -1 || !walkable(state, next)) continue
      dist[next] = dist[index] + 1
      queue.push(next)
    }
  }
  return dist
}

/** The way on foot from a house to the building of a field: tile indices from the door of the house on. Null if there is none. */
export function walkPath(state: IslandState, field: Int16Array, house: TileRect): number[] | null {
  const { width } = state.map
  let index = -1
  for (const door of doorTiles(state, house)) {
    if (field[door] >= 0 && (index === -1 || field[door] < field[index])) index = door
  }
  if (index === -1) return null
  const path = [index]
  for (let d = field[index]; d > 0; d--) {
    const x = index % width
    const next = [index - 1, index + 1, index - width, index + width].find((n) => n >= 0 && n < field.length && Math.abs((n % width) - x) <= 1 && field[n] === d - 1)
    if (next === undefined) return null
    path.push(next)
    index = next
  }
  return path
}

export type WalkerStep = { where: 'out' | 'back'; share: number } | { where: 'inside' }

/**
 * What a walker does at a time within its round: walks out (share 0 to 1 along the way), is inside at the other
 * end, walks back (share 1 to 0), is at home. All times in ticks.
 */
export function walkerStep(time: number, travel: number, away: number): WalkerStep {
  if (time < travel) return { where: 'out', share: time / travel }
  if (time < travel + away) return { where: 'inside' }
  if (time < 2 * travel + away) return { where: 'back', share: 1 - (time - travel - away) / travel }
  return { where: 'inside' }
}

interface Destination {
  field: Int16Array
  /** The trading post or a market house: residents come back from there with a sack. */
  store: boolean
}

interface Routes {
  roads: number[]
  signature: string
  destinations: Destination[]
  /** Ways of a house, found when it is first drawn. */
  ways: Map<number, { path: number[]; store: boolean }[]>
}

const cache = new WeakMap<number[], Routes>()

/** The places residents go to (running stores and public buildings) and the ways found so far. Made again when buildings or roads change. */
function routesOf(state: IslandState): Routes {
  const targets = state.buildings.filter((building) => {
    const def = getBuilding(building.type)
    return building.active && (def.catchment !== undefined || def.category === 'public')
  })
  const signature = targets.map((building) => building.id).join(',')
  const hit = cache.get(state.occupancy)
  if (hit && hit.roads === state.roads && hit.signature === signature) return hit
  const routes: Routes = {
    roads: state.roads,
    signature,
    destinations: targets.map((building) => ({ field: walkField(state, buildingRect(building)), store: getBuilding(building.type).catchment !== undefined })),
    ways: new Map(),
  }
  cache.set(state.occupancy, routes)
  return routes
}

function waysOf(state: IslandState, routes: Routes, house: PlacedBuilding): { path: number[]; store: boolean }[] {
  let ways = routes.ways.get(house.id)
  if (!ways) {
    ways = []
    for (const destination of routes.destinations) {
      const path = walkPath(state, destination.field, buildingRect(house))
      if (path && path.length >= 3) ways.push({ path, store: destination.store })
    }
    routes.ways.set(house.id, ways)
  }
  return ways
}

/** How many residents of a house are out and about at most. */
function walkersOf(residents: number): number {
  return residents <= 0 ? 0 : residents < 8 ? 1 : residents < 15 ? 2 : residents < 28 ? 3 : 4
}

/**
 * The residents that are on their way right now, each with where it stands, so the map can draw it between the
 * buildings (see depth.ts). `ticks` is the game time with its fraction (see TickClock).
 */
export function collectWalkers(state: IslandState, range: TileRange, ticks: number): Mover[] {
  const movers: Mover[] = []
  if (getSettings().reducedMotion) return movers
  const routes = routesOf(state)
  if (routes.destinations.length === 0) return movers
  const { width } = state.map
  for (const building of state.buildings) {
    const house = building.house
    if (!house || house.ruin) continue
    const count = walkersOf(house.residents)
    if (count === 0) continue
    // only houses near the screen: nobody walks farther than MAX_WALK
    if (building.x < range.minI - MAX_WALK || building.x > range.maxI + MAX_WALK || building.y < range.minJ - MAX_WALK || building.y > range.maxJ + MAX_WALK) continue
    const ways = waysOf(state, routes, building)
    if (ways.length === 0) continue
    for (let n = 0; n < count; n++) {
      // every walker has its own way, pace of life and place in time
      const way = ways[Math.floor(hash2(building.id, n, 811) * ways.length)]
      const travel = (way.path.length - 1) / SPEED
      const away = 3 + 4 * hash2(building.id, n, 812)
      // at home for a while, then out again: about half of them are on their way at any time
      const period = 2 * travel + away + 4 + 14 * hash2(building.id, n, 813)
      const step = walkerStep((ticks + hash2(building.id, n, 814) * period) % period, travel, away)
      if (step.where === 'inside') continue
      const along = step.share * (way.path.length - 1)
      const from = way.path[Math.floor(along)]
      const to = way.path[Math.min(way.path.length - 1, Math.floor(along) + 1)]
      const part = along - Math.floor(along)
      const fx = from % width
      const fy = Math.floor(from / width)
      const dx = (to % width) - fx
      const dy = Math.floor(to / width) - fy
      const x = fx + dx * part
      const y = fy + dy * part
      if (x < range.minI - 1 || x > range.maxI + 1 || y < range.minJ - 1 || y > range.maxJ + 1) continue
      const at = tileToWorld(x + 0.5, y + 0.5)
      const heading = (dx - dy) * (step.where === 'out' ? 1 : -1)
      const looks = CLOTHES[house.tier] ?? CLOTHES.pioneers
      // a little to the side of the middle of the tile, so two walkers do not walk through each other
      const sideX = (hash2(building.id, n, 815) - 0.5) * 12
      const sideY = (hash2(building.id, n, 816) - 0.5) * 6
      const look = { ...looks[(building.id + n) % looks.length], sack: step.where === 'back' && way.store }
      movers.push({ x: x + 0.5, y: y + 0.5, draw: (ctx) => drawPerson(ctx, at.x + sideX, at.y + sideY, heading >= 0 ? 1 : -1, ticks * 7 + building.id + n, look) })
      if (movers.length >= MAX_WALKERS) return movers
    }
  }
  return movers
}
