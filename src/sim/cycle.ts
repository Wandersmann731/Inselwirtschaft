import { runMarket } from './market'
import { runPopulation } from './population'
import type { GameState } from './state'

/** Everything that happens once per economy cycle: shopping first, then the population reacts. */
export function runCycle(state: GameState): GameState {
  return runPopulation(runMarket(state))
}
