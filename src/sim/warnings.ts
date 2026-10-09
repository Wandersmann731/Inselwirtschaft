import { goods } from '../data'
import type { GameState } from './state'

/** A good that will run out soon. */
export interface ShortageWarning {
  good: string
  /** Economy cycles the store lasts at the net consumption of the last cycle. 0 if it is empty. */
  cycles: number
}

/** Warn if the store lasts fewer than this many economy cycles. */
export const WARNING_CYCLES = 3

/**
 * Goods that are used up faster than they are made and whose store lasts fewer than
 * WARNING_CYCLES cycles. Based on the last settled cycle, so nothing shows before the first one.
 */
export function findShortages(state: GameState): ShortageWarning[] {
  const last = state.economy.last
  if (!last) return []
  const warnings: ShortageWarning[] = []
  for (const good of goods) {
    const consumed = last.consumed[good.id] ?? 0
    const net = consumed - (last.produced[good.id] ?? 0)
    if (consumed <= 0 || net <= 0) continue
    const cycles = (state.stock[good.id] ?? 0) / net
    if (cycles < WARNING_CYCLES) warnings.push({ good: good.id, cycles })
  }
  return warnings.sort((a, b) => a.cycles - b.cycles)
}
