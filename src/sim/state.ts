import { config } from '../data'

/** Bump when the GameState shape changes and add a migration in migrations.ts. */
export const CURRENT_SAVE_VERSION = 1

export type GameSpeed = number

export interface GameMap {
  width: number
  height: number
  tiles: number[]
}

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
    map: { width: 0, height: 0, tiles: [] },
  }
}
