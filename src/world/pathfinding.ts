export interface TileRect {
  x: number
  y: number
  w: number
  h: number
}

/** Indices of road tiles that share an edge with the rectangle (corners do not count). */
export function adjacentRoadTiles(
  roads: number[],
  mapWidth: number,
  mapHeight: number,
  rect: TileRect,
): number[] {
  const found: number[] = []
  const check = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return
    const index = y * mapWidth + x
    if (roads[index]) found.push(index)
  }
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    check(x, rect.y - 1)
    check(x, rect.y + rect.h)
  }
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    check(rect.x - 1, y)
    check(rect.x + rect.w, y)
  }
  return found
}

/**
 * Number of road steps from the nearest source tile to every road tile (breadth-first,
 * 4-neighbour, one step per tile). Tiles without a road or not reachable get -1.
 * All roads cost the same, so this finds the shortest way to every tile in one pass.
 */
export function roadDistances(
  roads: number[],
  mapWidth: number,
  mapHeight: number,
  sources: number[],
): Int32Array {
  const dist = new Int32Array(roads.length).fill(-1)
  const queue: number[] = []
  for (const source of sources) {
    if (roads[source] && dist[source] === -1) {
      dist[source] = 0
      queue.push(source)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    const x = index % mapWidth
    const y = (index - x) / mapWidth
    const next = dist[index] + 1
    const visit = (neighbour: number): void => {
      if (roads[neighbour] && dist[neighbour] === -1) {
        dist[neighbour] = next
        queue.push(neighbour)
      }
    }
    if (x > 0) visit(index - 1)
    if (x < mapWidth - 1) visit(index + 1)
    if (y > 0) visit(index - mapWidth)
    if (y < mapHeight - 1) visit(index + mapWidth)
  }
  return dist
}
