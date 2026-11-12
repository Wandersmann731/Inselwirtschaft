import { describe, expect, it } from 'vitest'
import { config, quests } from '../src/data'
import { migrateState } from '../src/sim/migrations'
import { createNewGame } from '../src/sim/newGame'
import { declineQuest, deliverQuest, questGoods, questReward, questSource, runQuests } from '../src/sim/quests'
import { createRng } from '../src/sim/rng'
import { CURRENT_SAVE_VERSION, type GameState } from '../src/sim/state'
import { createHouse } from '../src/sim/tiers'
import { basePrice } from '../src/sim/trade'

const CYCLE = config.economyCycleTicks

/** A game whose home island has residents, made the given goods in its last cycle and holds the given stock. */
function town(made: string[], stock: Record<string, number> = {}, residents = quests.minResidents): GameState {
  const game = createNewGame(1)
  const home = game.islands[0]
  const house = { id: 900, type: 'house_pioneers', x: 0, y: 0, rotated: false, active: true, house: { ...createHouse('pioneers'), residents } }
  const last = { income: 0, upkeep: 0, produced: Object.fromEntries(made.map((good) => [good, 3])), consumed: {} }
  const island = { ...home, buildings: [...home.buildings, house], stock: { ...home.stock, ...stock }, economy: { ...home.economy, last } }
  return { ...game, tick: quests.firstAfterCycles * CYCLE, islands: [island, ...game.islands.slice(1)] }
}

describe('orders of the trader town', () => {
  it('ask only for goods the player made in the last cycle', () => {
    expect(questGoods(town(['cloth', 'wool']))).toEqual(['cloth'])
    expect(questGoods(town([]))).toEqual([])
  })

  it('come after the first wait, for a listed amount and a reward above the trade price', () => {
    const game = town(['cloth'])
    const early = runQuests({ ...game, tick: game.tick - CYCLE }, createRng(7))
    expect(early.quest).toBeNull()
    const offered = runQuests(game, createRng(7))
    const quest = offered.quest!
    expect(quest.good).toBe('cloth')
    expect(quests.amounts).toContain(quest.amount)
    expect(quest.reward).toBe(questReward('cloth', quest.amount))
    expect(quest.reward).toBeGreaterThan(quest.amount * basePrice('cloth'))
    expect(quest.expires).toBe(game.tick + quests.durationCycles * CYCLE)
  })

  it('are drawn with the seeded generator: same seed, same order, and the generator moves on', () => {
    const game = town(['cloth', 'food', 'wood', 'tools'])
    const a = runQuests(game, createRng(game.rngState))
    const b = runQuests(game, createRng(game.rngState))
    expect(a.quest).toEqual(b.quest)
    expect(a.rngState).not.toBe(game.rngState)
  })

  it('wait for a town of some size and for a good to ask for', () => {
    expect(runQuests(town(['cloth'], {}, quests.minResidents - 1), createRng(1)).quest).toBeNull()
    expect(runQuests(town([]), createRng(1)).quest).toBeNull()
  })

  it('pay the reward and take the goods from the store on delivery', () => {
    const game = runQuests(town(['cloth'], { cloth: 50 }), createRng(3))
    const quest = game.quest!
    expect(questSource(game)?.id).toBe(game.islands[0].id)
    const done = deliverQuest(game)
    expect(done.coins).toBe(game.coins + quest.reward)
    expect(done.islands[0].stock.cloth).toBe(50 - quest.amount)
    expect(done.quest).toBeNull()
    expect(done.questsDone).toBe(1)
    expect(done.nextQuestTick).toBe(game.tick + quests.pauseCycles * CYCLE)
  })

  it('cannot be filled without enough of the good', () => {
    const game = runQuests(town(['cloth'], { cloth: 2 }), createRng(3))
    expect(questSource(game)).toBeNull()
    expect(deliverQuest(game)).toBe(game)
  })

  it('end unfilled after their time, and the next one comes only after the pause', () => {
    const game = runQuests(town(['cloth']), createRng(3))
    const late = { ...game, tick: game.quest!.expires }
    const ended = runQuests(late, createRng(3))
    expect(ended.quest).toBeNull()
    expect(runQuests(ended, createRng(3)).quest).toBeNull()
    expect(runQuests({ ...ended, tick: ended.nextQuestTick }, createRng(3)).quest).not.toBeNull()
  })

  it('can be turned down', () => {
    const game = runQuests(town(['cloth']), createRng(3))
    const declined = declineQuest(game)
    expect(declined.quest).toBeNull()
    expect(declined.coins).toBe(game.coins)
    expect(declined.nextQuestTick).toBe(game.tick + quests.pauseCycles * CYCLE)
  })

  it('come into old saves through the migration', () => {
    const old = { ...createNewGame(1), tick: 600, version: 14 } as Record<string, unknown>
    for (const key of ['quest', 'nextQuestTick', 'questsDone', 'goalReachedTick', 'goalClosed']) delete old[key]
    const migrated = migrateState(old)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.quest).toBeNull()
    expect(migrated.nextQuestTick).toBe(600 + quests.firstAfterCycles * CYCLE)
    expect(migrated.goalReachedTick).toBeNull()
    expect(migrated.goalClosed).toBe(false)
  })
})
