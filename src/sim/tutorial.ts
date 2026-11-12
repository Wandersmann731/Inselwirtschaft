// Beginner tips: the next thing a new player should build, in the order of tutorial.json.
import { buildings, getBuilding, tutorial } from '../data'
import type { BuildingDef, TutorialCondition, TutorialStep } from '../data'
import { buildingBlocker } from './build'
import { isBuildingUnlocked, tierIndex } from './tiers'
import type { GameState, IslandState, PlacedBuilding } from './state'

/** What the conditions look at, gathered once over the player's islands. */
interface Realm {
  state: GameState
  types: Set<string>
  houses: number
  stocked: Set<string>
}

/** False for a producer that cannot deliver yet: no road to a store, or no trading post or market house in reach. */
export function isConnected(building: PlacedBuilding): boolean {
  const kind = building.production?.status.kind
  return kind !== 'noRoad' && kind !== 'noHub'
}

function survey(state: GameState): Realm {
  const types = new Set<string>()
  const stocked = new Set<string>()
  let houses = 0
  for (const island of state.islands) {
    if (!island.owned) continue
    for (const building of island.buildings) {
      // a producer without a road (or out of reach of a store) delivers nothing yet: its tip is not done
      if (!isConnected(building)) continue
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

/** True if the building could be placed on the island as far as unlocks, land and deposits go (debt aside). */
function canBuildHere(island: IslandState, def: BuildingDef): boolean {
  const blocker = buildingBlocker(island, def)
  return blocker === null || blocker.code === 'debt'
}

/**
 * True if every input of the building can be had on this island: it lies in the store, a producer of it stands
 * here or one could be built here. A tobacco factory on an island without tobacco land has nothing to work with.
 */
function hasSupply(island: IslandState, def: BuildingDef): boolean {
  return (def.inputs ?? []).every((input) =>
    [input.good, ...(input.alternatives ?? [])].some((good) => {
      if ((island.stock[good] ?? 0) > 0) return true
      const makers = buildings.filter((maker) => maker.output?.good === good || (maker.byproducts ?? []).some((extra) => extra.good === good))
      return makers.some((maker) => island.buildings.some((building) => building.type === maker.id) || canBuildHere(island, maker))
    }),
  )
}

/**
 * The building a tip offers on the island on screen: the first of its list that is missing here, can be built here
 * and would get its inputs here; else the first that can be built at all. Null if none fits (other island needed).
 */
export function offeredBuilding(step: TutorialStep, island: IslandState): string | null {
  const fitting = (step.build ?? []).filter((id) => {
    const def = getBuilding(id)
    return canBuildHere(island, def) && hasSupply(island, def)
  })
  return fitting.find((id) => !island.buildings.some((building) => building.type === id)) ?? fitting[0] ?? null
}

/** The tips that belong together: all of the tier of the given one, in order, each with whether it is done. */
export function chapterOf(state: GameState, stepId: string): { step: TutorialStep; done: boolean }[] {
  const tier = tutorial.find((step) => step.id === stepId)?.tier
  const realm = survey(state)
  return tutorial
    .filter((step) => step.tier === tier && step.done.length > 0)
    .map((step) => ({ step, done: state.hintsDone.includes(step.id) || met(realm, step) }))
}
