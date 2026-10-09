import { describe, expect, it } from 'vitest'
import { adjacentRoadTiles, roadDistances } from '../src/world/pathfinding'

// 6x3 map, roads marked 1:
// . 1 1 1 . .
// . 1 . 1 . 1
// . 1 1 1 . .
const W = 6
const H = 3
const roads = [0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0]

describe('roadDistances', () => {
  it('counts road steps from the sources', () => {
    const dist = roadDistances(roads, W, H, [1])
    expect(dist[1]).toBe(0)
    expect(dist[2]).toBe(1)
    expect(dist[3]).toBe(2)
    expect(dist[W + 3]).toBe(3)
    expect(dist[2 * W + 3]).toBe(4)
    // the other way round the loop is shorter for the bottom right corner tile (2,3)
    expect(dist[2 * W + 2]).toBe(3)
  })

  it('marks tiles without road and unreachable roads with -1', () => {
    const dist = roadDistances(roads, W, H, [1])
    expect(dist[0]).toBe(-1)
    expect(dist[W + 5]).toBe(-1) // isolated road piece
  })

  it('starts from several sources at once and ignores sources without road', () => {
    const dist = roadDistances(roads, W, H, [1, 2 * W + 3, 0])
    expect(dist[W + 3]).toBe(1)
    expect(dist[0]).toBe(-1)
  })

  it('does not connect roads diagonally', () => {
    const diagonal = [1, 0, 0, 1]
    const dist = roadDistances(diagonal, 2, 2, [0])
    expect(dist[3]).toBe(-1)
  })
})

describe('adjacentRoadTiles', () => {
  it('finds road tiles along the edges but not at the corners', () => {
    const found = adjacentRoadTiles(roads, W, H, { x: 2, y: 1, w: 1, h: 1 })
    // above (2,0) and below (2,2) are roads; left (1,1) and right (3,1) are roads too
    expect(found.sort((a, b) => a - b)).toEqual([2, W + 1, W + 3, 2 * W + 2])
    const corner = adjacentRoadTiles(roads, W, H, { x: 4, y: 0, w: 1, h: 1 })
    expect(corner).toEqual([3]) // (3,0) at the left edge; (5,1) is only diagonal
  })
})
