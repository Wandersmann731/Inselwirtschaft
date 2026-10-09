import { generateIsland } from '../world/islandGenerator'
import { CURRENT_SAVE_VERSION, type GameState } from './state'

type RawState = Record<string, unknown>
/** Upgrades a save from version N to N + 1. */
export type Migration = (data: RawState) => RawState

/** Key = version the migration upgrades from. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 had an empty map. v2 generates the island from the saved seed.
  1: (data) => ({ ...data, map: generateIsland(Number(data.seed)) }),
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
