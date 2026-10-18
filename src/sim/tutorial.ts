// Beginner tips: the next thing a new player should build, in the order of tutorial.json.
import { tutorial } from '../data'
import type { TutorialCondition, TutorialStep } from '../data'
import { isBuildingUnlocked, tierIndex } from './tiers'
import type { GameState } from './state'

/** What the conditions look at, gathered once over the player's islands. */
interface Realm {
  state: GameState
  types: Set<string>
  houses: number
  stocked: Set<string>
}

function survey(state: GameState): Realm {
  const types = new Set<string>()
  const stocked = new Set<string>()
  let houses = 0
  for (const island of state.islands) {
    if (!island.owned) continue
    for (const building of island.buildings) {
      types.add(building.type)
      if (building.house && !building.house.ruin) houses += 1
    }
    for (const [good, amount] of Object.entries(island.stock)) if (amount > 0) stocked.add(good)
  }
  return { state, types, houses, stocked }
}

function holds(realm: Realm, condition: TutorialCondition): boolean {
  if (condition.buildings && !condition.buildings.every((group) => group.some((type) => realm.types.has(type)))) return false
  if (condition.houses !== undefined && realm.houses < condition.houses) return false
  if (condition.unlocked && !isBuildingUnlocked(realm.state, condition.unlocked)) return false
  if (condition.tier && realm.state.highestTier < tierIndex(condition.tier)) return false
  if (condition.stock && !condition.stock.some((good) => realm.stocked.has(good))) return false
  return true
}

function met(realm: Realm, step: TutorialStep): boolean {
  if (realm.state.highestTier > tierIndex(step.tier)) return true
  return step.done.some((condition) => holds(realm, condition))
}

/** True if the goal of the tip is reached right now. */
export function isHintMet(state: GameState, step: TutorialStep): boolean {
  return met(survey(state), step)
}

/** The tip to show: the first one neither done before nor met now. Null when all are through. */
export function currentHint(state: GameState): TutorialStep | null {
  const realm = survey(state)
  return tutorial.find((step) => !state.hintsDone.includes(step.id) && !met(realm, step)) ?? null
}

/** Remembers every tip whose goal is reached, so it stays done when the condition later breaks (houses rise, a building is torn down). */
export function recordHints(state: GameState): GameState {
  const realm = survey(state)
  const reached = tutorial.filter((step) => !state.hintsDone.includes(step.id) && met(realm, step)).map((step) => step.id)
  return reached.length === 0 ? state : { ...state, hintsDone: [...state.hintsDone, ...reached] }
}

/** The player skips a tip, or closes the last one. */
export function skipHint(state: GameState, stepId: string): GameState {
  if (state.hintsDone.includes(stepId) || !tutorial.some((step) => step.id === stepId)) return state
  return { ...state, hintsDone: [...state.hintsDone, stepId] }
}

/** Position of the tip in the list, counting from 1, and the number of tips. */
export function hintProgress(stepId: string): { index: number; total: number } {
  return { index: tutorial.findIndex((step) => step.id === stepId) + 1, total: tutorial.length }
}
