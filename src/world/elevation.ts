import { Terrain, type GameMap } from './terrain'

const cache = new WeakMap<number[], Uint8Array>()

/**
 * For every mountain tile: how many tiles it lies inside the mountain (1 at the edge, higher towards the middle).
 * Other tiles are 0. Used to put big peaks in the middle of a mountain and small ones at its foot.
 */
export function mountainDepth(map: GameMap): Uint8Array {
  const cached = cache.get(map.tiles)
  if (cached) return cached
  const { width, height, tiles } = map
  const depth = new Uint8Array(tiles.length)
  const queue: number[] = []
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== Terrain.Mountain) continue
    const x = i % width
    const y = (i - x) / width
    const edge =
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
      tiles[i - 1] !== Terrain.Mountain || tiles[i + 1] !== Terrain.Mountain ||
      tiles[i - width] !== Terrain.Mountain || tiles[i + width] !== Terrain.Mountain
    if (edge) {
      depth[i] = 1
      queue.push(i)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]
    const x = i % width
    const y = (i - x) / width
    const next = Math.min(255, depth[i] + 1)
    const visit = (j: number): void => {
      if (tiles[j] === Terrain.Mountain && depth[j] === 0) {
        depth[j] = next
        queue.push(j)
      }
    }
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (y > 0) visit(i - width)
    if (y < height - 1) visit(i + width)
  }
  cache.set(map.tiles, depth)
  return depth
}
