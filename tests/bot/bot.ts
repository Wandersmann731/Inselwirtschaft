import { buildings as allBuildings, getBuilding } from '../../src/data'
import { checkPlacement, footprint, placeBuilding, placeRoads } from '../../src/sim/build'
import { buildingRect, suppliedHouses } from '../../src/sim/coverage'
import { totalUpkeep } from '../../src/sim/economy'
import { fromIslandState, toIslandState } from '../../src/sim/islands'
import type { GameState, IslandState } from '../../src/sim/state'
import { cumulativeNeeds, getTier, isBuildingUnlocked } from '../../src/sim/tiers'
import { Terrain } from '../../src/world/terrain'
import { findStartSite } from '../../src/world/startSite'
import { connectRoad, findSpot, hasRoadAccess, hubOf, nearestCoast, nearestTile } from './spots'

const CYCLE_TICKS = 60

/** What a producer of one good makes per economy cycle when it runs without a break. */
function perCycle(typeId: string): number {
  const def = getBuilding(typeId)
  return ((def.output?.amount ?? 1) * CYCLE_TICKS) / (def.cycleTicks ?? CYCLE_TICKS)
}

export interface BotNote {
  tick: number
  text: string
}

/**
 * A simple but sensible player. It builds a market house, houses around market stands, the public buildings the
 * residents need and enough producers for what they use, and keeps extending. It never cheats: it only uses the
 * normal build rules and its own money. Used to test whether the economy can carry a city up to the merchants.
 */
export class Bot {
  notes: BotNote[] = []
  /** Reasons it could not do something, counted, so the report shows where it got stuck. */
  stuck = new Map<string, number>()
  /** Set when no more fisheries fit on the coast near the town, then bread is made instead. */
  private fisheryLimit: number | null = null
  private homeId: number
  private maxHouses: number

  constructor(homeId = 0, maxHouses = 70) {
    this.homeId = homeId
    this.maxHouses = maxHouses
  }

  private note(state: GameState, text: string): void {
    this.notes.push({ tick: state.tick, text })
  }

  private block(reason: string): void {
    this.stuck.set(reason, (this.stuck.get(reason) ?? 0) + 1)
  }

  /** One decision. Returns the new game (or the same if nothing was done). */
  step(state: GameState): GameState {
    let island = toIslandState(state, this.homeId)
    for (let action = 0; action < 3; action++) {
      const next = this.act(state, island)
      if (!next) break
      island = next
    }
    return fromIslandState(state, island)
  }

  private count(island: IslandState, type: string): number {
    return island.buildings.filter((b) => b.type === type).length
  }

  private houses(island: IslandState) {
    return island.buildings.filter((b) => b.house && !b.house.ruin)
  }

  /** Residents by tier index, for demand estimates. */
  private demand(island: IslandState): Record<string, number> {
    const produced = new Set(allBuildings.flatMap((def) => (def.output ? [def.output.good] : [])))
    const producible = new Set(
      island.buildings.flatMap((b) => {
        const def = getBuilding(b.type)
        return def.output ? [def.output.good] : []
      }),
    )
    const demand: Record<string, number> = {}
    for (const house of this.houses(island)) {
      const residents = house.house!.residents + 1
      for (const need of cumulativeNeeds(house.house!.tier)) {
        if (!need.good || need.rate === undefined) continue
        // goods nobody on the island makes (tobacco ...) are replaced by salt, like the residents do
        const good = !produced.has(need.good) || (need.substitutes?.length && !producible.has(need.good)) ? (need.substitutes?.[0] ?? need.good) : need.good
        demand[good] = (demand[good] ?? 0) + residents * need.rate * CYCLE_TICKS / CYCLE_TICKS
      }
    }
    return demand
  }

  /** Build `typeId` somewhere near (ax, ay). Returns the island with it, or null if impossible now. */
  private place(island: IslandState, typeId: string, ax: number, ay: number, radius: number, margin: number, needAccess = false): IslandState | null {
    // keep a few tools back for the tool chain itself: it cannot be built without them
    const toolChain = ['ore_mine', 'smelter', 'toolmaker'].includes(typeId)
    if (!toolChain && (island.stock.tools ?? 0) - getBuilding(typeId).cost.tools < 12 && !(this.count(island, 'toolmaker') > 0 && this.count(island, 'ore_mine') > 0 && this.count(island, 'smelter') > 0)) {
      this.block('keeping tools for the tool chain')
      return null
    }
    const spot = findSpot(island, typeId, ax, ay, radius, margin, needAccess ? (candidate) => hasRoadAccess(island, typeId, candidate) : undefined)
    if (!spot) {
      this.block(`no spot for ${typeId}`)
      return null
    }
    const error = checkPlacement(island, typeId, spot.x, spot.y, spot.rotated)
    if (error) {
      this.block(`${typeId}: ${error.code}${error.missing ? ' ' + error.missing : ''}`)
      return null
    }
    return placeBuilding(island, typeId, spot.x, spot.y, spot.rotated)
  }

  private anchor(island: IslandState): { x: number; y: number } {
    const hub = island.buildings.find((b) => b.type === 'market_house')
    if (hub) {
      const rect = buildingRect(hub)
      return { x: rect.x, y: rect.y }
    }
    return findStartSite(island.map)
  }

  /** Builds a producer where its placement rule allows, connects it by road to a hub, building a new hub if needed. */
  private producer(state: GameState, island: IslandState, typeId: string): IslandState | null {
    const def = getBuilding(typeId)
    const home = this.anchor(island)
    let ax = home.x
    let ay = home.y
    if (def.placement === 'mountain') {
      const tile = nearestTile(island, Terrain.Mountain, home.x, home.y)
      if (!tile) return null
      ax = tile.x
      ay = tile.y
    } else if (def.placement === 'coast') {
      const tile = nearestCoast(island, home.x, home.y)
      if (!tile) return null
      ax = tile.x
      ay = tile.y
    }
    let next = this.place(island, typeId, ax, ay, def.placement === 'land' ? 18 : 14, 1, true)
    if (!next) return null
    const building = next.buildings[next.buildings.length - 1]
    let hub = hubOf(next, buildingRect(building))
    if (!hub) {
      const rect = buildingRect(building)
      const withHub = this.place(next, 'market_house', rect.x, rect.y, 8, 1, true)
      if (!withHub) return null
      next = withHub
      hub = withHub.buildings[withHub.buildings.length - 1]
      this.note(state, `new market house near ${typeId}`)
    }
    const hubBuilding = hub
    const connected = connectRoad(next, buildingRect(building), hubBuilding, (tiles) => placeRoads(next!, tiles))
    if (!connected) {
      this.block(`no road for ${typeId}`)
      return next
    }
    this.note(state, `built ${typeId} (${this.count(connected, typeId)})`)
    return connected
  }

  /** Stands and public buildings that cover houses which are still without. */
  private cover(state: GameState, island: IslandState): IslandState | null {
    const houses = this.houses(island)
    if (houses.length === 0) return null
    const maxTier = Math.max(...houses.map((h) => allBuildings.findIndex((d) => d.houseTier === h.house!.tier) >= 0 ? tierRank(h.house!.tier) : 0))
    const wanted: { type: string }[] = []
    const addIf = (type: string, rank: number): void => {
      if (maxTier >= rank - 1) wanted.push({ type })
    }
    wanted.push({ type: 'food_salt_stand' }, { type: 'cloth_stand' }, { type: 'chapel' })
    addIf('drink_stand', 1)
    addIf('tavern', 1)
    addIf('church', 2)
    addIf('bathhouse', 3)

    for (const { type } of wanted) {
      if (!isBuildingUnlocked(island, type)) continue
      const def = getBuilding(type)
      const covered = new Set<number>()
      for (const b of island.buildings) {
        if (b.type !== type || !b.active) continue
        for (const house of suppliedHouses(island, buildingRect(b), def.radius ?? 0)) covered.add(house.id)
      }
      const open = houses.filter((h) => !covered.has(h.id))
      if (open.length === 0) continue
      const target = open[0]
      const rect = buildingRect(target)
      const big = (def.radius ?? 0) > 5
      const result = this.place(island, type, rect.x, rect.y, big ? 14 : 4, big ? 1 : 0)
      if (result) {
        this.note(state, `built ${type} for house ${target.id}`)
        return result
      }
    }
    return null
  }

  /** Grain, mill and bakery for the food that fisheries cannot cover. */
  private breadChain(island: IslandState, foodDemand: number): { type: string; want: number }[] {
    if (this.fisheryLimit === null) return []
    const fishing = this.count(island, 'fishery') * perCycle('fishery')
    const rest = Math.max(0, foodDemand * 1.2 - fishing)
    const bakeries = Math.ceil(rest / perCycle('bakery'))
    return [
      { type: 'grain_farm', want: Math.ceil(rest / perCycle('mill')) },
      { type: 'mill', want: bakeries },
      { type: 'bakery', want: bakeries },
    ]
  }

  /** Producer types that would fix a need which the residents do not get fully. */
  private shortages(island: IslandState): Set<string> {
    const result = new Set<string>()
    const level: Record<string, number[]> = {}
    for (const house of this.houses(island)) {
      for (const [need, percent] of Object.entries(house.house!.needs)) (level[need] ??= []).push(percent)
    }
    const makers: Record<string, string[]> = {
      food: ['fishery', 'grain_farm', 'mill', 'bakery'],
      cloth: ['sheep_farm', 'weaver'],
      alcohol: ['potato_farm', 'distillery'],
      salt: ['salt_mine'],
    }
    for (const [need, types] of Object.entries(makers)) {
      const values = level[need]
      const good = need === 'food' ? 'food' : need
      if (values && values.reduce((a, b) => a + b, 0) / values.length < 99 && (island.stock[good] ?? 0) < 12) types.forEach((type) => result.add(type))
    }
    if ((island.stock.wood ?? 0) < 40) result.add('forester')
    if ((island.stock.tools ?? 0) < 6) ['ore_mine', 'smelter', 'toolmaker'].forEach((type) => result.add(type))
    if ((island.stock.bricks ?? 0) < 6) ['quarry', 'stonemason'].forEach((type) => result.add(type))
    return result
  }

  /** True if a house still lacks one of the basic stands or the chapel. */
  private coverageMissing(island: IslandState): boolean {
    const houses = this.houses(island)
    for (const type of ['food_salt_stand', 'cloth_stand', 'chapel']) {
      const def = getBuilding(type)
      const covered = new Set<number>()
      for (const b of island.buildings) {
        if (b.type !== type) continue
        for (const house of suppliedHouses(island, buildingRect(b), def.radius ?? 0)) covered.add(house.id)
      }
      if (houses.some((h) => !covered.has(h.id))) return true
    }
    return false
  }

  private act(state: GameState, island: IslandState): IslandState | null {
    const houses = this.houses(island)

    // 1. a market house to start with, then the first houses and what they need
    if (this.count(island, 'market_house') === 0) {
      const site = findStartSite(island.map)
      return this.place(island, 'market_house', site.x, site.y, 6, 1)
    }
    if (houses.length < 4) return this.newHouse(state, island)
    if (this.coverageMissing(island)) {
      const covered = this.cover(state, island)
      if (covered) return covered
    }
    // fill the first houses before any big spending: residents pay for everything else
    if (houses.length < 10 && island.coins > 900) return this.newHouse(state, island)

    // money guard: a careful player keeps a reserve, except to fix a shortage (that costs more if left alone)
    const reserve = 300 + 8 * totalUpkeep(island)
    const shortOf = this.shortages(island)
    const rich = island.coins >= reserve

    // 2. producers for what the residents use (built before the next houses)
    const demand = this.demand(island)
    const n = houses.length
    const stock = (good: string): number => island.stock[good] ?? 0
    // the tool chain itself costs tools, so it is built early, while there still are some
    const needTools = n >= 4 || stock('tools') < 40
    const needBricks = n >= 8 || stock('bricks') < 70
    const settlers = houses.some((h) => tierRank(h.house!.tier) >= 1) || n >= 8
    const plan: { type: string; want: number }[] = [
      { type: 'ore_mine', want: needTools ? 1 + Math.floor(n / 40) : 0 },
      { type: 'smelter', want: needTools ? 1 + Math.floor(n / 40) : 0 },
      { type: 'toolmaker', want: needTools ? 1 + Math.floor(n / 40) : 0 },
      { type: 'forester', want: 3 + Math.floor(n / 4) + (stock('wood') < 40 ? 2 : 0) },
      { type: 'fishery', want: Math.min(this.fisheryLimit ?? 99, Math.max(1, Math.ceil(((demand.food ?? 0) * 1.2) / perCycle('fishery')))) },
      ...this.breadChain(island, demand.food ?? 0),
      { type: 'sheep_farm', want: Math.max(1, Math.ceil(((demand.cloth ?? 0) * 1.2) / perCycle('sheep_farm'))) },
      { type: 'weaver', want: Math.max(1, Math.ceil(((demand.cloth ?? 0) * 1.2) / perCycle('weaver'))) },
      { type: 'potato_farm', want: settlers ? Math.max(1, Math.ceil(((demand.alcohol ?? 0) * 1.2) / perCycle('potato_farm'))) : 0 },
      { type: 'distillery', want: settlers ? Math.max(1, Math.ceil(((demand.alcohol ?? 0) * 1.2) / perCycle('distillery'))) : 0 },
      { type: 'salt_mine', want: settlers ? Math.max(1, Math.ceil(((demand.salt ?? 0) * 1.2) / perCycle('salt_mine'))) : 0 },
      { type: 'quarry', want: needBricks ? 1 + Math.floor(n / 30) : 0 },
      { type: 'stonemason', want: needBricks ? 1 + Math.floor(n / 30) : 0 },
    ]
    for (const { type, want } of plan) {
      if (this.count(island, type) >= want) continue
      if (!isBuildingUnlocked(island, type)) continue
      if (!rich && !(shortOf.has(type) && island.coins > 250)) continue
      const built = this.producer(state, island, type)
      if (built) return built
      if (type === 'fishery' && this.fisheryLimit === null) this.fisheryLimit = this.count(island, 'fishery')
      if (type === 'fishery') continue
      continue // not possible now (money, goods or space): try the next thing
    }

    // 3. cover the houses with stands and public buildings
    if (rich || island.coins > 400) {
      const covered = this.cover(state, island)
      if (covered) return covered
    }
    if (!rich) {
      this.block('waiting for money')
      return null
    }

    // 4. more houses, once everything works and there is money
    const green = houses.filter((h) => h.house!.residents > 0 && Object.values(h.house!.needs).every((p) => p >= 99.9))
    const full = houses.filter((h) => h.house!.residents >= getTier(h.house!.tier).residents)
    if (houses.length < this.maxHouses && green.length >= houses.length * 0.75 && full.length >= houses.length * 0.6 && island.coins > 600) {
      return this.newHouse(state, island)
    }
    return null
  }

  private newHouse(state: GameState, island: IslandState): IslandState | null {
    const site = findStartSite(island.map)
    const houses = this.houses(island)
    let ax = site.x
    let ay = site.y + 4
    if (houses.length > 0) {
      const r = buildingRect(houses[Math.floor((houses.length - 1) / 2)])
      ax = r.x
      ay = r.y
    }
    const next = this.place(island, 'house_pioneers', ax, ay, 14, 0)
    if (next) this.note(state, `built house (${houses.length + 1})`)
    return next
  }
}

function tierRank(tier: string): number {
  return ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats'].indexOf(tier)
}

void footprint
