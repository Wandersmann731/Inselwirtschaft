import { describe, expect, it } from 'vitest'
import { config, getBuilding } from '../src/data'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { MIGRATIONS, migrateState } from '../src/sim/migrations'
import { createRng } from '../src/sim/rng'
import { createInitialState, CURRENT_SAVE_VERSION, type IslandState } from '../src/sim/state'
import { grassField, tickFlat } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 } }

/** A market house with the given producers in a row along a road. */
function line(types: string[], stock: Record<string, number> = {}, overrides: Partial<IslandState> = {}): IslandState {
  let state = grassField(80, 12, { ...rich, highestTier: 4, ...overrides })
  state = placeBuilding(state, 'market_house', 2, 4, false)
  types.forEach((type, i) => {
    state = placeBuilding(state, type, 6 + i * 3, 1 + (i % 2) * 7, false)
  })
  const tiles = []
  for (let x = 2; x < 6 + types.length * 3; x++) tiles.push({ x, y: 6 })
  for (let i = 0; i < types.length; i++) {
    const bx = 6 + i * 3
    const by = 1 + (i % 2) * 7
    for (let y = Math.min(by + 2, 6); y <= Math.max(by - 1, 6); y++) tiles.push({ x: bx, y })
  }
  state = placeRoads(state, tiles)
  return { ...state, stock: { ...state.stock, ...stock } }
}

function run(state: IslandState, ticks: number): IslandState {
  let next = state
  for (let i = 0; i < ticks; i++) next = tickFlat(next, createRng(next.rngState))
  return next
}

describe('byproducts', () => {
  it('the butcher makes food from cattle and hides on the side', () => {
    const state = run(line(['butcher'], { cattle: 20, food: 0, hides: 0 }), 200)
    expect(state.stock.food).toBeGreaterThanOrEqual(3)
    expect(state.stock.hides).toBeGreaterThanOrEqual(3)
    expect(Math.abs(state.stock.food - state.stock.hides)).toBeLessThanOrEqual(2)
  })

  it('does not run without cattle', () => {
    const state = run(line(['butcher'], { cattle: 0, food: 0, hides: 0 }), 100)
    expect(state.stock.food ?? 0).toBe(0)
    expect(state.stock.hides ?? 0).toBe(0)
  })

  it('the hunting lodge needs game and gives food and hides', () => {
    const state = run(line(['hunting_lodge'], { food: 0, hides: 0 }, { fertilities: ['game'] }), 200)
    expect(state.stock.food).toBeGreaterThanOrEqual(2)
    expect(state.stock.hides).toBeGreaterThanOrEqual(2)
    const noGame = line(['hunting_lodge'], {}, { fertilities: [] })
    expect(noGame.buildings).toHaveLength(1) // only the market house
  })

  it('stops with a full byproduct buffer when the store is full of hides', () => {
    const state = run(line(['butcher'], { cattle: 500, hides: config.production.stockCapacity, food: 0 }), 400)
    const butcher = state.buildings.find((b) => b.type === 'butcher')!
    expect(butcher.production!.status.kind).toBe('outputFull')
    expect(state.stock.hides).toBe(config.production.stockCapacity)
  })

  it('leather comes from hides: butcher to tannery', () => {
    const state = run(line(['butcher', 'tannery'], { cattle: 20, hides: 0, leather: 0 }), 300)
    expect(state.stock.leather).toBeGreaterThanOrEqual(2)
  })
})

describe('chains with two steps', () => {
  it('salt: saltstone from the mine, salt from the saltworks', () => {
    const state = run(line(['saltworks'], { saltstone: 10, salt: 0 }), 200)
    expect(state.stock.salt).toBeGreaterThanOrEqual(2)
    expect(run(line(['saltworks'], { saltstone: 0, salt: 0 }), 100).stock.salt ?? 0).toBe(0)
  })

  it('marble needs the deposit and two steps', () => {
    const mason = run(line(['marble_mason'], { marble_stone: 10, marble: 0 }), 200)
    expect(mason.stock.marble).toBeGreaterThanOrEqual(2)
    expect(getBuilding('marble_quarry').requiresDeposit).toBe('marble')
  })
})

describe('ratios of the chains', () => {
  const perCycle = (type: string): number => {
    const def = getBuilding(type)
    return ((def.output?.amount ?? 1) * config.economyCycleTicks) / (def.cycleTicks ?? 1)
  }

  it('bread: 4 farms feed 2 mills and 1 bakery', () => {
    const grain = 4 * perCycle('grain_farm')
    expect(2 * perCycle('mill')).toBeGreaterThanOrEqual(grain)
    expect(perCycle('bakery')).toBeGreaterThanOrEqual(grain)
  })

  it('meat: 2 cattle farms feed 1 butcher', () => {
    expect(perCycle('butcher')).toBeGreaterThanOrEqual(2 * perCycle('cattle_farm'))
    expect(perCycle('butcher') / 2).toBeLessThan(2 * perCycle('cattle_farm'))
  })

  it('hops and sugar: 2 farms feed 1 maker', () => {
    expect(perCycle('brewery')).toBeGreaterThanOrEqual(2 * perCycle('hops_farm'))
    expect(perCycle('distillery')).toBeGreaterThanOrEqual(2 * perCycle('sugar_plantation'))
  })

  it('lamp oil: 1 whaler feeds 2 oil boilers', () => {
    expect(2 * perCycle('oil_boiler')).toBeGreaterThanOrEqual(perCycle('whaler'))
    expect(perCycle('oil_boiler')).toBeLessThan(perCycle('whaler'))
  })

  it('wine comes straight from the vineyard and potatoes make alcohol on the farm', () => {
    expect(getBuilding('vineyard').output?.good).toBe('wine')
    expect(getBuilding('potato_farm').output?.good).toBe('alcohol')
    expect(getBuilding('potato_farm').inputs).toBeUndefined()
  })
})

describe('migration from version 9', () => {
  it('removes the winery, drops removed goods and gives producers a byproduct buffer', () => {
    const game = JSON.parse(JSON.stringify(createInitialState(3))) as Record<string, any>
    game.version = 9
    const home = game.islands[0]
    const width = home.map.width
    home.buildings = [
      { id: 1, type: 'winery', x: 5, y: 5, rotated: false, active: true, production: { progress: 0, busyTicks: 0, utilization: 0, inputs: { grapes: 2 }, output: 0, status: { kind: 'noRoad' }, shipments: [] } },
      { id: 2, type: 'forester', x: 9, y: 9, rotated: false, active: true, production: { progress: 3, busyTicks: 0, utilization: 0, inputs: { potatoes: 1 }, output: 0, status: { kind: 'noRoad' }, shipments: [] } },
    ]
    home.occupancy[5 * width + 5] = 1
    home.occupancy[9 * width + 9] = 2
    home.stock = { wood: 10, indigo: 4, grapes: 9, potatoes: 3 }
    home.trade = { grapes: { sellAbove: 5 }, wood: { sellAbove: 50 } }
    game.ships = [{ id: 1, name: 'S', capacity: 60, cargo: { indigo: 5, wood: 2 }, island: 0, x: 0, y: 0, path: [], destination: null, routeId: null, stopIndex: 0 }]
    const migrated = migrateState(game, MIGRATIONS)
    const island = migrated.islands[0]
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(island.buildings.map((b) => b.type)).toEqual(['forester'])
    expect(island.occupancy[5 * width + 5]).toBe(0)
    expect(island.occupancy[9 * width + 9]).toBe(2)
    expect(island.stock).toEqual({ wood: 10, dye: 4 })
    expect(Object.keys(island.trade)).toEqual(['wood'])
    expect(island.buildings[0].production).toMatchObject({ progress: 3, extra: {}, inputs: {} })
    expect(migrated.ships[0].cargo).toEqual({ dye: 5, wood: 2 })
  })
})

