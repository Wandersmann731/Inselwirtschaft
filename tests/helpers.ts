import { config, landNames } from '../src/data'
import { liftIsland, toIslandState } from '../src/sim/islands'
import { emptyLedger } from '../src/sim/ledger'
import type { Rng } from '../src/sim/rng'
import { createStateWith, type Island, type IslandState } from '../src/sim/state'
import { runCycle } from '../src/sim/cycle'
import { tick } from '../src/sim/tick'
import { Terrain } from '../src/world/terrain'

const CHARS: Record<string, number> = {
  '~': Terrain.Water,
  '.': Terrain.Beach,
  ',': Terrain.Grass,
  T: Terrain.Forest,
  M: Terrain.Mountain,
}

/** Builds a small test state from ASCII rows: ~ water, . beach, , grass, T forest, M mountain. */
export function stateFromRows(rows: string[], overrides: Partial<IslandState> = {}): IslandState {
  const width = rows[0].length
  const tiles = rows.flatMap((row) => Array.from(row, (char) => CHARS[char]))
  const island: Island = {
    id: 0,
    name: 'Testinsel',
    climate: 'north',
    fertilities: landNames.fertilities.map((entry) => entry.id),
    deposits: landNames.deposits.map((entry) => entry.id),
    owned: true,
    role: 'home',
    map: { width, height: rows.length, tiles },
    buildings: [],
    nextBuildingId: 1,
    occupancy: new Array(tiles.length).fill(0),
    roads: new Array(tiles.length).fill(0),
    stock: { ...config.startStock },
    economy: { current: emptyLedger(), last: null },
  }
  const game = createStateWith(1, [island], { width: 1, height: 1, cells: [1], placements: [] })
  return { ...game, ...island, highestTier: 3, ...overrides }
}

/** One tick for a single island state (wraps it into a game with one island). */
export function tickFlat(state: IslandState, rng: Rng): IslandState {
  return toIslandState(tick(liftIsland(state), rng), state.id)
}

/** A 20x14 test island: sea around, beach ring, grass inside, a mountain block and some forest. */
export function testIsland(overrides: Partial<IslandState> = {}): IslandState {
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
export function grassField(width: number, height: number, overrides: Partial<IslandState> = {}): IslandState {
  return stateFromRows(
    Array.from({ length: height }, () => ','.repeat(width)),
    overrides,
  )
}

/** Replaces the house state of the building with the given id. */
export function patchHouse(state: IslandState, buildingId: number, patch: Partial<NonNullable<IslandState['buildings'][number]['house']>>): IslandState {
  return {
    ...state,
    buildings: state.buildings.map((b) => (b.id === buildingId && b.house ? { ...b, house: { ...b.house, ...patch } } : b)),
  }
}

/** Changes one building (for example to switch it off). */
export function patchBuilding(state: IslandState, buildingId: number, patch: Partial<IslandState['buildings'][number]>): IslandState {
  return { ...state, buildings: state.buildings.map((b) => (b.id === buildingId ? { ...b, ...patch } : b)) }
}

/** One economy cycle for a single island state. */
export function cycleFlat(state: IslandState): IslandState {
  return toIslandState(runCycle(liftIsland(state)), state.id)
}
