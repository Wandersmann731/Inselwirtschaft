import { describe, expect, it } from 'vitest'
import { buildingRect, inRadius, suppliedHouses, tilesInRadius } from '../src/sim/coverage'
import { placeBuilding } from '../src/sim/build'
import { testIsland } from './helpers'

describe('radius from the building edge', () => {
  const stand = { x: 10, y: 10, w: 1, h: 1 }

  it('reaches radius tiles beyond the edge along an axis', () => {
    expect(inRadius(14, 10, stand, 4)).toBe(true) // 3 empty tiles in between
    expect(inRadius(15, 10, stand, 4)).toBe(false)
    expect(inRadius(6, 10, stand, 4)).toBe(true)
    expect(inRadius(5, 10, stand, 4)).toBe(false)
  })

  it('is round: far diagonal corners are outside', () => {
    expect(inRadius(13, 13, stand, 4)).toBe(true)
    expect(inRadius(14, 14, stand, 4)).toBe(false)
  })

  it('measures from the edge of a large building, not its centre', () => {
    const chapel = { x: 10, y: 10, w: 3, h: 4 }
    expect(inRadius(12 + 19, 11, chapel, 19)).toBe(true)
    expect(inRadius(12 + 20, 11, chapel, 19)).toBe(false)
    expect(inRadius(11, 13 + 19, chapel, 19)).toBe(true)
    expect(inRadius(11, 13 + 20, chapel, 19)).toBe(false)
  })

  it('lists tiles inside the map only', () => {
    const tiles = tilesInRadius({ x: 0, y: 0, w: 1, h: 1 }, 4, 20, 20)
    expect(tiles.every((t) => t.x >= 0 && t.y >= 0)).toBe(true)
    expect(tiles).toContainEqual({ x: 0, y: 0 })
    expect(tiles).toContainEqual({ x: 4, y: 0 })
    expect(tiles).not.toContainEqual({ x: 5, y: 0 })
  })
})

describe('suppliedHouses', () => {
  it('counts a house if at least one of its tiles is in range', () => {
    // house at 3..5 x 3..5, stand at 9,4: nearest house tile (5,4) has 3 empty tiles between
    let state = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    state = placeBuilding(state, 'food_salt_stand', 9, 4, false)
    const stand = state.buildings[1]
    expect(suppliedHouses(state, buildingRect(stand), 4)).toHaveLength(1)
  })

  it('ignores houses out of range and non-housing buildings', () => {
    let state = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    state = placeBuilding(state, 'forester', 6, 3, false)
    const farStand = { x: 11, y: 4, w: 1, h: 1 } // 5 empty tiles away from the house edge
    expect(suppliedHouses(state, farStand, 4)).toHaveLength(0)
  })
})
