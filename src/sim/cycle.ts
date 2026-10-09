import { settleCycle } from './economy'
import { runMarket } from './market'
import { runPopulation } from './population'
import type { GameState } from './state'

/** Everything that happens once per economy cycle: shopping, population, then the books are closed. */
export function runCycle(state: GameState): GameState {
  return settleCycle(runPopulation(runMarket(state)))
}
