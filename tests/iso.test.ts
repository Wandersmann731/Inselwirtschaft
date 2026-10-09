import { describe, expect, it } from 'vitest'
import { HALF_H, HALF_W, mapBounds, tileToWorld, worldToTile } from '../src/render/iso'

describe('iso conversion', () => {
  it('puts tile (0, 0) at the origin and steps by half a tile', () => {
    expect(tileToWorld(0, 0)).toEqual({ x: 0, y: 0 })
    expect(tileToWorld(1, 0)).toEqual({ x: HALF_W, y: HALF_H })
    expect(tileToWorld(0, 1)).toEqual({ x: -HALF_W, y: HALF_H })
  })

  it('round-trips tile -> world -> tile', () => {
    for (const [tx, ty] of [[0, 0], [5, 3], [12.5, 7.25], [79, 79]]) {
      const world = tileToWorld(tx, ty)
      const back = worldToTile(world.x, world.y)
      expect(back.x).toBeCloseTo(tx)
      expect(back.y).toBeCloseTo(ty)
    }
  })

  it('maps points inside a diamond to that tile and points past its right corner to the screen-right neighbour', () => {
    // centre of tile (4, 6): top corner plus half a tile height down
    const top = tileToWorld(4, 6)
    const centre = worldToTile(top.x, top.y + HALF_H)
    expect([Math.floor(centre.x), Math.floor(centre.y)]).toEqual([4, 6])
    // just inside each corner of the diamond
    const nearLeft = worldToTile(top.x - HALF_W + 1, top.y + HALF_H)
    expect([Math.floor(nearLeft.x), Math.floor(nearLeft.y)]).toEqual([4, 6])
    const pastRight = worldToTile(top.x + HALF_W + 1, top.y + HALF_H)
    expect([Math.floor(pastRight.x), Math.floor(pastRight.y)]).toEqual([5, 5])
  })

  it('bounds contain all four map corners', () => {
    const map = { width: 40, height: 50 }
    const b = mapBounds(map)
    for (const [tx, ty] of [[0, 0], [40, 0], [0, 50], [40, 50]]) {
      const p = tileToWorld(tx, ty)
      expect(p.x).toBeGreaterThanOrEqual(b.minX)
      expect(p.x).toBeLessThanOrEqual(b.maxX)
      expect(p.y).toBeGreaterThanOrEqual(b.minY)
      expect(p.y).toBeLessThanOrEqual(b.maxY)
    }
  })
})
