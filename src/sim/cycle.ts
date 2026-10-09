import { settleCycle } from './economy'
import { onEachIsland } from './islands'
import { runMarket } from './market'
import { runPopulation } from './population'
import { runKontorTrade } from './trade'
import type { GameState } from './state'

/** Everything that happens once per economy cycle on every island: shopping, population, then the books are closed. */
export function runCycle(state: GameState): GameState {
  return onEachIsland(state, (island) => settleCycle(runKontorTrade(runPopulation(runMarket(island)))))
}
