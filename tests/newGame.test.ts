import { describe, expect, it } from 'vitest'
import { tick } from '../src/sim/tick'
import { createRng } from '../src/sim/rng'
import { config, getBuilding } from '../src/data'
import { addStartKit, createNewGame } from '../src/sim/newGame'
import { buildShip, sendShip } from '../src/sim/ships'
import { createInitialState } from '../src/sim/state'
import { hasKontor } from '../src/sim/trade'
import { toIslandState } from '../src/sim/islands'
import { Terrain } from '../src/world/terrain'
import { portCell } from '../src/world/seaPath'

const SEEDS = [1, 2, 3, 7, 42, 99, 1234]

describe('a new game', () => {
  it('starts with a running Kontor on the shore of the home island', () => {
    for (const seed of SEEDS) {
      const game = createNewGame(seed)
      const home = game.islands[0]
      const kontors = home.buildings.filter((b) => b.type === 'kontor')
      expect(kontors, `seed ${seed}`).toHaveLength(1)
      expect(kontors[0].active).toBe(true)
      expect(hasKontor(toIslandState(game, 0))).toBe(true)
      // at the coast: water next to the 2x2 footprint
      const { x, y } = kontors[0]
      const { width, tiles } = home.map
      const around = [[x - 1, y], [x - 1, y + 1], [x + 2, y], [x + 2, y + 1], [x, y - 1], [x + 1, y - 1], [x, y + 2], [x + 1, y + 2]]
      expect(around.some(([ax, ay]) => tiles[ay * width + ax] === Terrain.Water), `seed ${seed}`).toBe(true)
    }
  })

  it('has one ship lying in the harbour of the home island', () => {
    for (const seed of SEEDS) {
      const game = createNewGame(seed)
      expect(game.ships, `seed ${seed}`).toHaveLength(1)
      const ship = game.ships[0]
      expect(ship.island).toBe(0)
      expect(ship.cargo).toEqual({})
      expect(ship.routeId).toBeNull()
      const port = portCell(game.world, 0)!
      expect({ x: ship.x, y: ship.y }).toEqual(port)
      expect(game.nextShipId).toBe(2)
    }
  })

  it('costs nothing: coins, goods and the books stay as in a plain new game', () => {
    const plain = createInitialState(5, 7000)
    const game = createNewGame(5, 7000)
    expect(game.coins).toBe(7000)
    expect(game.islands[0].stock).toEqual(plain.islands[0].stock)
    expect(game.islands[0].economy).toEqual(plain.islands[0].economy)
    expect(game.coins).toBe(plain.coins)
    // colonies stay as they are; the trader island gets its town (scenery, not the player's)
    for (const [i, island] of game.islands.entries()) {
      if (i === 0) continue
      if (island.role === 'trader') expect(island.stock).toEqual(plain.islands[i].stock)
      else expect(island).toEqual(plain.islands[i])
    }
    expect(config.startCoins).toBeGreaterThan(0)
  })

  it('leaves the colonies untouched, builds the trader town, and the same seed gives the same game', () => {
    expect(createNewGame(11)).toEqual(createNewGame(11))
    const game = createNewGame(11)
    for (const island of game.islands.slice(1)) {
      expect(island.owned).toBe(false)
      if (island.role === 'trader') {
        const types = island.buildings.map((b) => b.type)
        expect(types).toContain('kontor')
        expect(types).toContain('market_house')
        expect(types.filter((t) => t === 'house_pioneers').length).toBeGreaterThan(8)
        expect(island.roads.some((r) => r === 1)).toBe(true)
      } else {
        expect(island.buildings).toEqual([])
      }
    }
  })

  it('the trader town costs and earns the player nothing', () => {
    let game = createNewGame(11)
    const coins = game.coins
    const trader = game.islands.find((island) => island.role === 'trader')!
    const before = trader.buildings
    // a whole cycle without any buildings of the player: only the free Kontor's upkeep is paid
    for (let i = 0; i < config.economyCycleTicks; i++) game = tick(game, createRng(i))
    const kontorUpkeep = getBuilding('kontor').upkeep.active
    expect(game.coins).toBe(coins - kontorUpkeep)
    expect(game.islands.find((island) => island.role === 'trader')!.buildings).toEqual(before)
  })

  it('does not add the kit twice', () => {
    const game = createNewGame(3)
    expect(addStartKit(game)).toBe(game)
  })

  it('can sail at once: the first ship goes to a colony island', () => {
    const game = createNewGame(1)
    const sent = sendShip(game, game.ships[0].id, 2)
    expect(sent.ships[0].island).toBeNull()
    expect(sent.ships[0].destination).toBe(2)
  })

  it('can build a second ship at a shipyard like before', () => {
    const game = createNewGame(1)
    expect(buildShip(game, 0).ships).toHaveLength(1) // no shipyard yet
  })

  it('survives a JSON round trip', () => {
    const game = createNewGame(2)
    expect(JSON.parse(JSON.stringify(game))).toEqual(game)
  })
})

describe('migration from version 12 and the harbour', () => {
  it('builds the town on the empty trader island of an old save and adds the upgrade stops', async () => {
    const { MIGRATIONS, migrateState } = await import('../src/sim/migrations')
    const { CURRENT_SAVE_VERSION } = await import('../src/sim/state')
    const old = JSON.parse(JSON.stringify(createInitialState(4))) as Record<string, any>
    old.version = 12
    const migrated = migrateState(old, MIGRATIONS)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    const trader = migrated.islands.find((island) => island.role === 'trader')!
    expect(trader.buildings.length).toBeGreaterThan(5)
    expect(migrated.islands.every((island) => Array.isArray(island.upgradeStop))).toBe(true)
  })

  it('a docked ship lies on open water near the Kontor', async () => {
    const { dockTile } = await import('../src/sim/harbour')
    const game = createNewGame(3)
    const home = toIslandState(game, game.islands[0].id)
    const dock = dockTile(home)!
    const kontor = home.buildings.find((b) => b.type === 'kontor')!
    const { width, tiles } = home.map
    const tx = Math.floor(dock.x)
    const ty = Math.floor(dock.y)
    const inside = tx >= 0 && ty >= 0 && tx < width && ty < home.map.height
    if (inside) expect(tiles[ty * width + tx]).toBe(Terrain.Water)
    expect(Math.hypot(dock.x - kontor.x, dock.y - kontor.y)).toBeLessThan(12)
  })
})

describe('the trader town is not part of the realm', () => {
  it('its residents are not counted and do not unlock anything', async () => {
    const { totalResidents, residentsOfTier, isTierUnlocked } = await import('../src/sim/tiers')
    const game = createNewGame(11)
    expect(totalResidents(game)).toBe(0)
    expect(residentsOfTier(game, 'merchants')).toBe(0)
    expect(isTierUnlocked(game, 'aristocrats')).toBe(false)
  })
})
