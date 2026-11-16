// Everything that grows wild or lies about on the islands is painted here, by code, the first time it is needed, and
// kept: trees, firs, palms, bushes, rocks, pebbles, tufts of grass, flowers, and the peaks of the mountains. A
// picture is asked for by its kind and variant, as the picture files were ("tree", 3), and has four picture pixels
// to the world pixel like them, so everything else draws it as before.
import { bush, tree } from './canopy'
import { palm, pine } from './conifer'
import { flowers, tuft } from './herbs'
import { hash2 } from '../../world/noise2d'
import type { Ctx } from './paint'
import { peak, PEAK_RES, pebbles, rock } from './stones'

/** Picture pixels per world pixel. */
export const RES = 4

/** What is painted here, with the size of its picture in world pixels and how many variants there are. */
export const GROWN: Record<string, { w: number; h: number; variants: number; res?: number; paint: (g: Ctx, w: number, h: number, variant: number) => void }> = {
  tree: { w: 92, h: 110, variants: 4, paint: tree },
  pine: { w: 48, h: 88, variants: 3, paint: pine },
  palm: { w: 64, h: 88, variants: 2, paint: palm },
  bush: { w: 48, h: 36, variants: 3, paint: bush },
  rock: { w: 48, h: 36, variants: 3, paint: rock },
  tuft: { w: 24, h: 20, variants: 3, paint: tuft },
  flowers: { w: 32, h: 24, variants: 2, paint: flowers },
  pebbles: { w: 32, h: 20, variants: 2, paint: pebbles },
  peak_small: { w: 96, h: 80, variants: 3, res: PEAK_RES, paint: (g, w, h, v) => peak(g, w, h, 0, false, v) },
  peak_medium: { w: 144, h: 120, variants: 3, res: PEAK_RES, paint: (g, w, h, v) => peak(g, w, h, 1, false, v) },
  peak_large: { w: 208, h: 176, variants: 3, res: PEAK_RES, paint: (g, w, h, v) => peak(g, w, h, 2, false, v) },
  peak_snow: { w: 208, h: 192, variants: 2, res: PEAK_RES, paint: (g, w, h, v) => peak(g, w, h, 2, true, v) },
}

/**
 * The last pass over a picture: every picture pixel a shade lighter or darker than its neighbour, and the lights and
 * darks drawn a little apart. Paint is flat; a leaf, a needle, a stone in the open never is.
 */
function grain(g: Ctx, width: number, height: number, seed: number): void {
  const image = g.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    if (data[o + 3] === 0) continue
    const [x, y] = [i % width, Math.floor(i / width)]
    const fleck = 0.92 + 0.16 * hash2(x, y, seed) + 0.06 * (hash2(x >> 1, y >> 1, seed + 1) - 0.5)
    for (let c = 0; c < 3; c++) {
      // a gentle curve that deepens the shade and lifts the light
      const v = data[o + c] / 255
      data[o + c] = 255 * (v + 0.1 * (v - 0.5) * (1 - Math.abs(2 * v - 1))) * fleck
    }
  }
  g.putImageData(image, 0, 0)
}

const cache = new Map<string, HTMLCanvasElement | null>()

/** World pixels per picture pixel of the pictures of a kind (a quarter for most, more for the peaks). Pure. */
export function grownScale(kind: string): number {
  return 1 / (GROWN[kind]?.res ?? RES)
}

/** The pictures that are kept right now, by their names. */
export function grownKept(): string[] {
  return [...cache.keys()]
}

/** Lets go of pictures: they are painted again when they are next asked for. */
export function forgetGrown(ids: string[]): void {
  for (const id of ids) cache.delete(id)
}

/** The picture of something that grows or lies about, or null if its kind is not painted here (or there is no canvas). */
export function grown(kind: string, variant: number): HTMLCanvasElement | null {
  const id = `${kind}_${variant}`
  const hit = cache.get(id)
  if (hit !== undefined) return hit
  const spec = GROWN[kind]
  if (!spec || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const res = spec.res ?? RES
  canvas.width = spec.w * res
  canvas.height = spec.h * res
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(res, res)
    spec.paint(g, spec.w, spec.h, ((variant - 1) % spec.variants) + 1)
    grain(g, canvas.width, canvas.height, kind.length * 31 + variant)
  }
  cache.set(id, g ? canvas : null)
  return g ? canvas : null
}
