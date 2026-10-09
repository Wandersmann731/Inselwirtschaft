import { describe, expect, it } from 'vitest'
import { strokeLine } from '../src/game/stroke'

function connected(tiles: { x: number; y: number }[]): boolean {
  return tiles.every((t, i) => i === 0 || Math.abs(t.x - tiles[i - 1].x) + Math.abs(t.y - tiles[i - 1].y) === 1)
}

describe('strokeLine', () => {
  it('returns a single tile for identical ends', () => {
    expect(strokeLine({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([{ x: 2, y: 2 }])
  })

  it('walks straight lines in both directions', () => {
    expect(strokeLine({ x: 0, y: 0 }, { x: 3, y: 0 })).toHaveLength(4)
    expect(strokeLine({ x: 3, y: 5 }, { x: 3, y: 2 })).toEqual([
      { x: 3, y: 5 },
      { x: 3, y: 4 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
    ])
  })

  it('never makes diagonal jumps and always reaches the end', () => {
    for (const [bx, by] of [[5, 3], [-4, 7], [6, -6], [-3, -9], [1, 1]]) {
      const tiles = strokeLine({ x: 0, y: 0 }, { x: bx, y: by })
      expect(connected(tiles)).toBe(true)
      expect(tiles[tiles.length - 1]).toEqual({ x: bx, y: by })
      expect(tiles).toHaveLength(Math.abs(bx) + Math.abs(by) + 1)
    }
  })
})
