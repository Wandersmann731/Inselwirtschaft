import { world } from '../data'
import { hash2 } from './noise2d'
import type { GameMap } from './terrain'

const cache = new WeakMap<number[], Float32Array>()

/**
 * How much of a "village yard" each tile has (0..1): full on house tiles, fading out over a few tiles, with an
 * irregular edge. Houses that stand close together merge into one worn patch of ground.
 */
export function yardField(map: GameMap, occupancy: number[], houseIds: Set<number>): Float32Array {
  const hit = cache.get(occupancy)
  if (hit) return hit
  const { width, height } = map
  const { radius, falloff } = world.settlement
  const field = new Float32Array(width * height)
  for (let i = 0; i < occupancy.length; i++) {
    if (!houseIds.has(occupancy[i])) continue
    const x = i % width
    const y = (i - x) / width
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const distance = Math.max(Math.abs(dx), Math.abs(dy))
        const edge = distance === 0 ? 1 : 0.7 + 0.6 * hash2(nx, ny, 9157)
        const index = ny * width + nx
        field[index] = Math.max(field[index], Math.min(1, (falloff[distance] ?? 0) * edge))
      }
    }
  }
  cache.set(occupancy, field)
  return field
}

/** The yard strength at a fractional tile position (tile centres are the sample points). */
export function yardAt(field: Float32Array, width: number, height: number, u: number, v: number): number {
  const fx = u - 0.5
  const fy = v - 0.5
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? 0 : field[y * width + x])
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
}
