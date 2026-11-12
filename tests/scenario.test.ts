import { describe, expect, it } from 'vitest'
import { scenario } from '../src/data'
import { createNewGame } from '../src/sim/newGame'
import { checkGoal, closeGoal, goalProgress } from '../src/sim/scenario'
import type { GameState } from '../src/sim/state'
import { createHouse, getTier, previousTier } from '../src/sim/tiers'

/** A game with one house of the given tier holding the given residents on the home island. */
function withHouse(tier: string, residents: number): GameState {
  const game = createNewGame(1)
  const home = game.islands[0]
  const house = { id: 900, type: 'house_pioneers', x: 0, y: 0, rotated: false, active: true, house: { ...createHouse(tier), residents } }
  return { ...game, tick: 1234, islands: [{ ...home, buildings: [...home.buildings, house] }, ...game.islands.slice(1)] }
}

describe('the goal of the game', () => {
  const { tier, residents } = scenario.goal

  it('counts residents of the tier and of higher ones, not of lower ones', () => {
    expect(goalProgress(withHouse(tier, 20))).toEqual({ have: 20, need: residents })
    const lower = previousTier(tier)
    if (lower) expect(goalProgress(withHouse(lower.id, 20)).have).toBe(0)
    expect(getTier(tier).id).toBe(tier)
  })

  it('is noted with its tick once enough residents live there, and stays reached', () => {
    const short = withHouse(tier, residents - 1)
    expect(checkGoal(short)).toBe(short)
    const reached = checkGoal(withHouse(tier, residents))
    expect(reached.goalReachedTick).toBe(1234)
    // residents leave again later: the goal is not taken back
    const later = { ...reached, tick: 5000, islands: withHouse(tier, 3).islands }
    expect(checkGoal(later).goalReachedTick).toBe(1234)
  })

  it('shows its end screen until the player plays on', () => {
    const fresh = withHouse(tier, 0)
    expect(closeGoal(fresh)).toBe(fresh)
    const closed = closeGoal(checkGoal(withHouse(tier, residents)))
    expect(closed.goalClosed).toBe(true)
    expect(closeGoal(closed)).toBe(closed)
  })
})
