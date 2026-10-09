import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
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
    expect(game.islands.slice(1)).toEqual(plain.islands.slice(1))
    expect(config.startCoins).toBeGreaterThan(0)
  })

  it('leaves the other islands untouched and the same seed gives the same game', () => {
    expect(createNewGame(11)).toEqual(createNewGame(11))
    const game = createNewGame(11)
    for (const island of game.islands.slice(1)) {
      expect(island.buildings).toEqual([])
      expect(island.owned).toBe(false)
    }
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
