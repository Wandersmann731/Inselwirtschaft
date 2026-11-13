// Rock painted from heights: a mountain or a boulder is given as its height over every place on the ground. The
// heights are worked out once per world pixel; then every column of the picture is walked from the viewer into the
// rock, and each picture pixel gets the colour of what it shows there, as light as the rock is turned to the sun.
// So there are no faces and no edges but those the rock itself has.
import { fbm, hash2 } from '../../world/noise2d'
import { mix, type Ctx, type Rgb } from './paint'

/** Where the light comes from, for faces in space (x right, y towards the viewer, z up): the top left. */
const SUN: [number, number, number] = [-0.7, 0.1, 0.7]

/** How light a face is whose normal is (nx, ny, nz): 0.4 in full shade, a little over 1 turned to the sun. Pure. */
export function faceLight(nx: number, ny: number, nz: number): number {
  const d = Math.hypot(nx, ny, nz) || 1
  return 0.4 + 0.72 * Math.max(0, (nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / d) + 0.08 * Math.max(0, nz / d)
}

/** The colour of bare rock in a given light: warm where the sun is on it, blue-grey in the shade. */
export function rockColour(base: Rgb, light: number): Rgb {
  const lit = mix(base, [255, 240, 214], Math.max(0, light - 0.8) * 0.5, Math.min(1.2, light + 0.12))
  return light < 0.62 ? mix(lit, [70, 78, 104], (0.62 - light) * 1.1) : lit
}

export interface Relief {
  /** How far from its middle the rock reaches at most, in world pixels. */
  reach: number
  /** Its height over a place on the ground (x right, y towards the viewer), 0 where there is none. */
  heightOf: (x: number, y: number) => number
  seed: number
  base: Rgb
  /** Snow lies above this height (world pixels), or nowhere. */
  snow: number | null
  /** Grass and moss hold on below about this height where it is not too steep (0: bare rock). */
  green: number
  /** How strongly bands of lighter and darker rock show (0 to 1). */
  bands: number
  /** Picture pixels per world pixel it is painted with (4 if not said). */
  fine?: number
}

/** Picture pixels per world pixel, unless the rock says otherwise. */
const FINEST = 4

/** Paints a rock around the point (cx, baseY) of a picture `w` by `h` world pixels. */
export function relief(g: Ctx, w: number, h: number, cx: number, baseY: number, rock: Relief): void {
  const { seed, base, snow } = rock
  const FINE = rock.fine ?? FINEST
  const reach = Math.ceil(rock.reach)
  const size = reach * 2 + 1
  const heights = new Float32Array(size * size)
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) heights[j * size + i] = Math.max(0, rock.heightOf(i - reach, j - reach))
  // the height between the places it was worked out for
  const heightAt = (x: number, y: number): number => {
    const fx = Math.max(0, Math.min(size - 1.001, x + reach))
    const fy = Math.max(0, Math.min(size - 1.001, y + reach))
    const [i, j] = [Math.floor(fx), Math.floor(fy)]
    const [tx, ty] = [fx - i, fy - j]
    const n = j * size + i
    return (heights[n] * (1 - tx) + heights[n + 1] * tx) * (1 - ty) + (heights[n + size] * (1 - tx) + heights[n + size + 1] * tx) * ty
  }
  const canvas = document.createElement('canvas')
  canvas.width = w * FINE
  canvas.height = h * FINE
  const paint = canvas.getContext('2d')
  if (!paint) return
  const image = paint.createImageData(canvas.width, canvas.height)
  const data = image.data
  const colour: Rgb = [0, 0, 0]
  for (let col = 0; col < canvas.width; col++) {
    const x = col / FINE - cx
    if (Math.abs(x) > reach) continue
    // the lowest row of the picture that is still free in this column: what lies nearer hides what lies behind it
    let free = canvas.height
    for (let y = reach; y >= -reach; y -= 0.5) {
      const high = heightAt(x, y)
      if (high <= 0.05) continue
      const row = Math.round((baseY + y * 0.5 - high) * FINE)
      // rock does not reach below its own foot: under the nearest of it lies the ground, not the mountain
      free = Math.min(free, Math.round((baseY + y * 0.5) * FINE) + 1)
      if (row >= free) continue
      // which way the rock faces here
      const nx = -(heightAt(x + 0.75, y) - heightAt(x - 0.75, y)) / 1.5
      const ny = -(heightAt(x, y + 0.75) - heightAt(x, y - 0.75)) / 1.5
      const level = 1 / Math.hypot(nx, ny, 1)
      const light = faceLight(nx, ny, 1)
      // bands of lighter and darker rock, as the mountain was laid down, bent a little
      const band = 1 - rock.bands * 0.1 + rock.bands * 0.2 * hash2(Math.floor((high + 4 * fbm(x * 0.06, y * 0.06, seed + 9, 2)) / 6), 9, seed)
      const stone = mix(base, [150, 132, 112], fbm(x * 0.05 + 3, y * 0.05 + 3, seed + 6, 2) * 0.6, band)
      const lit = rockColour(stone, light)
      if (snow !== null && high > snow + (fbm(x * 0.07, y * 0.07, seed + 7, 2) - 0.5) * 34 && level > 0.34) {
        const white: Rgb = light < 0.62 ? [170, 186, 214] : mix([226, 234, 244], [255, 255, 252], (light - 0.62) * 1.6)
        colour[0] = white[0]
        colour[1] = white[1]
        colour[2] = white[2]
      } else {
        // grass and moss hold on where it is low and not too steep
        const green = rock.green <= 0 ? 0 : high < rock.green * (0.5 + fbm(x * 0.09, y * 0.09, seed + 8, 2) * 1.1) && level > 0.42 ? 0.62 : level > 0.8 && high < rock.green * 2.5 ? 0.2 : 0
        colour[0] = lit[0] + (98 * Math.min(1.1, light + 0.2) - lit[0]) * green
        colour[1] = lit[1] + (116 * Math.min(1.1, light + 0.2) - lit[1]) * green
        colour[2] = lit[2] + (64 * Math.min(1.1, light + 0.2) - lit[2]) * green
      }
      for (let r = Math.max(0, row); r < free; r++) {
        // the grain of the rock: every picture pixel a shade of its own
        const grain = 0.9 + 0.2 * hash2(col, r, seed + 31) + (hash2(col >> 1, r >> 2, seed + 32) - 0.5) * 0.12
        const o = (r * canvas.width + col) * 4
        data[o] = colour[0] * grain
        data[o + 1] = colour[1] * grain
        data[o + 2] = colour[2] * grain
        data[o + 3] = 255
      }
      free = Math.max(0, row)
    }
  }
  paint.putImageData(image, 0, 0)
  g.drawImage(canvas, 0, 0, w, h)
}
