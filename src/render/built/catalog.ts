// Which building is built how: every building of the game by its id.
import type { BuildingDef } from '../../data'
import { farm } from './fields'
import type { Scene } from './kit'
import { publicBuilding } from './publics'
import { special } from './special'
import { plainWorkshop, workshop } from './workshops'

export interface Maker {
  /** How many pictures of the building there are. */
  variants: number
  make: (scene: Scene, variant: number, def: BuildingDef) => void
}

/** Farms come in two variants: the rows run one way or the other. */
const FARMS = new Set(['potato_farm', 'cotton_plantation', 'tobacco_plantation', 'indigo_farm', 'sugar_plantation', 'hops_farm', 'vineyard', 'spice_plantation', 'silk_plantation', 'grain_farm', 'sheep_farm', 'cattle_farm'])

const maker: Maker['make'] = (scene, _variant, def) => {
  if (farm(scene, def.id) || workshop(scene, def.id) || special(scene, def.id) || publicBuilding(scene, def.id)) return
  plainWorkshop(scene)
}

/** How a building is made, or null for something that is no building (a road). */
export function makerOf(id: string): Maker | null {
  if (id === 'road') return null
  return { variants: FARMS.has(id) ? 2 : 1, make: maker }
}
