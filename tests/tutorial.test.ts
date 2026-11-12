import { describe, expect, it } from 'vitest'
import { getBuilding, tutorial } from '../src/data'
import { migrateState } from '../src/sim/migrations'
import { createNewGame } from '../src/sim/newGame'
import { createProduction } from '../src/sim/productionState'
import { createRng } from '../src/sim/rng'
import { CURRENT_SAVE_VERSION, type GameState, type PlacedBuilding } from '../src/sim/state'
import { tick } from '../src/sim/tick'
import { createHouse, tierIndex } from '../src/sim/tiers'
import { toIslandState } from '../src/sim/islands'
import { chapterOf, currentHint, hintProgress, offeredBuilding, recordHints, skipHint } from '../src/sim/tutorial'

/** Puts buildings on the home island. The tips only look at their types and houses, not at the spot. */
function withBuildings(game: GameState, types: string[], residents = 0): GameState {
  const home = game.islands[0]
  let nextId = home.nextBuildingId
  const added: PlacedBuilding[] = types.map((type) => {
    const tier = getBuilding(type).houseTier
    return {
      id: nextId++,
      type,
      x: 0,
      y: 0,
      rotated: false,
      active: true,
      house: tier ? { ...createHouse(tier), residents } : undefined,
    }
  })
  const island = { ...home, buildings: [...home.buildings, ...added], nextBuildingId: nextId }
  return { ...game, islands: [island, ...game.islands.slice(1)] }
}

const houses = (count: number): string[] => new Array(count).fill('house_pioneers')

describe('beginner tips', () => {
  it('start with building pioneer houses', () => {
    expect(currentHint(createNewGame(1))?.id).toBe('houses')
  })

  it('ask for food once the first houses stand, then wood and cloth', () => {
    let game = withBuildings(createNewGame(1), houses(4))
    expect(currentHint(game)?.id).toBe('food')
    game = withBuildings(game, ['fishery'])
    expect(currentHint(game)?.id).toBe('wood')
    game = withBuildings(game, ['forester'])
    expect(currentHint(game)?.id).toBe('cloth')
  })

  it('wait for a producer to be connected by road before moving on', () => {
    const base = withBuildings(createNewGame(1), [...houses(4), 'fishery'])
    const withStatus = (kind: 'noRoad' | 'noHub' | 'producing'): GameState => {
      const home = base.islands[0]
      const buildings = home.buildings.map((b) => (b.type === 'fishery' ? { ...b, production: { ...createProduction(), status: { kind } } } : b))
      return { ...base, islands: [{ ...home, buildings }, ...base.islands.slice(1)] }
    }
    expect(currentHint(withStatus('noRoad'))?.id).toBe('food')
    expect(currentHint(withStatus('noHub'))?.id).toBe('food')
    expect(currentHint(withStatus('producing'))?.id).toBe('wood')
  })

  it('need both the wool farm and the weaver for cloth, or a tannery for leather', () => {
    const base = withBuildings(createNewGame(1), [...houses(4), 'fishery', 'forester'])
    expect(currentHint(withBuildings(base, ['weaver']))?.id).toBe('cloth')
    expect(currentHint(withBuildings(base, ['sheep_farm', 'weaver']))?.id).toBe('grow')
    expect(currentHint(withBuildings(base, ['tannery']))?.id).toBe('grow')
  })

  it('skip a tip whose goal was reached out of order', () => {
    const game = withBuildings(createNewGame(1), [...houses(4), 'forester'])
    expect(currentHint(game)?.id).toBe('food')
    expect(currentHint(withBuildings(game, ['fishery']))?.id).toBe('cloth')
  })

  it('ask for the chapel once enough pioneers live on the island', () => {
    const base = withBuildings(createNewGame(1), [...houses(4), 'fishery', 'forester', 'sheep_farm', 'weaver'])
    const threshold = getBuilding('chapel').unlock!.residents
    expect(currentHint(base)?.id).toBe('grow')
    const grown = withBuildings(base, houses(Math.ceil(threshold / 8)), 8)
    expect(currentHint(grown)?.id).toBe('chapel')
  })

  it('count every tip below the highest tier reached as done', () => {
    const game = { ...createNewGame(1), highestTier: tierIndex('settlers') }
    expect(currentHint(game)?.id).toBe('tavern')
  })

  it('accept bought salt instead of a saltworks', () => {
    const base = withBuildings({ ...createNewGame(1), highestTier: tierIndex('settlers') }, ['tavern', 'potato_farm'])
    expect(currentHint(base)?.id).toBe('salt')
    const home = base.islands[0]
    const bought = { ...base, islands: [{ ...home, stock: { ...home.stock, salt: 5 } }, ...base.islands.slice(1)] }
    expect(currentHint(bought)?.id).toBe('riseCitizens')
  })

  it('ask for the church only once citizens live in the town: it is what lets them rise', () => {
    const citizens = withBuildings({ ...createNewGame(1), highestTier: tierIndex('citizens') }, ['toolmaker', 'stonemason', 'tobacco_factory'])
    // settlers' tips are through with the rise; the church is still locked, so the tip says how to get it
    expect(currentHint(citizens)?.id).toBe('growSettlers')
    expect(chapterOf(citizens, 'church').map((entry) => entry.step.id)).toEqual(['tools', 'bricks', 'citizenGoods', 'growSettlers', 'church', 'riseMerchants'])
  })

  it('keep a reached goal done when the condition later breaks', () => {
    const built = withBuildings(createNewGame(1), [...houses(4), 'fishery'])
    const recorded = recordHints(built)
    expect(recorded.hintsDone).toEqual(['houses', 'food'])
    // the fishery is torn down again: the tip does not come back
    const torn = { ...recorded, islands: [{ ...recorded.islands[0], buildings: recorded.islands[0].buildings.filter((b) => b.type !== 'fishery') }, ...recorded.islands.slice(1)] }
    expect(currentHint(torn)?.id).toBe('wood')
  })

  it('return the same state when nothing new was reached', () => {
    const game = createNewGame(1)
    expect(recordHints(game)).toBe(game)
  })

  it('let the player skip a tip, once', () => {
    const game = skipHint(createNewGame(1), 'houses')
    expect(game.hintsDone).toEqual(['houses'])
    expect(currentHint(game)?.id).toBe('food')
    expect(skipHint(game, 'houses')).toBe(game)
    expect(skipHint(game, 'unknown')).toBe(game)
  })

  it('end with the last tip, which only goes when closed', () => {
    const all = tutorial.slice(0, -1).map((step) => step.id)
    const game = { ...createNewGame(1), hintsDone: all }
    expect(currentHint(game)?.id).toBe('finished')
    expect(currentHint(skipHint(game, 'finished'))).toBeNull()
  })

  it('are recorded by the economy cycle', () => {
    let game = withBuildings(createNewGame(1), houses(4))
    for (let i = 0; i < 60; i++) game = tick(game, createRng(game.rngState))
    expect(game.hintsDone).toContain('houses')
  })

  it('only name buildings and tiers that exist', () => {
    for (const step of tutorial) {
      tierIndex(step.tier)
      for (const id of step.build ?? []) getBuilding(id)
      for (const condition of step.done) {
        condition.buildings?.flat().forEach((id) => getBuilding(id))
        if (condition.unlocked) getBuilding(condition.unlocked)
        if (condition.tier) tierIndex(condition.tier)
      }
    }
    expect(new Set(tutorial.map((step) => step.id)).size).toBe(tutorial.length)
    expect(hintProgress('food')).toEqual({ index: 2, total: tutorial.length })
  })

  it('come into old saves through the migration', () => {
    const old = { ...createNewGame(1), version: 13 } as Record<string, unknown>
    delete old.hintsDone
    const migrated = migrateState(old)
    expect(migrated.hintsDone).toEqual([])
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
  })
})

describe('what a tip offers to build', () => {
  const step = (id: string) => tutorial.find((entry) => entry.id === id)!
  const home = (game: GameState) => toIslandState({ ...game, highestTier: tierIndex('citizens') }, 0)

  it('offers the first building of the tip that is missing', () => {
    const game = createNewGame(1)
    expect(offeredBuilding(step('cloth'), home(game))).toBe('sheep_farm')
    expect(offeredBuilding(step('cloth'), home(withBuildings(game, ['sheep_farm'])))).toBe('weaver')
  })

  it('offers no tobacco factory where no tobacco grows', () => {
    // the home island lies in the north: no tobacco land, no spices
    expect(offeredBuilding(step('citizenGoods'), home(createNewGame(1)))).toBeNull()
  })

  it('offers the factory once tobacco leaves are in the store', () => {
    const game = createNewGame(1)
    const stocked = { ...game, islands: [{ ...game.islands[0], stock: { ...game.islands[0].stock, tobacco_leaf: 10 } }, ...game.islands.slice(1)] }
    expect(offeredBuilding(step('citizenGoods'), home(stocked))).toBe('tobacco_factory')
  })
})

describe('the goals of a chapter', () => {
  it('lists the tips of the same tier and ticks the reached ones', () => {
    const game = withBuildings(createNewGame(1), houses(4))
    const chapter = chapterOf(game, 'food')
    expect(chapter.map((entry) => entry.step.tier)).toEqual(new Array(chapter.length).fill('pioneers'))
    expect(chapter.find((entry) => entry.step.id === 'houses')!.done).toBe(true)
    expect(chapter.find((entry) => entry.step.id === 'food')!.done).toBe(false)
  })

  it('counts a skipped tip as done', () => {
    const chapter = chapterOf(skipHint(createNewGame(1), 'houses'), 'houses')
    expect(chapter[0].done).toBe(true)
  })
})

