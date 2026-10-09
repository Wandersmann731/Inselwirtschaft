import { describe, expect, it } from 'vitest'
import { priceOf } from '../src/data'
import { placeBuilding } from '../src/sim/build'
import { runMarket } from '../src/sim/market'
import type { GameState } from '../src/sim/state'
import { grassField, patchBuilding, patchHouse } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

/** A house at (10,10) with the given residents, a food stand and a cloth stand next to it and a chapel nearby. */
function village(residents: number, stock: Record<string, number> = {}): GameState {
  let state = grassField(50, 30, { ...rich, coins: 1000 })
  state = placeBuilding(state, 'house_pioneers', 10, 10, false)
  state = placeBuilding(state, 'food_salt_stand', 14, 10, false)
  state = placeBuilding(state, 'cloth_stand', 14, 12, false)
  state = placeBuilding(state, 'chapel', 20, 10, false)
  state = patchHouse(state, 1, { residents })
  return { ...state, coins: 1000, stock: { food: 100, cloth: 100, ...stock } }
}

const house = (state: GameState) => state.buildings.find((b) => b.house)!.house!

describe('market', () => {
  it('sells food to the residents, takes it from the store and pays the price', () => {
    const state = village(8)
    const next = runMarket(state)
    expect(next.stock.food).toBeCloseTo(100 - 8 * 0.1)
    expect(next.coins).toBeCloseTo(1000 + 8 * 0.1 * priceOf('food') + 8 * 0.05 * priceOf('cloth'))
    expect(house(next).needs.food).toBe(100)
    expect(house(next).needs.cloth).toBe(100)
  })

  it('earns nothing and reports 0 % when the store has no food', () => {
    const next = runMarket(village(8, { food: 0 }))
    expect(house(next).needs.food).toBe(0)
    expect(next.coins).toBeCloseTo(1000 + 8 * 0.05 * priceOf('cloth'))
  })

  it('reports partial fulfilment when the store is short', () => {
    const next = runMarket(village(8, { food: 0.4 }))
    expect(house(next).needs.food).toBeCloseTo(50)
    expect(next.stock.food).toBeCloseTo(0)
  })

  it('sells nothing without a stand in reach', () => {
    let state = grassField(50, 30, { ...rich })
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = placeBuilding(state, 'food_salt_stand', 20, 10, false) // far away
    state = { ...patchHouse(state, 1, { residents: 8 }), coins: 1000, stock: { food: 100, cloth: 100 } }
    const next = runMarket(state)
    expect(house(next).needs.food).toBe(0)
    expect(next.coins).toBe(1000)
    expect(next.stock.food).toBe(100)
  })

  it('counts a stand whose range reaches one tile of the house', () => {
    let state = grassField(50, 30, { ...rich })
    state = placeBuilding(state, 'house_pioneers', 10, 10, false) // x 10..11
    state = placeBuilding(state, 'food_salt_stand', 15, 10, false) // 3 empty tiles between
    state = { ...patchHouse(state, 1, { residents: 8 }), coins: 1000, stock: { food: 100, cloth: 100 } }
    expect(house(runMarket(state)).needs.food).toBe(100)
    let far = grassField(50, 30, { ...rich })
    far = placeBuilding(far, 'house_pioneers', 10, 10, false)
    far = placeBuilding(far, 'food_salt_stand', 16, 10, false) // 4 empty tiles between
    far = { ...patchHouse(far, 1, { residents: 8 }), coins: 1000, stock: { food: 100, cloth: 100 } }
    expect(house(runMarket(far)).needs.food).toBe(0)
  })

  it('does not sell at a shut down stand', () => {
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
    expect(house(runMarket(patchBuilding(village(8), 4, { active: false }))).needs.chapel).toBe(0)
  })

  it('lets salt stand in for missing tobacco at citizen houses', () => {
    let state = village(28, { salt: 50, tobacco: 0, spices: 0 })
    state = patchHouse(state, 1, { tier: 'citizens' })
    const next = runMarket(state)
    expect(house(next).needs.tobacco).toBe(100)
    expect(house(next).needs.spices).toBe(100)
    expect(next.stock.salt).toBeLessThan(50)
  })

  it('shows 100 % for an empty house only if a stand in reach has the goods', () => {
    expect(house(runMarket(village(0))).needs.food).toBe(100)
    expect(house(runMarket(village(0, { food: 0 }))).needs.food).toBe(0)
  })

  it('leaves ruins and non-housing buildings alone', () => {
    const state = patchHouse(village(8), 1, { ruin: true })
    const next = runMarket(state)
    expect(next.coins).toBe(1000)
    expect(next.stock.food).toBe(100)
  })

  it('serves houses one after another until the store is empty', () => {
    let state = village(8)
    state = placeBuilding({ ...state, coins: 1_000_000, stock: { ...rich.stock } }, 'house_pioneers', 12, 13, false)
    state = patchHouse(state, 5, { residents: 8 })
    const next = runMarket({ ...state, stock: { food: 1, cloth: 100 } })
    const homes = next.buildings.filter((b) => b.house)
    expect(homes[0].house!.needs.food).toBe(100)
    expect(homes[1].house!.needs.food).toBeCloseTo(25)
  })
})
