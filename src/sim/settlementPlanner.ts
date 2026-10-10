import { getBuilding, world } from '../data'
import { placeBuilding } from './build'
import type { Tile } from './roadPlanner'
import type { IslandState } from './state'

export interface SettlementPlan {
  /** Top left tiles of the houses, in building order. */
  origins: Tile[]
  /** For every house the block it belongs to (index), parallel to `origins`. A block shares one yard. */
  blocks: number[]
  /** The island with all those houses built (to show the cost, and to see what the money allows). */
  result: IslandState
  /** True if houses were left out because goods or coins ran out. */
  outOfMoney: boolean
}

/**
 * How houses of `size` tiles fill a length: blocks of up to `most` houses with a lane between them, as
 * [first tile, houses] pairs. Of 2 and 3 houses per block the one that fits more houses wins (2 on a tie).
 */
export function blocksAlong(length: number, size: number, most: number, lane: number): [number, number][] {
  let best: [number, number][] = []
  let bestCount = -1
  for (let per = 2; per <= Math.max(2, most); per++) {
    const segments: [number, number][] = []
    let pos = 0
    while (pos + size <= length) {
      const count = Math.min(per, Math.floor((length - pos) / size))
      segments.push([pos, count])
      pos += count * size + lane
    }
    const total = segments.reduce((sum, [, count]) => sum + count, 0)
    if (total > bestCount) {
      best = segments
      bestCount = total
    }
  }
  return best
}

/**
 * Fills a dragged area with houses in blocks: up to 3 x 3 houses stand side by side on one yard, with a lane of
 * one tile between the blocks, so all gaps are the same. Every house remembers its block (`quarter`), the map draws
 * the shared yard under it. Spots that are blocked are skipped, and the houses stop when the money runs out.
 */
export function planSettlement(state: IslandState, typeId: string, a: Tile, b: Tile): SettlementPlan {
  const def = getBuilding(typeId)
  const [w, h] = def.size
  const cfg = world.settlementPlanner
  const minX = Math.min(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const columns = blocksAlong(Math.abs(a.x - b.x) + 1, w, cfg.blockHouses, cfg.laneTiles)
  const rows = blocksAlong(Math.abs(a.y - b.y) + 1, h, cfg.blockHouses, cfg.laneTiles)
  const origins: Tile[] = []
  const blocks: number[] = []
  let current = state
  let outOfMoney = false
  let block = 0
  for (const [rowStart, rowCount] of rows) {
    for (const [columnStart, columnCount] of columns) {
      let quarter: number | null = null
      for (let j = 0; j < rowCount && !outOfMoney; j++) {
        for (let i = 0; i < columnCount && origins.length < cfg.maxHouses; i++) {
          const x = minX + columnStart + i * w
          const y = minY + rowStart + j * h
          const next = placeBuilding(current, typeId, x, y, false)
          if (next === current) {
            if (isShort(current, typeId)) {
              outOfMoney = true
              break
            }
            continue
          }
          quarter ??= current.nextBuildingId
          current = withQuarter(next, next.nextBuildingId - 1, quarter)
          origins.push({ x, y })
          blocks.push(block)
        }
      }
      block++
    }
  }
  return { origins, blocks, result: current, outOfMoney }
}

/** Notes the block (quarter) on a house. */
function withQuarter(state: IslandState, buildingId: number, quarter: number): IslandState {
  return { ...state, buildings: state.buildings.map((b) => (b.id === buildingId ? { ...b, quarter } : b)) }
}

/** True if the island cannot pay for another house of this kind. */
function isShort(state: IslandState, typeId: string): boolean {
  const cost = getBuilding(typeId).cost
  if (state.coins < cost.coins) return true
  return (Object.keys(cost) as (keyof typeof cost)[]).some((good) => good !== 'coins' && cost[good] > (state.stock[good] ?? 0))
}

/**
 * Builds the planned houses on the island (those that are still possible). Houses of the same block get the id of
 * the first of them as their quarter, so they share a yard.
 */
export function buildSettlement(state: IslandState, typeId: string, origins: Tile[], blocks: number[] = []): IslandState {
  const quarters = new Map<number, number>()
  return origins.reduce((island, tile, index) => {
    const next = placeBuilding(island, typeId, tile.x, tile.y, false)
    const block = blocks[index]
    if (next === island || block === undefined) return next
    const id = next.nextBuildingId - 1
    if (!quarters.has(block)) quarters.set(block, id)
    return withQuarter(next, id, quarters.get(block)!)
  }, state)
}
