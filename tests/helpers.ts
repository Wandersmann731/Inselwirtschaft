import { createInitialState, type GameState } from '../src/sim/state'
import { Terrain } from '../src/world/terrain'

const CHARS: Record<string, number> = {
  '~': Terrain.Water,
  '.': Terrain.Beach,
  ',': Terrain.Grass,
  T: Terrain.Forest,
  M: Terrain.Mountain,
}

/** Builds a small test state from ASCII rows: ~ water, . beach, , grass, T forest, M mountain. */
export function stateFromRows(rows: string[], overrides: Partial<GameState> = {}): GameState {
  const width = rows[0].length
  const tiles = rows.flatMap((row) => Array.from(row, (char) => CHARS[char]))
  return {
    ...createInitialState(1),
    map: { width, height: rows.length, tiles },
    occupancy: new Array(tiles.length).fill(0),
    roads: new Array(tiles.length).fill(0),
    ...overrides,
  }
}

/** A 20x14 test island: sea around, beach ring, grass inside, a mountain block and some forest. */
export function testIsland(overrides: Partial<GameState> = {}): GameState {
  return stateFromRows(
    [
      '~~~~~~~~~~~~~~~~~~~~',
      '~~..............~~~~',
      '~.,,,,,,,,,,,,,.~~~~',
      '~.,,,,,,,,,,,,,.~~~~',
      '~.,,,,,,,,,,,,,.~~~~',
      '~.,,,,TTTT,,,,,.~~~~',
      '~.,,,,TTTT,,MMMM.~~~',
      '~.,,,,,,,,,,MMMM.~~~',
      '~.,,,,,,,,,,MMMM.~~~',
      '~.,,,,,,,,,,MMMM.~~~',
      '~.,,,,,,,,,,,,,.~~~~',
      '~.,,,,,,,,,,,,,.~~~~',
      '~..............~~~~~',
      '~~~~~~~~~~~~~~~~~~~~',
    ],
    overrides,
  )
}
