import { climates, config, world } from '../data'
import type { IslandSpec } from '../data'
import { emptyLedger } from '../sim/ledger'
import { createRng, type Rng } from '../sim/rng'
import type { Island, IslandPlacement, WorldChart } from '../sim/state'
import { generateIsland } from './islandGenerator'
import { Terrain, type GameMap } from './terrain'

/** Builds one island of the archipelago from its description in world.json. */
export function createIsland(id: number, spec: IslandSpec, map: GameMap): Island {
  const climate = climates.find((entry) => entry.id === spec.climate)
  if (!climate) throw new Error(`Unknown climate: ${spec.climate}`)
  return {
    id,
    name: spec.name,
    climate: spec.climate,
    fertilities: [...climate.fertilities],
    deposits: [...spec.deposits],
    owned: spec.role === 'home',
    role: spec.role,
    map,
    buildings: [],
    nextBuildingId: 1,
    occupancy: new Array(map.tiles.length).fill(0),
    roads: new Array(map.tiles.length).fill(0),
    stock: spec.role === 'home' ? { ...config.startStock } : {},
    economy: { current: emptyLedger(), last: null },
    trade: {},
  }
}

/** Size of an island on the world map, in cells. */
function cellSize(map: GameMap): { w: number; h: number } {
  const { cellTiles } = world.sea
  return { w: Math.ceil(map.width / cellTiles), h: Math.ceil(map.height / cellTiles) }
}

function overlaps(a: IslandPlacement, b: IslandPlacement, gap: number): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
}

/** Random free spot for an island with sea around it. Falls back to scanning the whole chart. */
function findSpot(rng: Rng, w: number, h: number, placed: IslandPlacement[]): { x: number; y: number } {
  const { width, height, islandGap } = world.sea
  const fits = (x: number, y: number): boolean =>
    placed.every((other) => !overlaps({ id: -1, x, y, w, h }, other, islandGap))
  const maxX = width - w - islandGap
  const maxY = height - h - islandGap
  if (maxX < islandGap || maxY < islandGap) throw new Error('The world map is too small for the islands')
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = islandGap + rng.nextInt(maxX - islandGap + 1)
    const y = islandGap + rng.nextInt(maxY - islandGap + 1)
    if (fits(x, y)) return { x, y }
  }
  for (let y = islandGap; y <= maxY; y++) {
    for (let x = islandGap; x <= maxX; x++) if (fits(x, y)) return { x, y }
  }
  throw new Error('The islands do not fit on the world map')
}

/** Marks every world map cell that holds land of an island (any land tile in its block). */
function paintCells(chart: WorldChart, island: Island, placement: IslandPlacement): void {
  const { cellTiles } = world.sea
  const { map } = island
  for (let cy = 0; cy < placement.h; cy++) {
    for (let cx = 0; cx < placement.w; cx++) {
      let land = false
      for (let ty = cy * cellTiles; ty < Math.min(map.height, (cy + 1) * cellTiles) && !land; ty++) {
        for (let tx = cx * cellTiles; tx < Math.min(map.width, (cx + 1) * cellTiles); tx++) {
          if (map.tiles[ty * map.width + tx] !== Terrain.Water) {
            land = true
            break
          }
        }
      }
      if (land) chart.cells[(placement.y + cy) * chart.width + placement.x + cx] = island.id + 1
    }
  }
}

/** Random numbers for placing the islands of a game with this seed. */
export function layoutRng(seed: number): Rng {
  return createRng((seed ^ 0x51ed270b) >>> 0)
}

/** Generates all islands described in world.json and places them on the world map. */
export function generateWorld(seed: number): { islands: Island[]; world: WorldChart } {
  const rng = layoutRng(seed)
  const islands = world.archipelago.map((spec, id) =>
    createIsland(id, spec, generateIsland((seed + id * 7919) >>> 0, spec.size)),
  )
  return { islands, world: layoutWorld(islands, rng) }
}

/** Places existing islands on a new world map. Big islands first; tries again with other random spots if they do not fit. */
export function layoutWorld(islands: Island[], rng: Rng): WorldChart {
  const { width, height } = world.sea
  const bySize = [...islands].sort((a, b) => b.map.width * b.map.height - a.map.width * a.map.height)
  let lastError: unknown = null
  for (let attempt = 0; attempt < 30; attempt++) {
    const chart: WorldChart = { width, height, cells: new Array(width * height).fill(0), placements: [] }
    try {
      for (const island of bySize) {
        const { w, h } = cellSize(island.map)
        const spot = findSpot(rng, w, h, chart.placements)
        const placement = { id: island.id, x: spot.x, y: spot.y, w, h }
        chart.placements.push(placement)
        paintCells(chart, island, placement)
      }
      chart.placements.sort((a, b) => a.id - b.id)
      return chart
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
