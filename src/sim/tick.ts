import { config } from '../data'
import { runCycle } from './cycle'
import { onEachIsland } from './islands'
import { processProduction } from './production'
import type { Rng } from './rng'
import type { GameSpeed, GameState } from './state'

/** Advances the simulation by one second of game time. Pure: returns a new state. */
export function tick(state: GameState, rng: Rng): GameState {
  const next = onEachIsland(
    { ...state, tick: state.tick + 1, rngState: rng.getState() },
    processProduction,
  )
  return next.tick % config.economyCycleTicks === 0 ? runCycle(next) : next
}

/** Returns a new state with the given speed. Unknown speeds are ignored. */
export function setSpeed(state: GameState, speed: GameSpeed): GameState {
  if (!config.speeds.includes(speed) || speed === state.speed) return state
  return { ...state, speed }
}
