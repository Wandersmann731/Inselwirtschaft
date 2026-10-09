import { describe, expect, it } from 'vitest'
import { config, world } from '../src/data'
import { CURRENT_SAVE_VERSION, createInitialState } from '../src/sim/state'
import { generateIsland } from '../src/world/islandGenerator'

describe('createInitialState', () => {
  it('starts with the world, start coins and tick 0', () => {
    const state = createInitialState(3)
    expect(state.tick).toBe(0)
    expect(state.coins).toBe(config.startCoins)
    expect(state.coins).toBe(10000)
    expect(state.version).toBe(CURRENT_SAVE_VERSION)
    expect(state.seed).toBe(3)
    expect(state.islands).toHaveLength(world.archipelago.length)
  })

  it('gives the home island the start stock and an empty economy', () => {
    const home = createInitialState(3).islands[0]
    expect(home.owned).toBe(true)
    expect(home.stock).toEqual(config.startStock)
    expect(home.economy.last).toBeNull()
    expect(home.map).toEqual(generateIsland(3, world.archipelago[0].size))
  })

  it('survives a JSON round trip unchanged', () => {
    const state = createInitialState(9)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it('is the same world for the same seed', () => {
    expect(createInitialState(4)).toEqual(createInitialState(4))
    expect(createInitialState(4).islands[0].map).not.toEqual(createInitialState(5).islands[0].map)
  })
})
