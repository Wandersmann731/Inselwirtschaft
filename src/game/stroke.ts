export interface Tile {
  x: number
  y: number
}

/**
 * Tiles from a to b with only horizontal and vertical steps, so a dragged road never
 * has diagonal gaps. Includes both ends.
 */
export function strokeLine(a: Tile, b: Tile): Tile[] {
  const tiles: Tile[] = [{ x: a.x, y: a.y }]
  let x = a.x
  let y = a.y
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  const sx = a.x < b.x ? 1 : -1
  const sy = a.y < b.y ? 1 : -1
  let error = dx - dy
  while (x !== b.x || y !== b.y) {
    // Take the step that keeps the path closest to the straight line.
    if (error * 2 > -dy && x !== b.x) {
      error -= dy
      x += sx
    } else {
      error += dx
      y += sy
    }
    tiles.push({ x, y })
  }
  return tiles
}
