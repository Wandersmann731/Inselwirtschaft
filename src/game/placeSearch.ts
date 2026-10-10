import { getBuilding } from '../data'
import { checkPlacement, footprint } from '../sim/build'
import { hubReaches } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import type { Tile } from './stroke'

/** Top-left tile of a building centred on `center`, as the build tool places it. */
export function originAt(typeId: string, rotated: boolean, center: Tile): Tile {
  const { w, h } = footprint(getBuilding(typeId), rotated)
  return { x: center.x - Math.floor(w / 2), y: center.y - Math.floor(h / 2) }
}

/**
 * The free spot closest to `center` (ring by ring) where the building can stand, as its centre tile. Spots inside
 * the reach of a Kontor or market house win within a ring. Missing money does not count: the ghost then shows
 * why it cannot be built. Null if nothing fits within `maxRadius` tiles.
 */
export function nearestSpot(state: IslandState, typeId: string, rotated: boolean, center: Tile, maxRadius = 12): Tile | null {
  const { w, h } = footprint(getBuilding(typeId), rotated)
  let fallback: Tile | null = null
  for (let r = 0; r <= maxRadius; r++) {
    let best: Tile | null = null
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const tile = { x: center.x + dx, y: center.y + dy }
        const origin = originAt(typeId, rotated, tile)
        const error = checkPlacement(state, typeId, origin.x, origin.y, rotated)
        if (error && error.code !== 'funds') continue
        if (hubReaches(state, { x: origin.x, y: origin.y, w, h })) {
          best = tile
          break
        }
        fallback ??= tile
      }
      if (best) break
    }
    if (best) return best
    // a spot outside every reach is only taken if nothing better lies a few rings further out
    if (fallback && r >= 4) return fallback
  }
  return fallback
}
