import { describe, expect, it } from 'vitest'
import {
  centerCamera,
  clampCamera,
  panCamera,
  screenToWorld,
  visibleWorldRect,
  zoomCameraAt,
} from '../src/render/camera'
import { mapBounds } from '../src/render/iso'

const vp = { width: 800, height: 400 }
const bounds = mapBounds({ width: 60, height: 60 })
const limits = { min: 0.5, max: 2 }

describe('camera', () => {
  it('maps the screen centre to the camera position', () => {
    const p = screenToWorld({ x: 100, y: 200, zoom: 2 }, vp, 400, 200)
    expect(p).toEqual({ x: 100, y: 200 })
  })

  it('pans opposite to the finger and scales with zoom', () => {
    const start = { x: 0, y: 960, zoom: 2 }
    const moved = panCamera(start, 100, -40, vp, bounds)
    expect(moved.x).toBe(-50)
    expect(moved.y).toBe(980)
  })

  it('never lets the view leave the map', () => {
    const far = clampCamera({ x: 99999, y: -99999, zoom: 1 }, vp, bounds)
    const rect = visibleWorldRect(far, vp)
    expect(rect.maxX).toBeLessThanOrEqual(bounds.maxX)
    expect(rect.minY).toBeGreaterThanOrEqual(bounds.minY)
  })

  it('centres the map when the view is larger than the map', () => {
    const tiny = mapBounds({ width: 2, height: 2 })
    const cam = clampCamera({ x: 500, y: 500, zoom: 1 }, vp, tiny)
    expect(cam.x).toBe((tiny.minX + tiny.maxX) / 2)
    expect(cam.y).toBe((tiny.minY + tiny.maxY) / 2)
  })

  it('keeps the point under the pinch centre fixed while zooming', () => {
    const start = centerCamera(bounds, 1, vp)
    const before = screenToWorld(start, vp, 300, 120)
    const zoomed = zoomCameraAt(start, 1.5, 300, 120, vp, bounds, limits)
    const after = screenToWorld(zoomed, vp, 300, 120)
    expect(zoomed.zoom).toBeCloseTo(1.5)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('limits zoom to the configured range', () => {
    const start = centerCamera(bounds, 1, vp)
    expect(zoomCameraAt(start, 100, 400, 200, vp, bounds, limits).zoom).toBe(2)
    expect(zoomCameraAt(start, 0.001, 400, 200, vp, bounds, limits).zoom).toBe(0.5)
  })
})
