import { config } from '../data'
import { emptyLedger } from './ledger'
import { upkeepOf } from './production'
import type { CycleLedger, IslandState } from './state'

/** Total upkeep of all buildings per economy cycle. Shut down buildings cost less. */
export function totalUpkeep(state: IslandState): number {
  return state.buildings.reduce((sum, building) => sum + upkeepOf(building), 0)
}

/** Income minus upkeep of a settled cycle. */
export function balanceOf(ledger: CycleLedger): number {
  return ledger.income - ledger.upkeep
}

/**
 * Closes the running economy cycle: pays the upkeep of every building, stores the cycle as
 * the last one and starts an empty one. Producers get the utilisation of the cycle.
 * Coins may go negative, which blocks new construction.
 */
export function settleCycle(state: IslandState): IslandState {
  const upkeep = totalUpkeep(state)
  const last: CycleLedger = { ...state.economy.current, upkeep }
  const buildings = state.buildings.map((building) => {
    if (!building.production) return building
    const utilization = Math.min(100, Math.round((building.production.busyTicks / config.economyCycleTicks) * 100))
    return { ...building, production: { ...building.production, busyTicks: 0, utilization } }
  })
  return {
    ...state,
    coins: state.coins - upkeep,
    buildings,
    economy: { current: emptyLedger(), last },
  }
}
