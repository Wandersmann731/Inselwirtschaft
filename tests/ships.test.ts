import { describe, expect, it } from 'vitest'
import { config, trade } from '../src/data'
import { checkPlacement, placeBuilding } from '../src/sim/build'
import { fromIslandState, getIsland, onIsland, toIslandState } from '../src/sim/islands'
import { addOrder, addStop, createRoute } from '../src/sim/routes'
import { createRng } from '../src/sim/rng'
import { assignRoute, buildShip, cargoTotal, colonyBlocker, foundColony, getShip, loadKit, moveShips, sendShip, unloadAll } from '../src/sim/ships'
import { createInitialState, type GameState } from '../src/sim/state'
import { tick } from '../src/sim/tick'
import { kontorKit, traderBuyPrice, traderSellPrice } from '../src/sim/trade'

const base = createInitialState(1)
const HOME = 0
const COLONY = 2 // Frostmark
const TRADER = 5

/** Puts a building on the first spot of an island where it fits. */
function place(state: GameState, islandId: number, type: string): GameState {
  const flat = toIslandState(state, islandId)
  for (let y = 0; y < flat.map.height; y++) {
    for (let x = 0; x < flat.map.width; x++) {
      if (!checkPlacement(flat, type, x, y, false)) return fromIslandState(state, placeBuilding(flat, type, x, y, false))
    }
  }
  throw new Error(`no spot for ${type}`)
}

const rich = (state: GameState): GameState => ({
  ...state,
  coins: 100000,
  highestTier: 3,
  islands: state.islands.map((island) =>
    island.id === HOME ? { ...island, stock: { ...island.stock, tools: 500, wood: 500, bricks: 500, marble: 50 } } : island,
  ),
})

function withYard(): GameState {
  return place(rich(base), HOME, 'shipyard')
}

function sail(state: GameState, ticks: number): GameState {
  let next = state
  for (let i = 0; i < ticks; i++) next = tick(next, createRng(next.rngState))
  return next
}

function until(state: GameState, done: (state: GameState) => boolean, limit = 3000): GameState {
  let next = state
  for (let i = 1; i <= limit; i++) {
    next = tick(next, createRng(next.rngState))
    if (done(next)) return next
  }
  throw new Error('condition not reached')
}

function untilDocked(state: GameState, shipId: number, limit = 3000): { state: GameState; ticks: number } {
  let next = state
  for (let i = 1; i <= limit; i++) {
    next = tick(next, createRng(next.rngState))
    if (getShip(next, shipId).island !== null) return { state: next, ticks: i }
  }
  throw new Error('ship did not arrive')
}

describe('building ships', () => {
  it('needs a shipyard on a home island', () => {
    expect(buildShip(rich(base), HOME)).toEqual(rich(base))
    expect(buildShip(withYard(), COLONY)).toEqual(withYard())
  })

  it('pays goods and coins and puts the ship into the harbour', () => {
    const yard = withYard()
    const built = buildShip(yard, HOME)
    expect(built.ships).toHaveLength(1)
    const ship = built.ships[0]
    expect(ship.island).toBe(HOME)
    expect(ship.capacity).toBe(trade.ship.capacity)
    expect(built.coins).toBe(yard.coins - trade.ship.cost.coins)
    expect(getIsland(built, HOME).stock.wood).toBe(getIsland(yard, HOME).stock.wood - trade.ship.cost.wood)
    expect(built.nextShipId).toBe(2)
  })

  it('does not build without enough goods or coins', () => {
    const yard = withYard()
    expect(buildShip({ ...yard, coins: 10 }, HOME).ships).toHaveLength(0)
    const noWood = { ...yard, islands: yard.islands.map((i) => (i.id === HOME ? { ...i, stock: { ...i.stock, wood: 1 } } : i)) }
    expect(buildShip(noWood, HOME).ships).toHaveLength(0)
  })

  it('does not build in debt', () => {
    expect(buildShip({ ...withYard(), coins: -1 }, HOME).ships).toHaveLength(0)
  })
})

describe('sailing', () => {
  const ready = buildShip(withYard(), HOME)

  it('leaves the harbour and arrives at the other island after some time', () => {
    const sent = sendShip(ready, 1, COLONY)
    expect(sent.ships[0].island).toBeNull()
    expect(sent.ships[0].destination).toBe(COLONY)
    const arrived = untilDocked(sent, 1)
    expect(arrived.ticks).toBeGreaterThan(10)
    expect(getShip(arrived.state, 1).island).toBe(COLONY)
    expect(getShip(arrived.state, 1).path).toEqual([])
  })

  it('keeps going while on the way and moves at the configured speed', () => {
    const sent = sendShip(ready, 1, COLONY)
    const after = moveShips(sent)
    const ship = getShip(after, 1)
    const travelled = Math.hypot(ship.x - sent.ships[0].x, ship.y - sent.ships[0].y)
    expect(travelled).toBeGreaterThan(0)
    expect(travelled).toBeLessThanOrEqual(trade.ship.speed + 1e-9)
  })

  it('stays where it is if the destination is its own island', () => {
    expect(sendShip(ready, 1, HOME)).toEqual(ready)
  })

  it('takes longer to a farther island', () => {
    const times = [1, 2, 3, 4, 5].map((island) => untilDocked(sendShip(ready, 1, island), 1).ticks)
    expect(new Set(times).size).toBeGreaterThan(1)
  })
})

describe('trade routes', () => {
  /** Home and Frostmark are both yours; a route carries wood from one to the other. */
  function twoIslands(): GameState {
    let state = buildShip(withYard(), HOME)
    state = { ...state, islands: state.islands.map((i) => (i.id === COLONY ? { ...i, owned: true } : i)) }
    state = createRoute(state)
    state = addStop(state, 1, HOME)
    state = addStop(state, 1, COLONY)
    state = addOrder(state, 1, 0, { good: 'wood', amount: 40, mode: 'load' })
    state = addOrder(state, 1, 1, { good: 'wood', amount: 9999, mode: 'unload' })
    return state
  }

  it('loads at the first stop and unloads at the second', () => {
    const start = twoIslands()
    const woodBefore = getIsland(start, HOME).stock.wood
    const started = assignRoute(start, 1, 1)
    expect(getShip(started, 1).routeId).toBe(1)
    // loaded immediately because the ship lies at the first stop
    expect(cargoTotal(getShip(started, 1))).toBe(40)
    expect(getIsland(started, HOME).stock.wood).toBe(woodBefore - 40)

    const arrived = until(started, (s) => (getIsland(s, COLONY).stock.wood ?? 0) > 0)
    expect(cargoTotal(getShip(arrived, 1))).toBe(0)
    expect(getIsland(arrived, COLONY).stock.wood).toBe(40)
  })

  it('sails the route over and over', () => {
    let state = assignRoute(twoIslands(), 1, 1)
    state = sail(state, 1500)
    expect(getIsland(state, COLONY).stock.wood).toBeGreaterThan(40)
  })

  it('loads no more than the ship holds or the store has', () => {
    let state = twoIslands()
    state = addOrder(state, 1, 0, { good: 'tools', amount: 9999, mode: 'load' })
    const started = assignRoute(state, 1, 1)
    expect(cargoTotal(getShip(started, 1))).toBe(trade.ship.capacity)
  })

  it('does nothing at stops it does not own', () => {
    let state = buildShip(withYard(), HOME)
    state = createRoute(state)
    state = addStop(state, 1, COLONY)
    state = addOrder(state, 1, 0, { good: 'wood', amount: 10, mode: 'load' })
    const started = assignRoute(state, 1, 1)
    const arrived = untilDocked(started, 1)
    expect(cargoTotal(getShip(arrived.state, 1))).toBe(0)
    expect(getIsland(arrived.state, COLONY).stock.wood ?? 0).toBe(0)
  })

  it('can be taken off the route', () => {
    let state = createRoute(buildShip(withYard(), HOME))
    state = addStop(state, 1, HOME)
    const onRoute = assignRoute(state, 1, 1)
    expect(getShip(onRoute, 1).routeId).toBe(1)
    const off = assignRoute(onRoute, 1, null)
    expect(getShip(off, 1).routeId).toBeNull()
  })
})

describe('trading with the trader island', () => {
  function toTrader(orders: { good: string; amount: number; mode: 'load' | 'unload' }[]): GameState {
    let state = buildShip(withYard(), HOME)
    state = createRoute(state)
    state = addStop(state, 1, TRADER)
    for (const order of orders) state = addOrder(state, 1, 0, order)
    return state
  }

  it('sells cargo at the fixed buying price', () => {
    let state = toTrader([{ good: 'wood', amount: 9999, mode: 'unload' }])
    const ship = getShip(state, 1)
    state = { ...state, ships: [{ ...ship, cargo: { wood: 30 } }] }
    const coins = state.coins
    const arrived = untilDocked(assignRoute(state, 1, 1), 1).state
    expect(arrived.coins).toBeCloseTo(coins + 30 * traderBuyPrice('wood'))
    expect(cargoTotal(getShip(arrived, 1))).toBe(0)
  })

  it('buys goods at the fixed selling price and as far as the money goes', () => {
    const state = toTrader([{ good: 'tobacco', amount: 20, mode: 'load' }])
    const coins = state.coins
    const arrived = untilDocked(assignRoute(state, 1, 1), 1).state
    expect(getShip(arrived, 1).cargo.tobacco).toBe(20)
    expect(arrived.coins).toBeCloseTo(coins - 20 * traderSellPrice('tobacco'))

    const poor = untilDocked(assignRoute({ ...state, coins: 50 }, 1, 1), 1).state
    expect(getShip(poor, 1).cargo.tobacco ?? 0).toBe(Math.floor(50 / traderSellPrice('tobacco')))
    expect(poor.coins).toBeGreaterThanOrEqual(0)
  })
})

describe('loading and unloading by hand', () => {
  it('loads the Kontor goods and unloads everything at your own island', () => {
    const ready = buildShip(withYard(), HOME)
    const loaded = loadKit(ready, 1)
    const kit = kontorKit().goods
    for (const [good, amount] of Object.entries(kit)) expect(getShip(loaded, 1).cargo[good]).toBe(amount)
    // with room in the store everything goes ashore
    const roomy = onIsland(loaded, HOME, (flat) => ({ ...flat, stock: { tools: 0, wood: 0 } }))
    const unloaded = unloadAll(roomy, 1)
    expect(cargoTotal(getShip(unloaded, 1))).toBe(0)
    expect(getIsland(unloaded, HOME).stock.wood).toBe(kit.wood)
  })

  it('keeps on board what does not fit into the store', () => {
    const loaded = loadKit(buildShip(withYard(), HOME), 1)
    const kit = kontorKit().goods
    const nearlyFull = onIsland(loaded, HOME, (flat) => ({ ...flat, stock: { ...flat.stock, wood: config.production.stockCapacity - 2 } }))
    const unloaded = unloadAll(nearlyFull, 1)
    expect(getIsland(unloaded, HOME).stock.wood).toBe(config.production.stockCapacity)
    expect(getShip(unloaded, 1).cargo.wood).toBe(kit.wood - 2)
  })

  it('cannot unload at a foreign island', () => {
    const loaded = loadKit(buildShip(withYard(), HOME), 1)
    const there = untilDocked(sendShip(loaded, 1, COLONY), 1).state
    expect(unloadAll(there, 1)).toBe(there)
  })
})

describe('founding a colony', () => {
  function atColony(withKit: boolean): GameState {
    let state = buildShip(withYard(), HOME)
    if (withKit) state = loadKit(state, 1)
    return untilDocked(sendShip(state, 1, COLONY), 1).state
  }

  it('turns the island into yours with a Kontor, paid from the ship and the treasury', () => {
    const arrived = atColony(true)
    expect(colonyBlocker(arrived, 1)).toBeNull()
    const founded = foundColony(arrived, 1)
    const island = getIsland(founded, COLONY)
    expect(island.owned).toBe(true)
    expect(island.buildings.map((b) => b.type)).toEqual(['kontor'])
    expect(founded.coins).toBe(arrived.coins - kontorKit().coins)
    expect(cargoTotal(getShip(founded, 1))).toBe(0)
  })

  it('needs the goods on board', () => {
    const arrived = atColony(false)
    expect(colonyBlocker(arrived, 1)).toBe('noKit')
    expect(foundColony(arrived, 1)).toBe(arrived)
  })

  it('needs the coins', () => {
    const arrived = { ...atColony(true), coins: 10 }
    expect(colonyBlocker(arrived, 1)).toBe('noCoins')
  })

  it('does not work in port at home or at the trader', () => {
    const ready = loadKit(buildShip(withYard(), HOME), 1)
    expect(colonyBlocker(ready, 1)).toBe('notFree')
    const trader = untilDocked(sendShip(ready, 1, TRADER), 1).state
    expect(colonyBlocker(trader, 1)).toBe('notFree')
  })

  it('does not work while sailing', () => {
    const sailing = sendShip(loadKit(buildShip(withYard(), HOME), 1), 1, COLONY)
    expect(colonyBlocker(sailing, 1)).toBe('notDocked')
  })

  it('lets you build on the new island afterwards', () => {
    const founded = foundColony(atColony(true), 1)
    const flat = toIslandState(founded, COLONY)
    expect(flat.owned).toBe(true)
    let spot: { x: number; y: number } | null = null
    for (let y = 0; y < flat.map.height && !spot; y++) {
      for (let x = 0; x < flat.map.width; x++) {
        if (!checkPlacement({ ...flat, coins: 1e6, stock: { tools: 99, wood: 99 } }, 'house_pioneers', x, y, false)) {
          spot = { x, y }
          break
        }
      }
    }
    expect(spot).not.toBeNull()
  })
})

describe('save format', () => {
  it('keeps ships and routes in a JSON round trip', () => {
    const state = assignRoute(buildShip(withYard(), HOME), 1, null)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})
