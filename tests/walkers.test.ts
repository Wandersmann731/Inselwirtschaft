import { describe, expect, it } from 'vitest'
import { TickClock } from '../src/render/tickClock'
import { walkerStep, walkField, walkPath } from '../src/render/walkers'
import { placeBuilding } from '../src/sim/build'
import { buildingRect } from '../src/sim/coverage'
import type { IslandState } from '../src/sim/state'
import { grassField } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

/** A market house at (10, 4), a house at (2, 4) and a row of houses at x = 6 between them. */
function village(): IslandState {
  let state = grassField(24, 14, { ...rich })
  state = placeBuilding(state, 'market_house', 10, 4, false)
  state = placeBuilding(state, 'house_pioneers', 2, 4, false)
  for (const y of [2, 4, 6]) state = placeBuilding(state, 'house_pioneers', 6, y, false)
  return state
}

describe('ways of the residents', () => {
  it('lead from the house to the store around the buildings in between', () => {
    const state = village()
    const market = state.buildings.find((b) => b.type === 'market_house')!
    const house = state.buildings.find((b) => b.type === 'house_pioneers' && b.x === 2)!
    const path = walkPath(state, walkField(state, buildingRect(market)), buildingRect(house))!
    expect(path).not.toBeNull()
    const { width } = state.map
    for (const index of path) expect(state.occupancy[index]).toBe(0)
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs((path[i] % width) - (path[i - 1] % width))
      const dy = Math.abs(Math.floor(path[i] / width) - Math.floor(path[i - 1] / width))
      expect(dx + dy).toBe(1)
    }
    // the straight line is blocked by the row of houses: the way is longer than the gap
    expect(path.length).toBeGreaterThan(6)
    // it ends at the market house (x 10..11): on a tile beside it
    const last = path[path.length - 1]
    expect(Math.abs((last % width) - 10.5)).toBeLessThanOrEqual(1.5)
  })

  it('finds no way to a store that is too far to walk', () => {
    let state = grassField(90, 10, { ...rich })
    state = placeBuilding(state, 'market_house', 2, 4, false)
    state = placeBuilding(state, 'house_pioneers', 20, 4, false)
    state = placeBuilding(state, 'house_pioneers', 70, 4, false)
    const field = walkField(state, buildingRect(state.buildings[0]))
    expect(walkPath(state, field, buildingRect(state.buildings[1]))).not.toBeNull()
    expect(walkPath(state, field, buildingRect(state.buildings[2]))).toBeNull()
  })

  it('walks out, stays, walks back and is home for the rest of its round', () => {
    expect(walkerStep(0, 10, 4)).toEqual({ where: 'out', share: 0 })
    expect(walkerStep(5, 10, 4)).toEqual({ where: 'out', share: 0.5 })
    expect(walkerStep(12, 10, 4)).toEqual({ where: 'inside' })
    expect(walkerStep(14, 10, 4)).toEqual({ where: 'back', share: 1 })
    expect(walkerStep(19, 10, 4)).toEqual({ where: 'back', share: 0.5 })
    expect(walkerStep(30, 10, 4)).toEqual({ where: 'inside' })
  })
})

describe('tick clock', () => {
  it('runs on between two ticks and stands still in a pause', () => {
    const clock = new TickClock()
    expect(clock.ticks(10, 0)).toBe(10)
    expect(clock.ticks(11, 500)).toBe(11)
    // ticks take 500 ms now: half a tick later
    expect(clock.ticks(11, 750)).toBeCloseTo(11.5)
    // no new tick for a long time (paused): it waits at the end of the tick
    expect(clock.ticks(11, 60000)).toBe(12)
  })
})
