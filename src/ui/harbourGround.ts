// The ground of the island behind the start menu, worked out for every picture point instead of drawn as rings:
// how far a place lies from the waterline decides what it is - deep water, the green shallows over the sand, the
// surf, wet sand, dry sand, dune grass, meadow - and noise of several sizes moves every one of these borders, so
// the coast has bays and spits and no line in it is smooth. Sand and grass are the game's own grounds.
import { GROUND_SIZE, groundPixels } from '../render/groundMade'
import { fbm, valueNoise } from '../world/noise2d'

type Ctx = CanvasRenderingContext2D

/** The middle of the island, in tiles. */
const MID: [number, number] = [5.7, 5.4]
/** How far the shore lies from the middle on average, in tiles. */
const REACH = 9
/** How far out the sea is still lighter over the sand, in tiles. */
const SHALLOWS = 3.4

/** The streets of the town, as lines from tile to tile: trodden earth between the houses. */
const STREETS: [number, number, number, number][] = [[4.4, 2.7, 11.8, 2.7], [4.4, 5.2, 11.8, 5.2], [4.4, 7.85, 11.8, 7.85], [4.5, -0.4, 4.5, 10.6], [0.2, 5.65, 4.5, 5.65], [0.2, 8, 4.5, 8], [11.8, 2.7, 11.8, 7.85], [4.5, 10.6, 3.6, 12.4]]

/**
 * How far a place (in tiles) lies inland from the waterline: positive on land, negative in the sea, about in tiles.
 * The island is a round with three headlands, and its shore wanders. Pure.
 */
export function landAt(u: number, v: number): number {
  const [du, dv] = [u - MID[0], v - MID[1]]
  const turn = Math.atan2(dv, du)
  const far = REACH * (1 + 0.1 * Math.sin(turn * 3 + 1) + 0.06 * Math.sin(turn * 5 + 2) + 0.04 * Math.sin(turn * 9))
  return far + (fbm(u * 0.42 + 40, v * 0.42 + 40, 7, 3) - 0.5) * 1.5 + (valueNoise(u * 1.9 + 9, v * 1.9 + 9, 8) - 0.5) * 0.34 - Math.hypot(du, dv)
}

/** How near a place is to a street: 1 on it, 0 a third of a tile away. Pure. */
export function streetAt(u: number, v: number): number {
  let near = 9
  for (const [u0, v0, u1, v1] of STREETS) {
    const [du, dv] = [u1 - u0, v1 - v0]
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / (du * du + dv * dv)))
    near = Math.min(near, Math.hypot(u - u0 - du * t, v - v0 - dv * t))
  }
  return Math.max(0, Math.min(1, (0.34 - near) / 0.16))
}

const step = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/**
 * Paints shallows, shore and ground into `g`. `origin` is where the tile (0, 0) lies in the canvas and `s` the size
 * of a world pixel there. It is worked out for every second canvas pixel and laid on softly: ground has no edges.
 */
export function paintGround(g: Ctx, origin: [number, number], s: number): void {
  const COARSE = 2
  const reach = (REACH * 1.2 + 1.2 + SHALLOWS) * 1.42
  const [left, top] = [Math.floor(origin[0] + (MID[0] - MID[1] - reach) * 32 * s), Math.floor(origin[1] + (MID[0] + MID[1] - reach) * 16 * s)]
  const [w, h] = [Math.ceil((reach * 64 * s) / COARSE), Math.ceil((reach * 32 * s) / COARSE)]
  const layer = document.createElement('canvas')
  layer.width = w
  layer.height = h
  const paint = layer.getContext('2d')
  if (!paint) return
  const image = paint.createImageData(w, h)
  const data = image.data
  const grass = groundPixels('grass')
  const sand = groundPixels('sand')
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      // from the canvas back to the tiles
      const wx = (left + (i + 0.5) * COARSE - origin[0]) / s
      const wy = (top + (j + 0.5) * COARSE - origin[1]) / s
      const [u, v] = [(wx / 32 + wy / 16) / 2, (wy / 16 - wx / 32) / 2]
      if (Math.hypot(u - MID[0], v - MID[1]) > REACH * 1.2 + 1 + SHALLOWS) continue
      const land = landAt(u, v)
      if (land < -SHALLOWS) continue
      const o = (j * w + i) * 4
      const texel = ((((Math.round(wy * 2) % GROUND_SIZE) + GROUND_SIZE) % GROUND_SIZE) * GROUND_SIZE + (((Math.round(wx * 2) % GROUND_SIZE) + GROUND_SIZE) % GROUND_SIZE)) * 4
      const fine = valueNoise(u * 7, v * 7, 31)
      let [r, gg, b, a] = [0, 0, 0, 255]
      if (land < 0) {
        // the sea over the sand: clear and green at the shore, the blue of the deep further out, where it lets the open sea through
        const deep = -land
        const k = step(deep / 1.5)
        r = 168 - 112 * k + fine * 10
        gg = 226 - 62 * k + fine * 8
        b = 208 - 28 * k
        a = 235 * (1 - step((deep - 0.25) / (SHALLOWS - 0.25))) ** 1.3
        // the sand shows through close to the shore
        const sandy = 1 - step(deep / 0.5)
        r += (214 - r) * sandy * 0.5
        gg += (200 - gg) * sandy * 0.3
        b += (150 - b) * sandy * 0.3
        // surf: the line where the waves break, the lace they leave behind, and two swells that follow further out
        const wander = (valueNoise(u * 1.3, v * 1.3, 21) - 0.5) * 0.3
        const torn = valueNoise(u * 4.4, v * 4.4, 22)
        const lace = valueNoise(u * 11, v * 11, 23)
        let foam = step(1 - Math.abs(deep - 0.16 - wander) / 0.13) * step((torn - 0.2) / 0.25)
        foam = Math.max(foam, step(1 - deep / 0.42) * step((lace - 0.45) / 0.2) * 0.75)
        foam = Math.max(foam, step(1 - Math.abs(deep - 0.95 - wander * 2.4) / 0.09) * step((torn - 0.42) / 0.2) * 0.62)
        foam = Math.max(foam, step(1 - Math.abs(deep - 1.9 - wander * 3) / 0.07) * step((torn - 0.5) / 0.2) * 0.34)
        r += (250 - r) * foam
        gg += (253 - gg) * foam
        b += (250 - b) * foam
        a = Math.max(a, 255 * foam)
      } else {
        // sand: wet and dark where the last wave ran up, dry and light above
        const wet = 1 - step((land - 0.04) / 0.34)
        const shade = 0.83 + 0.06 * fine + 0.06 * valueNoise(u * 0.9, v * 0.9, 33)
        r = sand[texel] * shade * (1 - 0.24 * wet)
        gg = sand[texel + 1] * shade * 0.95 * (1 - 0.25 * wet)
        b = sand[texel + 2] * shade * 0.8 * (1 - 0.3 * wet)
        // grass begins behind the beach: first in tufts, then closed; lush here and dry there
        const border = 1.05 + (fbm(u * 0.8 + 3, v * 0.8 + 3, 34, 3) - 0.5) * 1.3
        const cover = step((land - border) / 0.5 + (valueNoise(u * 9, v * 9, 35) - 0.5) * 1.6)
        const lush = fbm(u * 0.5 + 7, v * 0.5 + 7, 36, 3)
        const dark = 0.7 + 0.2 * lush
        const [gr, ggr, gb] = [grass[texel] * dark * (1.04 - 0.1 * lush), grass[texel + 1] * dark, grass[texel + 2] * dark * 0.78]
        r += (gr - r) * cover
        gg += (ggr - gg) * cover
        b += (gb - b) * cover
        // streets: earth, lighter in the wheel tracks, with a ragged edge
        const street = streetAt(u, v) * step(land / 0.6) * (0.75 + 0.5 * valueNoise(u * 6, v * 6, 37))
        const earth = 0.9 + 0.2 * fine
        r += (176 * earth - r) * Math.min(1, street) * 0.88
        gg += (146 * earth - gg) * Math.min(1, street) * 0.88
        b += (100 * earth - b) * Math.min(1, street) * 0.88
      }
      data[o] = r
      data[o + 1] = gg
      data[o + 2] = b
      data[o + 3] = a
    }
  }
  paint.putImageData(image, 0, 0)
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(layer, left, top, w * COARSE, h * COARSE)
}
