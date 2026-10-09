import { settleCycle } from './economy'
import { onEachIsland } from './islands'
import { runMarket } from './market'
import { runPopulation } from './population'
import { runKontorTrade } from './trade'
import type { GameState } from './state'

/**
 * Everything that happens once per economy cycle on every island of the player: shopping, population, then the books
 * are closed. Islands of others (the trader town) cost and earn the player nothing.
 */
export function runCycle(state: GameState): GameState {
  return onEachIsland(state, (island) => (island.owned ? settleCycle(runKontorTrade(runPopulation(runMarket(island)))) : island))
}
