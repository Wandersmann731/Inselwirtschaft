import { hash2 } from '../world/noise2d'
import { checkPlacement, placeBuilding, placeRoads } from './build'
import { portTile } from './harbour'
import { fromIslandState, toIslandState } from './islands'
import { planRoute } from './roadPlanner'
import { planSettlement } from './settlementPlanner'
import type { GameState, IslandState } from './state'

/** Everything that may be built, for free: the trader town is laid out with the normal building rules. */
function builder(flat: IslandState): IslandState {
  const plenty = Object.fromEntries(['tools', 'wood', 'bricks', 'marble'].map((good) => [good, 1e9]))
  return { ...flat, owned: true, coins: 1e9, highestTier: 4, stock: plenty }
}

/** The free spot for a building closest to a point, or null. */
function nearest(state: IslandState, typeId: string, ax: number, ay: number, minDistance = 0): { x: number; y: number } | null {
  const { width, height } = state.map
  let best: { x: number; y: number; d: number } | null = null
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - ax, y - ay)
      if (d < minDistance || (best && d >= best.d)) continue
      if (checkPlacement(state, typeId, x, y, false) === null) best = { x, y, d }
    }
  }
  return best
}

/**
 * Builds the town of the trader island: a Kontor at the harbour, a market house, a church and a tavern, streets and
 * a quarter of merchant houses. It is only scenery: islands of others take no part in the economy.
 */
export function buildTraderTown(game: GameState, islandId: number): GameState {
  const original = toIslandState(game, islandId)
  if (original.owned || original.buildings.length > 0) return game
  let town = builder(original)
  const harbour = portTile(game, islandId) ?? { x: town.map.width / 2, y: town.map.height / 2 }

  const kontor = nearest(town, 'kontor', harbour.x, harbour.y)
  if (!kontor) return game
  town = placeBuilding(town, 'kontor', kontor.x, kontor.y, false)
  // the town lies inland from the Kontor, towards the middle of the island
  const mx = town.map.width / 2
  const my = town.map.height / 2
  const toward = (share: number) => ({ x: kontor.x + (mx - kontor.x) * share, y: kontor.y + (my - kontor.y) * share })
  const marketAt = toward(0.3)
  const market = nearest(town, 'market_house', marketAt.x, marketAt.y, 4)
  if (market) town = placeBuilding(town, 'market_house', market.x, market.y, false)
  if (market) {
    const route = planRoute(town, { x: kontor.x, y: kontor.y }, { x: market.x, y: market.y })
    if (route.reachable) town = placeRoads(town, route.newTiles)
  }
  const centre = market ?? kontor
  for (const typeId of ['church', 'tavern']) {
    const spot = nearest(town, typeId, centre.x + 3, centre.y + 3, 3)
    if (spot) town = placeBuilding(town, typeId, spot.x, spot.y, false)
  }
  const quarter = planSettlement(town, 'house_pioneers', { x: centre.x - 9, y: centre.y - 9 }, { x: centre.x + 9, y: centre.y + 9 })
  town = quarter.result
  // the houses are merchants and citizens with full homes
  town = {
    ...town,
    buildings: town.buildings.map((building) => {
      if (!building.house) return building
      const tier = hash2(building.x, building.y, 77) < 0.6 ? 'merchants' : 'citizens'
      const residents = tier === 'merchants' ? 42 : 28
      return { ...building, house: { ...building.house, tier, residents } }
    }),
  }
  const done: IslandState = { ...town, owned: false, coins: original.coins, highestTier: original.highestTier, stock: original.stock, economy: original.economy }
  return fromIslandState(game, done)
}

/** Adds the town to every trader island that is still empty. */
export function addTraderTowns(game: GameState): GameState {
  return game.islands.filter((island) => island.role === 'trader').reduce((state, island) => buildTraderTown(state, island.id), game)
}

