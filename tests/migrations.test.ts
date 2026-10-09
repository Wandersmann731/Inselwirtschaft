import { describe, expect, it } from 'vitest'
import { migrateState } from '../src/sim/migrations'
import { generateIsland } from '../src/world/islandGenerator'
import { CURRENT_SAVE_VERSION, createInitialState } from '../src/sim/state'

describe('migrateState', () => {
  it('upgrades a version 1 save by generating the island from its seed', () => {
    const v1 = {
      version: 1,
      seed: 5,
      rngState: 5,
      tick: 40,
      speed: 1,
      coins: 9000,
      map: { width: 0, height: 0, tiles: [] },
    }
    const migrated = migrateState(v1)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.tick).toBe(40)
    expect(migrated.coins).toBe(9000)
    expect(migrated.map).toEqual(generateIsland(5))
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
