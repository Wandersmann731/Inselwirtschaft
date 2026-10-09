import { describe, expect, it } from 'vitest'
import { ambienceLevels, chapelNear, eventsBetween, terrainShares, townLoop, workLevels } from '../src/audio/mix'
import { placeBuilding, placeRoads, demolishAt } from '../src/sim/build'
import { liftIsland } from '../src/sim/islands'
import { createInitialState } from '../src/sim/state'
import { createRng } from '../src/sim/rng'
import { tick } from '../src/sim/tick'
import { grassField, patchHouse, stateFromRows, testIsland } from './helpers'
import type { Ship } from '../src/sim/state'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 } }

describe('terrainShares', () => {
  it('adds up to 1 and reports what is around a tile', () => {
    const island = testIsland()
    const shares = terrainShares(island, 8, 6)
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(shares.grass).toBeGreaterThan(0.4)
    expect(terrainShares(island, 1, 1).water).toBeGreaterThan(0.3)
  })

  it('counts everything outside the map as sea', () => {
    expect(terrainShares(grassField(10, 10), -30, -30).water).toBe(1)
  })
})

describe('ambienceLevels', () => {
  it('is loud with sea at the coast and quiet inland', () => {
    const island = grassField(60, 60)
    const coast = { ...island, map: { ...island.map, tiles: island.map.tiles.map((t, i) => (i % 60 < 12 ? 0 : t)) } }
    expect(ambienceLevels(coast, 12, 30).amb_sea).toBeGreaterThan(0.5)
    expect(ambienceLevels(coast, 45, 30).amb_sea).toBe(0)
    expect(ambienceLevels(coast, 45, 30).amb_meadow).toBeGreaterThan(0.5)
  })

  it('plays forest and mountain sounds over trees and mountains', () => {
    const forest = stateFromRows(Array.from({ length: 20 }, () => 'T'.repeat(20)))
    expect(ambienceLevels(forest, 10, 10).amb_forest).toBe(1)
    const mountain = stateFromRows(Array.from({ length: 20 }, () => 'M'.repeat(20)))
    expect(ambienceLevels(mountain, 10, 10).amb_mountain).toBe(1)
  })

  it('picks the town loop by the number of residents and only near houses', () => {
    expect(townLoop(0)).toBeNull()
    expect(townLoop(60)).toBe('amb_town_small')
    expect(townLoop(400)).toBe('amb_town_medium')
    expect(townLoop(5000)).toBe('amb_town_large')
    let island = grassField(50, 50, { ...rich })
    island = placeBuilding(island, 'house_pioneers', 20, 20, false)
    island = patchHouse(island, 1, { residents: 8 })
    expect(ambienceLevels(island, 21, 21).amb_town_small).toBeGreaterThan(0)
    expect(ambienceLevels(island, 2, 2).amb_town_small).toBeUndefined()
  })

  it('adds the harbour sound at a Kontor and cold wind on polar islands', () => {
    let island = grassField(50, 50, { ...rich })
    island = { ...island, map: { ...island.map, tiles: island.map.tiles.map((t, i) => (i % 50 === 0 ? 0 : t)) } }
    island = placeBuilding(island, 'kontor', 1, 20, false)
    expect(ambienceLevels(island, 2, 21).amb_harbour).toBeGreaterThan(0.5)
    expect(ambienceLevels({ ...island, climate: 'polar' }, 2, 21).amb_cold).toBeGreaterThan(0)
    expect(ambienceLevels(island, 2, 21).amb_cold).toBeUndefined()
  })
})

describe('workLevels', () => {
  function working() {
    let state = grassField(40, 12, { ...rich })
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = placeRoads(state, [4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    let game = liftIsland(state)
    for (let i = 0; i < 40; i++) game = tick(game, createRng(game.rngState))
    return { ...state, ...game.islands[0], coins: game.coins }
  }

  it('plays the work loop of a running building near the camera, louder when closer', () => {
    const island = working()
    const near = workLevels(island, 9, 3).work_forester
    const far = workLevels(island, 16, 3).work_forester
    expect(near).toBeGreaterThan(0)
    expect(far === undefined || near > far).toBe(true)
  })

  it('is silent far away, for shut down buildings and for the limit', () => {
    const island = working()
    expect(workLevels(island, 35, 3)).toEqual({})
    const off = { ...island, buildings: island.buildings.map((b) => ({ ...b, active: false })) }
    expect(workLevels(off, 9, 3)).toEqual({})
    expect(Object.keys(workLevels(island, 9, 3, 0))).toHaveLength(0)
  })

  it('hears a chapel from afar', () => {
    let island = grassField(60, 60, { ...rich })
    island = placeBuilding(island, 'chapel', 10, 10, false)
    expect(chapelNear(island, 25, 12)).toBe(true)
    expect(chapelNear(island, 55, 55)).toBe(false)
  })
})

describe('eventsBetween', () => {
  const game = () => createInitialState(1)
  const owned = (state: ReturnType<typeof game>) => state.islands.find((i) => i.owned)!

  it('says nothing for an unchanged game', () => {
    const state = game()
    expect(eventsBetween(state, state)).toEqual([])
  })

  it('reports building, roads and demolishing once each', () => {
    const before = liftIsland(grassField(30, 30, { ...rich, coins: 1e6 }))
    let island = placeBuilding(grassField(30, 30, { ...rich, coins: 1e6 }), 'house_pioneers', 5, 5, false)
    const built = liftIsland(island)
    expect(eventsBetween(before, built)).toContain('build_place')
    island = placeRoads(island, [{ x: 10, y: 10 }, { x: 11, y: 10 }])
    expect(eventsBetween(built, liftIsland(island))).toEqual(['build_road'])
    const razed = liftIsland(demolishAt(island, 5, 5))
    expect(eventsBetween(liftIsland(island), razed)).toContain('build_demolish')
  })

  it('reports tier changes, ruins and the first reach of a new tier', () => {
    let island = placeBuilding(grassField(30, 30, { ...rich }), 'house_pioneers', 5, 5, false)
    const base = liftIsland(island)
    const up = liftIsland(patchHouse(island, 1, { tier: 'settlers' }))
    expect(eventsBetween(base, up)).toContain('pop_tier_up')
    expect(eventsBetween(up, base)).toContain('pop_tier_down')
    island = patchHouse(island, 1, { tier: 'aristocrats' })
    const ruined = liftIsland(patchHouse(island, 1, { ruin: true }))
    expect(eventsBetween(liftIsland(island), ruined)).toContain('build_ruin')
    expect(eventsBetween(base, { ...base, highestTier: 4 })).toContain('pop_new_tier_unlocked')
  })

  it('warns when the coins drop below zero but not while already in debt', () => {
    const state = game()
    expect(eventsBetween(state, { ...state, coins: -5 })).toContain('ui_warning')
    expect(eventsBetween({ ...state, coins: -5 }, { ...state, coins: -50 })).not.toContain('ui_warning')
  })

  it('reports ships leaving, arriving and founding a colony', () => {
    const state = game()
    const ship: Ship = { id: 1, name: 'S', capacity: 60, cargo: {}, island: 0, x: 0, y: 0, path: [], destination: null, routeId: null, stopIndex: 0 }
    const docked = { ...state, ships: [ship] }
    expect(eventsBetween(state, docked)).toContain('trade_ship_built')
    const sailing = { ...docked, ships: [{ ...ship, island: null, destination: 2 }] }
    expect(eventsBetween(docked, sailing)).toContain('trade_ship_horn')
    expect(eventsBetween(sailing, docked)).toEqual(expect.arrayContaining(['trade_ship_horn', 'trade_anchor']))
    const founded = { ...state, islands: state.islands.map((i) => (i.id === 2 ? { ...i, owned: true } : i)) }
    expect(eventsBetween(state, founded)).toContain('trade_colony')
    expect(owned(state).owned).toBe(true)
  })

  it('plays the coin sound when the settled income rises', () => {
    const state = game()
    const ledger = { income: 40, upkeep: 10, produced: {}, consumed: {} }
    const later = { ...state, islands: state.islands.map((i) => (i.id === 0 ? { ...i, economy: { ...i.economy, last: ledger } } : i)) }
    expect(eventsBetween(state, later)).toContain('ui_coin')
  })
})
