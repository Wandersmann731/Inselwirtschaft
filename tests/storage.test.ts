import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { runKontorTrade } from '../src/sim/trade'
import { hubCount, stockCapacity } from '../src/sim/storage'
import type { PlacedBuilding } from '../src/sim/state'
import { testIsland } from './helpers'

const hub = (id: number, type = 'market_house'): PlacedBuilding => ({ id, type, x: id * 3, y: 0, rotated: false, active: true })

describe('island store', () => {
  it('holds the base amount with no or one Kontor or market house', () => {
    expect(stockCapacity({ buildings: [] })).toBe(config.production.stockCapacity)
    expect(stockCapacity({ buildings: [hub(1, 'kontor')] })).toBe(config.production.stockCapacity)
  })

  it('grows with every further Kontor or market house, first in the listed steps, then in small steps', () => {
    const { stockCapacity: base, stockGrowth } = config.production
    expect(stockCapacity({ buildings: [hub(1, 'kontor'), hub(2)] })).toBe(base + stockGrowth.steps[0])
    const many = Array.from({ length: stockGrowth.steps.length + 2 }, (_, i) => hub(i + 1))
    const steps = stockGrowth.steps.reduce((sum, step) => sum + step, 0)
    expect(stockCapacity({ buildings: many })).toBe(Math.min(stockGrowth.max, base + steps + stockGrowth.then))
  })

  it('never goes beyond the maximum', () => {
    const lots = Array.from({ length: 200 }, (_, i) => hub(i + 1))
    expect(hubCount({ buildings: lots })).toBe(200)
    expect(stockCapacity({ buildings: lots })).toBe(config.production.stockGrowth.max)
  })

  it('lets the Kontor trader fill the store up to the larger capacity', () => {
    const base = config.production.stockCapacity
    const state = testIsland({
      coins: 1_000_000,
      stock: { tools: base, wood: 0, bricks: 0, marble: 0 },
      buildings: [hub(1, 'kontor'), hub(2), hub(3)],
      trade: { tools: { buyBelow: base + 500 } },
    })
    const after = runKontorTrade(state)
    expect(after.stock.tools).toBeGreaterThan(base)
    expect(after.stock.tools).toBeLessThanOrEqual(stockCapacity(state))
  })
})
