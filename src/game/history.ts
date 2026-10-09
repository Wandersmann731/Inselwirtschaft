import { balanceOf } from '../sim/economy'
import type { GameState } from '../sim/state'
import { totalResidents } from '../sim/tiers'

/** One line of the balancing table: how the realm stood at the end of an economy cycle. */
export interface CycleSnapshot {
  cycle: number
  tick: number
  coins: number
  /** Income minus upkeep of all owned islands in the cycle. */
  balance: number
  income: number
  residents: number
  highestTier: number
}

export const HISTORY_LENGTH = 60

export function snapshotOf(state: GameState, cycleTicks: number): CycleSnapshot {
  const ledgers = state.islands.flatMap((island) => (island.owned && island.economy.last ? [island.economy.last] : []))
  return {
    cycle: Math.floor(state.tick / cycleTicks),
    tick: state.tick,
    coins: Math.floor(state.coins),
    balance: Math.round(ledgers.reduce((sum, ledger) => sum + balanceOf(ledger), 0)),
    income: Math.round(ledgers.reduce((sum, ledger) => sum + ledger.income, 0)),
    residents: Math.floor(totalResidents(state)),
    highestTier: state.highestTier,
  }
}

/** Adds the snapshot of the cycle that just ended, if a new cycle ended between `before` and `after`. */
export function recordCycles(history: CycleSnapshot[], before: GameState, after: GameState, cycleTicks: number): CycleSnapshot[] {
  if (Math.floor(after.tick / cycleTicks) === Math.floor(before.tick / cycleTicks)) return history
  return [...history, snapshotOf(after, cycleTicks)].slice(-HISTORY_LENGTH)
}
