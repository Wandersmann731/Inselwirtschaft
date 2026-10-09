import { getBuilding } from '../data'
import type { PlacedBuilding } from '../sim/state'
import { hash2 } from '../world/noise2d'
import { sprites } from './sprites'

export const WATER_FRAMES = 8
export const SMOKE_FRAMES = 12

export function waterKey(frame: number): string {
  return `terrain/water_${(frame % WATER_FRAMES) + 1}`
}

/** Road sprite for the neighbours that are roads: n = up right (y - 1), e = down right (x + 1), s = down left (y + 1), w = up left (x - 1). */
export function roadKey(north: boolean, east: boolean, south: boolean, west: boolean): string {
  const name = `${north ? 'n' : ''}${east ? 'e' : ''}${south ? 's' : ''}${west ? 'w' : ''}`
  return `roads/road_${name || 'none'}`
}

/** Which of several pictures a building uses. Follows from where it stands, so it never changes. */
export function pickVariant(count: number, x: number, y: number): number {
  return Math.floor(hash2(x, y, 4242) * count)
}

/**
 * Sprite of a placed building. Houses show the picture of their current tier (or the ruin), and buildings that exist
 * in several pictures use one of them by position. Falls back to the plain name, then to nothing (colour shape).
 */
export function buildingKey(building: Pick<PlacedBuilding, 'type' | 'x' | 'y' | 'house'>): string {
  const def = getBuilding(building.type)
  const house = building.house
  const tier = house?.tier ?? def.houseTier
  const base = tier ? (house?.ruin ? 'buildings/house_ruin' : `buildings/house_${tier}`) : `buildings/${building.type}`
  const list = sprites.variants(base)
  if (list.length === 0) return base
  return list[pickVariant(list.length, building.x, building.y)]
}

/** The picture shown in the placement ghost: always the first one, so it does not flicker while you move it. */
export function ghostKey(typeId: string): string {
  const def = getBuilding(typeId)
  const base = def.houseTier ? `buildings/house_${def.houseTier}` : `buildings/${typeId}`
  return sprites.variants(base)[0] ?? base
}

export function smokeKey(frame: number): string {
  return `effects/smoke_${(frame % SMOKE_FRAMES) + 1}`
}
