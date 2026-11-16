import { decorForTile, isTall, type DecorItem } from '../world/decor'
import { hash2 } from '../world/noise2d'
import { surroundRing } from '../world/surroundings'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { tierIndex } from '../sim/tiers'
import { Terrain } from '../world/terrain'
import { GARDEN_DROP } from './gardenSprites'

/** Share of the trees, bushes and rocks next to a building that are kept, and how much smaller they are drawn. */
const FRONT_KEEP = 0.45
const FRONT_SCALE = 0.8

const HALF_W = 32
const HALF_H = 16

export interface FrontItem {
  item: DecorItem
  /** Tile the object stands on. */
  tx: number
  ty: number
  /** Where its base is, in world pixels. */
  wx: number
  wy: number
  /** Sort key: larger is nearer to the viewer. */
  depth: number
}

/** Houses from this tier on keep clipped hedges, and from the next one on gardens inside a hedge instead of a fence. */
const HEDGE_FROM = tierIndex('settlers')
const LAWN_FROM = tierIndex('citizens')
/** From this tier on a lawn lies inside a low wall of stone as often as inside a hedge. */
const WALL_FROM = tierIndex('merchants')
/**
 * On a free tile beside a house: the chance that the whole tile is a fenced garden; if not, the chance of a hedge
 * along the house (where hedges are kept), of a bed, of a bush.
 */
const GARDEN = { plot: 0.62, lawn: 0.45, hedge: 0.6, bed: 0.42, bush: 0.3 }

/**
 * What people plant around their houses: a free tile beside a house becomes a fenced garden of vegetables or
 * flowers (a lawn inside a hedge at richer houses), or gets a hedge along the plot, a bed, a bush. Always the same
 * for the same house in the same place. Nothing is planted on roads, other plots, rock or water, nor on sand right
 * at the water, so houses that stand wall to wall or on a lane stay bare there. Pure.
 */
export function gardenItems(state: Pick<IslandState, 'map' | 'buildings' | 'occupancy' | 'roads' | 'id'>): FrontItem[] {
  const { map } = state
  const terrainAt = (x: number, y: number): number => (x < 0 || y < 0 || x >= map.width || y >= map.height ? Terrain.Water : map.tiles[y * map.width + x])
  const free = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
    const index = y * map.width + x
    if (state.occupancy[index] !== 0 || state.roads[index] !== 0) return false
    const terrain = map.tiles[index]
    if (terrain === Terrain.Grass || terrain === Terrain.Forest) return true
    if (terrain !== Terrain.Beach) return false
    // sand a step back from the sea will do, the wet rim will not
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (terrainAt(x + dx, y + dy) === Terrain.Water) return false
    return true
  }
  const items: FrontItem[] = []
  /** What stands on a tile already: 1 a bed or bush, 2 a garden (nothing else goes there). */
  const planted = new Map<number, number>()
  const add = (kind: 'hedge' | 'bed' | 'garden' | 'bush', variant: number, x: number, y: number, tx: number, ty: number, scale: number): void => {
    const drop = kind === 'bush' ? 0 : GARDEN_DROP[kind]
    items.push({ item: { kind, variant, x, y, scale, flip: false }, tx, ty, wx: (x - y) * HALF_W, wy: (x + y) * HALF_H + drop, depth: x + y })
  }
  for (const building of state.buildings) {
    if (!building.house || building.house.ruin) continue
    const tier = tierIndex(building.house.tier)
    const rect = buildingRect(building)
    // the tiles along the four sides: [tile, which way the house lies from it]
    const sides: [number, number, number, number][] = []
    for (let i = 0; i < rect.w; i++) sides.push([rect.x + i, rect.y - 1, 0, 1], [rect.x + i, rect.y + rect.h, 0, -1])
    for (let i = 0; i < rect.h; i++) sides.push([rect.x - 1, rect.y + i, 1, 0], [rect.x + rect.w, rect.y + i, -1, 0])
    for (const [tx, ty, dx, dy] of sides) {
      if (!free(tx, ty)) continue
      const index = ty * map.width + tx
      const tile = (n: number): number => hash2(tx * 13 + n, ty * 7, state.id + 93)
      if (!planted.has(index) && tile(1) < GARDEN.plot) {
        planted.set(index, 2)
        const lawn = tier >= LAWN_FROM && tile(2) < GARDEN.lawn
        const walled = lawn && tier >= WALL_FROM && tile(4) < 0.5
        add('garden', lawn ? (walled ? 5 : 4) : 1 + Math.floor(tile(3) * 3), tx + 0.5, ty + 0.5, tx, ty, 1)
      }
      if (planted.get(index) === 2) continue
      const r = (n: number): number => hash2(tx * 13 + n, ty * 7 + dx * 3 + dy, state.id + 91)
      // a hedge or bed runs along the side of the house: across the direction the house lies in
      const along = dx !== 0 ? 2 : 0
      if (tier >= HEDGE_FROM && r(1) < GARDEN.hedge) add('hedge', 1 + along + (r(2) < 0.5 ? 0 : 1), tx + 0.5 + dx * 0.36, ty + 0.5 + dy * 0.36, tx, ty, 1)
      if (planted.has(index)) continue
      planted.set(index, 1)
      if (r(3) < GARDEN.bed) add('bed', 1 + along + (r(4) < 0.5 ? 0 : 1), tx + 0.5 - dx * 0.08 + (r(5) - 0.5) * 0.1, ty + 0.5 - dy * 0.08 + (r(6) - 0.5) * 0.1, tx, ty, 1)
      else if (r(7) < GARDEN.bush) add('bush', 1 + Math.floor(r(8) * 3), tx + 0.3 + r(9) * 0.4, ty + 0.3 + r(10) * 0.4, tx, ty, 0.55 + 0.25 * r(11))
    }
  }
  return items
}

/** Changes when a house comes, goes, falls to ruin or rises a tier: then its garden changes. */
function houseSignature(state: IslandState): number {
  let hash = 0
  for (const building of state.buildings) {
    if (building.house) hash = (Math.imul(hash, 31) + building.id * 8 + tierIndex(building.house.tier) + (building.house.ruin ? 7 : 0)) | 0
  }
  return hash
}

const cache = new WeakMap<number[], { roads: number[]; houses: number; items: FrontItem[] }>()

/** Tall objects on the tiles next to buildings, and the gardens of the houses. Only recomputed when buildings or roads change. */
function allFrontDecor(state: IslandState): FrontItem[] {
  const hit = cache.get(state.occupancy)
  const houses = houseSignature(state)
  if (hit && hit.roads === state.roads && hit.houses === houses) return hit.items
  const { map } = state
  const ring = surroundRing(map, state.occupancy, state.roads)
  const ctx = {
    map,
    seed: state.id,
    climate: state.climate,
    blocked: (x: number, y: number) => state.occupancy[y * map.width + x] !== 0 || state.roads[y * map.width + x] !== 0,
  }
  const items: FrontItem[] = []
  for (let i = 0; i < ring.length; i++) {
    if (!ring[i]) continue
    const tx = i % map.width
    const ty = (i - tx) / map.width
    for (const item of decorForTile(ctx, tx, ty)) {
      if (!isTall(item.kind)) continue
      // Next to a building the forest is thinner and the trees smaller, so the building stays visible and clickable
      // but some trees still stand in front of it.
      if (hash2(tx * 3 + 1, ty * 5 + 2, state.id + 77) > FRONT_KEEP) continue
      item.scale *= FRONT_SCALE
      items.push({ item, tx, ty, wx: (item.x - item.y) * HALF_W, wy: (item.x + item.y) * HALF_H, depth: item.x + item.y })
    }
  }
  items.push(...gardenItems(state))
  cache.set(state.occupancy, { roads: state.roads, houses, items })
  return items
}

/** The objects next to buildings that lie in (or just around) a range of tiles. */
export function frontDecorIn(
  state: IslandState,
  range: { minI: number; maxI: number; minJ: number; maxJ: number },
  margin = 6,
): FrontItem[] {
  return allFrontDecor(state).filter(
    (entry) => entry.tx >= range.minI - margin && entry.tx <= range.maxI + margin && entry.ty >= range.minJ - margin && entry.ty <= range.maxJ + margin,
  )
}
