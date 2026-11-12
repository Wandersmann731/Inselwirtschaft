// Small orders: now and then the trader town asks for a good the player makes and pays well above the usual price.
import { config, quests } from '../data'
import type { Rng } from './rng'
import type { GameState, Island } from './state'
import { totalResidents } from './tiers'
import { basePrice, hasKontor } from './trade'
import { toIslandState } from './islands'

/** Goods an order can ask for right now: those of the list that an island of the player made in its last cycle. */
export function questGoods(state: GameState): string[] {
  const made = new Set<string>()
  for (const island of state.islands) {
    if (!island.owned || !island.economy.last) continue
    for (const [good, amount] of Object.entries(island.economy.last.produced)) if (amount > 0) made.add(good)
  }
  return quests.goods.filter((good) => made.has(good))
}

/** Coins an order pays. */
export function questReward(good: string, amount: number): number {
  return Math.round(amount * basePrice(good) * quests.rewardMultiplier)
}

/**
 * Once per economy cycle: an order that ran out is dropped, and after the pause a new one comes, as soon as the
 * realm is big enough and makes one of the goods. Good and amount are drawn with the seeded generator.
 */
export function runQuests(state: GameState, rng: Rng): GameState {
  const pause = quests.pauseCycles * config.economyCycleTicks
  if (state.quest) {
    return state.tick >= state.quest.expires ? { ...state, quest: null, nextQuestTick: state.tick + pause } : state
  }
  if (state.tick < state.nextQuestTick || totalResidents(state) < quests.minResidents) return state
  const options = questGoods(state)
  if (options.length === 0) return state
  const good = options[rng.nextInt(options.length)]
  const amount = quests.amounts[rng.nextInt(quests.amounts.length)]
  const quest = {
    id: state.questsDone + 1,
    good,
    amount,
    reward: questReward(good, amount),
    expires: state.tick + quests.durationCycles * config.economyCycleTicks,
  }
  return { ...state, quest, rngState: rng.getState() }
}

/** The island that fills the order: the first of the player's islands with a running trading post and enough of the good. */
export function questSource(state: GameState): Island | null {
  const quest = state.quest
  if (!quest) return null
  return state.islands.find((island) => island.owned && (island.stock[quest.good] ?? 0) >= quest.amount && hasKontor(toIslandState(state, island.id))) ?? null
}

/** The player hands over the goods: they leave the store and the reward is paid. Nothing happens if they are not there. */
export function deliverQuest(state: GameState): GameState {
  const quest = state.quest
  const source = questSource(state)
  if (!quest || !source) return state
  const islands = state.islands.map((island) =>
    island.id === source.id ? { ...island, stock: { ...island.stock, [quest.good]: island.stock[quest.good] - quest.amount } } : island,
  )
  return {
    ...state,
    islands,
    coins: state.coins + quest.reward,
    quest: null,
    questsDone: state.questsDone + 1,
    nextQuestTick: state.tick + quests.pauseCycles * config.economyCycleTicks,
  }
}

/** The player turns the order down. The next one comes after the usual pause. */
export function declineQuest(state: GameState): GameState {
  if (!state.quest) return state
  return { ...state, quest: null, nextQuestTick: state.tick + quests.pauseCycles * config.economyCycleTicks }
}
