import { config, getBuilding } from '../data'
import type { TierNeed } from '../data'
import { buildingRect, inRadius, type Rect } from './coverage'
import { addTo, cloneLedger } from './ledger'
import type { CycleLedger, IslandState, PlacedBuilding } from './state'
import { cumulativeNeeds, getTier } from './tiers'

const EPSILON = 1e-9

interface Reach {
  rect: Rect
  radius: number
  type: string
}

function rangeCovers(provider: Reach, house: Rect): boolean {
  for (let y = house.y; y < house.y + house.h; y++) {
    for (let x = house.x; x < house.x + house.w; x++) {
      if (inRadius(x, y, provider.rect, provider.radius)) return true
    }
  }
  return false
}

/**
 * Residents fetch their goods from the island store by themselves, as long as a Kontor or market house reaches their
 * house (its catchment). Public buildings (chapel, tavern ...) serve houses in their radius. Every house pays a land
 * tax, from the first resident on: the more of its goods needs are met, the more it pays. Also records how well each
 * need of each house is met. Runs once per economy cycle.
 */
export function runMarket(state: IslandState): IslandState {
  const active = state.buildings.filter((building) => building.active)
  const hubs: Reach[] = active.flatMap((building) => {
    const catchment = getBuilding(building.type).catchment
    return catchment === undefined ? [] : [{ rect: buildingRect(building), radius: catchment, type: building.type }]
  })
  const services: Reach[] = active.flatMap((building) => {
    const radius = getBuilding(building.type).radius
    return radius === undefined ? [] : [{ rect: buildingRect(building), radius, type: building.type }]
  })

  const stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  let coins = state.coins

  const buildings = state.buildings.map((building): PlacedBuilding => {
    const house = building.house
    if (!house || house.ruin) return building
    const rect = buildingRect(building)
    const supplied = hubs.some((hub) => rangeCovers(hub, rect))
    const near = services.filter((service) => rangeCovers(service, rect))
    const needs: Record<string, number> = {}
    let goodsSum = 0
    let goodsCount = 0

    for (const need of cumulativeNeeds(house.tier)) {
      if (need.building) {
        needs[need.id] = near.some((service) => service.type === need.building) ? 100 : 0
        continue
      }
      const percent = fetchNeed(need, house.residents, supplied, stock, ledger)
      needs[need.id] = percent
      goodsSum += percent
      goodsCount++
    }
    const supply = goodsCount > 0 ? goodsSum / goodsCount / 100 : 1
    const tax = house.residents * getTier(house.tier).tax * (config.tax.base + (1 - config.tax.base) * supply)
    coins += tax
    ledger.income += tax
    return { ...building, house: { ...house, needs } }
  })

  return { ...state, coins, stock, buildings, economy: { ...state.economy, current: ledger } }
}

/** Takes what the residents need of one good from the store, trying the good first, then alternatives and substitutes. */
function fetchNeed(need: TierNeed, residents: number, supplied: boolean, stock: Record<string, number>, ledger: CycleLedger): number {
  if (!need.good || need.rate === undefined) return 100
  if (!supplied) return 0
  const options = [need.good, ...(need.alternatives ?? []), ...(need.substitutes ?? [])]
  const demand = residents * need.rate

  // An empty house takes nothing, but it counts as supplied if the goods are there.
  if (demand <= 0) return options.some((good) => (stock[good] ?? 0) > 0) ? 100 : 0

  let taken = 0
  for (const good of options) {
    if (taken >= demand - EPSILON) break
    const take = Math.min(demand - taken, stock[good] ?? 0)
    if (take <= 0) continue
    stock[good] -= take
    addTo(ledger.consumed, good, take)
    taken += take
  }
  return taken >= demand - EPSILON ? 100 : (taken / demand) * 100
}
