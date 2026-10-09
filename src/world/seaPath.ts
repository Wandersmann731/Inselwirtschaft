import type { SeaPoint, WorldChart } from '../sim/state'

const reachableCache = new WeakMap<number[], Uint8Array>()

/** Sea cells that can be reached from the open sea along the edge of the map (no closed bays). */
export function reachableSea(chart: WorldChart): Uint8Array {
  const cached = reachableCache.get(chart.cells)
  if (cached) return cached
  const { width, height, cells } = chart
  const seen = new Uint8Array(cells.length)
  const queue: number[] = []
  const add = (index: number): void => {
    if (cells[index] === 0 && !seen[index]) {
      seen[index] = 1
      queue.push(index)
    }
  }
  for (let x = 0; x < width; x++) {
    add(x)
    add((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    add(y * width)
    add(y * width + width - 1)
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    const x = index % width
    const y = (index - x) / width
    if (x > 0) add(index - 1)
    if (x < width - 1) add(index + 1)
    if (y > 0) add(index - width)
    if (y < height - 1) add(index + width)
  }
  reachableCache.set(cells, seen)
  return seen
}

/**
 * The sea cell where ships dock at an island: a reachable sea cell next to the island's land,
 * the one closest to the middle of the map. Null if the island has no such cell.
 */
export function portCell(chart: WorldChart, islandId: number): SeaPoint | null {
  const { width, height, cells } = chart
  const sea = reachableSea(chart)
  let best: SeaPoint | null = null
  let bestDistance = Infinity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (!sea[index]) continue
      const touches =
        (x > 0 && cells[index - 1] === islandId + 1) ||
        (x < width - 1 && cells[index + 1] === islandId + 1) ||
        (y > 0 && cells[index - width] === islandId + 1) ||
        (y < height - 1 && cells[index + width] === islandId + 1)
      if (!touches) continue
      const distance = Math.hypot(x - width / 2, y - height / 2)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { x, y }
      }
    }
  }
  return best
}

const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/**
 * Shortest way over sea cells (A*, eight directions, no cutting corners over land).
 * Returns the cells to sail through, from the one after `from` to `to`, or null if there is no way.
 */
export function findSeaPath(chart: WorldChart, from: SeaPoint, to: SeaPoint): SeaPoint[] | null {
  const { width, height, cells } = chart
  const open = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x] === 0
  if (!open(from.x, from.y) || !open(to.x, to.y)) return null
  if (from.x === to.x && from.y === to.y) return []

  const heuristic = (x: number, y: number): number => {
    const dx = Math.abs(x - to.x)
    const dy = Math.abs(y - to.y)
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy)
  }
  const cost = new Float64Array(cells.length).fill(Infinity)
  const parent = new Int32Array(cells.length).fill(-1)
  const closed = new Uint8Array(cells.length)
  const startIndex = from.y * width + from.x
  const goalIndex = to.y * width + to.x
  cost[startIndex] = 0

  // Plain array as a priority queue: the map is small, so the O(n) scan is fast enough.
  const frontier: { index: number; score: number }[] = [{ index: startIndex, score: heuristic(from.x, from.y) }]
  while (frontier.length > 0) {
    let best = 0
    for (let i = 1; i < frontier.length; i++) if (frontier[i].score < frontier[best].score) best = i
    const { index } = frontier.splice(best, 1)[0]
    if (index === goalIndex) break
    if (closed[index]) continue
    closed[index] = 1
    const x = index % width
    const y = (index - x) / width
    for (const [dx, dy] of STEPS) {
      const nx = x + dx
      const ny = y + dy
      if (!open(nx, ny)) continue
      if (dx !== 0 && dy !== 0 && (!open(x + dx, y) || !open(x, y + dy))) continue
      const next = ny * width + nx
      const newCost = cost[index] + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1)
      if (newCost < cost[next]) {
        cost[next] = newCost
        parent[next] = index
        frontier.push({ index: next, score: newCost + heuristic(nx, ny) })
      }
    }
  }
  if (parent[goalIndex] === -1) return null

  const path: SeaPoint[] = []
  for (let index = goalIndex; index !== startIndex; index = parent[index]) {
    path.push({ x: index % width, y: Math.floor(index / width) })
  }
  return path.reverse()
}
