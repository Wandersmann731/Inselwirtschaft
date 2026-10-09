import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { generateIsland } from '../src/world/islandGenerator'
import { CURRENT_SAVE_VERSION, createInitialState } from '../src/sim/state'

describe('createInitialState', () => {
  it('starts with the generated island, start coins and tick 0', () => {
    const state = createInitialState(3)
    expect(state.tick).toBe(0)
    expect(state.coins).toBe(config.startCoins)
    expect(state.coins).toBe(10000)
    expect(state.map).toEqual(generateIsland(3))
    expect(state.version).toBe(CURRENT_SAVE_VERSION)
    expect(state.seed).toBe(3)
  })

  it('survives a JSON round trip unchanged', () => {
    const state = createInitialState(9)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})
