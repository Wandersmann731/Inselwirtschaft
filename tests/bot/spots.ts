import { getBuilding } from '../../src/data'
import { checkPlacement, footprint, placeRoads } from '../../src/sim/build'
import { buildingRect, inRadius, type Rect } from '../../src/sim/coverage'
import type { IslandState, PlacedBuilding } from '../../src/sim/state'
import { adjacentRoadTiles, roadDistances } from '../../src/world/pathfinding'
import { Terrain } from '../../src/world/terrain'

export interface Spot {
  x: number
  y: number
  rotated: boolean
}

const at = (island: IslandState, x: number, y: number): number => y * island.map.width + x
const inside = (island: IslandState, x: number, y: number): boolean => x >= 0 && y >= 0 && x < island.map.width && y < island.map.height

/** True if every tile around the footprint (a ring of `margin` tiles) is free of buildings. */
function ringFree(island: IslandState, x: number, y: number, w: number, h: number, margin: number): boolean {
  for (let ty = y - margin; ty < y + h + margin; ty++) {
    for (let tx = x - margin; tx < x + w + margin; tx++) {
      if (!inside(island, tx, ty)) continue
      if (island.occupancy[at(island, tx, ty)] !== 0) return false
    }
  }
  return true
}

/** The reason a placement fails, ignoring money: null if only the money is missing or everything is fine. */
export function blockedBesidesMoney(island: IslandState, typeId: string, x: number, y: number, rotated: boolean): boolean {
  const error = checkPlacement({ ...island, coins: 1e12, stock: hugeStock(island) }, typeId, x, y, rotated)
  return error !== null
}

function hugeStock(island: IslandState): Record<string, number> {
  return Object.fromEntries(Object.keys({ ...island.stock, tools: 0, wood: 0, bricks: 0, marble: 0 }).map((key) => [key, 1e9]))
}

/**
 * The nearest valid spot to (ax, ay) within `maxRadius`, searching ring by ring. `margin` keeps free tiles around
 * the building (for roads). Returns null if there is none.
 */
export function findSpot(
  island: IslandState,
  typeId: string,
  ax: number,
  ay: number,
  maxRadius: number,
  margin = 1,
  accept: (spot: Spot) => boolean = () => true,
): Spot | null {
  const def = getBuilding(typeId)
  for (let radius = 0; radius <= maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue
        for (const rotated of def.size[0] === def.size[1] ? [false] : [false, true]) {
          const x = ax + dx
          const y = ay + dy
          const { w, h } = footprint(def, rotated)
          if (!inside(island, x, y) || !inside(island, x + w - 1, y + h - 1)) continue
          if (!ringFree(island, x, y, w, h, margin)) continue
          if (blockedBesidesMoney(island, typeId, x, y, rotated)) continue
          if (!accept({ x, y, rotated })) continue
          return { x, y, rotated }
        }
      }
    }
  }
  return null
}

/** The nearest tile of a terrain to a point, or null. */
export function nearestTile(island: IslandState, terrain: number, ax: number, ay: number): { x: number; y: number } | null {
  let best: { x: number; y: number; d: number } | null = null
  const { width, height, tiles } = island.map
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y * width + x] !== terrain) continue
      const d = Math.hypot(x - ax, y - ay)
      if (!best || d < best.d) best = { x, y, d }
    }
  }
  return best
}

/** A land tile next to water, nearest to a point. */
export function nearestCoast(island: IslandState, ax: number, ay: number): { x: number; y: number } | null {
  let best: { x: number; y: number; d: number } | null = null
  const { width, height, tiles } = island.map
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const t = tiles[y * width + x]
      if (t === Terrain.Water || t === Terrain.Mountain) continue
      if (tiles[y * width + x - 1] !== Terrain.Water && tiles[y * width + x + 1] !== Terrain.Water && tiles[(y - 1) * width + x] !== Terrain.Water && tiles[(y + 1) * width + x] !== Terrain.Water) continue
      const d = Math.hypot(x - ax, y - ay)
      if (!best || d < best.d) best = { x, y, d }
    }
  }
  return best
}

/** Is the building within the catchment area of one of the hubs (market houses or Kontore)? */
export function hubOf(island: IslandState, rect: Rect): PlacedBuilding | null {
  for (const hub of island.buildings) {
    const def = getBuilding(hub.type)
    if (def.catchment === undefined || !hub.active) continue
    const hubRect = buildingRect(hub)
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (inRadius(x, y, hubRect, def.catchment)) return hub
      }
    }
  }
  return null
}

/**
 * Lays roads from a building to a hub: the shortest way over free land tiles to the hub's edge or to a road that
 * already leads to the hub. Returns the island with the roads, or null if no way exists.
 */
export function connectRoad(island: IslandState, from: Rect, hub: PlacedBuilding, place: (tiles: { x: number; y: number }[]) => IslandState): IslandState | null {
  const { width, height } = island.map
  const hubRect = buildingRect(hub)
  const hubSources = adjacentRoadTiles(island.roads, width, height, hubRect)
  const connected = roadDistances(island.roads, width, height, hubSources)
  const passable = (x: number, y: number): boolean => {
    if (!inside(island, x, y)) return false
    const i = at(island, x, y)
    if (island.occupancy[i] !== 0) return false
    const t = island.map.tiles[i]
    return t !== Terrain.Water && t !== Terrain.Mountain
  }
  const isGoal = (x: number, y: number): boolean => {
    const i = at(island, x, y)
    if (connected[i] >= 0) return true
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= hubRect.x && nx < hubRect.x + hubRect.w && ny >= hubRect.y && ny < hubRect.y + hubRect.h) return true
    }
    return false
  }
  const start: [number, number][] = []
  for (let x = from.x; x < from.x + from.w; x++) for (const y of [from.y - 1, from.y + from.h]) if (passable(x, y)) start.push([x, y])
  for (let y = from.y; y < from.y + from.h; y++) for (const x of [from.x - 1, from.x + from.w]) if (passable(x, y)) start.push([x, y])

  const parent = new Int32Array(width * height).fill(-2)
  const queue: number[] = []
  for (const [x, y] of start) {
    parent[at(island, x, y)] = -1
    queue.push(at(island, x, y))
  }
  let goal = -1
  for (let head = 0; head < queue.length && goal < 0; head++) {
    const index = queue[head]
    const x = index % width
    const y = (index - x) / width
    if (isGoal(x, y)) {
      goal = index
      break
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (!passable(nx, ny)) continue
      const next = at(island, nx, ny)
      if (parent[next] !== -2) continue
      parent[next] = index
      queue.push(next)
    }
  }
  if (goal < 0) return null
  const tiles: { x: number; y: number }[] = []
  for (let index = goal; index >= 0; index = parent[index]) tiles.push({ x: index % width, y: Math.floor(index / width) })
  void placeRoads
  return place(tiles)
}

/** True if at least one free land tile (not mountain, not water, not built on) touches the footprint, so a road can start there. */
export function hasRoadAccess(island: IslandState, typeId: string, spot: Spot): boolean {
  const def = getBuilding(typeId)
  const { w, h } = footprint(def, spot.rotated)
  const ok = (x: number, y: number): boolean => {
    if (!inside(island, x, y)) return false
    const i = at(island, x, y)
    const t = island.map.tiles[i]
    return island.occupancy[i] === 0 && t !== Terrain.Water && t !== Terrain.Mountain
  }
  for (let x = spot.x; x < spot.x + w; x++) if (ok(x, spot.y - 1) || ok(x, spot.y + h)) return true
  for (let y = spot.y; y < spot.y + h; y++) if (ok(spot.x - 1, y) || ok(spot.x + w, y)) return true
  return false
}
