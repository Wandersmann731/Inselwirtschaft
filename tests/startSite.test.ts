import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { createInitialState } from '../src/sim/state'
import { tick, setSpeed } from '../src/sim/tick'
import { createRng } from '../src/sim/rng'
import { findStartSite } from '../src/world/startSite'
import { generateWorld } from '../src/world/worldGenerator'
import { Terrain } from '../src/world/terrain'
import { stateFromRows } from './helpers'

describe('findStartSite', () => {
  it('finds a free grass area near the sea on every home island', () => {
    const { size, maxCoastDistance } = config.startSite
    for (const seed of [1, 2, 3, 7, 42, 99, 1234]) {
      const map = generateWorld(seed).islands[0].map
      const site = findStartSite(map)
      const half = Math.floor(size / 2)
      for (let y = site.y - half; y < site.y - half + size; y++) {
        for (let x = site.x - half; x < site.x - half + size; x++) {
          const terrain = map.tiles[y * map.width + x]
          expect([Terrain.Grass, Terrain.Beach], `seed ${seed} at ${x},${y}`).toContain(terrain)
        }
      }
      // some water within reach
      let near = false
      for (let dy = -maxCoastDistance; dy <= maxCoastDistance && !near; dy++) {
        for (let dx = -maxCoastDistance; dx <= maxCoastDistance; dx++) {
          const x = site.x + dx
          const y = site.y + dy
          if (x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] === Terrain.Water) near = true
        }
      }
      expect(near, `seed ${seed} near the sea`).toBe(true)
    }
  })

  it('is deterministic', () => {
    const map = generateWorld(5).islands[0].map
    expect(findStartSite(map)).toEqual(findStartSite(map))
  })

  it('falls back to the middle of the land if no big enough grass area exists', () => {
    const rows = ['~~~~~~~~', '~..MM..~', '~..MM..~', '~~~~~~~~']
    const map = stateFromRows(rows).map
    const site = findStartSite(map)
    expect(site.x).toBeGreaterThanOrEqual(1)
    expect(site.x).toBeLessThanOrEqual(6)
    expect(site.y).toBeGreaterThanOrEqual(1)
    expect(site.y).toBeLessThanOrEqual(2)
  })
})

describe('new game options', () => {
  it('starts with the chosen coins and the chosen seed', () => {
    const state = createInitialState(77, 25000)
    expect(state.coins).toBe(25000)
    expect(state.seed).toBe(77)
    expect(createInitialState(77).coins).toBe(config.startCoins)
  })

  it('offers the start coin choices including the default', () => {
    expect(config.startCoinOptions).toContain(config.startCoins)
  })

  it('allows the debug speeds and rejects unknown ones', () => {
    const state = createInitialState(1)
    for (const speed of config.debugSpeeds) expect(setSpeed(state, speed).speed).toBe(speed)
    expect(setSpeed(state, 7)).toBe(state)
    expect(tick(state, createRng(1)).tick).toBe(1)
  })
})
