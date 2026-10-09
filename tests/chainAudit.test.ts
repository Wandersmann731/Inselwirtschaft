import { describe, expect, it } from 'vitest'
import { buildings, climates, getBuilding, goods, landNames, tiers } from '../src/data'

const producers = buildings.filter((b) => b.output)
const tierIndex = (id: string): number => tiers.findIndex((t) => t.id === id)

/** Goods people ask for, plus everything construction and upgrades use up. */
function demandedGoods(): Set<string> {
  const used = new Set<string>()
  for (const tier of tiers) {
    for (const need of tier.needs) {
      if (need.good) used.add(need.good)
      for (const g of [...(need.alternatives ?? []), ...(need.substitutes ?? [])]) used.add(g)
    }
    for (const [good, amount] of Object.entries(tier.upgradeCost ?? {})) if (good !== 'coins' && amount > 0) used.add(good)
  }
  for (const b of buildings) {
    for (const [good, amount] of Object.entries(b.cost)) if (good !== 'coins' && amount > 0) used.add(good)
  }
  return used
}

/** Goods that count as useful: demanded ones and everything that leads to them through a chain. */
function usefulGoods(): Set<string> {
  const useful = demandedGoods()
  for (let changed = true; changed; ) {
    changed = false
    for (const b of producers) {
      const makes = [b.output!.good, ...(b.byproducts ?? []).map((p) => p.good)]
      if (!makes.some((g) => useful.has(g))) continue
      for (const input of b.inputs ?? []) {
        for (const g of [input.good, ...(input.alternatives ?? [])]) {
          if (!useful.has(g)) {
            useful.add(g)
            changed = true
          }
        }
      }
    }
  }
  return useful
}

/** True if the good can be made using only buildings that are unlocked by the given tier. */
function availableAt(good: string, tier: number, seen = new Set<string>()): boolean {
  if (seen.has(good)) return false
  return producers.some((b) => {
    const makes = b.output!.good === good || (b.byproducts ?? []).some((p) => p.good === good)
    if (!makes || tierIndex(b.unlockTier) > tier) return false
    return (b.inputs ?? []).every((input) =>
      [input.good, ...(input.alternatives ?? [])].some((g) => availableAt(g, tier, new Set([...seen, good]))),
    )
  })
}

describe('production chains make sense', () => {
  it('every good is made by some building', () => {
    for (const good of goods) {
      expect(producers.some((b) => b.output!.good === good.id || (b.byproducts ?? []).some((p) => p.good === good.id)), good.id).toBe(true)
    }
  })

  it('every good is needed by residents, construction or another building', () => {
    const useful = usefulGoods()
    for (const good of goods) expect(useful.has(good.id), `${good.id} is never used`).toBe(true)
  })

  it('every producer makes something that is used', () => {
    const useful = usefulGoods()
    for (const b of producers) {
      const makes = [b.output!.good, ...(b.byproducts ?? []).map((p) => p.good)]
      expect(makes.some((g) => useful.has(g)), `${b.id} makes nothing that is used`).toBe(true)
    }
  })

  it('every need of a tier can be met with buildings unlocked by that tier', () => {
    tiers.forEach((tier, index) => {
      for (const need of tier.needs) {
        if (!need.good) continue
        expect(availableAt(need.good, index), `${tier.id} needs ${need.good}`).toBe(true)
      }
    })
  })

  it('construction and upgrade goods are available by the tier that asks for them', () => {
    for (const b of buildings) {
      for (const good of ['tools', 'wood', 'bricks', 'marble']) {
        if ((b.cost[good as 'tools'] ?? 0) > 0) expect(availableAt(good, tierIndex(b.unlockTier)), `${b.id} needs ${good}`).toBe(true)
      }
    }
    tiers.forEach((tier, index) => {
      for (const [good, amount] of Object.entries(tier.upgradeCost ?? {})) {
        if (good !== 'coins' && amount > 0) expect(availableAt(good, index), `${tier.id} upgrade needs ${good}`).toBe(true)
      }
    })
  })

  it('every public building a tier needs exists and is unlocked by that tier', () => {
    tiers.forEach((tier, index) => {
      for (const need of tier.needs) {
        if (!need.building) continue
        expect(tierIndex(getBuilding(need.building).unlockTier), `${tier.id} needs ${need.building}`).toBeLessThanOrEqual(index)
      }
    })
  })

  it('every fertility and deposit a building needs exists on some island type', () => {
    const fertilities = new Set(climates.flatMap((c) => c.fertilities))
    const deposits = new Set(landNames.deposits.map((d) => d.id))
    for (const b of buildings) {
      if (b.requiresFertility) expect(fertilities.has(b.requiresFertility), `${b.id}: ${b.requiresFertility}`).toBe(true)
      if (b.requiresDeposit) expect(deposits.has(b.requiresDeposit), `${b.id}: ${b.requiresDeposit}`).toBe(true)
    }
  })

  it('every fertility of a climate is used by some building', () => {
    const required = new Set(buildings.map((b) => b.requiresFertility))
    for (const climate of climates) {
      for (const fertility of climate.fertilities) expect(required.has(fertility), `${climate.id}: ${fertility}`).toBe(true)
    }
  })

  it('every deposit is used by some building', () => {
    const required = new Set(buildings.map((b) => b.requiresDeposit))
    for (const deposit of landNames.deposits) expect(required.has(deposit.id), deposit.id).toBe(true)
  })
})
