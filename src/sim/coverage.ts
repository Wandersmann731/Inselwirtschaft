import { getBuilding } from '../data'
import { footprint } from './build'
import type { IslandState, PlacedBuilding } from './state'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Distance from a tile centre to the nearest point of a rectangle (0 inside). */
function distanceToRect(tx: number, ty: number, rect: Rect): number {
  const cx = tx + 0.5
  const cy = ty + 0.5
  const dx = Math.max(rect.x - cx, 0, cx - (rect.x + rect.w))
  const dy = Math.max(rect.y - cy, 0, cy - (rect.y + rect.h))
  return Math.hypot(dx, dy)
}

/** True if a tile centre lies within `radius` tiles of the rectangle's edge. */
export function inRadius(tx: number, ty: number, rect: Rect, radius: number): boolean {
  return distanceToRect(tx, ty, rect) <= radius
}

export function buildingRect(building: Pick<PlacedBuilding, 'type' | 'x' | 'y' | 'rotated'>): Rect {
  const { w, h } = footprint(getBuilding(building.type), building.rotated)
  return { x: building.x, y: building.y, w, h }
}

/** All map tiles within the radius of the given rectangle, as {x, y}. Radius counts from the edge. */
export function tilesInRadius(
  rect: Rect,
  radius: number,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = []
  const minX = Math.max(0, Math.floor(rect.x - radius))
  const maxX = Math.min(mapWidth - 1, Math.ceil(rect.x + rect.w + radius))
  const minY = Math.max(0, Math.floor(rect.y - radius))
  const maxY = Math.min(mapHeight - 1, Math.ceil(rect.y + rect.h + radius))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (inRadius(x, y, rect, radius)) tiles.push({ x, y })
    }
  }
  return tiles
}

/** Houses with at least one tile inside the radius of a supplying building. */
export function suppliedHouses(state: IslandState, rect: Rect, radius: number): PlacedBuilding[] {
  return state.buildings.filter((building) => {
    if (getBuilding(building.type).category !== 'housing') return false
    const house = buildingRect(building)
    for (let y = house.y; y < house.y + house.h; y++) {
      for (let x = house.x; x < house.x + house.w; x++) {
        if (inRadius(x, y, rect, radius)) return true
      }
    }
    return false
  })
}

/** True if a Kontor or market house reaches at least one tile of the rectangle with its catchment. */
export function hubReaches(state: IslandState, rect: Rect): boolean {
  return state.buildings.some((building) => {
    const catchment = getBuilding(building.type).catchment
    if (catchment === undefined || !building.active) return false
    const hub = buildingRect(building)
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (inRadius(x, y, hub, catchment)) return true
      }
    }
    return false
  })
}

/**
 * Houses that a Kontor or market house supplies now but would not any more once the given buildings are gone.
 * Shown before demolishing, because those residents then get no goods.
 */
export function housesLosingSupply(state: IslandState, removedIds: number[]): PlacedBuilding[] {
  const removed = new Set(removedIds)
  if (!state.buildings.some((b) => removed.has(b.id) && getBuilding(b.type).catchment !== undefined)) return []
  const after = { ...state, buildings: state.buildings.filter((b) => !removed.has(b.id)) }
  return state.buildings.filter((b) => b.house && !removed.has(b.id) && hubReaches(state, buildingRect(b)) && !hubReaches(after, buildingRect(b)))
}
