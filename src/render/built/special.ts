// Buildings that are no ordinary house, each made where its kind is: mines and quarries (mines.ts), the stalls and
// the market house (stalls.ts), the buildings of the harbour (harbour.ts, shipyard.ts).
import type { Scene } from './kit'
import { fishery, kontor, whaler } from './harbour'
import { mine, ORES, quarry } from './mines'
import { shipyard } from './shipyard'
import { marketHouse, stall } from './stalls'

/** Builds one of the special buildings. Returns false if `id` is none of them. */
export function special(scene: Scene, id: string): boolean {
  if (id in ORES) mine(scene, id)
  else if (id === 'quarry' || id === 'marble_quarry') quarry(scene, id === 'marble_quarry')
  else if (stall(scene, id)) return true
  else if (id === 'kontor') kontor(scene)
  else if (id === 'fishery') fishery(scene)
  else if (id === 'whaler') whaler(scene)
  else if (id === 'shipyard') shipyard(scene)
  else if (id === 'market_house') marketHouse(scene)
  else return false
  return true
}
