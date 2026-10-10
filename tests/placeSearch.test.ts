import { describe, expect, it } from 'vitest'
import { checkPlacement, placeBuilding } from '../src/sim/build'
import { nearestSpot, originAt } from '../src/game/placeSearch'
import { grassField } from './helpers'

const rich = { coins: 100_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

describe('nearest spot for the ghost building', () => {
  it('keeps the centre when it is free', () => {
    const state = grassField(30, 30, rich)
    expect(nearestSpot(state, 'forester', false, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 })
  })

  it('moves next to an occupied centre onto a valid spot', () => {
    const state = placeBuilding(grassField(30, 30, rich), 'forester', 9, 9, false)
    const spot = nearestSpot(state, 'forester', false, { x: 10, y: 10 })!
    expect(spot).not.toEqual({ x: 10, y: 10 })
    const origin = originAt('forester', false, spot)
    expect(checkPlacement(state, 'forester', origin.x, origin.y, false)).toBeNull()
    expect(Math.max(Math.abs(spot.x - 10), Math.abs(spot.y - 10))).toBeLessThanOrEqual(2)
  })

  it('prefers spots inside the reach of a market house', () => {
    let state = grassField(60, 30, rich)
    state = placeBuilding(state, 'market_house', 34, 10, false)
    const spot = nearestSpot(state, 'forester', false, { x: 10, y: 10 }, 20)!
    // the centre lies just outside the reach (22 tiles from x 34): a spot a little closer is chosen
    expect(spot.x).toBeGreaterThan(10)
  })

  it('also offers a spot when money is short, so the ghost can say what is missing', () => {
    const state = grassField(30, 30, { coins: 0 })
    expect(nearestSpot(state, 'forester', false, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 })
  })
})
