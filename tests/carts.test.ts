import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { deliveryPaths, shipmentShare } from '../src/render/carts'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { getLinks } from '../src/sim/logistics'
import type { IslandState } from '../src/sim/state'
import { grassField } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

/** A market house at (4, 4) and a sheep farm at (14, 4), joined by a road along y = 6 if `road` is set. */
function village(road: boolean): IslandState {
  let state = grassField(30, 20, { ...rich })
  state = placeBuilding(state, 'market_house', 4, 4, false)
  state = placeBuilding(state, 'sheep_farm', 14, 4, false)
  if (road) state = placeRoads(state, Array.from({ length: 12 }, (_, i) => ({ x: 4 + i, y: 6 })))
  return state
}

describe('cart paths', () => {
  it('lead from the producer to the store along the road, as long as the delivery takes', () => {
    const state = village(true)
    const farm = state.buildings.find((b) => b.type === 'sheep_farm')!
    const path = deliveryPaths(state).get(farm.id)!
    const link = getLinks(state).get(farm.id)!
    expect(link.kind).toBe('ok')
    if (link.kind !== 'ok') return
    expect(path.length).toBe(link.delay / config.production.ticksPerRoadTile)
    const { width } = state.map
    // every step goes to a neighbouring road tile
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs((path[i] % width) - (path[i - 1] % width))
      const dy = Math.abs(Math.floor(path[i] / width) - Math.floor(path[i - 1] / width))
      expect(dx + dy).toBe(1)
      expect(state.roads[path[i]]).toBe(1)
    }
    // starts at the farm (x 14..15), ends at the market house (x 4..5)
    expect(path[0] % width).toBeGreaterThanOrEqual(14)
    expect(path[path.length - 1] % width).toBeLessThanOrEqual(5)
  })

  it('has no path for a producer without a road', () => {
    const state = village(false)
    const farm = state.buildings.find((b) => b.type === 'sheep_farm')!
    expect(deliveryPaths(state).has(farm.id)).toBe(false)
  })

  it('places a delivery between start and end by the time left', () => {
    expect(shipmentShare(110, 10, 100)).toBe(0)
    expect(shipmentShare(110, 10, 105)).toBe(0.5)
    expect(shipmentShare(110, 10, 110)).toBe(1)
    expect(shipmentShare(110, 10, 130)).toBe(1)
  })
})
