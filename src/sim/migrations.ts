import { config, getBuilding } from '../data'
import { generateIsland } from '../world/islandGenerator'
import { generateWorld, layoutRng, layoutWorld } from '../world/worldGenerator'
import { emptyLedger } from './ledger'
import { createProduction } from './productionState'
import { createHouse } from './tiers'
import { CURRENT_SAVE_VERSION, type GameState, type Island } from './state'

type RawState = Record<string, unknown>
/** Upgrades a save from version N to N + 1. */
export type Migration = (data: RawState) => RawState

/** Key = version the migration upgrades from. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 had an empty map. v2 generates the island from the saved seed.
  1: (data) => ({ ...data, map: generateIsland(Number(data.seed)) }),
  // v3 adds the goods store, buildings and roads.
  2: (data) => {
    const tileCount = (data.map as { tiles: unknown[] }).tiles.length
    return {
      ...data,
      stock: { ...config.startStock },
      buildings: [],
      nextBuildingId: 1,
      occupancy: new Array(tileCount).fill(0),
      roads: new Array(tileCount).fill(0),
    }
  },
  // v4 gives producing buildings their production state.
  3: (data) => ({
    ...data,
    buildings: (data.buildings as { type: string }[]).map((building) =>
      getBuilding(building.type).output ? { ...building, production: createProduction() } : building,
    ),
  }),
  // v5 adds houses with residents and the highest tier reached.
  4: (data) => ({
    ...data,
    highestTier: 0,
    buildings: (data.buildings as { type: string }[]).map((building) => {
      const tier = getBuilding(building.type).houseTier
      return tier ? { ...building, house: createHouse(tier) } : building
    }),
  }),
  // v6 makes all houses 2x2 and the islands much larger. The old layout no longer fits:
  // the world is generated again from the seed and the buildings are gone. Time, coins and goods stay.
  5: (data) => {
    const map = generateIsland(Number(data.seed))
    const zeros = new Array(map.tiles.length).fill(0)
    return { ...data, map, buildings: [], nextBuildingId: 1, occupancy: zeros, roads: [...zeros], highestTier: 0 }
  },
  // v7 adds the economy ledger and the utilisation of producers.
  6: (data) => ({
    ...data,
    economy: { current: emptyLedger(), last: null },
    buildings: (data.buildings as { production?: object }[]).map((building) =>
      building.production
        ? { ...building, production: { busyTicks: 0, utilization: 0, ...building.production } }
        : building,
    ),
  }),
  // v8 moves the single island into the archipelago: the old island becomes the home island,
  // the other islands are generated from the seed.
  7: (data) => {
    const generated = generateWorld(Number(data.seed)).islands
    const home = {
      ...generated[0],
      map: data.map,
      buildings: data.buildings,
      nextBuildingId: data.nextBuildingId,
      occupancy: data.occupancy,
      roads: data.roads,
      stock: data.stock,
      economy: data.economy,
    } as unknown as Island
    const islands = [home, ...generated.slice(1)]
    return {
      seed: data.seed,
      rngState: data.rngState,
      tick: data.tick,
      speed: data.speed,
      coins: data.coins,
      highestTier: data.highestTier,
      islands,
      world: layoutWorld(islands, layoutRng(Number(data.seed))),
    }
  },
  // v9 adds ships, routes and the Kontor trade settings of the islands.
  8: (data) => ({
    ...data,
    ships: [],
    routes: [],
    nextShipId: 1,
    nextRouteId: 1,
    islands: (data.islands as object[]).map((island) => ({ trade: {}, ...island })),
  }),
  // v10: chains follow the production diagrams. Removed: winery, potatoes, grapes, indigo. New: byproducts of producers.
  9: (data) => {
    const gone = new Set(['winery'])
    const dropGoods = ['grapes', 'potatoes']
    const clean = (record: Record<string, number>): Record<string, number> => {
      const next = { ...record }
      if (next.indigo !== undefined) {
        next.dye = (next.dye ?? 0) + next.indigo
        delete next.indigo
      }
      for (const good of dropGoods) delete next[good]
      return next
    }
    const islands = (data.islands as Record<string, unknown>[]).map((island) => {
      const buildings = island.buildings as { id: number; type: string; production?: Record<string, unknown> }[]
      const removed = new Set(buildings.filter((b) => gone.has(b.type)).map((b) => b.id))
      const trade = Object.fromEntries(Object.entries((island.trade ?? {}) as Record<string, unknown>).filter(([good]) => !dropGoods.includes(good) && good !== 'indigo'))
      return {
        ...island,
        stock: clean(island.stock as Record<string, number>),
        trade,
        occupancy: (island.occupancy as number[]).map((id) => (removed.has(id) ? 0 : id)),
        buildings: buildings
          .filter((b) => !removed.has(b.id))
          .map((b) => (b.production ? { ...b, production: { extra: {}, ...b.production, inputs: clean((b.production.inputs ?? {}) as Record<string, number>) } } : b)),
      }
    })
    const ships = (data.ships as { cargo: Record<string, number> }[]).map((ship) => ({ ...ship, cargo: clean(ship.cargo) }))
    return { ...data, islands, ships }
  },
  // v11: residents fetch their goods from the Kontor by themselves and pay a land tax, so the market stands are gone.
  10: (data) => {
    const islands = (data.islands as Record<string, unknown>[]).map((island) => {
      const buildings = island.buildings as { id: number; type: string }[]
      const removed = new Set(buildings.filter((b) => getBuilding(b.type).sells !== undefined).map((b) => b.id))
      return {
        ...island,
        buildings: buildings.filter((b) => !removed.has(b.id)),
        occupancy: (island.occupancy as number[]).map((id) => (removed.has(id) ? 0 : id)),
      }
    })
    return { ...data, islands }
  },
  // v12: public buildings got smaller footprints. The occupancy of every island is laid out again from the buildings.
  11: (data) => {
    const islands = (data.islands as Record<string, unknown>[]).map((island) => {
      const { width, height } = island.map as { width: number; height: number }
      const occupancy: number[] = new Array(width * height).fill(0)
      for (const b of island.buildings as { id: number; type: string; x: number; y: number; rotated: boolean }[]) {
        const [w0, h0] = getBuilding(b.type).size
        const [w, h] = b.rotated ? [h0, w0] : [w0, h0]
        for (let y = b.y; y < b.y + h && y < height; y++) {
          for (let x = b.x; x < b.x + w && x < width; x++) occupancy[y * width + x] = b.id
        }
      }
      return { ...island, occupancy }
    })
    return { ...data, islands }
  },
}

/** Brings a raw saved object up to the current version or throws if that is impossible. */
export function migrateState(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  targetVersion: number = CURRENT_SAVE_VERSION,
): GameState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Save data is not an object')
  let data = raw as RawState
  let version = data.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Save data has no valid version')
  }
  if (version > targetVersion) throw new Error(`Save version ${version} is newer than the game`)
  while (version < targetVersion) {
    const migrate = migrations[version]
    if (!migrate) throw new Error(`No migration from save version ${version}`)
    data = { ...migrate(data), version: version + 1 }
    version += 1
  }
  if (typeof data.tick !== 'number' || typeof data.coins !== 'number') {
    throw new Error('Save data is incomplete')
  }
  return data as unknown as GameState
}
