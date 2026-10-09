import { buildings, chains, config, tiers } from '../data'
import type { ChainDef } from '../data'
import type { IslandState } from '../sim/state'
import { tierIndex } from '../sim/tiers'

const buildingMap = new Map(buildings.map((def) => [def.id, def]))

/** One good that residents of a tier ask for, as the production menu shows it. */
export interface NeedTile {
  good: string
  /** The need id in the house needs. */
  needId: string
  /** A bonus: raises the tax but is not needed to stay. */
  optional: boolean
  /** Goods that count the same (leather for cloth). */
  alternatives: string[]
  /** Goods that stand in when it is missing (salt). */
  substitutes: string[]
}

export interface TierNeeds {
  tierId: string
  name: string
  /** Not reached yet: shown as a preview of what comes next. */
  locked: boolean
  goods: NeedTile[]
}

/**
 * The goods each tier asks for (its own, not those of the tiers below), from pioneers up to the next tier that is
 * not reached yet. That one is shown greyed, so the player sees what will be needed.
 */
export function needsByTier(state: IslandState): TierNeeds[] {
  const last = Math.min(tiers.length - 1, state.highestTier + 1)
  return tiers.slice(0, last + 1).map((tier, index) => ({
    tierId: tier.id,
    name: tier.name,
    locked: index > state.highestTier,
    goods: tier.needs
      .filter((need) => need.good)
      .map((need) => ({
        good: need.good!,
        needId: need.id,
        optional: need.optional === true,
        alternatives: need.alternatives ?? [],
        substitutes: need.substitutes ?? [],
      })),
  }))
}

/** Building materials: what construction and rising houses use up. */
export const MATERIALS = Object.keys(config.startStock)

/** How well a need is met over all inhabited houses that have it, in percent. Null if no such house exists. */
export function supplyOf(state: IslandState, needId: string): number | null {
  let sum = 0
  let count = 0
  for (const building of state.buildings) {
    const house = building.house
    if (!house || house.ruin || house.residents <= 0 || house.needs[needId] === undefined) continue
    sum += house.needs[needId]
    count++
  }
  return count > 0 ? sum / count : null
}

export type ChainRole = 'main' | 'alternative' | 'substitute'

/** The chains that make a good, then those that make an alternative, then those of a substitute. */
export function chainsFor(good: string, alternatives: string[] = [], substitutes: string[] = []): { chain: ChainDef; role: ChainRole; good: string }[] {
  const result: { chain: ChainDef; role: ChainRole; good: string }[] = []
  const seen = new Set<string>()
  const add = (wanted: string, role: ChainRole): void => {
    for (const chain of chains) {
      if (!chain.goods.includes(wanted) || seen.has(chain.id)) continue
      seen.add(chain.id)
      result.push({ chain, role, good: wanted })
    }
  }
  add(good, 'main')
  alternatives.forEach((alternative) => add(alternative, 'alternative'))
  substitutes.forEach((substitute) => add(substitute, 'substitute'))
  return result
}

/** How many buildings of a type stand on the island. */
export function builtCount(state: IslandState, typeId: string): number {
  return state.buildings.filter((building) => building.type === typeId).length
}

/** The tier that first asks for a good, e.g. to label a material or need. Null for materials. */
export function firstTierOf(good: string): string | null {
  const tier = tiers.find((entry) => entry.needs.some((need) => need.good === good))
  return tier ? tier.id : null
}

/** True if a tier was reached on this island's realm. */
export function tierReached(state: IslandState, tierId: string): boolean {
  return tierIndex(tierId) <= state.highestTier
}

/**
 * What stands between two neighbouring buildings of a chain: "›" when the second processes something, "+" when both
 * deliver separate inputs of the same later building (silk and dye), "oder" when they are two ways to the same thing.
 */
export function chainSeparator(chain: ChainDef, index: number): '›' | '+' | 'oder' {
  const defs = chain.buildings.map((id) => buildingMap.get(id)!)
  const current = defs[index]
  const previous = defs[index - 1]
  if ((current.inputs ?? []).length > 0) return '›'
  const made = current.output?.good
  const before = previous.output?.good
  const consumer = defs.slice(index + 1).find((def) => (def.inputs ?? []).some((input) => [input.good, ...(input.alternatives ?? [])].includes(made ?? '')))
  if (consumer && before && before !== made) {
    const lines = consumer.inputs ?? []
    const lineOf = (good: string): number => lines.findIndex((input) => [input.good, ...(input.alternatives ?? [])].includes(good))
    if (lineOf(before) >= 0 && lineOf(before) !== lineOf(made!)) return '+'
  }
  return 'oder'
}
