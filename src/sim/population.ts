import { config } from '../data'
import type { BuildingCost } from '../data'
import { goods } from '../data'
import { addTo, cloneLedger } from './ledger'
import type { CycleLedger, IslandState, HouseState, PlacedBuilding } from './state'
import { getTier, nextTier, previousTier, tierIndex } from './tiers'

const FULL = 100 - 1e-6

const shortage = (house: HouseState): boolean =>
  Object.values(house.needs).some((percent) => percent < config.population.shortageBelow)

const allMet = (house: HouseState): boolean => Object.values(house.needs).every((percent) => percent >= FULL)

function affordable(stock: Record<string, number>, cost: BuildingCost): boolean {
  return goods.every((good) => (stock[good.id] ?? 0) >= (cost[good.id as keyof BuildingCost] ?? 0))
}

/**
 * Moves residents in and out, lets houses rise or fall a tier and collapses aristocrat houses.
 * Runs once per economy cycle, after the market has updated the needs.
 */
export function runPopulation(state: IslandState): IslandState {
  const stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  let highestTier = state.highestTier

  const buildings = state.buildings.map((building): PlacedBuilding => {
    if (!building.house || building.house.ruin) return building
    const house = stepHouse(building.house, stock, ledger)
    highestTier = Math.max(highestTier, tierIndex(house.tier))
    return { ...building, house }
  })

  return { ...state, stock, buildings, highestTier, economy: { ...state.economy, current: ledger } }
}

function stepHouse(previous: HouseState, stock: Record<string, number>, ledger: CycleLedger): HouseState {
  const house: HouseState = { ...previous }
  const { moveInPerCycle, moveOutPerCycle, upgradeCycles, downgradeCycles, ruinCycles } = config.population
  const tier = getTier(house.tier)

  if (shortage(house)) {
    house.shortageTimer += 1
    house.upgradeTimer = 0
    house.missingMaterials = false
    house.residents = Math.max(0, house.residents - moveOutPerCycle)

    if (tier.unlock) {
      // Aristocrats do not fall back, their house collapses.
      if (house.shortageTimer >= ruinCycles) return { ...house, residents: 0, ruin: true }
    } else if (house.shortageTimer >= downgradeCycles) {
      const lower = previousTier(house.tier)
      if (lower) {
        house.tier = lower.id
        house.residents = Math.min(house.residents, lower.residents)
        house.shortageTimer = 0
      }
    }
    return house
  }

  house.shortageTimer = 0
  house.residents = Math.min(tier.residents, house.residents + moveInPerCycle)

  const next = nextTier(house.tier)
  if (next && house.residents >= tier.residents && allMet(house)) {
    house.upgradeTimer += 1
    const cost = next.upgradeCost
    if (house.upgradeTimer >= upgradeCycles) {
      if (cost && !affordable(stock, cost)) {
        house.missingMaterials = true
      } else {
        for (const good of goods) {
          const needed = cost?.[good.id as keyof BuildingCost] ?? 0
          if (needed > 0) {
            stock[good.id] -= needed
            addTo(ledger.consumed, good.id, needed)
          }
        }
        return { ...house, tier: next.id, upgradeTimer: 0, missingMaterials: false }
      }
    }
  } else {
    house.upgradeTimer = 0
    house.missingMaterials = false
  }
  return house
}
