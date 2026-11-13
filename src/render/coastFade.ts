// The rims of plots: the painted ground of a building or a yard ends in a hard, straight edge. Where an edge borders
// free beach or the water, the picture fades out widely towards that edge, so the sand below shows through softly.
// Every other edge gets a narrow, ragged rim: only the ground of the picture runs out there, in an uneven line, and
// what stands on it (fences, crates, walls) stays. At the back edges a building rises over its plot, so there only
// the open ground is faded, never roof or wall.
import { buildings } from '../data'
import { fbm } from '../world/noise2d'
import { shadePlot } from './buildingShadows'
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
 * Width in tiles of the soft rim on open land: wide for the plot of a building (most of it is plain ground), narrow
 * for a yard between houses and narrower still for fields and pastures, which fill their tiles to the edge.
 */
export const RIM_TILES = { plot: 0.26, yard: 0.18, field: 0.07 }
/** How far (in rim widths) noise lets the ground below eat into the rim. */
const RIM_RAGGED = 1.3
/** A colour is ground of a picture if at least this share of the strip along its front edges has it. */
const COMMON_SHARE = 0.004
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

/** Fertilities that are not grown in a field or kept on a pasture: these buildings stand on an ordinary plot. */
const WILD = ['forest', 'game', 'whales']
/** Farms, plantations and pastures: their picture is crop or meadow up to the edge. */
const CULTIVATED = buildings
  .filter((def) => def.requiresFertility !== undefined && !WILD.includes(def.requiresFertility))
  .map((def) => `buildings/${def.id}`)

/** True for the picture of a cultivated plot, by its sprite key (see spriteKeys.ts). */
export function isCultivated(key: string): boolean {
  return CULTIVATED.some((base) => key === base || key.startsWith(`${base}_`))
}

const cache = new Map<string, HTMLCanvasElement>()
const MAX_CACHE = 96

/** A copy of the picture that fades out towards the given edges. Made once per picture and edge set, then reused. */
export function fadedCopy(key: string, image: SpriteImage, frame: FadeFrame, edges: FadeEdges, style: FadeStyle): SpriteImage {
  if (style === 'pier') return image
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
  const rim = style === 'flat' ? RIM_TILES.yard : isCultivated(key) ? RIM_TILES.field : RIM_TILES.plot
  fadePixels(pixels.data, canvas.width, canvas.height, frame, edges, style === 'flat', rim)
  // the building's own shadow on its plot (see buildingShadows.ts): the copy is made anyway, so it costs nothing later
  if (style === 'building') shadePlot(pixels.data, canvas.width, canvas.height, frame)
  ctx.putImageData(pixels, 0, 0)
  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(id, canvas)
  return canvas
}

/** How far the rim is eaten away at a tile position inside a footprint, 0 to 1: slow bays with a finer fray. */
function ragged(u: number, v: number): number {
  return Math.max(0, Math.min(1, (fbm(u * 2.1 + 3.7, v * 2.1 + 9.2, 77, 2) - 0.3) * 1.6 + (fbm(u * 8.3, v * 8.3, 78, 2) - 0.5) * 0.5))
}

/**
 * Works on RGBA pixels in place. Pure: no canvas, so it can be tested. With `rim` (a width in tiles) the edges that
 * are not in `edges` get the narrow ragged rim of open land; without it they stay hard.
 */
export function fadePixels(data: Uint8ClampedArray, width: number, height: number, frame: FadeFrame, edges: FadeEdges, flat: boolean, rim = 0): void {
  const tileOf = (ix: number, iy: number): [number, number] => {
    const sx = frame.mirrored ? width - 1 - ix : ix
    const px = (sx + 0.5 - frame.originX) / frame.scale / HALF_W
    const py = (iy + 0.5 - frame.originY) / frame.scale / HALF_H
    return [(px + py) / 2, (py - px) / 2]
  }
  // the ground colours of this picture, taken from the strip along its front edges where nothing but ground lies
  const ground = new Uint8Array(4096)
  const counts = new Uint32Array(4096)
  let counted = 0
  const bin = (o: number): number => ((data[o] >> 4) << 8) | ((data[o + 1] >> 4) << 4) | (data[o + 2] >> 4)
  if (!flat) {
    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const o = (iy * width + ix) * 4
        if (data[o + 3] < 250) continue
        const [u, v] = tileOf(ix, iy)
        if (u < 0 || v < 0 || u > frame.w || v > frame.h) continue
        if (Math.min(frame.w - u, frame.h - v) < GROUND_STRIP) {
          ground[bin(o)] = 1
          counts[bin(o)]++
          counted++
        }
      }
    }
  }
  // on open land only the ground of the picture runs out: its colours are the frequent ones of that strip, and
  // never the dark ones (outlines and deep shade belong to things that stand there)
  const least = Math.max(3, counted * COMMON_SHARE)
  const isGround = (o: number): boolean => flat || (counts[bin(o)] >= least && 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] >= OUTLINE_DARK)
  const front: FadeEdges = flat ? edges : { ...edges, ne: false, nw: false }
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const offset = (iy * width + ix) * 4 + 3
      if (data[offset] === 0) continue
      const [u, v] = tileOf(ix, iy)
      let keep = edgeFade(u, v, frame.w, frame.h, front)
      if (rim > 0 && keep > 0) {
        let distance = Infinity
        if (!edges.se) distance = Math.min(distance, frame.w - u)
        if (!edges.sw) distance = Math.min(distance, frame.h - v)
        if (flat && !edges.ne) distance = Math.min(distance, v)
        if (flat && !edges.nw) distance = Math.min(distance, u)
        if (distance < rim * (1 + RIM_RAGGED) && isGround(offset - 3)) {
          const t = Math.max(0, Math.min(1, (distance - ragged(u, v) * rim * RIM_RAGGED) / rim))
          keep = Math.min(keep, t * t * (3 - 2 * t))
        }
      }
      if (keep < 1) data[offset] = Math.round(data[offset] * keep)
    }
  }
  if (flat || (rim <= 0 && !edges.ne && !edges.nw)) return
  // back edges, column by column: where nothing rises over the edge, the ground below it runs out. The run ends at
  // the first outline or the first colour that is not ground, so roofs and walls stay whole.
  const tile = 2 * HALF_H * frame.scale
  // the distances below were measured in pictures with two pixels per world pixel
  const unit = frame.scale / 2
  for (let ix = 0; ix < width; ix++) {
    const sx = (frame.mirrored ? width - 1 - ix : ix) + 0.5
    const along = (sx - frame.originX) / (HALF_W * frame.scale)
    // NE edge runs right of the top corner, NW edge left of it
    if (along >= 0 ? along > frame.w : -along > frame.h) continue
    const shore = along >= 0 ? edges.ne : edges.nw
    if (!shore && rim <= 0) continue
    // on open land the rim is narrow and of uneven depth
    const depth = shore ? FADE_TILES * tile : rim * (0.6 + RIM_RAGGED * ragged(Math.max(0, along) + 0.5, Math.max(0, -along) + 0.5)) * tile
    const edgeY = frame.originY + (Math.abs(sx - frame.originX) * HALF_H) / HALF_W
    const alphaAt = (y: number): number => (y < 0 || y >= height ? 0 : data[(Math.round(y) * width + ix) * 4 + 3])
    if (alphaAt(edgeY - 5 * unit) > 40 || alphaAt(edgeY - 10 * unit) > 40) continue
    for (let iy = Math.max(0, Math.floor(edgeY - 3 * unit)); iy < height; iy++) {
      const distance = iy + 0.5 - edgeY
      if (distance >= depth) break
      const o = (iy * width + ix) * 4
      if (data[o + 3] === 0) continue
      if (distance > 3 * unit) {
        const dark = 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] < OUTLINE_DARK
        if (dark || ground[bin(o)] === 0) break
      }
      const t = Math.max(0, Math.min(1, distance / depth))
      data[o + 3] = Math.round(data[o + 3] * t * t * (3 - 2 * t))
    }
  }
}
