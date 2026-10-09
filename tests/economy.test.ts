import { describe, expect, it } from 'vitest'
import { config, getBuilding } from '../src/data'
import { checkPlacement, checkRoad, demolishAt, placeBuilding, placeRoads } from '../src/sim/build'
import { runCycle } from '../src/sim/cycle'
import { balanceOf, settleCycle, totalUpkeep } from '../src/sim/economy'
import { runMarket } from '../src/sim/market'
import { migrateState } from '../src/sim/migrations'
import { processProduction, setBuildingActive } from '../src/sim/production'
import { createRng } from '../src/sim/rng'
import { createInitialState, type GameState } from '../src/sim/state'
import { tick } from '../src/sim/tick'
import { findShortages, WARNING_CYCLES } from '../src/sim/warnings'
import { grassField, patchHouse } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

const upkeep = (type: string): number => getBuilding(type).upkeep.active

function run(state: GameState, ticks: number): GameState {
  let next = state
  for (let i = 0; i < ticks; i++) next = tick(next, createRng(next.rngState))
  return next
}

describe('settling a cycle', () => {
  it('pays the upkeep of every building and records income, upkeep and balance', () => {
    let state = grassField(50, 30, { ...rich, coins: 1000 })
    state = placeBuilding(state, 'chapel', 5, 5, false)
    state = placeBuilding(state, 'forester', 12, 5, false)
    state = { ...state, coins: 1000, economy: { ...state.economy, current: { ...state.economy.current, income: 40 } } }
    const settled = settleCycle(state)
    const expected = upkeep('chapel') + upkeep('forester')
    expect(totalUpkeep(state)).toBe(expected)
    expect(settled.coins).toBe(1000 - expected)
    expect(settled.economy.last).toMatchObject({ income: 40, upkeep: expected })
    expect(balanceOf(settled.economy.last!)).toBe(40 - expected)
  })

  it('starts the next cycle with an empty ledger', () => {
    const settled = settleCycle(grassField(10, 10, rich))
    expect(settled.economy.current).toEqual({ income: 0, upkeep: 0, produced: {}, consumed: {} })
  })

  it('charges less for shut down buildings', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'chapel', 5, 5, false)
    const off = setBuildingActive(state, state.buildings[0].id, false)
    expect(totalUpkeep(off)).toBe(getBuilding('chapel').upkeep.idle)
    expect(totalUpkeep(off)).toBeLessThan(totalUpkeep(state))
  })

  it('has nothing to show before the first cycle ends', () => {
    expect(createInitialState(1).economy.last).toBeNull()
  })

  it('runs in the tick once per economy cycle: balance = income - upkeep', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = placeBuilding(state, 'food_salt_stand', 14, 10, false)
    state = placeBuilding(state, 'chapel', 20, 10, false)
    state = patchHouse(state, 1, { residents: 8 })
    state = { ...state, stock: { ...state.stock, food: 100 } }
    const coins = state.coins
    const next = run({ ...state, tick: config.economyCycleTicks - 1 }, 1)
    expect(next.economy.last).not.toBeNull()
    const last = next.economy.last!
    expect(last.income).toBeGreaterThan(0)
    expect(last.upkeep).toBe(upkeep('food_salt_stand') + upkeep('chapel'))
    expect(next.coins).toBeCloseTo(coins + balanceOf(last))
  })

  it('lets coins go negative', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'chapel', 5, 5, false)
    expect(settleCycle({ ...state, coins: 3 }).coins).toBeLessThan(0)
  })
})

describe('goods ledger', () => {
  it('counts what the residents buy as consumed and the money as income', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = placeBuilding(state, 'food_salt_stand', 14, 10, false)
    state = patchHouse(state, 1, { residents: 8 })
    const next = runMarket({ ...state, stock: { ...state.stock, food: 100 } })
    expect(next.economy.current.consumed.food).toBeCloseTo(0.8)
    expect(next.economy.current.income).toBeCloseTo(0.8 * 8)
  })

  it('counts production and the inputs it uses up', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'weaver', 8, 2, false)
    state = placeRoads(state, [4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    state = { ...state, stock: { ...state.stock, wool: 20, cloth: 0 } }
    state = run(state, 100)
    expect(state.economy.current.produced.cloth).toBeGreaterThanOrEqual(2)
    expect(state.economy.current.consumed.wool).toBeGreaterThanOrEqual(2)
  })

  it('counts the materials used for building', () => {
    const state = placeBuilding(grassField(30, 30, rich), 'chapel', 5, 5, false)
    expect(state.economy.current.consumed.wood).toBe(getBuilding('chapel').cost.wood)
    expect(state.economy.current.consumed.tools).toBe(getBuilding('chapel').cost.tools)
  })

  it('does not count refunds', () => {
    const built = placeBuilding(grassField(30, 30, rich), 'chapel', 5, 5, false)
    expect(demolishAt(built, 5, 5).economy.current).toEqual(built.economy.current)
  })
})

describe('utilisation', () => {
  it('shows the share of the cycle a producer spent producing', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = placeRoads(state, [4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    state = run(state, config.economyCycleTicks)
    const forester = state.buildings.find((b) => b.type === 'forester')!.production!
    expect(forester.utilization).toBeGreaterThan(80)
    expect(forester.busyTicks).toBe(0)
  })

  it('is zero for a producer that stood idle', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'forester', 8, 2, false) // no road, no hub
    state = run(state, config.economyCycleTicks)
    expect(state.buildings[0].production!.utilization).toBe(0)
  })
})

describe('debt blocks new construction', () => {
  it('refuses buildings and roads while coins are negative', () => {
    const state = { ...grassField(30, 30, rich), coins: -1 }
    expect(checkPlacement(state, 'house_pioneers', 5, 5, false)?.code).toBe('debt')
    expect(checkRoad(state, 5, 5)?.code).toBe('debt')
    expect(placeBuilding(state, 'house_pioneers', 5, 5, false)).toBe(state)
    expect(placeRoads(state, [{ x: 5, y: 5 }])).toBe(state)
  })

  it('still allows demolition and building again once coins are positive', () => {
    let state = placeBuilding(grassField(30, 30, rich), 'chapel', 5, 5, false)
    state = { ...state, coins: -50 }
    expect(demolishAt(state, 5, 5).buildings).toHaveLength(0)
    expect(checkPlacement({ ...state, coins: 5000 }, 'house_pioneers', 15, 15, false)).toBeNull()
  })
})

describe('shortage warnings', () => {
  const withLast = (consumed: number, produced: number, stock: number): GameState => ({
    ...createInitialState(1),
    stock: { food: stock },
    economy: { current: { income: 0, upkeep: 0, produced: {}, consumed: {} }, last: { income: 0, upkeep: 0, produced: { food: produced }, consumed: { food: consumed } } },
  })

  it('warns if the store lasts fewer than three cycles', () => {
    const warnings = findShortages(withLast(10, 0, 25))
    expect(warnings).toEqual([{ good: 'food', cycles: 2.5 }])
  })

  it('stays quiet at three cycles or more', () => {
    expect(findShortages(withLast(10, 0, 10 * WARNING_CYCLES))).toEqual([])
    expect(findShortages(withLast(10, 0, 100))).toEqual([])
  })

  it('uses the net consumption: production counts against it', () => {
    expect(findShortages(withLast(10, 8, 5))).toEqual([{ good: 'food', cycles: 2.5 }])
    expect(findShortages(withLast(10, 10, 0))).toEqual([])
    expect(findShortages(withLast(10, 12, 0))).toEqual([])
  })

  it('reports an empty store with 0 cycles', () => {
    expect(findShortages(withLast(10, 0, 0))).toEqual([{ good: 'food', cycles: 0 }])
  })

  it('ignores goods nobody uses and shows nothing before the first cycle', () => {
    expect(findShortages({ ...withLast(0, 0, 0) })).toEqual([])
    expect(findShortages(createInitialState(1))).toEqual([])
  })

  it('sorts the most urgent first', () => {
    const state = withLast(10, 0, 25)
    const two: GameState = {
      ...state,
      stock: { food: 25, cloth: 5 },
      economy: { ...state.economy, last: { ...state.economy.last!, consumed: { food: 10, cloth: 10 } } },
    }
    expect(findShortages(two).map((w) => w.good)).toEqual(['cloth', 'food'])
  })

  it('finds a real shortage after a cycle with a starving village', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = placeBuilding(state, 'food_salt_stand', 14, 10, false)
    state = patchHouse(state, 1, { residents: 8 })
    state = { ...state, stock: { ...state.stock, food: 1 } }
    const next = runCycle(state)
    expect(findShortages(next).map((w) => w.good)).toContain('food')
  })
})

describe('migration from version 6', () => {
  it('adds the ledger and the producer fields', () => {
    const old = {
      ...createInitialState(5),
      version: 6,
      economy: undefined,
      buildings: [
        { id: 1, type: 'forester', x: 3, y: 3, rotated: false, active: true, production: { progress: 3, inputs: {}, output: 0, status: { kind: 'noRoad' }, shipments: [] } },
      ],
    }
    const migrated = migrateState(old)
    expect(migrated.economy).toEqual({ current: { income: 0, upkeep: 0, produced: {}, consumed: {} }, last: null })
    expect(migrated.buildings[0].production).toMatchObject({ progress: 3, busyTicks: 0, utilization: 0 })
  })
})

describe('production does not break without a ledger change', () => {
  it('keeps the state when there are no producers', () => {
    const state = grassField(10, 10, rich)
    expect(processProduction(state)).toBe(state)
  })
})
