// The goal of a game: a number of residents in houses of a tier or higher (scenario.json). Reaching it ends nothing:
// the screen shows a summary once and the game goes on.
import { scenario } from '../data'
import type { GameState } from './state'
import { residentsFromTier } from './tiers'

/** How far the realm is: residents that count for the goal and how many it takes. */
export function goalProgress(state: GameState): { have: number; need: number } {
  return { have: Math.floor(residentsFromTier(state, scenario.goal.tier)), need: scenario.goal.residents }
}

/** Notes the tick at which the goal was reached. It stays reached when residents leave again. */
export function checkGoal(state: GameState): GameState {
  if (state.goalReachedTick !== null) return state
  const { have, need } = goalProgress(state)
  return have >= need ? { ...state, goalReachedTick: state.tick } : state
}

/** The player has seen the end screen and plays on. */
export function closeGoal(state: GameState): GameState {
  return state.goalReachedTick === null || state.goalClosed ? state : { ...state, goalClosed: true }
}
