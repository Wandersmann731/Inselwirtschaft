// The four grounds of the map, worked out by code: meadow grass, the floor of a forest, beach sand and bare rock.
// Each is a square of colours that repeats without a seam. The ground painter (groundTextures.ts) mixes them along
// noise, so nobody ever sees the square; what matters is that each has the grain of the real thing: grass is made of
// blades, a forest floor of litter and shade, sand of ripples, rock of grit and cracks.
import { hash2 } from '../world/noise2d'

export const GROUND_SIZE = 256
export type GroundName = 'grass' | 'forest' | 'sand' | 'rock'

const smooth = (t: number): number => t * t * (3 - 2 * t)

/** Smooth noise from -0.5 to 0.5 that repeats over the square; a noise cell is `cx` by `cy` texels. */
function noise(x: number, y: number, cx: number, cy: number, seed: number): number {
  const px = GROUND_SIZE / cx
  const py = GROUND_SIZE / cy
  const fx = x / cx
  const fy = y / cy
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = smooth(fx - x0)
  const ty = smooth(fy - y0)
  const at = (ix: number, iy: number): number => hash2(((ix % px) + px) % px, ((iy % py) + py) % py, seed)
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty - 0.5
}

/** Noise of several sizes laid over each other: `amps` are how strong the cells of 2, 4, 8, 16, 32 and 64 texels are. */
function layered(x: number, y: number, seed: number, amps: number[]): number {
  let sum = 0
  for (let k = 0; k < amps.length; k++) if (amps[k] !== 0) sum += amps[k] * noise(x, y, 2 << k, 2 << k, seed + k)
  return sum
}

/** The colour of one texel of a ground, as red, green and blue from 0 to 255. Pure. */
export function groundTexel(name: GroundName, tx: number, ty: number): [number, number, number] {
  // the square repeats: a texel one square further on is the same texel
  const x = ((tx % GROUND_SIZE) + GROUND_SIZE) % GROUND_SIZE
  const y = ((ty % GROUND_SIZE) + GROUND_SIZE) % GROUND_SIZE
  const grit = hash2(x, y, 911) - 0.5
  if (name === 'grass') {
    // soft clumps of longer and shorter grass, single dark tufts in it, fine blades over all; dry and lush patches.
    // Dark grass is the greener, light grass the yellower: sun on dry tips, shade between the stalks.
    const blades = noise(x + y, y, 1, 4, 921) * 26 + grit * 16
    const clumps = layered(x, y, 931, [12, 26, 40, 34, 18, 6])
    const tuft = noise(x, y, 8, 6, 925) + noise(x, y, 4, 3, 926) * 0.6
    const dark = tuft > 0.14 ? (tuft - 0.14) * 170 : 0
    const dry = noise(x, y, 32, 32, 941) * 0.6 + noise(x, y, 8, 8, 942) * 0.5
    const light = blades + clumps - dark
    return [112 + light * 1.04 + dry * 22, 125 + light * 0.94 + dry * 6, 56 + light * 0.44 - dry * 8]
  }
  if (name === 'forest') {
    // dark earth and moss, with the litter of leaves and twigs lying on it
    const litter = layered(x, y, 951, [58, 54, 38, 20, 4, 1]) + grit * 50
    const leaf = noise(x, y, 4, 2, 961)
    const fallen = leaf > 0.24 ? (leaf - 0.24) * 300 : 0
    const moss = noise(x, y, 16, 16, 971) * 0.5
    return [54 + litter * 0.95 + fallen * 0.9 - moss * 16, 57 + litter * 1.0 + fallen * 0.6 + moss * 14, 42 + litter * 0.7 + fallen * 0.2 - moss * 8]
  }
  if (name === 'sand') {
    // ripples the wind and the water left, soft heaps and hollows, the sparkle of single grains, and here and there
    // a pebble, a shell or a bit of dark weed
    const warp = noise(x, y, 32, 32, 981) * 5 + noise(x, y, 8, 8, 982) * 1.6
    const ripple = Math.sin(((x * 5 + y * 26) / GROUND_SIZE) * Math.PI * 2 + warp)
    let light = ripple * 7 + grit * 13 + noise(x, y, 4, 4, 983) * 17 + noise(x, y, 16, 16, 985) * 16 + noise(x, y, 64, 64, 984) * 9
    const speck = noise(x, y, 2, 2, 986)
    if (speck > 0.33) light += (hash2(x >> 1, y >> 1, 987) > 0.62 ? 30 : -52) * Math.min(1, (speck - 0.33) * 14)
    return [245 + light * 0.8, 233 + light, 210 + light * 1.3]
  }
  // rock: grit of many sizes, darker in cracks, single lighter stones
  const grain = layered(x, y, 991, [30, 28, 22, 18, 9, 3]) + grit * 28
  const crack = Math.abs(noise(x, y, 16, 16, 995) + noise(x, y, 4, 4, 996) * 0.3) < 0.02 ? -22 : 0
  const stone = noise(x, y, 4, 4, 997) > 0.3 ? 16 : 0
  const light = grain + crack + stone
  return [118 + light * 1.02, 112 + light, 100 + light * 0.94]
}

/** One ground as pixel data, red, green, blue and full cover for every texel. */
export function groundPixels(name: GroundName): Uint8ClampedArray {
  const data = new Uint8ClampedArray(GROUND_SIZE * GROUND_SIZE * 4)
  for (let y = 0; y < GROUND_SIZE; y++) {
    for (let x = 0; x < GROUND_SIZE; x++) {
      const [r, g, b] = groundTexel(name, x, y)
      const o = (y * GROUND_SIZE + x) * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = 255
    }
  }
  return data
}
