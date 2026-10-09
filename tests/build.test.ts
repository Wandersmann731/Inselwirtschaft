import { describe, expect, it } from 'vitest'
import { config, getBuilding } from '../src/data'
import {
  checkPlacement,
  checkRoad,
  demolishAt,
  demolishTiles,
  footprint,
  placeBuilding,
  placeRoads,
} from '../src/sim/build'
import { testIsland } from './helpers'

describe('footprint', () => {
  it('swaps width and height when rotated', () => {
    const chapel = getBuilding('chapel')
    expect(footprint(chapel, false)).toEqual({ w: 2, h: 3 })
    expect(footprint(chapel, true)).toEqual({ w: 3, h: 2 })
  })
})

describe('placement rules', () => {
  it('allows a house on grass', () => {
    expect(checkPlacement(testIsland(), 'house_pioneers', 3, 3, false)).toBeNull()
  })

  it('rejects water and anything outside the map', () => {
    const state = testIsland()
    expect(checkPlacement(state, 'house_pioneers', 0, 0, false)?.code).toBe('water')
    expect(checkPlacement(state, 'food_salt_stand', -1, 3, false)?.code).toBe('outOfMap')
    expect(checkPlacement(state, 'food_salt_stand', 19, 3, false)?.code).toBe('water')
    expect(checkPlacement(state, 'food_salt_stand', 3, 14, false)?.code).toBe('outOfMap')
  })

  it('rejects a house that only partly covers water', () => {
    // x = 0..2 covers water column 0
    expect(checkPlacement(testIsland(), 'house_pioneers', 0, 3, false)?.code).toBe('water')
  })

  it('rejects mountain for normal buildings and for roads', () => {
    const state = testIsland()
    expect(checkPlacement(state, 'house_pioneers', 12, 6, false)?.code).toBe('mountain')
    expect(checkRoad(state, 13, 7)?.code).toBe('mountain')
  })

  it('allows quarry and mine on mountain only', () => {
    const state = testIsland()
    expect(checkPlacement(state, 'quarry', 12, 6, false)).toBeNull()
    expect(checkPlacement(state, 'ore_mine', 13, 7, false)).toBeNull()
    expect(checkPlacement(state, 'quarry', 4, 3, false)?.code).toBe('notMountain')
    // partly on mountain
    expect(checkPlacement(state, 'quarry', 11, 6, false)?.code).toBe('notMountain')
    expect(checkPlacement(state, 'ore_mine', 3, 3, false)?.code).toBe('notMountain')
  })

  it('allows the Kontor only at the coast', () => {
    const state = testIsland()
    expect(checkPlacement(state, 'kontor', 3, 3, false)?.code).toBe('notCoast')
    // beach/grass at the western shore: footprint x 1..3 touches water at x = 0
    expect(checkPlacement(state, 'kontor', 1, 3, false)).toBeNull()
    // along the northern shore
    expect(checkPlacement(state, 'kontor', 5, 1, false)).toBeNull()
  })

  it('does not count a water tile touching only diagonally across a corner of the footprint as coast', () => {
    // footprint 2..4 x 2..4 on grass: nearest water is far away
    expect(checkPlacement(testIsland(), 'kontor', 2, 2, false)?.code).toBe('notCoast')
  })

  it('allows building on forest', () => {
    expect(checkPlacement(testIsland(), 'forester', 6, 5, false)).toBeNull()
  })

  it('rejects overlapping buildings and building on roads', () => {
    let state = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    expect(checkPlacement(state, 'house_pioneers', 4, 4, false)?.code).toBe('occupied')
    expect(checkPlacement(state, 'house_pioneers', 5, 3, false)).toBeNull()
    state = placeRoads(state, [{ x: 9, y: 9 }])
    expect(checkPlacement(state, 'food_salt_stand', 9, 9, false)?.code).toBe('occupied')
  })

  it('respects rotation for the footprint', () => {
    const state = testIsland()
    // chapel 2x3 at y=11 would reach y=13 (water row); rotated 3x2 fits
    expect(checkPlacement(state, 'chapel', 8, 11, false)?.code).toBe('water')
    expect(checkPlacement(state, 'chapel', 8, 11, true)).toBeNull()
  })
})

describe('costs', () => {
  it('pays coins and goods when building', () => {
    const state = testIsland({ coins: 1000, stock: { tools: 10, wood: 20, bricks: 0, marble: 0 } })
    const chapel = getBuilding('chapel')
    const next = placeBuilding(state, 'chapel', 3, 3, false)
    expect(next.coins).toBe(1000 - chapel.cost.coins)
    expect(next.stock.tools).toBe(10 - chapel.cost.tools)
    expect(next.stock.wood).toBe(20 - chapel.cost.wood)
    expect(next.buildings).toHaveLength(1)
    expect(state.buildings).toHaveLength(0)
  })

  it('refuses to build without enough goods and reports what is missing', () => {
    const state = testIsland({ coins: 20000, stock: { tools: 50, wood: 100, bricks: 100, marble: 5 } })
    expect(checkPlacement(state, 'cathedral', 3, 3, false)).toEqual({ code: 'funds', missing: 'marble' })
    expect(placeBuilding(state, 'cathedral', 3, 3, false)).toBe(state)
  })

  it('refuses to build without enough coins', () => {
    const state = testIsland({ coins: 10 })
    expect(checkPlacement(state, 'house_pioneers', 3, 3, false)).toEqual({ code: 'funds', missing: 'coins' })
  })

  it('marks every footprint tile with the building id', () => {
    const state = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    const id = state.buildings[0].id
    const { width } = state.map
    for (let y = 3; y < 5; y++) for (let x = 3; x < 5; x++) expect(state.occupancy[y * width + x]).toBe(id)
    expect(state.occupancy.filter((v) => v === id)).toHaveLength(4)
  })
})

describe('roads', () => {
  it('lays roads on valid tiles only and charges per tile', () => {
    const state = testIsland({ coins: 100 })
    const price = getBuilding('road').cost.coins
    const next = placeRoads(state, [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 0, y: 0 }, // water: skipped
      { x: 12, y: 6 }, // mountain: skipped
    ])
    expect(next.roads.filter((v) => v === 1)).toHaveLength(2)
    expect(next.coins).toBe(100 - 2 * price)
  })

  it('does not lay a road twice on the same tile', () => {
    const once = placeRoads(testIsland(), [{ x: 3, y: 3 }])
    const twice = placeRoads(once, [{ x: 3, y: 3 }])
    expect(twice.coins).toBe(once.coins)
  })

  it('stops when the coins run out', () => {
    const price = getBuilding('road').cost.coins
    const state = testIsland({ coins: price * 2 })
    const next = placeRoads(state, [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }])
    expect(next.roads.filter((v) => v === 1)).toHaveLength(2)
    expect(next.coins).toBe(0)
  })
})

describe('demolition', () => {
  it('removes a building and pays back half of its cost, rounded down', () => {
    const chapel = getBuilding('chapel')
    const built = placeBuilding(testIsland(), 'chapel', 3, 3, false)
    const razed = demolishAt(built, 4, 5) // any tile of the footprint
    expect(razed.buildings).toHaveLength(0)
    expect(razed.occupancy.every((v) => v === 0)).toBe(true)
    expect(razed.coins).toBe(built.coins + Math.floor(chapel.cost.coins * config.refundRate))
    expect(razed.stock.tools).toBe(built.stock.tools + Math.floor(chapel.cost.tools * 0.5))
    expect(razed.stock.wood).toBe(built.stock.wood + Math.floor(chapel.cost.wood * 0.5))
  })

  it('pays back exactly 50 percent of an even cost', () => {
    const built = placeBuilding(testIsland(), 'chapel', 3, 3, false) // 700 coins, 6 tools, 10 wood
    const razed = demolishAt(built, 3, 3)
    expect(razed.coins - built.coins).toBe(350)
    expect(razed.stock.tools - built.stock.tools).toBe(3)
    expect(razed.stock.wood - built.stock.wood).toBe(5)
  })

  it('removes a road and pays back part of it', () => {
    const built = placeRoads(testIsland(), [{ x: 3, y: 3 }])
    const razed = demolishAt(built, 3, 3)
    expect(razed.roads[3 * razed.map.width + 3]).toBe(0)
    expect(razed.coins).toBe(built.coins + Math.floor(getBuilding('road').cost.coins * 0.5))
  })

  it('leaves empty tiles and outside coordinates alone', () => {
    const state = testIsland()
    expect(demolishAt(state, 3, 3)).toBe(state)
    expect(demolishAt(state, -5, 99)).toBe(state)
  })

  it('demolishes several tiles in one go', () => {
    const built = placeRoads(testIsland(), [{ x: 3, y: 3 }, { x: 4, y: 3 }])
    const razed = demolishTiles(built, [{ x: 3, y: 3 }, { x: 4, y: 3 }])
    expect(razed.roads.every((v) => v === 0)).toBe(true)
  })
})
