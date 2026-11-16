// The ground of the map, made by code: the four ground textures as pixel data, the colour of one ground pixel
// (terrains run into each other along noise, not along tile edges) and the fine grain that is laid over it.
import { coastWarp, landField, terrainAt, type GroundTextures, type Texture } from '../world/ground'
import { fbm, hash2 } from '../world/noise2d'
import { Terrain, type GameMap } from '../world/terrain'
import { GROUND_SIZE, groundPixels, type GroundName } from './groundMade'

let cached: GroundTextures | null = null

/** The four ground textures as pixel data, worked out once (see groundMade.ts). */
export function groundTextures(): GroundTextures | null {
  if (cached) return cached
  const made = (name: GroundName): Texture => ({ data: groundPixels(name), size: GROUND_SIZE })
  cached = { grass: made('grass'), forest: made('forest'), sand: made('sand'), rock: made('rock') }
  return cached
}

const HALF_W = 32
const HALF_H = 16
/** Bare, trodden earth: where the grass is worn away. */
const EARTH = [172, 141, 96]
const BEACH_TINT = [0.86, 0.76, 0.56]
/** Land share (see landShare) at which the land begins, and up to where its ground is damp from the sea. */
const COAST = 0.5
const DAMP_TO = 0.74
/** How much darker damp ground is, per colour channel. */
const DAMP = [0.2, 0.22, 0.26]
/**
 * Sand under buildings and roads at the water: their tiles count this many times towards the land, so the ground
 * reaches a little beyond them in a rounded apron instead of ending at the straight tile edge. The apron follows
 * the coast noise only this much, so it never cuts into a footprint.
 */
const APRON = 2.6
const APRON_WOBBLE = 0.3
/** Half the width of the land's edge in land share: about one picture pixel, so the edge is not a staircase. */
const EDGE = 0.022
/** Width of the band in which two terrains mix (in terrain share) and how far noise pushes the border about. */
const BLEND = 0.2
const RAGGED = 0.46
/** Sea counts this much more than a beach tile towards the sand, so a strip of sand lies along every shore. */
const SHORE_SAND = 1.8

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

function sample(texture: Texture, u: number, v: number, out: number[]): void {
  const { data, size } = texture
  const x = (((u % 1) + 1) % 1) * size
  const y = (((v % 1) + 1) % 1) * size
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const x1 = (x0 + 1) % size
  const y1 = (y0 + 1) % size
  const a = (y0 * size + x0) * 4
  const b = (y0 * size + x1) * 4
  const c = (y1 * size + x0) * 4
  const d = (y1 * size + x1) * 4
  for (let k = 0; k < 3; k++) {
    out[k] = (data[a + k] * (1 - fx) + data[b + k] * fx) * (1 - fy) + (data[c + k] * (1 - fx) + data[d + k] * fx) * fy
  }
}

const scratchA = [0, 0, 0]
const scratchB = [0, 0, 0]

/**
 * Colour of one land terrain at a position in tile coordinates. Two layers of the texture at different scales and
 * directions are mixed, so there is no visible repetition. Grass and forest floor come in patches: dry and yellow,
 * lush and dark, with a mottle of about a tile.
 */
function landColor(terrain: number, tex: GroundTextures, u: number, v: number, seed: number, out: number[]): void {
  const texture =
    terrain === Terrain.Forest ? tex.forest : terrain === Terrain.Beach ? tex.sand : terrain === Terrain.Mountain ? tex.rock : tex.grass
  sample(texture, u * 0.3, v * 0.3, scratchA)
  sample(texture, (u * 0.9 - v * 0.4) * 0.11 + 0.37, (v * 0.9 + u * 0.4) * 0.11 + 0.61, scratchB)
  const drift = 0.88 + 0.24 * fbm(u * 0.06, v * 0.06, seed + 30, 2)
  const base = terrain === Terrain.Mountain ? 0.9 : terrain === Terrain.Forest ? 0.92 : 1
  for (let k = 0; k < 3; k++) out[k] = (scratchA[k] * 0.6 + scratchB[k] * 0.4) * drift * base
  if (terrain === Terrain.Beach) {
    // an ochre tint, and the sand lies in lighter and darker drifts
    const drifts = 0.87 + 0.26 * fbm(u * 0.7 + 3, v * 0.7 + 8, seed + 36, 3)
    for (let k = 0; k < 3; k++) out[k] *= BEACH_TINT[k] * drifts
    return
  }
  if (terrain === Terrain.Mountain) return
  const slow = fbm(u * 0.045 + 5, v * 0.045 + 5, seed + 31, 2)
  const dry = Math.max(0, slow - 0.52) * 2.2
  const blotch = fbm(u * 0.42, v * 0.42, seed + 33, 3)
  const lush = Math.max(0, 0.47 - blotch) * 2.4
  const pale = Math.max(0, blotch - 0.58) * 1.6
  const mottle = (0.88 + 0.24 * fbm(u * 1.9, v * 1.9, seed + 34, 2)) * (1 - 0.36 * lush)
  out[0] = (out[0] + 30 * dry + 22 * pale - 10 * lush) * mottle
  out[1] = (out[1] + 12 * dry + 14 * pale) * mottle
  out[2] = (out[2] - 8 * dry - 4 * pale - 6 * lush) * mottle
}

const shares = [0, 0, 0]

/**
 * How much forest, beach and rock lies at a fractional tile position (into `shares`, the rest is grass): the
 * terrains of the four nearest tile centres, blended bilinearly. Sea counts as beach (and more), so every shore is sandy.
 * Returns false where all four tiles are the same, then `shares` is 0 or 1 and needs no blending.
 */
function terrainShares(map: GameMap, u: number, v: number): boolean {
  const fu = u - 0.5
  const fv = v - 0.5
  const x0 = Math.floor(fu)
  const y0 = Math.floor(fv)
  const tx = fu - x0
  const ty = fv - y0
  shares[0] = shares[1] = shares[2] = 0
  let first = -1
  let mixed = false
  for (let corner = 0; corner < 4; corner++) {
    const dx = corner & 1
    const dy = corner >> 1
    const terrain = terrainAt(map, x0 + dx, y0 + dy)
    const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty)
    const slot = terrain === Terrain.Forest ? 0 : terrain === Terrain.Beach || terrain === Terrain.Water ? 1 : terrain === Terrain.Mountain ? 2 : 3
    if (first < 0) first = slot
    else if (slot !== first) mixed = true
    if (slot < 3) shares[slot] += terrain === Terrain.Water ? weight * SHORE_SAND : weight
  }
  if (shares[1] > 1) shares[1] = 1
  return mixed
}

/** Where the last landShare looked up the terrain (the position moved by the coast noise), and whether an apron made it land. */
const looked = [0, 0]
let onApron = false

/**
 * Share of land at a tile position, 0 to 1: the coast is where it is 0.5. It is the smooth land field of the map
 * (see world/ground.ts), wobbled by noise, so the coast is rounded instead of a staircase of tiles. `solid` tells
 * which tiles carry a building or road: around them the land reaches out into the sea in a rounded apron, and their
 * own tiles are always land. The ground picture and the surf both use this, so the foam lies where the sand ends.
 */
export function landShare(map: GameMap, seed: number, u: number, v: number, solid?: (x: number, y: number) => boolean): number {
  const [du, dv] = coastWarp(u, v, seed)
  looked[0] = u + du
  looked[1] = v + dv
  onApron = false
  let share = landField(map, looked[0], looked[1])
  if (solid === undefined || share >= DAMP_TO) return share
  const inside = (x: number, y: number): number => (x >= 0 && y >= 0 && x < map.width && y < map.height && solid(x, y) ? 1 : 0)
  const fu = u + du * APRON_WOBBLE - 0.5
  const fv = v + dv * APRON_WOBBLE - 0.5
  const x0 = Math.floor(fu)
  const y0 = Math.floor(fv)
  const tx = fu - x0
  const ty = fv - y0
  const plot = (inside(x0, y0) * (1 - tx) + inside(x0 + 1, y0) * tx) * (1 - ty) + (inside(x0, y0 + 1) * (1 - tx) + inside(x0 + 1, y0 + 1) * tx) * ty
  let apron = Math.min(1, plot * APRON)
  // the tiles themselves stay land whatever the noise does
  if (apron < DAMP_TO && inside(Math.floor(u), Math.floor(v)) === 1) apron = DAMP_TO
  if (apron > share) {
    share = apron
    onApron = true
    looked[0] = u
    looked[1] = v
  }
  return share
}

const TERRAINS = [Terrain.Forest, Terrain.Beach, Terrain.Mountain, Terrain.Grass]
const weights = [0, 0, 0, 0]
const color = [0, 0, 0]

/**
 * Writes the ground colour at a world position (RGBA into `out` at `offset`) and returns how much of the pixel is
 * grown over (grass or forest floor, 0 to 1), or -1 where there is no land.
 *
 * The coast is the 0.5 line of landShare, which the surf follows too. Terrains do not end at tile edges: each has a smooth share, the border between two is pushed
 * about by noise and the colours mix across it. `wearAt` says how trodden the ground is (0 to 1, tile position):
 * there the bare earth shows through the grass in blotches.
 */
export function paintGround(
  map: GameMap,
  tex: GroundTextures,
  seed: number,
  wx: number,
  wy: number,
  out: Uint8ClampedArray,
  offset: number,
  solid?: (x: number, y: number) => boolean,
  wearAt?: (u: number, v: number) => number,
): number {
  const u = (wy / HALF_H + wx / HALF_W) / 2
  const v = (wy / HALF_H - wx / HALF_W) / 2
  const share = landShare(map, seed, u, v, solid)
  if (share < COAST - EDGE) {
    // open sea: the water, the shallows and the wet sand are drawn below the ground picture (see surf.ts)
    out[offset + 3] = 0
    return -1
  }
  const ut = looked[0]
  const vt = looked[1]
  const apron = onApron

  // the share of each terrain, with a ragged border between two of them
  if (apron) {
    // sand that was put under a building or road at the water
    weights[0] = weights[2] = weights[3] = 0
    weights[1] = 1
  } else if (terrainShares(map, ut, vt)) {
    const ragged = (fbm(u * 1.7, v * 1.7, seed + 41, 2) - 0.5) * RAGGED + (fbm(u * 6.1, v * 6.1, seed + 42, 2) - 0.5) * 0.16
    let rest = 1
    for (let k = 0; k < 3; k++) {
      weights[k] = shares[k] <= 0 ? 0 : smooth((shares[k] + ragged - (0.5 - BLEND)) / (2 * BLEND))
      rest -= weights[k]
    }
    weights[3] = Math.max(0, rest)
    const total = weights[0] + weights[1] + weights[2] + weights[3]
    for (let k = 0; k < 4; k++) weights[k] /= total
  } else {
    for (let k = 0; k < 3; k++) weights[k] = shares[k] > 0.5 ? 1 : 0
    weights[3] = 1 - weights[0] - weights[1] - weights[2]
  }
  let r = 0
  let g = 0
  let b = 0
  for (let k = 0; k < 4; k++) {
    if (weights[k] < 0.004) continue
    landColor(TERRAINS[k], tex, u, v, seed, color)
    r += color[0] * weights[k]
    g += color[1] * weights[k]
    b += color[2] * weights[k]
  }

  // bare earth: a few blotches of its own, and wherever the ground is trodden
  let grown = weights[0] + weights[3]
  if (grown > 0.02) {
    let bare = smooth((fbm(u * 0.31 + 11, v * 0.31 + 3, seed + 35, 3) - 0.66) / 0.1) * 0.5
    const wear = wearAt ? wearAt(u, v) : 0
    if (wear > 0.02) {
      const patch = fbm(u * 2.3, v * 2.3, seed + 55, 2) + (fbm(u * 7.3, v * 7.3, seed + 57, 2) - 0.5) * 0.4
      bare = Math.max(bare, smooth((wear + (patch - 0.5) * 0.8 - 0.36) / 0.4) * 0.9)
    }
    if (bare > 0.01) {
      const mix = bare * grown
      const shade = 0.9 + 0.2 * fbm(u * 3.1, v * 3.1, seed + 56, 2)
      r += (EARTH[0] * shade - r) * mix
      g += (EARTH[1] * shade - g) * mix
      b += (EARTH[2] * shade - b) * mix
      grown *= 1 - bare
    }
  }

  if (share < DAMP_TO) {
    // towards the water the ground is damp and darker; the wet sand in the sea goes on from there
    const damp = smooth((DAMP_TO - share) / (DAMP_TO - COAST))
    r *= 1 - DAMP[0] * damp
    g *= 1 - DAMP[1] * damp
    b *= 1 - DAMP[2] * damp
  }
  if (share < COAST + EDGE) {
    // the last pixel of land is half clear, so the edge is no staircase
    const land = (share - (COAST - EDGE)) / (2 * EDGE)
    out[offset] = r
    out[offset + 1] = g
    out[offset + 2] = b
    out[offset + 3] = 255 * land
    return grown * land
  }
  out[offset] = r
  out[offset + 1] = g
  out[offset + 2] = b
  out[offset + 3] = 255
  return grown
}

/** World pixels one grain picture covers before it repeats, and its picture pixels per world pixel. */
export const GRAIN_SPAN = 256
export const GRAIN_SCALE = 2

/** Smooth noise that repeats after `period` cells, 0 to 1. */
function tiledNoise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const at = (cx: number, cy: number): number => hash2(((cx % period) + period) % period, ((cy % period) + period) % period, seed)
  const a = at(x0, y0)
  const b = at(x0 + 1, y0)
  const c = at(x0, y0 + 1)
  const d = at(x0 + 1, y0 + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/**
 * A seamless grey picture of fine structure, for the 'overlay' blend (mid grey changes nothing). `layers` are noise
 * layers as [cell size in picture pixels, strength]; `stretch` pulls the cells upright like blades of grass;
 * `flecks` is the share of pixels that become a light or dark speck.
 */
function makeGrain(seed: number, layers: [number, number][], stretch: number, speckle: number, flecks: number, tufts = 0): HTMLCanvasElement | null {
  const size = GRAIN_SPAN * GRAIN_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const image = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 128 + (hash2(x, y, seed) - 0.5) * speckle
      for (const [index, [cell, strength]] of layers.entries()) {
        value += (tiledNoise(x / cell, y / (cell * stretch), size / cell, seed + 7 + index * 13) - 0.5) * strength
      }
      // a speck is two pixels high: a dry stalk, a pebble, a shadow between the blades
      const fleck = Math.max(hash2(x, y, seed + 3), hash2(x, y - 1, seed + 3))
      if (fleck > 1 - flecks) value += hash2(x >> 1, y >> 2, seed + 4) > 0.5 ? 46 : -52
      const o = (y * size + x) * 4
      image.data[o] = image.data[o + 1] = image.data[o + 2] = value
      image.data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  layTufts(ctx, size, seed + 21, tufts)
  return canvas
}

/**
 * Tufts of grass over the grain: a few blades each, fanned out from one foot, some in the light and some in the
 * shade of the others. A tuft that crosses an edge is drawn again one picture further on, so the picture still
 * joins itself.
 */
function layTufts(ctx: CanvasRenderingContext2D, size: number, seed: number, count: number): void {
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.9
  for (let n = 0; n < count; n++) {
    const x = hash2(n, 1, seed) * size
    const y = hash2(n, 2, seed) * size
    const blades = 3 + Math.floor(hash2(n, 3, seed) * 4)
    const grey = hash2(n, 4, seed) > 0.45 ? 228 : 34
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      if (x + ox < -9 || x + ox > size + 9 || y + oy < -9 || y + oy > size + 9) continue
      for (let k = 0; k < blades; k++) {
        const lean = (hash2(n, 10 + k, seed) - 0.5) * 5
        const long = 3 + hash2(n, 20 + k, seed) * 5
        const root = x + ox + (hash2(n, 30 + k, seed) - 0.5) * 3
        ctx.strokeStyle = `rgba(${grey}, ${grey}, ${grey}, ${0.28 + 0.3 * hash2(n, 40 + k, seed)})`
        ctx.beginPath()
        ctx.moveTo(root, y + oy)
        ctx.quadraticCurveTo(root + lean * 0.3, y + oy - long * 0.6, root + lean, y + oy - long)
        ctx.stroke()
      }
    }
  }
}

export interface GroundGrain {
  /** Grass and forest floor: clumps and upright blades. */
  grown: HTMLCanvasElement
  /** Sand, earth and rock: fine, even grains. */
  bare: HTMLCanvasElement
}

let grain: GroundGrain | null | undefined

/** The two grain pictures, made once. Null if no canvas is to be had. */
export function groundGrain(): GroundGrain | null {
  if (grain !== undefined) return grain
  const grown = makeGrain(811, [[32, 14], [16, 22], [8, 32], [4, 34], [2, 18]], 1.5, 14, 0.014, 2400)
  const bare = makeGrain(977, [[32, 20], [16, 20], [8, 16], [4, 22], [2, 16]], 1, 20, 0.02)
  grain = grown && bare ? { grown, bare } : null
  return grain
}
