import { getBuilding, world } from '../data'
import { hash2 } from '../world/noise2d'
import { placeBuilding } from './build'
import type { Tile } from './roadPlanner'
import type { IslandState } from './state'

export interface SettlementPlan {
  /** Top left tiles of the houses, in building order. */
  origins: Tile[]
  /** The island with all those houses built (to show the cost, and to see what the money allows). */
  result: IslandState
  /** True if houses were left out because goods or coins ran out. */
  outOfMoney: boolean
}

/**
 * Fills a dragged area with houses the way a village grows: back-to-back rows with a lane now and then, a gap
 * after some houses, some houses a little further back. Same area and map always give the same layout. Spots that
 * are blocked are skipped, and the houses stop when the money runs out.
 */
export function planSettlement(state: IslandState, typeId: string, a: Tile, b: Tile): SettlementPlan {
  const def = getBuilding(typeId)
  const [w, h] = def.size
  const cfg = world.settlementPlanner
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  const seed = state.id * 31 + 7
  const origins: Tile[] = []
  let current = state
  let outOfMoney = false
  let y = minY
  let row = 0
  while (y + h - 1 <= maxY && origins.length < cfg.maxHouses && !outOfMoney) {
    // the first house of a row starts a little offset, so the rows do not line up like a grid
    let x = minX + (hash2(row, minY, seed) < 0.5 ? 0 : 1) * Math.min(1, Math.max(0, maxX - minX + 1 - w * 2))
    while (x + w - 1 <= maxX && origins.length < cfg.maxHouses) {
      const back = hash2(x, y, seed + 1) < cfg.jitterChance && y + h <= maxY ? 1 : 0
      const next = placeBuilding(current, typeId, x, y + back, false)
      if (next !== current) {
        origins.push({ x, y: y + back })
        current = next
      } else if (isShort(current, typeId)) {
        outOfMoney = true
        break
      }
      x += w + (hash2(x, y, seed + 2) < cfg.gapChance ? 1 : 0)
    }
    row++
    y += h + (row % cfg.rowsPerLane === 0 ? 1 : 0)
  }
  return { origins, result: current, outOfMoney }
}

/** True if the island cannot pay for another house of this kind. */
function isShort(state: IslandState, typeId: string): boolean {
  const cost = getBuilding(typeId).cost
  if (state.coins < cost.coins) return true
  return (Object.keys(cost) as (keyof typeof cost)[]).some((good) => good !== 'coins' && cost[good] > (state.stock[good] ?? 0))
}

/** Builds the planned houses on the island (those that are still possible). */
export function buildSettlement(state: IslandState, typeId: string, origins: Tile[]): IslandState {
  return origins.reduce((island, tile) => placeBuilding(island, typeId, tile.x, tile.y, false), state)
}
