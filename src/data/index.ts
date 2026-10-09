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
export const world: WorldConfig = worldJson
