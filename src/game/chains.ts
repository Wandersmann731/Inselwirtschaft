import { buildings, tiers } from '../data'
import type { ChainDef } from '../data'

/** Who needs what a chain makes: the tiers that ask for it and "Bau" if buildings or upgrades use it up. */
export function chainUsers(chain: ChainDef): string[] {
  const makes = new Set(chain.goods)
  const users: string[] = []
  for (const tier of tiers) {
    const asked = tier.needs.some((need) => [need.good, ...(need.alternatives ?? []), ...(need.substitutes ?? [])].some((g) => g && makes.has(g)))
    if (asked) users.push(tier.name)
  }
  const construction =
    buildings.some((b) => Object.entries(b.cost).some(([good, amount]) => amount > 0 && makes.has(good))) ||
    tiers.some((t) => Object.entries(t.upgradeCost ?? {}).some(([good, amount]) => amount > 0 && makes.has(good)))
  if (construction) users.push('Bau')
  return users
}

/** Goods a building takes in (first choice of each input) and what it makes. */
export function buildingFlow(id: string): { inputs: string[]; outputs: string[] } {
  const def = buildings.find((b) => b.id === id)
  if (!def?.output) return { inputs: [], outputs: [] }
  return {
    inputs: (def.inputs ?? []).map((input) => input.good),
    outputs: [def.output.good, ...(def.byproducts ?? []).map((p) => p.good)],
  }
}
