import { describe, expect, it } from 'vitest'
import { getTier } from '../src/sim/tiers'
import { createNewGame } from '../src/sim/newGame'

describe('the trader town', () => {
  it('gets its Kontor, market house, church and tavern in a new game, before the player has any residents', () => {
    for (const seed of [1, 2, 42]) {
      const game = createNewGame(seed)
      const trader = game.islands.find((island) => island.role === 'trader')!
      const types = new Set(trader.buildings.map((building) => building.type))
      for (const type of ['kontor', 'market_house', 'church', 'tavern']) expect(types.has(type), `seed ${seed}: ${type}`).toBe(true)
    }
  })

  it('fills its houses with citizens and merchants as the tier data says', () => {
    const trader = createNewGame(1).islands.find((island) => island.role === 'trader')!
    const houses = trader.buildings.flatMap((building) => (building.house ? [building.house] : []))
    expect(houses.length).toBeGreaterThan(0)
    for (const house of houses) expect(house.residents).toBe(getTier(house.tier).residents)
  })
})
