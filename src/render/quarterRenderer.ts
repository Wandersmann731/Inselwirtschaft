import { buildingRect } from '../sim/coverage'
import type { IslandState, PlacedBuilding } from '../sim/state'
import { tierIndex } from '../sim/tiers'
import { hash2 } from '../world/noise2d'
import type { TileRange } from './buildingRenderer'
import { HALF_H, HALF_W, tileToWorld } from './iso'
import { sprites } from './sprites'

/** A block of houses built together: they share one yard. */
export interface QuarterBlock {
  id: number
  members: PlacedBuilding[]
  /** Bounding box of the houses in tiles. */
  x: number
  y: number
  w: number
  h: number
}

/** Houses of a tier from this one on stand on a paved yard instead of a village yard. */
const TOWN_FROM = tierIndex('citizens')
const MAX_HOUSES = 3

const cache = new WeakMap<PlacedBuilding[], Map<number, QuarterBlock>>()

/** The blocks with at least two houses still standing, by quarter number. A lone house keeps its own plot. */
export function quarterBlocks(state: Pick<IslandState, 'buildings'>): Map<number, QuarterBlock> {
  const hit = cache.get(state.buildings)
  if (hit) return hit
  const groups = new Map<number, PlacedBuilding[]>()
  for (const building of state.buildings) {
    if (building.quarter === undefined || !building.house) continue
    const list = groups.get(building.quarter)
    if (list) list.push(building)
    else groups.set(building.quarter, [building])
  }
  const blocks = new Map<number, QuarterBlock>()
  for (const [id, members] of groups) {
    if (members.length < 2) continue
    const rects = members.map(buildingRect)
    const x = Math.min(...rects.map((r) => r.x))
    const y = Math.min(...rects.map((r) => r.y))
    const w = Math.max(...rects.map((r) => r.x + r.w)) - x
    const h = Math.max(...rects.map((r) => r.y + r.h)) - y
    blocks.set(id, { id, members, x, y, w, h })
  }
  cache.set(state.buildings, blocks)
  return blocks
}

/** "village" or "town": paved once most houses of the block are citizens or higher. */
function yardStyle(block: QuarterBlock): 'village' | 'town' {
  const town = block.members.filter((b) => b.house && !b.house.ruin && tierIndex(b.house.tier) >= TOWN_FROM).length
  return town * 2 >= block.members.length ? 'town' : 'village'
}

/**
 * Draws the shared yards of the house blocks: after the ground, before roads and buildings. A yard reaches half a
 * tile beyond its houses, into the lanes, so the paths of neighbouring blocks meet there.
 */
export function drawYards(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
  for (const block of quarterBlocks(state).values()) {
    if (block.x > range.maxI + 2 || block.x + block.w < range.minI - 2 || block.y > range.maxJ + 2 || block.y + block.h < range.minJ - 2) continue
    const a = Math.round(block.w / 2)
    const b = Math.round(block.h / 2)
    if (a < 1 || b < 1 || a > MAX_HOUSES || b > MAX_HOUSES) continue
    const list = sprites.variants(`quarters/yard_${yardStyle(block)}_${a}x${b}`)
    if (list.length === 0) continue
    const image = sprites.get(list[Math.floor(hash2(block.id, 3, 991) * list.length)])
    if (!image) continue
    const W = 2 * a + 1
    const H = 2 * b + 1
    const top = tileToWorld(block.x - 0.5, block.y - 0.5)
    ctx.drawImage(image, top.x - H * HALF_W, top.y, (W + H) * HALF_W, (W + H) * HALF_H)
  }
}
