import { fbm } from './noise2d'
import { Terrain, type GameMap } from './terrain'

/** A square picture that repeats seamlessly, RGBA bytes. */
export interface Texture {
  data: Uint8ClampedArray
  size: number
}

export interface GroundTextures {
  grass: Texture
  forest: Texture
  sand: Texture
  rock: Texture
}

const HALF_W = 32
const HALF_H = 16
const FOAM: [number, number, number] = [238, 247, 250]
const SHALLOW: [number, number, number] = [118, 196, 214]

/** Terrain at a fractional tile position. Outside the map is sea. */
export function terrainAt(map: GameMap, u: number, v: number): number {
  const x = Math.floor(u)
  const y = Math.floor(v)
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return Terrain.Water
  return map.tiles[y * map.width + x]
}

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

const BEACH_TINT = [0.92, 0.78, 0.55]
const NO_TINT = [1, 1, 1]
const scratchA = [0, 0, 0]
const scratchB = [0, 0, 0]

/**
 * Colour of one land terrain at a position in tile coordinates. Two layers of the texture at different scales and
 * directions are mixed and the brightness drifts slowly, so there is no visible repetition however far you look.
 */
function landColor(terrain: number, tex: GroundTextures, u: number, v: number, seed: number, out: number[]): void {
  const texture =
    terrain === Terrain.Forest ? tex.forest : terrain === Terrain.Beach ? tex.sand : terrain === Terrain.Mountain ? tex.rock : tex.grass
  sample(texture, u * 0.3, v * 0.3, scratchA)
  sample(texture, (u * 0.9 - v * 0.4) * 0.11 + 0.37, (v * 0.9 + u * 0.4) * 0.11 + 0.61, scratchB)
  const drift = 0.88 + 0.24 * fbm(u * 0.06, v * 0.06, seed + 30, 2)
  const base = terrain === Terrain.Mountain ? 0.9 : terrain === Terrain.Forest ? 0.92 : 1
  // The beach gets an ochre tint: a warm sandy rim between green land and blue sea.
  const tint = terrain === Terrain.Beach ? BEACH_TINT : NO_TINT
  for (let k = 0; k < 3; k++) out[k] = (scratchA[k] * 0.6 + scratchB[k] * 0.4) * drift * base * tint[k]
  if (terrain === Terrain.Grass) {
    // slow patches of lighter, yellower grass
    const patch = Math.max(0, fbm(u * 0.045 + 5, v * 0.045 + 5, seed + 31, 2) - 0.52) * 2.2
    out[0] += 34 * patch
    out[1] += 14 * patch
    out[2] -= 12 * patch
  }
}

const color = [0, 0, 0]
const color1 = [0, 0, 0]
const color2 = [0, 0, 0]

/**
 * Share of land at a fractional tile position: the land flags (1 land, 0 sea) of the four nearest tile centres,
 * blended bilinearly. The coast is where it is 0.5, so a staircase of tiles becomes a straight, rounded line.
 */
export function landField(map: GameMap, u: number, v: number): number {
  const fu = u - 0.5
  const fv = v - 0.5
  const x0 = Math.floor(fu)
  const y0 = Math.floor(fv)
  const tx = fu - x0
  const ty = fv - y0
  const land = (x: number, y: number): number => (terrainAt(map, x, y) === Terrain.Water ? 0 : 1)
  return (land(x0, y0) * (1 - tx) + land(x0 + 1, y0) * tx) * (1 - ty) + (land(x0, y0 + 1) * (1 - tx) + land(x0 + 1, y0 + 1) * tx) * ty
}

/** The land terrain closest to a position that is land by `landField` but lies over a sea tile (the rounded corners). */
function nearestLand(map: GameMap, u: number, v: number): number {
  const fu = u - 0.5
  const fv = v - 0.5
  const x0 = Math.floor(fu)
  const y0 = Math.floor(fv)
  const tx = fu - x0
  const ty = fv - y0
  let best: number = Terrain.Beach
  let bestWeight = -1
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const terrain = terrainAt(map, x0 + dx, y0 + dy)
    if (terrain === Terrain.Water) continue
    const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty)
    if (weight > bestWeight) {
      best = terrain
      bestWeight = weight
    }
  }
  return best
}

/** How far noise pushes a position before the coast is looked up, in tiles: a big slow swing plus a finer wobble. */
export function coastWarp(u: number, v: number, seed: number): [number, number] {
  const du = (fbm(u * 0.4, v * 0.4, seed + 21, 2) - 0.5) * 1 + (fbm(u * 1.3, v * 1.3, seed + 23, 2) - 0.5) * 0.45
  const dv = (fbm(u * 0.4 + 17, v * 0.4 + 9, seed + 22, 2) - 0.5) * 1 + (fbm(u * 1.3 + 7, v * 1.3 + 3, seed + 24, 2) - 0.5) * 0.45
  return [du, dv]
}

const SHALLOW_FROM = 0.2
const FOAM_TO = 0.74

/**
 * Writes the ground colour at a world position (RGBA into `out` at `offset`). The coast is the 0.5 line of a smooth
 * land field (see landField), wobbled by noise, so it is rounded and natural instead of a staircase of tiles. Land
 * next to the sea gets a foam rim, sea next to land a shallow rim. Sea far from land is transparent (the animated
 * water shows through).
 */
export function groundPixel(map: GameMap, tex: GroundTextures, seed: number, wx: number, wy: number, out: Uint8ClampedArray, offset: number): void {
  const u = (wy / HALF_H + wx / HALF_W) / 2
  const v = (wy / HALF_H - wx / HALF_W) / 2
  const [du, dv] = coastWarp(u, v, seed)
  const ut = u + du
  const vt = v + dv
  const share = landField(map, ut, vt)

  if (share < 0.5) {
    if (share < SHALLOW_FROM) {
      out[offset + 3] = 0
      return
    }
    const k = (share - SHALLOW_FROM) / (0.5 - SHALLOW_FROM)
    out[offset] = SHALLOW[0]
    out[offset + 1] = SHALLOW[1]
    out[offset + 2] = SHALLOW[2]
    out[offset + 3] = 105 * k * k * (3 - 2 * k)
    return
  }

  let t0 = terrainAt(map, ut, vt)
  if (t0 === Terrain.Water) t0 = nearestLand(map, ut, vt)
  landColor(t0, tex, u, v, seed, color)
  // soft transition to the neighbouring terrain
  const t1 = terrainAt(map, ut + 0.22, vt + 0.22)
  const t2 = terrainAt(map, ut - 0.22, vt - 0.22)
  let wSelf = 1
  let r = color[0]
  let g = color[1]
  let b = color[2]
  if (t1 !== Terrain.Water && t1 !== t0) {
    landColor(t1, tex, u, v, seed, color1)
    r += color1[0] * 0.8
    g += color1[1] * 0.8
    b += color1[2] * 0.8
    wSelf += 0.8
  }
  if (t2 !== Terrain.Water && t2 !== t0) {
    landColor(t2, tex, u, v, seed, color2)
    r += color2[0] * 0.8
    g += color2[1] * 0.8
    b += color2[2] * 0.8
    wSelf += 0.8
  }
  r /= wSelf
  g /= wSelf
  b /= wSelf

  if (share < FOAM_TO) {
    const foam = ((FOAM_TO - share) / (FOAM_TO - 0.5)) * 0.55
    r += (FOAM[0] - r) * foam
    g += (FOAM[1] - g) * foam
    b += (FOAM[2] - b) * foam
  }
  out[offset] = r
  out[offset + 1] = g
  out[offset + 2] = b
  out[offset + 3] = 255
}
