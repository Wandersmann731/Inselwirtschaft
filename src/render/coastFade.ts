// Plots on the shore: the painted ground of a building or a yard ends in a hard edge on the sand. Where an edge
// borders free beach or the water, the picture fades out towards that edge, so the sand below shows through softly.
// At the back edges a building rises over its plot, so there only the open ground is faded, never roof or wall.
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
/** The strip along the front edges (in tiles) whose colours count as the ground colours of a picture. */
const GROUND_STRIP = 0.3
/** Pixels darker than this are outlines: there the ground ends and something painted begins. */
const OUTLINE_DARK = 58

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

/**
 * How a picture fades: a flat yard runs out at every shore edge; a building runs out at its front edges, and at its
 * back edges only where open ground lies at the edge (see fadeBackEdge); a pier keeps its planks.
 */
export type FadeStyle = 'flat' | 'building' | 'pier'

const cache = new Map<string, HTMLCanvasElement>()
const MAX_CACHE = 80

/** A copy of the picture that fades out towards the given edges. Made once per picture and edge set, then reused. */
export function fadedCopy(key: string, image: SpriteImage, frame: FadeFrame, edges: FadeEdges, style: FadeStyle): SpriteImage {
  if (style === 'pier' || (!edges.ne && !edges.se && !edges.sw && !edges.nw)) return image
  const id = `${key}|${style}|${frame.w}x${frame.h}|${frame.mirrored ? 'm' : ''}|${edges.ne ? 1 : 0}${edges.se ? 1 : 0}${edges.sw ? 1 : 0}${edges.nw ? 1 : 0}|${image.width}`
  const hit = cache.get(id)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return image
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  fadePixels(pixels.data, canvas.width, canvas.height, frame, edges, style === 'flat')
  ctx.putImageData(pixels, 0, 0)
  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(id, canvas)
  return canvas
}

/** Works on RGBA pixels in place. Pure: no canvas, so it can be tested. */
export function fadePixels(data: Uint8ClampedArray, width: number, height: number, frame: FadeFrame, edges: FadeEdges, flat: boolean): void {
  const tileOf = (ix: number, iy: number): [number, number] => {
    const sx = frame.mirrored ? width - 1 - ix : ix
    const px = (sx + 0.5 - frame.originX) / frame.scale / HALF_W
    const py = (iy + 0.5 - frame.originY) / frame.scale / HALF_H
    return [(px + py) / 2, (py - px) / 2]
  }
  // the ground colours of this picture, taken from the strip along its front edges where nothing but ground lies
  const ground = new Uint8Array(4096)
  const bin = (o: number): number => ((data[o] >> 4) << 8) | ((data[o + 1] >> 4) << 4) | (data[o + 2] >> 4)
  if (!flat) {
    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const o = (iy * width + ix) * 4
        if (data[o + 3] < 250) continue
        const [u, v] = tileOf(ix, iy)
        if (u < 0 || v < 0 || u > frame.w || v > frame.h) continue
        if (Math.min(frame.w - u, frame.h - v) < GROUND_STRIP) ground[bin(o)] = 1
      }
    }
  }
  const front: FadeEdges = flat ? edges : { ...edges, ne: false, nw: false }
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const offset = (iy * width + ix) * 4 + 3
      if (data[offset] === 0) continue
      const [u, v] = tileOf(ix, iy)
      const keep = edgeFade(u, v, frame.w, frame.h, front)
      if (keep < 1) data[offset] = Math.round(data[offset] * keep)
    }
  }
  if (flat || (!edges.ne && !edges.nw)) return
  // back edges, column by column: where nothing rises over the edge, the ground below it runs out. The run ends at
  // the first outline or the first colour that is not ground, so roofs and walls stay whole.
  const depth = FADE_TILES * 2 * HALF_H * frame.scale
  for (let ix = 0; ix < width; ix++) {
    const sx = (frame.mirrored ? width - 1 - ix : ix) + 0.5
    const along = (sx - frame.originX) / (HALF_W * frame.scale)
    // NE edge runs right of the top corner, NW edge left of it
    const onEdge = along >= 0 ? edges.ne && along <= frame.w : edges.nw && -along <= frame.h
    if (!onEdge) continue
    const edgeY = frame.originY + (Math.abs(sx - frame.originX) * HALF_H) / HALF_W
    const alphaAt = (y: number): number => (y < 0 || y >= height ? 0 : data[(Math.round(y) * width + ix) * 4 + 3])
    if (alphaAt(edgeY - 5) > 40 || alphaAt(edgeY - 10) > 40) continue
    for (let iy = Math.max(0, Math.floor(edgeY - 3)); iy < height; iy++) {
      const distance = iy + 0.5 - edgeY
      if (distance >= depth) break
      const o = (iy * width + ix) * 4
      if (data[o + 3] === 0) continue
      if (distance > 3) {
        const dark = 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] < OUTLINE_DARK
        if (dark || ground[bin(o)] === 0) break
      }
      const t = Math.max(0, Math.min(1, distance / depth))
      data[o + 3] = Math.round(data[o + 3] * t * t * (3 - 2 * t))
    }
  }
}
