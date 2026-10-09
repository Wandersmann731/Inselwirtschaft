import buildingsJson from './buildings.json'
import climatesJson from './climates.json'
import configJson from './config.json'
import goodsJson from './goods.json'
import tiersJson from './tiers.json'
import worldJson from './world.json'
import type { BuildingDef, ClimateDef, GameConfig, GoodDef, TierDef, WorldConfig } from './types'

export type * from './types'

export const config: GameConfig = configJson
export const goods: GoodDef[] = goodsJson
export const buildings: BuildingDef[] = buildingsJson as BuildingDef[]
export const tiers: TierDef[] = tiersJson as TierDef[]
export const climates: ClimateDef[] = climatesJson
export const world = worldJson as WorldConfig

const buildingMap = new Map(buildings.map((def) => [def.id, def]))

/** Looks up a building definition. Throws for unknown ids so data errors fail loudly. */
export function getBuilding(id: string): BuildingDef {
  const def = buildingMap.get(id)
  if (!def) throw new Error(`Unknown building type: ${id}`)
  return def
}

const goodMap = new Map(goods.map((good) => [good.id, good]))

/** Selling price of one unit of a good, 0 if it has none. */
export function priceOf(goodId: string): number {
  return goodMap.get(goodId)?.price ?? 0
}
