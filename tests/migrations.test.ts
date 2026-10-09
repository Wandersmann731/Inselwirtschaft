import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { emptyLedger } from '../src/sim/ledger'
import { MIGRATIONS, migrateState } from '../src/sim/migrations'
import { CURRENT_SAVE_VERSION, createInitialState } from '../src/sim/state'
import { generateIsland } from '../src/world/islandGenerator'

/** A save as the game wrote it before the archipelago: everything of the single island at the top. */
function oldSave(version: number, seed = 5, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const map = generateIsland(seed)
  return {
    version,
    seed,
    rngState: seed,
    tick: 7,
    speed: 1,
    coins: 8000,
    stock: { ...config.startStock },
    map,
    buildings: [],
    nextBuildingId: 1,
    highestTier: 0,
    economy: { current: emptyLedger(), last: null },
    occupancy: new Array(map.tiles.length).fill(0),
    roads: new Array(map.tiles.length).fill(0),
    ...overrides,
  }
}

const building = (id: number, type: string, extra: object = {}) => ({
  id,
  type,
  x: id,
  y: id,
  rotated: false,
  active: true,
  ...extra,
})

describe('migrateState', () => {
  it('upgrades a version 1 save by generating the island from its seed', () => {
    const v1 = { version: 1, seed: 5, rngState: 5, tick: 40, speed: 1, coins: 9000, map: { width: 0, height: 0, tiles: [] } }
    const migrated = migrateState(v1)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.tick).toBe(40)
    expect(migrated.coins).toBe(9000)
    expect(migrated.islands[0].map).toEqual(generateIsland(5))
  })

  it('returns a current save unchanged', () => {
    const state = createInitialState(1)
    expect(migrateState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('applies migrations in order up to the target version', () => {
    const old = { version: 1, tick: 5, coins: 10 }
    const migrated = migrateState(
      old,
      {
        1: (data) => ({ ...data, added: 'a' }),
        2: (data) => ({ ...data, added: `${String(data.added)}b` }),
      },
      3,
    )
    expect(migrated).toMatchObject({ version: 3, tick: 5, added: 'ab' })
  })

  it('rejects saves from a newer game version', () => {
    expect(() => migrateState({ version: CURRENT_SAVE_VERSION + 1, tick: 0, coins: 0 })).toThrow()
  })

  it('rejects a missing migration step', () => {
    expect(() => migrateState({ version: 1, tick: 0, coins: 0 }, {}, 2)).toThrow()
  })

  it('rejects garbage', () => {
    expect(() => migrateState(null)).toThrow()
    expect(() => migrateState({ tick: 1 })).toThrow()
    expect(() => migrateState({ version: CURRENT_SAVE_VERSION })).toThrow()
  })
})

describe('migration from version 2', () => {
  it('adds stock, buildings and empty road and occupancy layers', () => {
    const map = generateIsland(5)
    const v2 = { version: 2, seed: 5, rngState: 5, tick: 7, speed: 1, coins: 8000, map }
    const migrated = migrateState(v2)
    const home = migrated.islands[0]
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.coins).toBe(8000)
    expect(home.buildings).toEqual([])
    expect(home.stock).toEqual(config.startStock)
    expect(home.occupancy).toHaveLength(map.tiles.length)
    expect(home.roads.every((v) => v === 0)).toBe(true)
  })
})

describe('migration from version 3', () => {
  it('gives producing buildings a production state and leaves others alone', () => {
    const v3 = oldSave(3, 5, { buildings: [building(1, 'forester'), building(2, 'house_pioneers')], nextBuildingId: 3 })
    const migrated = migrateState(v3, MIGRATIONS, 4) as unknown as { buildings: { production?: unknown }[]; version: number }
    expect(migrated.version).toBe(4)
    expect(migrated.buildings[0].production).toBeDefined()
    expect(migrated.buildings[1].production).toBeUndefined()
  })
})

describe('migration from version 5', () => {
  it('generates the world again but keeps time, coins and goods', () => {
    const old = oldSave(5, 5, {
      tick: 321,
      coins: 4242,
      stock: { wood: 7 },
      buildings: [building(1, 'house_pioneers')],
      nextBuildingId: 2,
    })
    const migrated = migrateState(old)
    const home = migrated.islands[0]
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.tick).toBe(321)
    expect(migrated.coins).toBe(4242)
    expect(home.stock).toEqual({ wood: 7 })
    expect(home.buildings).toEqual([])
    expect(home.occupancy.every((v) => v === 0)).toBe(true)
    expect(home.map).toEqual(generateIsland(5))
  })
})

describe('migration from version 6', () => {
  it('adds the ledger and the producer fields', () => {
    const production = { progress: 3, inputs: {}, output: 0, status: { kind: 'noRoad' }, shipments: [] }
    const v6 = oldSave(6, 5, { economy: undefined, buildings: [building(1, 'forester', { production })] })
    const migrated = migrateState(v6, MIGRATIONS, 7) as unknown as {
      economy: unknown
      buildings: { production: object }[]
    }
    expect(migrated.economy).toEqual({ current: { income: 0, upkeep: 0, produced: {}, consumed: {} }, last: null })
    expect(migrated.buildings[0].production).toMatchObject({ progress: 3, busyTicks: 0, utilization: 0 })
  })
})

describe('migration from version 7', () => {
  const old = oldSave(7, 5, {
    tick: 99,
    coins: 1234,
    highestTier: 2,
    stock: { wood: 9 },
    buildings: [building(1, 'house_pioneers')],
    nextBuildingId: 2,
  })

  it('turns the island into the owned home island and adds the other islands', () => {
    const migrated = migrateState(old)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.islands.length).toBeGreaterThan(1)
    const home = migrated.islands[0]
    expect(home.owned).toBe(true)
    expect(home.role).toBe('home')
    expect(home.map).toEqual(old.map)
    expect(home.buildings).toHaveLength(1)
    expect(home.stock).toEqual({ wood: 9 })
    expect(home.nextBuildingId).toBe(2)
    expect(migrated.islands.slice(1).every((island) => !island.owned)).toBe(true)
  })

  it('keeps the global values', () => {
    const migrated = migrateState(old)
    expect(migrated.tick).toBe(99)
    expect(migrated.coins).toBe(1234)
    expect(migrated.highestTier).toBe(2)
  })

  it('removes the island fields from the top level', () => {
    const migrated = migrateState(old) as unknown as Record<string, unknown>
    for (const key of ['map', 'buildings', 'stock', 'occupancy', 'roads', 'economy']) expect(key in migrated).toBe(false)
  })

  it('places the islands on the world map and lists them in the cells', () => {
    const migrated = migrateState(old)
    expect(migrated.world.placements).toHaveLength(migrated.islands.length)
    const ids = new Set(migrated.world.cells.filter((cell) => cell > 0))
    expect(ids.size).toBe(migrated.islands.length)
  })
})
