import { config, trade } from '../data'
import { findSeaPath, portCell } from '../world/seaPath'
import { checkPlacement, missingResource, pay, placeBuilding } from './build'
import { fromIslandState, getIsland, onIsland, toIslandState } from './islands'
import { traderBuyPrice, traderSellPrice, kontorKit } from './trade'
import type { GameState, IslandState, RouteOrder, Ship } from './state'

export function cargoTotal(ship: Ship): number {
  return Object.values(ship.cargo).reduce((sum, amount) => sum + amount, 0)
}

export function getShip(state: GameState, shipId: number): Ship {
  const ship = state.ships.find((entry) => entry.id === shipId)
  if (!ship) throw new Error(`Unknown ship: ${shipId}`)
  return ship
}

function withShip(state: GameState, ship: Ship): GameState {
  return { ...state, ships: state.ships.map((entry) => (entry.id === ship.id ? ship : entry)) }
}

/** Builds a ship at the shipyard of an island. Costs goods from the island store and coins. */
export function buildShip(state: GameState, islandId: number): GameState {
  const island = getIsland(state, islandId)
  const hasYard = island.buildings.some((building) => building.type === 'shipyard' && building.active)
  const port = portCell(state.world, islandId)
  if (!island.owned || !hasYard || !port || state.coins < 0) return state
  const afterCost = onIsland(state, islandId, (flat) =>
    missingResource(flat, trade.ship.cost) ? flat : { ...flat, ...pay(flat, trade.ship.cost) },
  )
  if (afterCost === state) return state
  const ship: Ship = {
    id: state.nextShipId,
    name: `${trade.ship.name} ${state.nextShipId}`,
    capacity: trade.ship.capacity,
    cargo: {},
    island: islandId,
    x: port.x,
    y: port.y,
    path: [],
    destination: null,
    routeId: null,
    stopIndex: 0,
  }
  return { ...afterCost, ships: [...afterCost.ships, ship], nextShipId: state.nextShipId + 1 }
}

/** Sends a docked ship to another island. Does nothing if there is no sea route. */
export function sendShip(state: GameState, shipId: number, islandId: number): GameState {
  const ship = getShip(state, shipId)
  return departTo(state, { ...ship, routeId: null }, islandId)
}

/** Lets a docked ship sail to an island, keeping its route settings. Null path: it stays. */
function departTo(state: GameState, ship: Ship, islandId: number): GameState {
  if (ship.island === null || ship.island === islandId) return withShip(state, ship)
  const from = portCell(state.world, ship.island)
  const to = portCell(state.world, islandId)
  const path = from && to ? findSeaPath(state.world, from, to) : null
  if (!from || !path) return withShip(state, ship)
  return withShip(state, { ...ship, island: null, destination: islandId, x: from.x, y: from.y, path })
}

/** Sails every ship on its way a little. Arriving ships dock and follow their route. */
export function moveShips(state: GameState): GameState {
  let next = state
  for (const ship of state.ships) {
    if (ship.island === null) next = stepShip(next, ship.id)
  }
  return next
}

function stepShip(state: GameState, shipId: number): GameState {
  const ship = getShip(state, shipId)
  let remaining = trade.ship.speed
  let { x, y } = ship
  const path = [...ship.path]
  while (remaining > 0 && path.length > 0) {
    const target = path[0]
    const distance = Math.hypot(target.x - x, target.y - y)
    if (distance <= remaining) {
      remaining -= distance
      x = target.x
      y = target.y
      path.shift()
    } else {
      x += ((target.x - x) / distance) * remaining
      y += ((target.y - y) / distance) * remaining
      remaining = 0
    }
  }
  if (path.length > 0 || ship.destination === null) return withShip(state, { ...ship, x, y, path })

  const docked: Ship = { ...ship, x, y, path: [], island: ship.destination, destination: null }
  return arrive(withShip(state, docked), docked.id)
}

/** A ship has docked: follow the route if it has one. */
function arrive(state: GameState, shipId: number): GameState {
  const ship = getShip(state, shipId)
  if (ship.routeId === null) return state
  return runRouteStop(state, shipId)
}

/** Does the orders of the stop the ship is at, then sails on to the next stop. */
function runRouteStop(state: GameState, shipId: number): GameState {
  const ship = getShip(state, shipId)
  const route = state.routes.find((entry) => entry.id === ship.routeId)
  if (!route || route.stops.length === 0 || ship.island === null) return state
  const stop = route.stops[ship.stopIndex % route.stops.length]
  let next = state
  if (stop.island === ship.island) {
    for (const order of stop.orders) next = applyOrder(next, shipId, order)
  }
  const nextIndex = (ship.stopIndex + 1) % route.stops.length
  const departing = { ...getShip(next, shipId), stopIndex: nextIndex }
  return departTo(next, departing, route.stops[nextIndex].island)
}

/** Puts a docked ship on a route (or takes it off with null). It goes to the first stop. */
export function assignRoute(state: GameState, shipId: number, routeId: number | null): GameState {
  const ship = getShip(state, shipId)
  if (ship.island === null) return state
  if (routeId === null) return withShip(state, { ...ship, routeId: null })
  const route = state.routes.find((entry) => entry.id === routeId)
  if (!route || route.stops.length === 0) return state
  const started: Ship = { ...ship, routeId, stopIndex: 0 }
  const first = route.stops[0].island
  if (ship.island === first) return runRouteStop(withShip(state, started), shipId)
  return departTo(state, started, first)
}

/** Carries out one load or unload order of the ship at the island where it lies. */
function applyOrder(state: GameState, shipId: number, order: RouteOrder): GameState {
  const ship = getShip(state, shipId)
  if (ship.island === null) return state
  const island = getIsland(state, ship.island)
  const have = ship.cargo[order.good] ?? 0
  const free = ship.capacity - cargoTotal(ship)

  if (island.owned) {
    const stock = island.stock[order.good] ?? 0
    // What does not fit into the store stays on board.
    const room = Math.max(0, config.production.stockCapacity - stock)
    const amount = order.mode === 'load' ? Math.min(order.amount, stock, free) : Math.min(order.amount, have, room)
    if (amount <= 0) return state
    const sign = order.mode === 'load' ? 1 : -1
    const cargo = { ...ship.cargo, [order.good]: have + sign * amount }
    const moved = onIsland(state, island.id, (flat) => ({
      ...flat,
      stock: { ...flat.stock, [order.good]: stock - sign * amount },
    }))
    return withShip(moved, { ...ship, cargo })
  }

  if (island.role === 'trader') {
    if (order.mode === 'load') {
      const price = traderSellPrice(order.good)
      const affordable = price > 0 ? Math.floor(Math.max(0, state.coins) / price) : 0
      const amount = Math.min(order.amount, free, affordable)
      if (amount <= 0) return state
      const bought = withShip(state, { ...ship, cargo: { ...ship.cargo, [order.good]: have + amount } })
      return { ...bought, coins: state.coins - amount * price }
    }
    const amount = Math.min(order.amount, have)
    if (amount <= 0) return state
    const sold = withShip(state, { ...ship, cargo: { ...ship.cargo, [order.good]: have - amount } })
    return { ...sold, coins: state.coins + amount * traderBuyPrice(order.good) }
  }
  return state
}

/** Empties the cargo of a docked ship into the store of its own island. What does not fit stays on board. */
export function unloadAll(state: GameState, shipId: number): GameState {
  const ship = getShip(state, shipId)
  if (ship.island === null || !getIsland(state, ship.island).owned || cargoTotal(ship) === 0) return state
  const cargo: Record<string, number> = {}
  const moved = onIsland(state, ship.island, (flat) => {
    const stock = { ...flat.stock }
    for (const [good, amount] of Object.entries(ship.cargo)) {
      const taken = Math.min(amount, Math.max(0, config.production.stockCapacity - (stock[good] ?? 0)))
      stock[good] = (stock[good] ?? 0) + taken
      if (amount - taken > 0) cargo[good] = amount - taken
    }
    return { ...flat, stock }
  })
  return withShip(moved, { ...ship, cargo })
}

/** Loads the goods for a new Kontor (not the coins) from the store of the island the ship lies at. */
export function loadKit(state: GameState, shipId: number): GameState {
  const ship = getShip(state, shipId)
  if (ship.island === null || !getIsland(state, ship.island).owned) return state
  const kit = kontorKit().goods
  const island = getIsland(state, ship.island)
  const cargo = { ...ship.cargo }
  const taken: Record<string, number> = {}
  for (const [good, needed] of Object.entries(kit)) {
    const missing = Math.max(0, needed - (cargo[good] ?? 0))
    const amount = Math.min(missing, island.stock[good] ?? 0)
    if (amount > 0) {
      cargo[good] = (cargo[good] ?? 0) + amount
      taken[good] = amount
    }
  }
  if (cargoTotal({ ...ship, cargo }) > ship.capacity || Object.keys(taken).length === 0) return state
  const moved = onIsland(state, island.id, (flat) => {
    const stock = { ...flat.stock }
    for (const [good, amount] of Object.entries(taken)) stock[good] -= amount
    return { ...flat, stock }
  })
  return withShip(moved, { ...ship, cargo })
}

/** First 2x2 spot on the shore where a Kontor can stand, or null. */
function findKontorSpot(island: IslandState): { x: number; y: number } | null {
  const { width, height } = island.map
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!checkPlacement(island, 'kontor', x, y, false)) return { x, y }
    }
  }
  return null
}

/** The island as it will be when the colony is founded: yours, with the ship's Kontor goods in store. */
function islandWithKit(state: GameState, islandId: number): IslandState {
  const flat = toIslandState(state, islandId)
  const stock = { ...flat.stock }
  for (const [good, needed] of Object.entries(kontorKit().goods)) stock[good] = (stock[good] ?? 0) + needed
  return { ...flat, owned: true, stock }
}

/** Why a colony cannot be founded now, or null if it can. */
export function colonyBlocker(
  state: GameState,
  shipId: number,
): 'notDocked' | 'notFree' | 'noKit' | 'noCoins' | 'noSpot' | null {
  const ship = getShip(state, shipId)
  if (ship.island === null) return 'notDocked'
  const island = getIsland(state, ship.island)
  if (island.owned || island.role !== 'colony') return 'notFree'
  const kit = kontorKit()
  if (Object.entries(kit.goods).some(([good, needed]) => (ship.cargo[good] ?? 0) < needed)) return 'noKit'
  if (state.coins < kit.coins) return 'noCoins'
  return findKontorSpot(islandWithKit(state, island.id)) ? null : 'noSpot'
}

/** Founds a colony: the ship's goods and some coins build a Kontor on the shore and the island is yours. */
export function foundColony(state: GameState, shipId: number): GameState {
  if (colonyBlocker(state, shipId) !== null) return state
  const ship = getShip(state, shipId)
  const cargo = { ...ship.cargo }
  for (const [good, needed] of Object.entries(kontorKit().goods)) cargo[good] -= needed
  const ready = islandWithKit(state, ship.island!)
  const spot = findKontorSpot(ready)!
  const built = placeBuilding(ready, 'kontor', spot.x, spot.y, false)
  return withShip(fromIslandState(state, built), { ...ship, cargo })
}
