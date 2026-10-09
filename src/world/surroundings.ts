import type { GameMap } from './terrain'

const cache = new WeakMap<number[], Uint8Array>()

/**
 * Tiles right next to a building (also diagonally) that carry no building themselves.
 * Trees, bushes and rocks on these tiles are drawn together with the building, sorted by depth, so some of them
 * stand in front of it and the building looks like part of the forest or the mountain.
 */
export function buildingRing(map: GameMap, occupancy: number[]): Uint8Array {
  const cached = cache.get(occupancy)
  if (cached) return cached
  const { width, height } = map
  const ring = new Uint8Array(width * height)
  for (let i = 0; i < occupancy.length; i++) {
    if (occupancy[i] === 0) continue
    const x = i % width
    const y = (i - x) / width
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const index = ny * width + nx
        if (occupancy[index] === 0) ring[index] = 1
      }
    }
  }
  cache.set(occupancy, ring)
  return ring
}
