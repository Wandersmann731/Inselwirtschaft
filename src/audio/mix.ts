import { getBuilding } from '../data'
import type { GameState, IslandState } from '../sim/state'
import { buildingRect } from '../sim/coverage'
import { totalResidents } from '../sim/tiers'
import { Terrain } from '../world/terrain'

/** How loud each ambience loop is, 0 to 1, by id (amb_sea ...). */
export type Levels = Record<string, number>

const COLD = new Set(['polar', 'tundra'])
const SAMPLE_RADIUS = 7

/** Share of each kind of terrain around a tile, to find out what the player is looking at. */
export function terrainShares(island: IslandState, cx: number, cy: number): Record<'water' | 'beach' | 'grass' | 'forest' | 'mountain', number> {
  const { map } = island
  const counts = { water: 0, beach: 0, grass: 0, forest: 0, mountain: 0 }
  let total = 0
  for (let y = Math.floor(cy) - SAMPLE_RADIUS; y <= Math.floor(cy) + SAMPLE_RADIUS; y++) {
    for (let x = Math.floor(cx) - SAMPLE_RADIUS; x <= Math.floor(cx) + SAMPLE_RADIUS; x++) {
      total++
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
        counts.water++
        continue
      }
      const terrain = map.tiles[y * map.width + x]
      if (terrain === Terrain.Water) counts.water++
      else if (terrain === Terrain.Beach) counts.beach++
      else if (terrain === Terrain.Grass) counts.grass++
      else if (terrain === Terrain.Forest) counts.forest++
      else counts.mountain++
    }
  }
  return { water: counts.water / total, beach: counts.beach / total, grass: counts.grass / total, forest: counts.forest / total, mountain: counts.mountain / total }
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value))

/** The size class of a town by residents on the island. */
export function townLoop(residents: number): string | null {
  if (residents <= 0) return null
  if (residents < 120) return 'amb_town_small'
  if (residents < 1000) return 'amb_town_medium'
  return 'amb_town_large'
}

/** Which buildings of a kind are within `radius` tiles of the camera tile, with a falloff from 1 (at the camera) to 0. */
function nearBuildings(island: IslandState, cx: number, cy: number, radius: number): { type: string; weight: number; active: boolean; producing: boolean }[] {
  const found = []
  for (const building of island.buildings) {
    const rect = buildingRect(building)
    const dx = rect.x + rect.w / 2 - cx
    const dy = rect.y + rect.h / 2 - cy
    const distance = Math.hypot(dx, dy)
    if (distance > radius) continue
    found.push({ type: building.type, weight: 1 - distance / radius, active: building.active, producing: building.production?.status.kind === 'producing' })
  }
  return found
}

/**
 * Levels of the ambience loops for the place the camera looks at: sea near the coast, forest over trees, wind over
 * mountains, village noise near houses and so on. Pure, so it can be tested.
 */
export function ambienceLevels(island: IslandState, cx: number, cy: number): Levels {
  const shares = terrainShares(island, cx, cy)
  const levels: Levels = {}
  const coast = clamp((shares.water + shares.beach * 0.5) * 1.6)
  levels.amb_sea = coast
  levels.amb_forest = clamp(shares.forest * 1.6)
  levels.amb_meadow = clamp(shares.grass * 1.3) * (1 - coast * 0.6)
  levels.amb_mountain = clamp(shares.mountain * 2)

  const near = nearBuildings(island, cx, cy, 14)
  const houses = near.filter((entry) => getBuilding(entry.type).category === 'housing')
  const town = townLoop(totalResidents(island))
  if (town && houses.length > 0) levels[town] = clamp(houses.reduce((sum, entry) => sum + entry.weight, 0) / 4)
  const harbour = near.filter((entry) => entry.type === 'kontor' || entry.type === 'shipyard')
  if (harbour.length > 0) levels.amb_harbour = clamp(Math.max(...harbour.map((entry) => entry.weight)) * 1.4)
  if (COLD.has(island.climate)) levels.amb_cold = 0.8
  if (island.climate === 'jungle') levels.amb_jungle = clamp(0.4 + shares.forest)
  if (near.some((entry) => entry.type === 'tavern')) levels.work_tavern = clamp(Math.max(...near.filter((e) => e.type === 'tavern').map((e) => e.weight)) * 1.3)
  return levels
}

/** Levels of the work loops of running buildings near the camera, loudest few only. */
export function workLevels(island: IslandState, cx: number, cy: number, max = 4): Levels {
  const loops: Levels = {}
  for (const entry of nearBuildings(island, cx, cy, 9)) {
    if (!entry.producing || !entry.active) continue
    const id = `work_${entry.type}`
    loops[id] = clamp((loops[id] ?? 0) + entry.weight * 0.6)
  }
  const loudest = Object.entries(loops).sort((a, b) => b[1] - a[1]).slice(0, max)
  return Object.fromEntries(loudest)
}

/** True if a chapel is close to the camera, so its bell can be heard. */
export function chapelNear(island: IslandState, cx: number, cy: number): boolean {
  return nearBuildings(island, cx, cy, 22).some((entry) => entry.type === 'chapel' && entry.active)
}

/**
 * Sounds for what changed between two states: building, demolishing, tier changes, ruins, ships, colonies, income, debt.
 * Returns sound ids (sfx), each at most once even when many things happened in the same tick.
 */
export function eventsBetween(before: GameState, after: GameState): string[] {
  const events = new Set<string>()
  if (before === after) return []

  if (after.highestTier > before.highestTier) events.add('pop_new_tier_unlocked')
  if (after.coins < 0 && before.coins >= 0) events.add('ui_warning')

  const owned = (state: GameState) => state.islands.filter((island) => island.owned).length
  if (owned(after) > owned(before)) events.add('trade_colony')
  if (after.ships.length > before.ships.length) events.add('trade_ship_built')

  for (const ship of after.ships) {
    const old = before.ships.find((entry) => entry.id === ship.id)
    if (!old) continue
    if (old.island !== null && ship.island === null) events.add('trade_ship_horn')
    if (old.island === null && ship.island !== null) {
      events.add('trade_ship_horn')
      events.add('trade_anchor')
    }
    const cargo = (s: typeof ship): number => Object.values(s.cargo).reduce((sum, amount) => sum + amount, 0)
    if (old.island !== null && ship.island !== null && cargo(ship) !== cargo(old)) events.add('trade_load')
  }

  for (const island of after.islands) {
    const old = before.islands.find((entry) => entry.id === island.id)
    if (!old) continue
    if (island.buildings.length > old.buildings.length) events.add('build_place')
    if (island.buildings.length < old.buildings.length) events.add('build_demolish')
    const roadsOld = old.roads.reduce((sum, value) => sum + value, 0)
    const roadsNew = island.roads.reduce((sum, value) => sum + value, 0)
    if (roadsNew > roadsOld) events.add('build_road')
    if (roadsNew < roadsOld) events.add('build_demolish')

    if (island.buildings.length === old.buildings.length) {
      for (const building of island.buildings) {
        const previous = old.buildings.find((entry) => entry.id === building.id)
        if (!previous?.house || !building.house) continue
        if (building.house.ruin && !previous.house.ruin) events.add('build_ruin')
        else if (building.house.tier !== previous.house.tier) {
          events.add(tierRank(building.house.tier) > tierRank(previous.house.tier) ? 'pop_tier_up' : 'pop_tier_down')
        }
      }
    }
    const income = island.economy.last?.income ?? 0
    const incomeBefore = old.economy.last?.income ?? 0
    if (island.economy.last !== old.economy.last && income > 0 && income !== incomeBefore) events.add('ui_coin')
  }
  return [...events]
}

const TIER_ORDER = ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats']
function tierRank(tier: string): number {
  return TIER_ORDER.indexOf(tier)
}
