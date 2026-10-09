import type { PlacedBuilding } from '../sim/state'

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

/** Sprite of a placed building. Houses show the picture of their current tier, or the ruin. */
export function buildingKey(building: Pick<PlacedBuilding, 'type' | 'house'>): string {
  const house = building.house
  if (house) return `buildings/${house.ruin ? 'house_ruin' : `house_${house.tier}`}`
  return `buildings/${building.type}`
}

export function smokeKey(frame: number): string {
  return `effects/smoke_${(frame % SMOKE_FRAMES) + 1}`
}
