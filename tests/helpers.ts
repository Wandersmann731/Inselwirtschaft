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
    highestTier: 3,
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

/** A flat grass map of the given size, handy for logistics tests. */
export function grassField(width: number, height: number, overrides: Partial<GameState> = {}): GameState {
  return stateFromRows(
    Array.from({ length: height }, () => ','.repeat(width)),
    overrides,
  )
}

/** Replaces the house state of the building with the given id. */
export function patchHouse(state: GameState, buildingId: number, patch: Partial<NonNullable<GameState['buildings'][number]['house']>>): GameState {
  return {
    ...state,
    buildings: state.buildings.map((b) => (b.id === buildingId && b.house ? { ...b, house: { ...b.house, ...patch } } : b)),
  }
}

/** Changes one building (for example to switch it off). */
export function patchBuilding(state: GameState, buildingId: number, patch: Partial<GameState['buildings'][number]>): GameState {
  return { ...state, buildings: state.buildings.map((b) => (b.id === buildingId ? { ...b, ...patch } : b)) }
}
