import { config } from '../data'
import { findStartSite } from '../world/startSite'
import { portCell } from '../world/seaPath'
import { checkPlacement, placeBuilding } from './build'
import { fromIslandState, toIslandState } from './islands'
import { createInitialState, type GameState, type Ship } from './state'
import { trade } from '../data'

/** The Kontor and ship every new game starts with. They are free: nothing is taken from the start money or goods. */
export function addStartKit(game: GameState): GameState {
  const home = game.islands.find((island) => island.owned)
  if (!home) return game
  // already there: a game that has its Kontor or a ship is left alone
  if (home.buildings.some((b) => b.type === 'kontor') || game.ships.length > 0) return game
  const flat = toIslandState(game, home.id)

  // Kontor: the shore spot nearest to the place the camera starts at.
  const rich = { ...flat, coins: 1e9, stock: Object.fromEntries(Object.keys({ ...flat.stock, tools: 0, wood: 0, bricks: 0, marble: 0 }).map((key) => [key, 1e9])) }
  const site = findStartSite(flat.map)
  let best: { x: number; y: number; d: number } | null = null
  for (let y = 0; y < flat.map.height; y++) {
    for (let x = 0; x < flat.map.width; x++) {
      const d = Math.hypot(x + 1 - site.x, y + 1 - site.y)
      if (best && d >= best.d) continue
      if (checkPlacement(rich, 'kontor', x, y, false) === null) best = { x, y, d }
    }
  }
  let next = game
  if (best) {
    const placed = placeBuilding(rich, 'kontor', best.x, best.y, false)
    next = fromIslandState(game, { ...placed, coins: flat.coins, stock: flat.stock, economy: flat.economy })
  }

  // First ship: lying in the harbour of the home island.
  const port = portCell(next.world, home.id)
  if (!port) return next
  const ship: Ship = {
    id: next.nextShipId,
    name: `${trade.ship.name} ${next.nextShipId}`,
    capacity: trade.ship.capacity,
    cargo: {},
    island: home.id,
    x: port.x,
    y: port.y,
    path: [],
    destination: null,
    routeId: null,
    stopIndex: 0,
  }
  return { ...next, ships: [...next.ships, ship], nextShipId: next.nextShipId + 1 }
}

/** A new game as the player starts it: the world, a Kontor on the home island and a first ship. */
export function createNewGame(seed: number = config.startSeed, startCoins: number = config.startCoins): GameState {
  return addStartKit(createInitialState(seed, startCoins))
}
