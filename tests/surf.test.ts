import { describe, expect, it } from 'vitest'
import { findShores } from '../src/render/surf'
import { Terrain, type GameMap } from '../src/world/terrain'

function mapOf(rows: number[][]): GameMap {
  return { width: rows[0].length, height: rows.length, tiles: rows.flat() }
}

describe('surf', () => {
  it('finds the water edges that touch land, and nothing in open sea', () => {
    const W = Terrain.Water
    const G = Terrain.Grass
    const map = mapOf([
      [W, W, W],
      [W, G, W],
      [W, W, W],
    ])
    const shores = findShores(map)
    // the four water tiles beside the island touch it with one edge each
    expect(shores).toHaveLength(4)
    expect(shores.map((s) => `${s.x},${s.y},${s.edge}`).sort()).toEqual(['0,1,2', '1,0,3', '1,2,1', '2,1,0'])
    expect(findShores(mapOf([[W, W], [W, W]]))).toHaveLength(0)
  })

  it('counts a water tile once per land neighbour', () => {
    const W = Terrain.Water
    const B = Terrain.Beach
    expect(findShores(mapOf([[B, W, B]]))).toHaveLength(2)
  })
})
