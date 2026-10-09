import { describe, expect, it } from 'vitest'
import { mapBounds, tileToWorld } from '../src/render/iso'
import { miniLayout, miniToWorld, worldToMini } from '../src/render/minimap'

describe('minimap layout', () => {
  const map = { width: 125, height: 100 }

  it('fits into the given box and keeps the proportions of the map', () => {
    const layout = miniLayout(map, 168, 104)
    expect(layout.width).toBeLessThanOrEqual(168)
    expect(layout.height).toBeLessThanOrEqual(104)
    const bounds = mapBounds(map)
    const ratio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY)
    expect(layout.width / layout.height).toBeCloseTo(ratio, 1)
  })

  it('uses the full width or the full height', () => {
    const layout = miniLayout(map, 168, 104)
    expect(layout.width === 168 || layout.height === 104).toBe(true)
  })

  it('maps the corners of the map diamond to the edges of the minimap', () => {
    const layout = miniLayout(map, 168, 104)
    const top = tileToWorld(0, 0)
    const left = tileToWorld(0, map.height)
    const right = tileToWorld(map.width, 0)
    const bottom = tileToWorld(map.width, map.height)
    expect(worldToMini(layout, top.x, top.y).y).toBeCloseTo(0)
    expect(worldToMini(layout, left.x, left.y).x).toBeCloseTo(0)
    expect(worldToMini(layout, right.x, right.y).x).toBeCloseTo(layout.width, 0)
    expect(worldToMini(layout, bottom.x, bottom.y).y).toBeCloseTo(layout.height, 0)
  })

  it('converts back and forth without loss', () => {
    const layout = miniLayout(map, 168, 104)
    for (const [wx, wy] of [[0, 0], [1234, 777], [-2000, 1500]]) {
      const mini = worldToMini(layout, wx, wy)
      const world = miniToWorld(layout, mini.x, mini.y)
      expect(world.x).toBeCloseTo(wx)
      expect(world.y).toBeCloseTo(wy)
    }
  })

  it('works for small islands too', () => {
    const layout = miniLayout({ width: 40, height: 40 }, 168, 104)
    expect(layout.scale).toBeGreaterThan(miniLayout(map, 168, 104).scale)
  })
})
