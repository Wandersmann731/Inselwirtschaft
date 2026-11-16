// The two grounds a road is made of, worked out by code: cobble pavement and trodden earth. Both repeat without a
// seam, so one small picture of each covers every road of the map.
import { hash2 } from '../world/noise2d'

export const TEX = 256
/** A texture covers this many tiles before it repeats. */
export const TEX_TILES = 2
const COBBLES_PER_TILE = 13
const PEBBLES_PER_TILE = 9

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

interface Cell {
  f1: number
  f2: number
  dx: number
  dy: number
  id: number
}

/**
 * The nearest point of a jittered grid that repeats after `period` cells: distance to it, to the second nearest, and
 * its offset and id. `spread` (0 to 1) is how far a point may lie from the middle of its cell: the more, the more
 * the cells differ in size and shape.
 */
function cells(x: number, y: number, period: number, seed: number, spread: number, out: Cell): void {
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  out.f1 = out.f2 = Infinity
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i
      const gy = cy + j
      const wx = ((gx % period) + period) % period
      const wy = ((gy % period) + period) % period
      const px = gx + 0.5 + (hash2(wx, wy, seed) - 0.5) * spread
      const py = gy + 0.5 + (hash2(wx, wy, seed + 1) - 0.5) * spread
      const d = Math.hypot(x - px, y - py)
      if (d < out.f1) {
        out.f2 = out.f1
        out.f1 = d
        out.dx = x - px
        out.dy = y - py
        out.id = wy * period + wx
      } else if (d < out.f2) out.f2 = d
    }
  }
}

const scratch: Cell = { f1: 0, f2: 0, dx: 0, dy: 0, id: 0 }

/** One stone of the pavement, as seen from a place on it. */
export interface Stone {
  /** Colour at this place. */
  r: number
  g: number
  b: number
  /** 0 in the joint around the stone, 1 on it. */
  body: number
  /** From this place to the middle of the stone, in tiles. */
  du: number
  dv: number
  /** Two numbers from 0 to 1 that belong to the stone: the same wherever on it you ask. */
  pick: number
  luck: number
}

/**
 * The cobble pavement at a position in tiles (it repeats every TEX_TILES): small setts in rows, of many greys, some
 * of them brown or blue, each a little rounded (light on the side of the sun, dark on the other). Pure.
 */
export function stoneAt(u: number, v: number, out: Stone): void {
  u = ((u % TEX_TILES) + TEX_TILES) % TEX_TILES
  v = ((v % TEX_TILES) + TEX_TILES) % TEX_TILES
  const period = COBBLES_PER_TILE * TEX_TILES
  // setts are cut to one size and laid in rows: they differ a little, not much
  cells(u * COBBLES_PER_TILE, v * COBBLES_PER_TILE, period, 301, 0.58, scratch)
  out.body = smooth((scratch.f2 - scratch.f1) / 0.17)
  out.du = -scratch.dx / COBBLES_PER_TILE
  out.dv = -scratch.dy / COBBLES_PER_TILE
  out.pick = hash2(scratch.id, 6, 306)
  out.luck = hash2(scratch.id, 7, 307)
  const tone = 0.78 + 0.34 * hash2(scratch.id, 1, 303)
  const kind = hash2(scratch.id, 2, 304)
  // most stones are grey, some warm brown, a few slate blue
  const [r, g, b] = kind < 0.56 ? [150, 143, 132] : kind < 0.8 ? [160, 142, 120] : [132, 134, 142]
  // the sun stands in the top left of the screen: that is towards smaller u
  const lit = 1 + 0.17 * Math.max(-1, Math.min(1, (-scratch.dx * 0.95 + scratch.dy * 0.3) / 0.35))
  const grain = 0.94 + 0.12 * hash2(Math.floor(u * 97), Math.floor(v * 97), 305)
  const shade = tone * lit * grain * (0.6 + 0.4 * out.body)
  out.r = r * shade
  out.g = g * shade
  out.b = b * shade
}

const stone: Stone = { r: 0, g: 0, b: 0, body: 0, du: 0, dv: 0, pick: 0, luck: 0 }

/** The colour of the pavement at a position in tiles, RGB into `out`. Pure. */
export function cobbleAt(u: number, v: number, out: number[]): void {
  stoneAt(u, v, stone)
  out[0] = stone.r
  out[1] = stone.g
  out[2] = stone.b
}

/** Trodden earth at a position in tiles: mottled, with pebbles that throw a little shade. RGB into `out`. Pure. */
export function trackAt(u: number, v: number, out: number[]): void {
  u = ((u % TEX_TILES) + TEX_TILES) % TEX_TILES
  v = ((v % TEX_TILES) + TEX_TILES) % TEX_TILES
  const period = PEBBLES_PER_TILE * TEX_TILES
  const wrap = (n: number, cellsPerTile: number): number => {
    const size = cellsPerTile * TEX_TILES
    const x = u * cellsPerTile
    const y = v * cellsPerTile
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = smooth(x - x0)
    const fy = smooth(y - y0)
    const at = (ix: number, iy: number): number => hash2(((ix % size) + size) % size, ((iy % size) + size) % size, n)
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
  }
  const mottle = 0.82 + 0.2 * wrap(311, 3) + 0.16 * wrap(312, 12)
  const grain = 0.94 + 0.12 * hash2(Math.floor(u * 97), Math.floor(v * 97), 313)
  let r = 172 * mottle * grain
  let g = 139 * mottle * grain
  let b = 92 * mottle * grain
  cells(u * PEBBLES_PER_TILE, v * PEBBLES_PER_TILE, period, 314, 0.6, scratch)
  if (hash2(scratch.id, 3, 315) < 0.4) {
    const radius = 0.1 + 0.14 * hash2(scratch.id, 4, 316)
    if (scratch.f1 < radius) {
      const tone = 0.85 + 0.25 * hash2(scratch.id, 5, 317)
      const lit = 1 + 0.18 * Math.max(-1, Math.min(1, (-scratch.dx * 0.95 + scratch.dy * 0.3) / radius))
      r = 168 * tone * lit
      g = 162 * tone * lit
      b = 150 * tone * lit
    } else if (scratch.f1 < radius + 0.07 && scratch.dx * 0.95 - scratch.dy * 0.3 > 0) {
      r *= 0.78
      g *= 0.78
      b *= 0.8
    }
  }
  out[0] = r
  out[1] = g
  out[2] = b
}

export interface RoadTextures {
  /** Pavement and earth, RGB per texel. */
  cobble: Uint8ClampedArray
  track: Uint8ClampedArray
  /** Per texel of the pavement: how much of it is stone and not joint (0 to 255), and the stone's two numbers (0 to 255). */
  body: Uint8ClampedArray
  pick: Uint8ClampedArray
  luck: Uint8ClampedArray
  /** Per texel: from there to the middle of its stone, in tiles. */
  du: Float32Array
  dv: Float32Array
}

let textures: RoadTextures | null = null

/** Both grounds of the roads as pixel data, worked out once. */
export function roadTextures(): RoadTextures {
  if (textures) return textures
  const made: RoadTextures = {
    cobble: new Uint8ClampedArray(TEX * TEX * 3),
    track: new Uint8ClampedArray(TEX * TEX * 3),
    body: new Uint8ClampedArray(TEX * TEX),
    pick: new Uint8ClampedArray(TEX * TEX),
    luck: new Uint8ClampedArray(TEX * TEX),
    du: new Float32Array(TEX * TEX),
    dv: new Float32Array(TEX * TEX),
  }
  const colour = [0, 0, 0]
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const u = ((x + 0.5) / TEX) * TEX_TILES
      const v = ((y + 0.5) / TEX) * TEX_TILES
      const i = y * TEX + x
      stoneAt(u, v, stone)
      made.cobble.set([stone.r, stone.g, stone.b], i * 3)
      made.body[i] = stone.body * 255
      made.pick[i] = stone.pick * 255
      made.luck[i] = stone.luck * 255
      made.du[i] = stone.du
      made.dv[i] = stone.dv
      trackAt(u, v, colour)
      made.track.set(colour, i * 3)
    }
  }
  textures = made
  return made
}
