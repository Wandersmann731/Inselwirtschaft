import type { GameState, Island, IslandState } from './state'

const ISLAND_KEYS = [
  'id',
  'name',
  'climate',
  'fertilities',
  'deposits',
  'owned',
  'role',
  'map',
  'buildings',
  'nextBuildingId',
  'occupancy',
  'roads',
  'stock',
  'economy',
  'trade',
] as const

export function getIsland(state: GameState, islandId: number): Island {
  const island = state.islands.find((entry) => entry.id === islandId)
  if (!island) throw new Error(`Unknown island: ${islandId}`)
  return island
}

/** The game as seen from one island. See IslandState. */
export function toIslandState(state: GameState, islandId: number): IslandState {
  return { ...state, ...getIsland(state, islandId) }
}

/** Writes the island fields of an island state back, together with the global money and unlock fields. */
export function fromIslandState(state: GameState, flat: IslandState): GameState {
  const island = Object.fromEntries(ISLAND_KEYS.map((key) => [key, flat[key]])) as unknown as Island
  return {
    ...state,
    coins: flat.coins,
    highestTier: flat.highestTier,
    islands: state.islands.map((entry) => (entry.id === island.id ? island : entry)),
  }
}

/** Applies a rule for one island to the whole game. */
export function onIsland(state: GameState, islandId: number, rule: (island: IslandState) => IslandState): GameState {
  const before = toIslandState(state, islandId)
  const after = rule(before)
  return after === before ? state : fromIslandState(state, after)
}

/** Applies a rule to every island in turn. Money and unlocks flow from one island to the next. */
export function onEachIsland(state: GameState, rule: (island: IslandState) => IslandState): GameState {
  return state.islands.reduce((current, island) => onIsland(current, island.id, rule), state)
}

/** All islands with the fields of an island state laid over its island, so rules see fresh data. */
export function islandsOf(state: GameState | IslandState): Island[] {
  if (!('buildings' in state)) return state.islands
  const flat = state as IslandState
  return flat.islands.map((entry) => (entry.id === flat.id ? (Object.fromEntries(ISLAND_KEYS.map((key) => [key, flat[key]])) as unknown as Island) : entry))
}

/** Wraps a single island state into a game with only that island. Used by tests. */
export function liftIsland(flat: IslandState): GameState {
  const island = Object.fromEntries(ISLAND_KEYS.map((key) => [key, flat[key]])) as unknown as Island
  const { version, seed, rngState, tick, speed, coins, highestTier, world, ships, routes, nextShipId, nextRouteId } = flat
  return { version, seed, rngState, tick, speed, coins, highestTier, world, ships, routes, nextShipId, nextRouteId, islands: [island] }
}
