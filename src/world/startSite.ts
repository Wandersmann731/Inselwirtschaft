import { config } from '../data'
import { Terrain, type GameMap } from './terrain'

export interface Site {
  /** Centre tile of the area. */
  x: number
  y: number
}

/** Distance in tiles (4-neighbour steps) from every tile to the nearest water tile. */
function coastDistance(map: GameMap): Uint16Array {
  const { width, height, tiles } = map
  const dist = new Uint16Array(tiles.length).fill(65535)
  const queue: number[] = []
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === Terrain.Water) {
      dist[i] = 0
      queue.push(i)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]
    const x = i % width
    const y = (i - x) / width
    const next = dist[i] + 1
    const visit = (j: number): void => {
      if (dist[j] === 65535) {
        dist[j] = next
        queue.push(j)
      }
    }
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (y > 0) visit(i - width)
    if (y < height - 1) visit(i + width)
  }
  return dist
}

/**
 * A good place to start building: an area of free grass (and beach) of config.startSite.size x size tiles not too far
 * from the sea, so ships can come. Of all such areas the one nearest to the sea wins; the middle of the island breaks ties.
 * Falls back to the middle of the island's land if no such area exists.
 */
export function findStartSite(map: GameMap): Site {
  const { width, height, tiles } = map
  const { size, maxCoastDistance } = config.startSite
  const buildable = (i: number): boolean => tiles[i] === Terrain.Grass || tiles[i] === Terrain.Beach
  // prefix sums of buildable tiles for fast area checks
  const sums = new Int32Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      sums[(y + 1) * (width + 1) + x + 1] =
        (buildable(y * width + x) ? 1 : 0) + sums[y * (width + 1) + x + 1] + sums[(y + 1) * (width + 1) + x] - sums[y * (width + 1) + x]
    }
  }
  const count = (x: number, y: number): number =>
    sums[(y + size) * (width + 1) + x + size] - sums[y * (width + 1) + x + size] - sums[(y + size) * (width + 1) + x] + sums[y * (width + 1) + x]

  const dist = coastDistance(map)
  let best: (Site & { score: number }) | null = null
  for (let y = 0; y + size <= height; y++) {
    for (let x = 0; x + size <= width; x++) {
      if (count(x, y) !== size * size) continue
      const cx = x + Math.floor(size / 2)
      const cy = y + Math.floor(size / 2)
      const coast = dist[cy * width + cx]
      if (coast > maxCoastDistance) continue
      const score = coast * 10 + Math.hypot(cx - width / 2, cy - height / 2) * 0.1
      if (!best || score < best.score) best = { x: cx, y: cy, score }
    }
  }
  if (best) return { x: best.x, y: best.y }

  let sumX = 0
  let sumY = 0
  let land = 0
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== Terrain.Water) {
      sumX += i % width
      sumY += Math.floor(i / width)
      land++
    }
  }
  return land > 0 ? { x: Math.round(sumX / land), y: Math.round(sumY / land) } : { x: Math.floor(width / 2), y: Math.floor(height / 2) }
}
