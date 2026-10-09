import { config, getBuilding } from '../data'
import { generateIsland } from '../world/islandGenerator'
import { emptyLedger } from './ledger'
import { createProduction } from './productionState'
import { createHouse } from './tiers'
import { CURRENT_SAVE_VERSION, createInitialState, type GameState } from './state'

type RawState = Record<string, unknown>
/** Upgrades a save from version N to N + 1. */
export type Migration = (data: RawState) => RawState

/** Key = version the migration upgrades from. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 had an empty map. v2 generates the island from the saved seed.
  1: (data) => ({ ...data, map: generateIsland(Number(data.seed)) }),
  // v3 adds the goods store, buildings and roads.
  2: (data) => {
    const tileCount = (data.map as { tiles: unknown[] }).tiles.length
    return {
      ...data,
      stock: { ...config.startStock },
      buildings: [],
      nextBuildingId: 1,
      occupancy: new Array(tileCount).fill(0),
      roads: new Array(tileCount).fill(0),
    }
  },
  // v4 gives producing buildings their production state.
  3: (data) => ({
    ...data,
    buildings: (data.buildings as { type: string }[]).map((building) =>
      getBuilding(building.type).output ? { ...building, production: createProduction() } : building,
    ),
  }),
  // v5 adds houses with residents and the highest tier reached.
  4: (data) => ({
    ...data,
    highestTier: 0,
    buildings: (data.buildings as { type: string }[]).map((building) => {
      const tier = getBuilding(building.type).houseTier
      return tier ? { ...building, house: createHouse(tier) } : building
    }),
  }),
  // v6 makes all houses 2x2 and the islands much larger. The old layout no longer fits:
  // the world is generated again from the seed and the buildings are gone. Time, coins and goods stay.
  5: (data) => {
    const fresh = createInitialState(Number(data.seed))
    return { ...fresh, tick: data.tick, speed: data.speed, coins: data.coins, stock: data.stock, rngState: data.rngState }
  },
  // v7 adds the economy ledger and the utilisation of producers.
  6: (data) => ({
    ...data,
    economy: { current: emptyLedger(), last: null },
    buildings: (data.buildings as { production?: object }[]).map((building) =>
      building.production
        ? { ...building, production: { busyTicks: 0, utilization: 0, ...building.production } }
        : building,
    ),
  }),
}

/** Brings a raw saved object up to the current version or throws if that is impossible. */
export function migrateState(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  targetVersion: number = CURRENT_SAVE_VERSION,
): GameState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Save data is not an object')
  let data = raw as RawState
  let version = data.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Save data has no valid version')
  }
  if (version > targetVersion) throw new Error(`Save version ${version} is newer than the game`)
  while (version < targetVersion) {
    const migrate = migrations[version]
    if (!migrate) throw new Error(`No migration from save version ${version}`)
    data = { ...migrate(data), version: version + 1 }
    version += 1
  }
  if (typeof data.tick !== 'number' || typeof data.coins !== 'number') {
    throw new Error('Save data is incomplete')
  }
  return data as unknown as GameState
}
