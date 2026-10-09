import { world } from '../data'
import { Terrain } from '../world/terrain'
import type { IslandState } from './state'

export interface Tile {
  x: number
  y: number
}

/** A planned road: the tiles in walking order, split at the waypoints. */
export interface RoutePlan {
  segments: Tile[][]
  /** All tiles in order, each once. */
  tiles: Tile[]
  /** Tiles that still need a road (the rest is already there). */
  newTiles: Tile[]
  /** False if some part of the route has no way through. */
  reachable: boolean
}

const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
]

const key = (x: number, y: number): string => `${x},${y}`

/** True if a road can run over the tile: land, no mountain, no building. Existing roads count as passable. */
export function passable(state: IslandState, x: number, y: number): boolean {
  const { width, height, tiles } = state.map
  if (x < 0 || y < 0 || x >= width || y >= height) return false
  const terrain = tiles[y * width + x]
  if (terrain === Terrain.Water || terrain === Terrain.Mountain) return false
  return state.occupancy[y * width + x] === 0
}

/**
 * The tiles a route may start or end on for a tapped tile: the tile itself, or for a building the free
 * tiles around it (so a route can be planned "to the market house"). Empty if nothing fits.
 */
export function anchorTiles(state: IslandState, tile: Tile): Tile[] {
  const { width, height } = state.map
  if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) return []
  if (passable(state, tile.x, tile.y)) return [tile]
  const id = state.occupancy[tile.y * width + tile.x]
  if (id === 0) return []
  const found = new Map<string, Tile>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (state.occupancy[y * width + x] !== id) continue
      for (const d of DIRS) {
        if (passable(state, x + d.x, y + d.y)) found.set(key(x + d.x, y + d.y), { x: x + d.x, y: y + d.y })
      }
    }
  }
  return [...found.values()]
}

/** Smallest-first queue for the path search. */
class Heap {
  private items: { cost: number; id: number }[] = []
  get size(): number {
    return this.items.length
  }
  push(cost: number, id: number): void {
    const items = this.items
    items.push({ cost, id })
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (items[parent].cost <= items[i].cost) break
      ;[items[parent], items[i]] = [items[i], items[parent]]
      i = parent
    }
  }
  pop(): { cost: number; id: number } {
    const items = this.items
    const top = items[0]
    const last = items.pop()!
    if (items.length > 0) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < items.length && items[l].cost < items[m].cost) m = l
        if (r < items.length && items[r].cost < items[m].cost) m = r
        if (m === i) break
        ;[items[m], items[i]] = [items[i], items[m]]
        i = m
      }
    }
    return top
  }
}

function stepCost(state: IslandState, x: number, y: number): number {
  const cfg = world.roadPlanner
  const index = y * state.map.width + x
  if (state.roads[index] !== 0) return cfg.roadTileCost
  return cfg.newTileCost + (state.map.tiles[index] === Terrain.Forest ? cfg.forestExtraCost : 0)
}

/**
 * Cheapest way between two sets of tiles. Existing roads are cheap, turns cost a little, forest costs a little
 * more, so the result is a straight, sensible road. Returns null if the sets are not connected.
 */
export function findPath(state: IslandState, from: Tile[], to: Tile[]): Tile[] | null {
  const { width, height } = state.map
  const goals = new Set(to.map((t) => key(t.x, t.y)))
  if (from.length === 0 || goals.size === 0) return null
  const turn = world.roadPlanner.turnPenalty
  // State = tile and direction of arrival (4 directions, plus 4 = "just started").
  const stateId = (x: number, y: number, d: number): number => (y * width + x) * 5 + d
  const best = new Float64Array(width * height * 5).fill(Infinity)
  const previous = new Int32Array(width * height * 5).fill(-1)
  const heap = new Heap()
  for (const t of from) {
    const id = stateId(t.x, t.y, 4)
    best[id] = stepCost(state, t.x, t.y)
    heap.push(best[id], id)
  }
  while (heap.size > 0) {
    const { cost, id } = heap.pop()
    if (cost > best[id]) continue
    const d = id % 5
    const cell = (id - d) / 5
    const x = cell % width
    const y = (cell - x) / width
    if (goals.has(key(x, y))) {
      const path: Tile[] = []
      for (let at = id; at !== -1; at = previous[at]) {
        const c = (at - (at % 5)) / 5
        path.push({ x: c % width, y: Math.floor(c / width) })
      }
      return path.reverse()
    }
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DIRS[nd].x
      const ny = y + DIRS[nd].y
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || !passable(state, nx, ny)) continue
      const next = cost + stepCost(state, nx, ny) + (d !== 4 && d !== nd ? turn : 0)
      const nid = stateId(nx, ny, nd)
      if (next < best[nid]) {
        best[nid] = next
        previous[nid] = id
        heap.push(next, nid)
      }
    }
  }
  return null
}

/** Plans start → waypoints → end. A waypoint or end on a building ends next to it. */
export function planRoute(state: IslandState, start: Tile, end: Tile, via: Tile[] = []): RoutePlan {
  const stops = [start, ...via, end]
  const anchors = stops.map((stop) => anchorTiles(state, stop))
  const segments: Tile[][] = []
  let reachable = anchors.every((a) => a.length > 0)
  for (let i = 0; reachable && i < stops.length - 1; i++) {
    // Continue where the last segment ended, so the pieces join up.
    const from = i === 0 ? anchors[0] : [segments[i - 1][segments[i - 1].length - 1]]
    const path = findPath(state, from, anchors[i + 1])
    if (!path) reachable = false
    else segments.push(path)
  }
  if (!reachable) return { segments: [], tiles: [], newTiles: [], reachable: false }
  const seen = new Set<string>()
  const tiles: Tile[] = []
  for (const segment of segments) {
    for (const tile of segment) {
      if (seen.has(key(tile.x, tile.y))) continue
      seen.add(key(tile.x, tile.y))
      tiles.push(tile)
    }
  }
  const newTiles = tiles.filter((t) => state.roads[t.y * state.map.width + t.x] === 0)
  return { segments, tiles, newTiles, reachable }
}

/** Which waypoint slot a grabbed tile belongs to: the number of segments that end before it. */
export function segmentOf(plan: RoutePlan, tile: Tile): number {
  const index = plan.segments.findIndex((segment) => segment.some((t) => t.x === tile.x && t.y === tile.y))
  return Math.max(0, index)
}

/** The route tile closest to a touched tile, if it lies within the grab radius. */
export function nearestRouteTile(plan: RoutePlan, tile: Tile, radius: number): Tile | null {
  let best: Tile | null = null
  let bestDistance = Infinity
  for (const t of plan.tiles) {
    const distance = Math.hypot(t.x - tile.x, t.y - tile.y)
    if (distance <= radius && distance < bestDistance) {
      best = t
      bestDistance = distance
    }
  }
  return best
}
