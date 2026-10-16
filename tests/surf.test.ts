import { describe, expect, it } from 'vitest'
import { findCoastLines } from '../src/render/surf'
import { Terrain, type GameMap } from '../src/world/terrain'

const W = Terrain.Water
const G = Terrain.Grass

function mapOf(rows: number[][]): GameMap {
  return { width: rows[0].length, height: rows.length, tiles: rows.flat() }
}

describe('coast lines', () => {
  it('draws one closed line around a lone island, four points for a single tile', () => {
    const lines = findCoastLines(mapOf([[W, W, W], [W, G, W], [W, W, W]]))
    expect(lines).toHaveLength(1)
    // a diamond: four corners plus the first point again
    expect(lines[0]).toHaveLength(5)
    expect(lines[0][0]).toEqual(lines[0][4])
  })

  it('draws a line for each island and none in open sea', () => {
    expect(findCoastLines(mapOf([[W, W], [W, W]]))).toHaveLength(0)
    expect(findCoastLines(mapOf([[G, W, G]]))).toHaveLength(2)
  })

  it('makes a lake inside land its own line', () => {
    const lines = findCoastLines(mapOf([[G, G, G], [G, W, G], [G, G, G]]))
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })
})
