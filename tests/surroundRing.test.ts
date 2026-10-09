import { describe, expect, it } from 'vitest'
import { buildingRing, surroundRing } from '../src/world/surroundings'
import { testIsland } from './helpers'

describe('surroundRing', () => {
  it('adds the free tiles next to a road and leaves the road itself out', () => {
    const state = testIsland()
    const { width } = state.map
    const roads = state.roads.slice()
    roads[5 * width + 8] = 1
    const ring = surroundRing(state.map, state.occupancy, roads)
    expect(ring[5 * width + 8]).toBe(0)
    expect(ring[5 * width + 9]).toBe(1)
    expect(ring[6 * width + 9]).toBe(1)
    expect(ring[5 * width + 11]).toBe(0)
  })

  it('keeps the tiles next to buildings and follows road changes', () => {
    const state = testIsland()
    const { width } = state.map
    const occupancy = state.occupancy.slice()
    occupancy[3 * width + 3] = 1
    const none = surroundRing(state.map, occupancy, state.roads)
    expect(none[3 * width + 4]).toBe(buildingRing(state.map, occupancy)[3 * width + 4])
    const roads = state.roads.slice()
    roads[8 * width + 8] = 1
    expect(surroundRing(state.map, occupancy, roads)[8 * width + 9]).toBe(1)
    expect(surroundRing(state.map, occupancy, roads)[3 * width + 4]).toBe(1)
  })
})
