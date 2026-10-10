import { config, getBuilding } from '../data'
import type { PlacedBuilding } from './state'

/** Kontore and market houses on the island: every one of them adds room to the shared store. */
export function hubCount(island: { buildings: PlacedBuilding[] }): number {
  return island.buildings.filter((building) => getBuilding(building.type).catchment !== undefined).length
}

/**
 * Most of one good the island store holds. The first Kontor or market house gives the base room, each
 * further one adds the next step, after the listed steps a smaller fixed step, up to the maximum.
 */
export function stockCapacity(island: { buildings: PlacedBuilding[] }): number {
  const { stockCapacity: base, stockGrowth } = config.production
  const extra = Math.max(0, hubCount(island) - 1)
  let capacity = base
  for (let i = 0; i < extra; i++) capacity += stockGrowth.steps[i] ?? stockGrowth.then
  return Math.min(capacity, stockGrowth.max)
}
