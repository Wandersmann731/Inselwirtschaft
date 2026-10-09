import { config } from '../data'
import { generateIsland } from '../world/islandGenerator'
import type { GameMap } from '../world/terrain'

export type { GameMap }

/** Bump when the GameState shape changes and add a migration in migrations.ts. */
export const CURRENT_SAVE_VERSION = 2

export type GameSpeed = number

export interface GameState {
  version: number
  seed: number
  rngState: number
  tick: number
  speed: GameSpeed
  coins: number
  map: GameMap
}

export function createInitialState(seed: number = config.startSeed): GameState {
  return {
    version: CURRENT_SAVE_VERSION,
    seed,
    rngState: seed >>> 0,
    tick: 0,
    speed: config.defaultSpeed,
    coins: config.startCoins,
    map: generateIsland(seed),
  }
}
