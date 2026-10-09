import { getBuilding, priceOf } from '../data'
import type { TierNeed } from '../data'
import { buildingRect, inRadius, type Rect } from './coverage'
import { addTo, cloneLedger } from './ledger'
import type { CycleLedger, GameState, PlacedBuilding } from './state'
import { cumulativeNeeds } from './tiers'

const EPSILON = 1e-9

interface Provider {
  rect: Rect
  radius: number
  type: string
  sells: string[]
}

function rangeCovers(provider: Provider, house: Rect): boolean {
  for (let y = house.y; y < house.y + house.h; y++) {
    for (let x = house.x; x < house.x + house.w; x++) {
      if (inRadius(x, y, provider.rect, provider.radius)) return true
    }
  }
  return false
}

/**
 * Residents buy goods at market stands within reach: the goods leave the island store and
 * their price is paid into the treasury. Also records how well each need of each house is met.
 * Runs once per economy cycle.
 */
export function runMarket(state: GameState): GameState {
  const providers: Provider[] = state.buildings
    .filter((building) => building.active)
    .flatMap((building) => {
      const def = getBuilding(building.type)
      return def.radius === undefined
        ? []
        : [{ rect: buildingRect(building), radius: def.radius, type: building.type, sells: def.sells ?? [] }]
    })

  const stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  let coins = state.coins

  const buildings = state.buildings.map((building): PlacedBuilding => {
    const house = building.house
    if (!house || house.ruin) return building
    const rect = buildingRect(building)
    const near = providers.filter((provider) => rangeCovers(provider, rect))
    const needs: Record<string, number> = {}

    for (const need of cumulativeNeeds(house.tier)) {
      if (need.building) {
        needs[need.id] = near.some((provider) => provider.type === need.building) ? 100 : 0
        continue
      }
      const result = buyNeed(need, house.residents, near, stock, ledger)
      coins += result.paid
      ledger.income += result.paid
      needs[need.id] = result.percent
    }
    return { ...building, house: { ...house, needs } }
  })

  return { ...state, coins, stock, buildings, economy: { ...state.economy, current: ledger } }
}

/** Buys what the residents need of one good, trying the good first, then alternatives and substitutes. */
function buyNeed(
  need: TierNeed,
  residents: number,
  near: Provider[],
  stock: Record<string, number>,
  ledger: CycleLedger,
): { percent: number; paid: number } {
  if (!need.good || need.rate === undefined) return { percent: 100, paid: 0 }
  const options = [need.good, ...(need.alternatives ?? []), ...(need.substitutes ?? [])]
  const demand = residents * need.rate

  // An empty house buys nothing, but it is only "supplied" if a stand in reach has the goods.
  if (demand <= 0) {
    const available = options.some(
      (good) => (stock[good] ?? 0) > 0 && near.some((provider) => provider.sells.includes(good)),
    )
    return { percent: available ? 100 : 0, paid: 0 }
  }

  let bought = 0
  let paid = 0
  for (const good of options) {
    if (bought >= demand - EPSILON) break
    if (!near.some((provider) => provider.sells.includes(good))) continue
    const take = Math.min(demand - bought, stock[good] ?? 0)
    if (take <= 0) continue
    stock[good] -= take
    addTo(ledger.consumed, good, take)
    bought += take
    paid += take * priceOf(good)
  }
  return { percent: bought >= demand - EPSILON ? 100 : (bought / demand) * 100, paid }
}
