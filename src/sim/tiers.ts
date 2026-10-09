import { getBuilding, tiers } from '../data'
import type { TierDef, TierNeed } from '../data'
import { islandsOf } from './islands'
import type { GameState, HouseState, IslandState } from './state'

export function tierIndex(tierId: string): number {
  const index = tiers.findIndex((tier) => tier.id === tierId)
  if (index === -1) throw new Error(`Unknown tier: ${tierId}`)
  return index
}

export function getTier(tierId: string): TierDef {
  return tiers[tierIndex(tierId)]
}

/** All needs of a tier: its own plus those of every tier below it. */
export function cumulativeNeeds(tierId: string): TierNeed[] {
  return tiers.slice(0, tierIndex(tierId) + 1).flatMap((tier) => tier.needs)
}

/** The tier a house rises into, or null. Aristocrat houses are built new, so they never follow merchants. */
export function nextTier(tierId: string): TierDef | null {
  const next = tiers[tierIndex(tierId) + 1]
  return next && !next.unlock ? next : null
}

export function previousTier(tierId: string): TierDef | null {
  return tiers[tierIndex(tierId) - 1] ?? null
}

export function createHouse(tierId: string): HouseState {
  return { tier: tierId, residents: 0, needs: {}, upgradeTimer: 0, shortageTimer: 0, ruin: false, missingMaterials: false }
}

/** Residents of the realm living in houses of one tier. */
export function residentsOfTier(state: GameState | IslandState, tierId: string): number {
  return islandsOf(state)
    .flatMap((island) => island.buildings)
    .reduce(
      (sum, building) =>
        building.house && !building.house.ruin && building.house.tier === tierId ? sum + building.house.residents : sum,
      0,
    )
}

export function totalResidents(state: GameState | IslandState): number {
  return islandsOf(state)
    .flatMap((island) => island.buildings)
    .reduce((sum, building) => sum + (building.house?.residents ?? 0), 0)
}

/** True if buildings of this tier may be built: the tier was reached once (or the resident threshold is met). */
export function isTierUnlocked(state: GameState | IslandState, tierId: string): boolean {
  const tier = getTier(tierId)
  if (tier.unlock) return residentsOfTier(state, tier.unlock.tier) >= tier.unlock.residents
  return tierIndex(tierId) <= state.highestTier
}

export function isBuildingUnlocked(state: GameState | IslandState, buildingId: string): boolean {
  return isTierUnlocked(state, getBuilding(buildingId).unlockTier)
}
