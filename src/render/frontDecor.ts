import { decorForTile, isTall, type DecorItem } from '../world/decor'
import { buildingRing } from '../world/surroundings'
import type { IslandState } from '../sim/state'

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

const cache = new WeakMap<number[], { roads: number[]; items: FrontItem[] }>()

/** Tall objects on the tiles next to buildings. Only recomputed when buildings or roads change. */
function allFrontDecor(state: IslandState): FrontItem[] {
  const hit = cache.get(state.occupancy)
  if (hit && hit.roads === state.roads) return hit.items
  const { map } = state
  const ring = buildingRing(map, state.occupancy)
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
      items.push({ item, tx, ty, wx: (item.x - item.y) * HALF_W, wy: (item.x + item.y) * HALF_H, depth: item.x + item.y })
    }
  }
  cache.set(state.occupancy, { roads: state.roads, items })
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
