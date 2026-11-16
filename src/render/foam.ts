// The foam of the surf as repeating pictures, made once: the net of white lines a broken wave leaves on the water,
// and froth, the white of a wave that is breaking right now. Froth comes in three densities that are cut from one
// and the same noise, so the thin froth at the rim of a wave and the thick froth at its edge are one body.
import { tiling } from './water'

/** Pixels of a foam picture. How many world pixels it covers is up to the surf. */
export const LACE_RES = 384
const FOAM = [246, 251, 249]

/**
 * How much foam lies at a point of the repeating foam picture (u, v from 0 to 1), 0 to 1: a net of white lines with
 * clear water in its meshes, as foam spreads behind a broken wave. `dense` is fresh froth: small meshes, thick
 * lines, and most of them closed. Pure.
 */
export function laceAt(u: number, v: number, dense = false): number {
  // the lines of a net are where a noise passes its middle: `off` is the distance from such a line
  const off = (cells: number, seed: number): number =>
    Math.abs(2 * (0.65 * tiling(u * cells, v * cells * 2, cells, cells * 2, seed) + 0.35 * tiling(u * cells * 2, v * cells * 4, cells * 2, cells * 4, seed + 1)) - 1)
  const thick = tiling(u * 4, v * 8, 4, 8, dense ? 19 : 17)
  const line = (distance: number, width: number): number => {
    const t = Math.min(1, distance / width)
    return 1 - t * t * (3 - 2 * t)
  }
  // a wide-meshed net and a finer one that fills in. Where fresh froth is thickest its meshes close; the net that
  // drifts off behind a wave stays a net (a closed patch of it would show the straight edge of the band it fills)
  const grow = dense ? 2 : 1
  const lines = Math.max(line(off(6, 11), (0.1 + 0.2 * thick) * grow), 0.8 * line(off(13, 13), (0.08 + 0.16 * thick) * grow))
  const closed = dense ? Math.min(1, Math.max(0, (thick - 0.6) / 0.22)) * 0.9 : 0
  // froth is not even: a fine grain breaks it up
  const grain = 0.82 + 0.18 * tiling(u * 64, v * 64, 64, 64, 29)
  return Math.min(1, Math.max(lines, closed)) * grain
}

/** The share of the picture that froth of each density leaves clear, as the height of noise it begins at. */
const FROTH_FROM = [0.6, 0.5, 0.41]

/** The heap of bubbles all froth is cut from at a point of the repeating picture, and the fine grain of single bubbles there. */
function heapAt(u: number, v: number): [number, number] {
  const heap = 0.44 * tiling(u * 11, v * 22, 11, 22, 31) + 0.32 * tiling(u * 24, v * 48, 24, 48, 32) + 0.24 * tiling(u * 52, v * 104, 52, 104, 33)
  return [heap, tiling(u * 128, v * 192, 128, 192, 34)]
}

/** How much froth of a density that heap gives: the grain eats into the rim of every clump and lies as specks beside it. */
function frothOf(heap: number, bubbles: number, level: number): number {
  const over = heap + (bubbles - 0.5) * 0.16 - FROTH_FROM[level]
  const t = Math.min(1, Math.max(0, over / 0.07))
  return t * t * (3 - 2 * t) * (0.86 + 0.14 * bubbles)
}

/**
 * How much froth lies at a point of the repeating froth picture (u, v from 0 to 1), 0 to 1. `level` is its density:
 * 0 single flecks, 1 clumps with water between them, 2 nearly closed. All three are cut from the same heap of
 * bubbles, so where the thin froth lies the thick one lies too. The rims of the clumps are grainy. Pure.
 */
export function frothAt(u: number, v: number, level: number): number {
  const [heap, bubbles] = heapAt(u, v)
  return frothOf(heap, bubbles, level)
}

/** A foam picture as a repeating fill; `at` gives the cover of every point, for each picture asked for. */
function pictures(count: number, at: (u: number, v: number, out: number[]) => void, ctx: CanvasRenderingContext2D): CanvasPattern[] | null {
  const canvases = Array.from({ length: count }, () => document.createElement('canvas'))
  const contexts = canvases.map((canvas) => {
    canvas.width = LACE_RES
    canvas.height = LACE_RES
    return canvas.getContext('2d')
  })
  if (contexts.some((g) => !g)) return null
  const images = contexts.map((g) => g!.createImageData(LACE_RES, LACE_RES))
  const cover = Array.from({ length: count }, () => 0)
  for (let y = 0; y < LACE_RES; y++) {
    for (let x = 0; x < LACE_RES; x++) {
      const o = (y * LACE_RES + x) * 4
      at((x + 0.5) / LACE_RES, (y + 0.5) / LACE_RES, cover)
      for (let k = 0; k < count; k++) {
        const data = images[k].data
        data[o] = FOAM[0]
        data[o + 1] = FOAM[1]
        data[o + 2] = FOAM[2]
        data[o + 3] = 255 * cover[k]
      }
    }
  }
  const made = contexts.map((g, k) => {
    g!.putImageData(images[k], 0, 0)
    return ctx.createPattern(canvases[k], 'repeat')
  })
  return made.every((pattern) => pattern !== null) ? (made as CanvasPattern[]) : null
}

/** The net of foam as a repeating fill, made once by the surf (see surf.ts). */
export function makeLace(ctx: CanvasRenderingContext2D, dense = false): CanvasPattern | null {
  return pictures(1, (u, v, out) => (out[0] = laceAt(u, v, dense)), ctx)?.[0] ?? null
}

/** Froth of all three densities as repeating fills, thin to thick: the heap of bubbles is worked out once for all of them. */
export function makeFroth(ctx: CanvasRenderingContext2D): CanvasPattern[] | null {
  return pictures(3, (u, v, out) => {
    const [heap, bubbles] = heapAt(u, v)
    for (let level = 0; level < 3; level++) out[level] = frothOf(heap, bubbles, level)
  }, ctx)
}
