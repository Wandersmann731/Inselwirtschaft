import type { Bounds, Point } from './iso'

/** Camera centre in world coordinates plus zoom factor. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

/** Size of the visible area in CSS pixels. */
export interface Viewport {
  width: number
  height: number
}

export interface ZoomLimits {
  min: number
  max: number
}

export function screenToWorld(cam: Camera, vp: Viewport, sx: number, sy: number): Point {
  return {
    x: cam.x + (sx - vp.width / 2) / cam.zoom,
    y: cam.y + (sy - vp.height / 2) / cam.zoom,
  }
}

export function visibleWorldRect(cam: Camera, vp: Viewport): Bounds {
  const halfW = vp.width / (2 * cam.zoom)
  const halfH = vp.height / (2 * cam.zoom)
  return { minX: cam.x - halfW, maxX: cam.x + halfW, minY: cam.y - halfH, maxY: cam.y + halfH }
}

function clampAxis(value: number, min: number, max: number, half: number): number {
  const lo = min + half
  const hi = max - half
  if (lo > hi) return (min + max) / 2
  return Math.min(hi, Math.max(lo, value))
}

/** Keeps the visible area inside the map. If the map is smaller than the view, it is centred. */
export function clampCamera(cam: Camera, vp: Viewport, bounds: Bounds): Camera {
  return {
    zoom: cam.zoom,
    x: clampAxis(cam.x, bounds.minX, bounds.maxX, vp.width / (2 * cam.zoom)),
    y: clampAxis(cam.y, bounds.minY, bounds.maxY, vp.height / (2 * cam.zoom)),
  }
}

export function centerCamera(bounds: Bounds, zoom: number, vp: Viewport): Camera {
  return clampCamera(
    { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, zoom },
    vp,
    bounds,
  )
}

/** Moves the map along with a finger that dragged by (dx, dy) screen pixels. */
export function panCamera(cam: Camera, dx: number, dy: number, vp: Viewport, bounds: Bounds): Camera {
  return clampCamera({ ...cam, x: cam.x - dx / cam.zoom, y: cam.y - dy / cam.zoom }, vp, bounds)
}

/** Multiplies the zoom while the world point under (sx, sy) stays under that screen point. */
export function zoomCameraAt(
  cam: Camera,
  factor: number,
  sx: number,
  sy: number,
  vp: Viewport,
  bounds: Bounds,
  limits: ZoomLimits,
): Camera {
  const zoom = Math.min(limits.max, Math.max(limits.min, cam.zoom * factor))
  const anchor = screenToWorld(cam, vp, sx, sy)
  return clampCamera(
    {
      zoom,
      x: anchor.x - (sx - vp.width / 2) / zoom,
      y: anchor.y - (sy - vp.height / 2) / zoom,
    },
    vp,
    bounds,
  )
}
