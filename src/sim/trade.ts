import { config, getBuilding, goods, trade } from '../data'
import type { IslandState, TradeLimit } from './state'

const goodMap = new Map(goods.map((good) => [good.id, good]))

/** Base trade price of a good. */
export function basePrice(good: string): number {
  return goodMap.get(good)?.tradePrice ?? 0
}

/** What the trader pays the player for one ton. He buys every good. */
export function traderBuyPrice(good: string): number {
  return basePrice(good) * trade.trader.buyMultiplier
}

/** What the trader asks of the player for one ton. */
export function traderSellPrice(good: string): number {
  return basePrice(good) * trade.trader.sellMultiplier
}

export function traderSells(good: string): boolean {
  return trade.trader.sells.includes(good)
}

/** Sets or clears the Kontor limits of one good. Empty limits are removed. */
export function setTradeLimit(state: IslandState, good: string, limit: TradeLimit): IslandState {
  const next: TradeLimit = {}
  if (limit.buyBelow && limit.buyBelow > 0) next.buyBelow = Math.floor(limit.buyBelow)
  if (limit.sellAbove && limit.sellAbove > 0) next.sellAbove = Math.floor(limit.sellAbove)
  const rest = { ...state.trade }
  if (next.buyBelow === undefined && next.sellAbove === undefined) delete rest[good]
  else rest[good] = next
  return { ...state, trade: rest }
}

/** True if the island has a Kontor that is running. */
export function hasKontor(state: IslandState): boolean {
  return state.buildings.some((building) => building.type === 'kontor' && building.active)
}

/**
 * Once per economy cycle the trader calls at the Kontor: he buys what lies above the sell
 * limit and sells what is missing below the buy limit, at fixed prices and up to
 * trade.trader.visitCapacity tons per good. Needs a running Kontor.
 */
export function runKontorTrade(state: IslandState): IslandState {
  if (!hasKontor(state) || Object.keys(state.trade).length === 0) return state
  const stock = { ...state.stock }
  let coins = state.coins
  for (const [good, limit] of Object.entries(state.trade)) {
    const have = stock[good] ?? 0
    if (limit.sellAbove !== undefined && have > limit.sellAbove) {
      const amount = Math.min(have - limit.sellAbove, trade.trader.visitCapacity)
      stock[good] = have - amount
      coins += amount * traderBuyPrice(good)
    } else if (limit.buyBelow !== undefined && have < limit.buyBelow && traderSells(good)) {
      const price = traderSellPrice(good)
      const room = config.production.stockCapacity - have
      const affordable = price > 0 ? Math.floor(Math.max(0, coins) / price) : 0
      const amount = Math.min(limit.buyBelow - have, trade.trader.visitCapacity, room, affordable)
      if (amount > 0) {
        stock[good] = have + amount
        coins -= amount * price
      }
    }
  }
  return { ...state, stock, coins }
}

/** Cost of a Kontor, split into the goods that must come on the ship and the coins. */
export function kontorKit(): { goods: Record<string, number>; coins: number } {
  const cost = getBuilding('kontor').cost
  const kit: Record<string, number> = {}
  for (const good of goods) {
    const needed = cost[good.id as keyof typeof cost] ?? 0
    if (needed > 0) kit[good.id] = needed
  }
  return { goods: kit, coins: cost.coins }
}
