import { describe, expect, it } from 'vitest'
import { config, trade } from '../src/data'
import { placeBuilding } from '../src/sim/build'
import { cycleFlat } from './helpers'
import { hasKontor, kontorKit, runKontorTrade, setTradeLimit, traderBuyPrice, traderSellPrice, traderSells } from '../src/sim/trade'
import { grassField } from './helpers'

const rich = { coins: 100000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

/** A grass island with a Kontor at the west shore. */
function withKontor() {
  let state = grassField(30, 30, { ...rich, highestTier: 3 })
  state = { ...state, map: { ...state.map, tiles: state.map.tiles.map((t, i) => (i % 30 === 0 ? 0 : t)) } }
  state = placeBuilding(state, 'kontor', 1, 5, false)
  expect(state.buildings).toHaveLength(1)
  return { ...state, coins: 1000, stock: { food: 100, tobacco: 0, silk: 100 } }
}

describe('trader prices', () => {
  it('buys cheaper and sells dearer than the base price', () => {
    expect(traderBuyPrice('wood')).toBeCloseTo(15 * trade.trader.buyMultiplier)
    expect(traderSellPrice('wood')).toBeCloseTo(15 * trade.trader.sellMultiplier)
    expect(traderBuyPrice('wood')).toBeLessThan(traderSellPrice('wood'))
  })

  it('sells only part of the goods', () => {
    expect(traderSells('tobacco')).toBe(true)
    expect(traderSells('silk')).toBe(false)
    expect(traderSells('jewelry')).toBe(false)
  })
})

describe('setTradeLimit', () => {
  it('stores limits and removes empty ones', () => {
    let state = grassField(5, 5)
    state = setTradeLimit(state, 'food', { buyBelow: 20, sellAbove: 80 })
    expect(state.trade.food).toEqual({ buyBelow: 20, sellAbove: 80 })
    state = setTradeLimit(state, 'food', { sellAbove: 50 })
    expect(state.trade.food).toEqual({ sellAbove: 50 })
    state = setTradeLimit(state, 'food', {})
    expect(state.trade).toEqual({})
  })
})

describe('Kontor trade', () => {
  it('sells the surplus above the limit at the trader price', () => {
    let state = setTradeLimit(withKontor(), 'food', { sellAbove: 70 })
    state = runKontorTrade(state)
    expect(state.stock.food).toBe(70 + Math.max(0, 30 - trade.trader.visitCapacity))
    expect(state.coins).toBeCloseTo(1000 + trade.trader.visitCapacity * traderBuyPrice('food'))
  })

  it('sells only what lies above the limit', () => {
    let state = setTradeLimit(withKontor(), 'food', { sellAbove: 95 })
    state = runKontorTrade(state)
    expect(state.stock.food).toBe(95)
    expect(state.coins).toBeCloseTo(1000 + 5 * traderBuyPrice('food'))
  })

  it('buys what is missing below the limit, as far as the trader moves per visit', () => {
    let state = setTradeLimit(withKontor(), 'tobacco', { buyBelow: 50 })
    state = runKontorTrade(state)
    expect(state.stock.tobacco).toBe(trade.trader.visitCapacity)
    expect(state.coins).toBeCloseTo(1000 - trade.trader.visitCapacity * traderSellPrice('tobacco'))
  })

  it('never buys more than the money allows and stays out of debt', () => {
    let state = { ...setTradeLimit(withKontor(), 'tobacco', { buyBelow: 50 }), coins: 100 }
    state = runKontorTrade(state)
    expect(state.stock.tobacco).toBe(Math.floor(100 / traderSellPrice('tobacco')))
    expect(state.coins).toBeGreaterThanOrEqual(0)
  })

  it('does not buy goods the trader does not have', () => {
    let state = setTradeLimit(withKontor(), 'silk', { buyBelow: 500, sellAbove: 0 })
    state = runKontorTrade({ ...state, stock: { ...state.stock, silk: 0 } })
    expect(state.stock.silk).toBe(0)
  })

  it('trades only with a running Kontor', () => {
    const state = setTradeLimit(withKontor(), 'food', { sellAbove: 10 })
    expect(hasKontor(state)).toBe(true)
    const off = { ...state, buildings: state.buildings.map((b) => ({ ...b, active: false })) }
    expect(runKontorTrade(off)).toBe(off)
    expect(runKontorTrade({ ...state, buildings: [] }).stock.food).toBe(100)
  })

  it('runs once per economy cycle', () => {
    const state = setTradeLimit(withKontor(), 'food', { sellAbove: 70 })
    const next = cycleFlat(state)
    expect(next.stock.food).toBeLessThan(100)
  })

  it('knows the goods a new Kontor needs', () => {
    const kit = kontorKit()
    expect(kit.coins).toBeGreaterThan(0)
    expect(Object.keys(kit.goods).length).toBeGreaterThan(0)
    expect(config.production.stockCapacity).toBeGreaterThan(0)
  })
})
