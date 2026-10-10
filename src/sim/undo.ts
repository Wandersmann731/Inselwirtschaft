import { getBuilding, goods } from '../data'
import type { BuildingCost } from '../data'
import { cloneLedger } from './ledger'
import type { IslandState } from './state'

/** What one build action added: the new buildings and the road tiles (as map indices). */
export interface BuildRecord {
  buildingIds: number[]
  roadTiles: number[]
}

/** Compares the island before and after a build action. Null if nothing was built. */
export function recordBuild(before: IslandState, after: IslandState): BuildRecord | null {
  const buildingIds = after.buildings.filter((b) => b.id >= before.nextBuildingId).map((b) => b.id)
  const roadTiles: number[] = []
  if (after.roads !== before.roads) {
    for (let i = 0; i < after.roads.length; i++) if (after.roads[i] !== 0 && before.roads[i] === 0) roadTiles.push(i)
  }
  return buildingIds.length > 0 || roadTiles.length > 0 ? { buildingIds, roadTiles } : null
}

/**
 * Takes back a build action: removes what of it still stands and pays its full cost back, so a slip of the finger
 * costs nothing. Parts that are already gone (demolished in between) are skipped.
 */
export function undoBuild(state: IslandState, record: BuildRecord): IslandState {
  const ids = new Set(record.buildingIds.filter((id) => state.buildings.some((b) => b.id === id)))
  const roads = state.roads.slice()
  const back: BuildingCost = { coins: 0, tools: 0, wood: 0, bricks: 0, marble: 0 }
  const add = (cost: BuildingCost): void => {
    for (const key of Object.keys(back) as (keyof BuildingCost)[]) back[key] += cost[key] ?? 0
  }
  for (const building of state.buildings) if (ids.has(building.id)) add(getBuilding(building.type).cost)
  let roadCount = 0
  for (const index of record.roadTiles) {
    if (roads[index] === 0) continue
    roads[index] = 0
    roadCount++
  }
  if (ids.size === 0 && roadCount === 0) return state
  const roadCost = getBuilding('road').cost
  for (let i = 0; i < roadCount; i++) add(roadCost)

  const stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  for (const good of goods) {
    const amount = back[good.id as keyof BuildingCost] ?? 0
    if (amount <= 0) continue
    stock[good.id] = (stock[good.id] ?? 0) + amount
    // the goods were never really used
    if (ledger.consumed[good.id] !== undefined) ledger.consumed[good.id] = Math.max(0, ledger.consumed[good.id] - amount)
  }
  return {
    ...state,
    coins: state.coins + back.coins,
    stock,
    economy: { ...state.economy, current: ledger },
    buildings: state.buildings.filter((b) => !ids.has(b.id)),
    occupancy: ids.size > 0 ? state.occupancy.map((id) => (ids.has(id) ? 0 : id)) : state.occupancy,
    roads: roadCount > 0 ? roads : state.roads,
  }
}
