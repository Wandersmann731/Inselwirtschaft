// The stone flags a town lays around its houses, worked out by code: slabs of uneven length in rows, each row begun
// somewhere else than the one before, so no joint runs through. A slab is of one stone and one tone, a little
// lighter along the edges that face the sun and darker along the others; between the slabs lies earth, and here and
// there moss. The pattern repeats after a few tiles without a seam, so one small table of it covers every yard.
import { hash2, valueNoise } from '../world/noise2d'

/** A table covers this many tiles before it repeats, with this many entries per tile. */
export const FLAG_TILES = 4
const PER_TILE = 96
export const FLAG_TEX = FLAG_TILES * PER_TILE
/** Rows of slabs per tile, and slabs per tile along a row (on average). */
const ROWS = 5
const SLABS = 3
/** Half the width of a joint, in tiles. */
const JOINT = 0.017

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** One slab, as seen from a place on it. */
export interface Flag {
  /** Colour at this place. */
  r: number
  g: number
  b: number
  /** 0 in the joint around the slab, 1 on it. */
  body: number
  /** The middle of the slab, in tiles. */
  cu: number
  cv: number
  /** A number from 0 to 1 that belongs to the slab: the same wherever on it you ask. */
  pick: number
}

/**
 * The flags at a position in tiles (they repeat every FLAG_TILES): which slab lies there, how far it is to its
 * joint, and its colour. Pure.
 */
export function flagAt(u: number, v: number, out: Flag): void {
  const period = FLAG_TILES * SLABS
  const [u0, v0] = [u, v]
  u = ((u % FLAG_TILES) + FLAG_TILES) % FLAG_TILES
  v = ((v % FLAG_TILES) + FLAG_TILES) % FLAG_TILES
  const row = Math.floor(v * ROWS)
  // every row is begun somewhere else, and its joints wander by a quarter of a slab
  const x = u * SLABS + hash2(row, 1, 731)
  const end = (k: number): number => k + (hash2(((k % period) + period) % period, row, 732) - 0.5) * 0.5
  let slab = Math.floor(x)
  if (x < end(slab)) slab--
  else if (x >= end(slab + 1)) slab++
  const [from, to] = [end(slab), end(slab + 1)]
  const along = Math.min(x - from, to - x) / SLABS
  const across = Math.min(v * ROWS - row, row + 1 - v * ROWS) / ROWS
  out.body = smooth((Math.min(along, across) - JOINT * 0.4) / JOINT)
  // the middle of the slab, counted from where the question was asked (not from the start of the repeat)
  out.cu = u0 + ((from + to) / 2 - x) / SLABS
  out.cv = v0 + (row + 0.5) / ROWS - v
  const id = (((slab % period) + period) % period) + row * 97
  out.pick = hash2(id, 3, 733)
  // most slabs are a warm grey, some of sandstone, a few of a cold grey; each of its own tone
  const kind = hash2(id, 4, 734)
  const [r, g, b] = kind < 0.58 ? [168, 156, 134] : kind < 0.84 ? [180, 160, 128] : [152, 150, 146]
  const tone = 0.84 + 0.24 * hash2(id, 5, 735)
  // the sun stands in the top left of the screen, towards smaller u: the end of a slab that faces it is lit, the
  // other one lies in the shade of the next slab
  const lit = 1 + 0.1 * (smooth(1 - (x - from) / SLABS / 0.035) - smooth(1 - (to - x) / SLABS / 0.035)) + 0.05 * (smooth(1 - (v * ROWS - row) / ROWS / 0.03) - smooth(1 - (row + 1 - v * ROWS) / ROWS / 0.03))
  const grit = 0.96 + 0.08 * hash2(Math.floor(u * 61), Math.floor(v * 61), 736)
  const shade = tone * lit * grit
  // in the joint: earth, and moss where it stays damp
  const moss = smooth((valueNoise(u * 2.3, v * 2.3, 737) - 0.52) / 0.12)
  const joint = [86 + 6 * moss, 76 + 26 * moss, 58 - 8 * moss]
  out.r = joint[0] + (r * shade - joint[0]) * out.body
  out.g = joint[1] + (g * shade - joint[1]) * out.body
  out.b = joint[2] + (b * shade - joint[2]) * out.body
}

export interface FlagTextures {
  /** Colour per entry, three bytes each. */
  colour: Uint8ClampedArray
  /** How much of an entry is slab and not joint, and the slab's own number, 0 to 255. */
  body: Uint8ClampedArray
  pick: Uint8ClampedArray
  /** From an entry to the middle of its slab, in tiles. */
  du: Float32Array
  dv: Float32Array
}

let textures: FlagTextures | null = null

/** The flags as a table, worked out once. */
export function flagTextures(): FlagTextures {
  if (textures) return textures
  const n = FLAG_TEX * FLAG_TEX
  const made: FlagTextures = { colour: new Uint8ClampedArray(n * 3), body: new Uint8ClampedArray(n), pick: new Uint8ClampedArray(n), du: new Float32Array(n), dv: new Float32Array(n) }
  const flag: Flag = { r: 0, g: 0, b: 0, body: 0, cu: 0, cv: 0, pick: 0 }
  for (let y = 0; y < FLAG_TEX; y++) {
    for (let x = 0; x < FLAG_TEX; x++) {
      const u = (x + 0.5) / PER_TILE
      const v = (y + 0.5) / PER_TILE
      flagAt(u, v, flag)
      const i = y * FLAG_TEX + x
      made.colour.set([flag.r, flag.g, flag.b], i * 3)
      made.body[i] = flag.body * 255
      made.pick[i] = flag.pick * 255
      made.du[i] = flag.cu - u
      made.dv[i] = flag.cv - v
    }
  }
  textures = made
  return made
}
