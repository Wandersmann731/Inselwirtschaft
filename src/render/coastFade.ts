// Plots on the shore: the painted ground of a building or a yard ends in a hard edge on the sand. Where an edge
// borders free beach or the water, the picture fades out towards that edge, so the sand below shows through softly.
import type { GameMap } from '../world/terrain'
import { Terrain } from '../world/terrain'
import { HALF_H, HALF_W } from './iso'
import type { TileRect } from './shapes'
import type { SpriteImage } from './sprites'

/** Which edges of a footprint fade out: ne = up right, se = down right, sw = down left, nw = up left. */
export interface FadeEdges {
  ne: boolean
  se: boolean
  sw: boolean
  nw: boolean
}

/** Width of the fade in tiles. */
export const FADE_TILES = 0.34

/**
 * The edges of a tile rectangle that border the shore: at least half of the tiles just outside the edge are free
 * sand or water (the drawn beach reaches a little into the water tiles). Edges on grass or against other buildings
 * stay hard.
 */
export function coastEdges(map: GameMap, occupancy: number[], rect: TileRect): FadeEdges {
  const sand = (x: number, y: number): boolean => {
    const tx = Math.floor(x)
    const ty = Math.floor(y)
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false
    const index = ty * map.width + tx
    return (map.tiles[index] === Terrain.Beach || map.tiles[index] === Terrain.Water) && occupancy[index] === 0
  }
  const share = (tiles: [number, number][]): boolean => tiles.filter(([x, y]) => sand(x, y)).length * 2 >= tiles.length
  const along = (length: number): number[] => Array.from({ length: Math.max(1, Math.round(length)) }, (_, i) => i + 0.5)
  return {
    ne: share(along(rect.w).map((i) => [rect.x + i, rect.y - 0.5])),
    se: share(along(rect.h).map((i) => [rect.x + rect.w + 0.5, rect.y + i])),
    sw: share(along(rect.w).map((i) => [rect.x + i, rect.y + rect.h + 0.5])),
    nw: share(along(rect.h).map((i) => [rect.x - 0.5, rect.y + i])),
  }
}

/**
 * How much of a pixel stays, 0 to 1, at tile position (u, v) inside a footprint of w by h tiles (u runs down right,
 * v down left, both from the top corner). Beyond a fading edge nothing stays.
 */
export function edgeFade(u: number, v: number, w: number, h: number, edges: FadeEdges): number {
  let keep = 1
  const fade = (distance: number): void => {
    const t = Math.max(0, Math.min(1, distance / FADE_TILES))
    keep = Math.min(keep, t * t * (3 - 2 * t))
  }
  if (edges.se) fade(w - u)
  if (edges.sw) fade(h - v)
  if (edges.ne) fade(v)
  if (edges.nw) fade(u)
  return keep
}

export interface FadeFrame {
  /** Where the top corner of the footprint lies in the picture, in picture pixels. */
  originX: number
  originY: number
  /** Picture pixels per world pixel. */
  scale: number
  /** Footprint in tiles. */
  w: number
  h: number
  /** The picture is drawn mirrored. */
  mirrored: boolean
}

const cache = new Map<string, HTMLCanvasElement>()
const MAX_CACHE = 80

/** A copy of the picture that fades out towards the given edges. Made once per picture and edge set, then reused. */
export function fadedCopy(key: string, image: SpriteImage, frame: FadeFrame, edges: FadeEdges): SpriteImage {
  if (!edges.ne && !edges.se && !edges.sw && !edges.nw) return image
  const id = `${key}|${frame.w}x${frame.h}|${frame.mirrored ? 'm' : ''}|${edges.ne ? 1 : 0}${edges.se ? 1 : 0}${edges.sw ? 1 : 0}${edges.nw ? 1 : 0}|${image.width}`
  const hit = cache.get(id)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return image
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let iy = 0; iy < canvas.height; iy++) {
    const py = (iy + 0.5 - frame.originY) / frame.scale / HALF_H
    for (let ix = 0; ix < canvas.width; ix++) {
      const offset = (iy * canvas.width + ix) * 4 + 3
      if (data[offset] === 0) continue
      const sx = frame.mirrored ? canvas.width - 1 - ix : ix
      const px = (sx + 0.5 - frame.originX) / frame.scale / HALF_W
      const keep = edgeFade((px + py) / 2, (py - px) / 2, frame.w, frame.h, edges)
      if (keep < 1) data[offset] = Math.round(data[offset] * keep)
    }
  }
  ctx.putImageData(pixels, 0, 0)
  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(id, canvas)
  return canvas
}
