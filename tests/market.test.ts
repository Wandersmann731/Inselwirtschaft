import { describe, expect, it } from 'vitest'
import { config, getBuilding, tiers } from '../src/data'
import { placeBuilding } from '../src/sim/build'
import { MIGRATIONS, migrateState } from '../src/sim/migrations'
import { runMarket } from '../src/sim/market'
import { createInitialState, type IslandState } from '../src/sim/state'
import { grassField, patchBuilding, patchHouse } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }
const tax = (tier: string): number => tiers.find((t) => t.id === tier)!.tax

/** A house at (10,10) with the given residents, a market house next to it and a chapel nearby. */
function village(residents: number, stock: Record<string, number> = {}): IslandState {
  let state = grassField(60, 30, { ...rich })
  state = placeBuilding(state, 'house_pioneers', 10, 10, false)
  state = placeBuilding(state, 'market_house', 14, 10, false)
  state = placeBuilding(state, 'chapel', 20, 10, false)
  state = patchHouse(state, 1, { residents })
  return { ...state, coins: 1000, stock: { food: 100, cloth: 100, ...stock } }
}

const house = (state: IslandState) => state.buildings.find((b) => b.house)!.house!

describe('market', () => {
  it('residents fetch their goods from the store by themselves and pay the full land tax', () => {
    const next = runMarket(village(8))
    expect(next.stock.food).toBeCloseTo(100 - 8 * 0.1)
    expect(next.coins).toBeCloseTo(1000 + 8 * tax('pioneers'))
    expect(house(next).needs.food).toBe(100)
    expect(house(next).needs.cloth).toBe(100)
  })

  it('pays a land tax even when no good is available, but less', () => {
    const next = runMarket(village(8, { food: 0, cloth: 0 }))
    expect(house(next).needs.food).toBe(0)
    expect(next.coins).toBeCloseTo(1000 + 8 * tax('pioneers') * config.tax.base)
  })

  it('pays more the more goods are available', () => {
    const none = runMarket(village(8, { food: 0, cloth: 0 })).coins
    const half = runMarket(village(8, { food: 0, cloth: 100 })).coins
    const all = runMarket(village(8)).coins
    expect(half).toBeGreaterThan(none)
    expect(all).toBeGreaterThan(half)
  })

  it('reports partial fulfilment when the store is short', () => {
    const next = runMarket(village(8, { food: 0.4 }))
    expect(house(next).needs.food).toBeCloseTo(50)
    expect(next.stock.food).toBeCloseTo(0)
  })

  it('needs no market stands: a Kontor or market house in reach is enough, and nothing without one', () => {
    let state = grassField(60, 30, { ...rich })
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = { ...patchHouse(state, 1, { residents: 8 }), coins: 1000, stock: { food: 100, cloth: 100 } }
    const alone = runMarket(state)
    expect(house(alone).needs.food).toBe(0)
    expect(alone.stock.food).toBe(100)
    expect(alone.coins).toBeCloseTo(1000 + 8 * tax('pioneers') * config.tax.base)
  })

  it('reaches as far as the catchment of the hub', () => {
    const catchment = getBuilding('market_house').catchment!
    const build = (x: number): IslandState => {
      let state = grassField(120, 30, { ...rich })
      state = placeBuilding(state, 'market_house', 2, 10, false) // x 2..3
      state = placeBuilding(state, 'house_pioneers', x, 10, false)
      return { ...patchHouse(state, 2, { residents: 8 }), coins: 1000, stock: { food: 100, cloth: 100 } }
    }
    const homeOf = (state: IslandState) => state.buildings.find((b) => b.house)!.house!
    expect(homeOf(runMarket(build(3 + catchment))).needs.food).toBe(100)
    expect(homeOf(runMarket(build(3 + catchment + 1))).needs.food).toBe(0)
  })

  it('does not supply from a shut down hub', () => {
    const state = patchBuilding(village(8), 2, { active: false })
    const next = runMarket(state)
    expect(house(next).needs.food).toBe(0)
    expect(next.stock.food).toBe(100)
  })

  it('accepts leather in place of cloth', () => {
    const next = runMarket(village(8, { cloth: 0, leather: 10 }))
    expect(house(next).needs.cloth).toBe(100)
    expect(next.stock.leather).toBeCloseTo(10 - 8 * 0.05)
  })

  it('meets the chapel need only inside the chapel radius of an active chapel', () => {
    expect(house(runMarket(village(8))).needs.chapel).toBe(100)
    expect(house(runMarket(patchBuilding(village(8), 3, { active: false }))).needs.chapel).toBe(0)
  })

  it('lets salt stand in for missing tobacco at citizen houses', () => {
    let state = village(28, { salt: 50, tobacco: 0, spices: 0 })
    state = patchHouse(state, 1, { tier: 'citizens' })
    const next = runMarket(state)
    expect(house(next).needs.tobacco).toBe(100)
    expect(house(next).needs.spices).toBe(100)
    expect(next.stock.salt).toBeLessThan(50)
  })

  it('shows 100 % for an empty house only if the goods are there, and an empty house pays no tax', () => {
    expect(house(runMarket(village(0))).needs.food).toBe(100)
    expect(house(runMarket(village(0, { food: 0 }))).needs.food).toBe(0)
    expect(runMarket(village(0)).coins).toBe(1000)
  })

  it('leaves ruins alone', () => {
    const next = runMarket(patchHouse(village(8), 1, { ruin: true }))
    expect(next.coins).toBe(1000)
    expect(next.stock.food).toBe(100)
  })

  it('serves houses one after another until the store is empty', () => {
    let state = village(8)
    state = placeBuilding({ ...state, coins: 1_000_000, stock: { ...rich.stock } }, 'house_pioneers', 12, 13, false)
    state = patchHouse(state, 4, { residents: 8 })
    const next = runMarket({ ...state, stock: { food: 1, cloth: 100 } })
    const homes = next.buildings.filter((b) => b.house)
    expect(homes[0].house!.needs.food).toBe(100)
    expect(homes[1].house!.needs.food).toBeCloseTo(25)
  })

  it('higher tiers pay more per resident', () => {
    expect(tax('settlers')).toBeGreaterThan(tax('pioneers'))
    expect(tax('aristocrats')).toBeGreaterThan(tax('merchants'))
  })
})

describe('migration from version 10', () => {
  it('removes the market stands', () => {
    const game = JSON.parse(JSON.stringify(createInitialState(3))) as Record<string, any>
    game.version = 10
    const home = game.islands[0]
    const width = home.map.width
    home.buildings = [
      { id: 1, type: 'food_salt_stand', x: 5, y: 5, rotated: false, active: true },
      { id: 2, type: 'chapel', x: 9, y: 9, rotated: false, active: true },
    ]
    home.occupancy[5 * width + 5] = 1
    home.occupancy[9 * width + 9] = 2
    const migrated = migrateState(game, MIGRATIONS)
    expect(migrated.version).toBe(11)
    expect(migrated.islands[0].buildings.map((b) => b.type)).toEqual(['chapel'])
    expect(migrated.islands[0].occupancy[5 * width + 5]).toBe(0)
    expect(migrated.islands[0].occupancy[9 * width + 9]).toBe(2)
  })
})
