// The pictures of the game were painted in a comic style: a dark ink line runs around every shape, and the colours
// are bright. Here the ink lines become soft shading in the colour of the surface beside them, and the colours are
// toned down to those of a landscape in daylight, with a fine grain. Done once for every picture when it is loaded,
// so drawing the map costs nothing more. Pure: works on RGBA pixels in place, no canvas.

/** A pixel darker than this can be ink. */
const INK = 100
/** An ink line is at most this many pixels thick. Darker areas that are thicker (windows, doors, tar roofs) stay. */
const THIN = 4
/** A pixel next to the line counts as the surface when it is this much lighter than the line. */
const LIGHTER = 34
/** How far the surface is looked for (pixels). */
const REACH = 2
/** The line takes the colour of the surface, this much darker, and keeps this little of its own colour. */
const SHADE = 0.72
const KEEP = 0.06
/** Colours lose this share of their strength; strong colours (lime grass, red roofs) lose up to MORE on top. */
const FADE = 0.14
const MORE = 0.24
/** A little more depth between light and dark. */
const CONTRAST = 1.07
const GRAIN = 8

const luma = (r: number, g: number, b: number): number => 0.3 * r + 0.59 * g + 0.11 * b

/** Turns thin dark outlines into shading of the surface next to them. */
export function softenInk(data: Uint8ClampedArray, width: number, height: number): void {
  const source = data.slice()
  const light = new Float32Array(width * height)
  const dark = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    light[i] = luma(source[o], source[o + 1], source[o + 2])
    dark[i] = source[o + 3] > 40 && light[i] < INK ? 1 : 0
  }
  const run = (x: number, y: number, dx: number, dy: number): number => {
    let n = 1
    for (const dir of [1, -1]) {
      for (let d = 1; d <= THIN; d++) {
        const nx = x + dx * dir * d
        const ny = y + dy * dir * d
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || !dark[ny * width + nx]) break
        n++
      }
    }
    return n
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!dark[i]) continue
      // thick in both directions: a dark area, not a line
      if (run(x, y, 1, 0) > THIN && run(x, y, 0, 1) > THIN) continue
      let r = 0
      let g = 0
      let b = 0
      let weight = 0
      for (let ny = Math.max(0, y - REACH); ny <= Math.min(height - 1, y + REACH); ny++) {
        for (let nx = Math.max(0, x - REACH); nx <= Math.min(width - 1, x + REACH); nx++) {
          const n = ny * width + nx
          const o = n * 4
          if (dark[n] || source[o + 3] < 200 || light[n] < light[i] + LIGHTER) continue
          // the nearer, the more it counts
          const w = 1 / (Math.abs(nx - x) + Math.abs(ny - y))
          r += source[o] * w
          g += source[o + 1] * w
          b += source[o + 2] * w
          weight += w
        }
      }
      if (weight === 0) continue
      const o = i * 4
      data[o] = source[o] * KEEP + (r / weight) * SHADE * (1 - KEEP)
      data[o + 1] = source[o + 1] * KEEP + (g / weight) * SHADE * (1 - KEEP)
      data[o + 2] = source[o + 2] * KEEP + (b / weight) * SHADE * (1 - KEEP)
    }
  }
}

/** Tones the colours down, deepens light and dark a little and lays a fine grain over the picture. */
export function gradeNatural(data: Uint8ClampedArray, width: number, height: number, seed = 1): void {
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    if (data[o + 3] === 0) continue
    let r = data[o]
    let g = data[o + 1]
    let b = data[o + 2]
    const max = Math.max(r, g, b)
    const strength = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    const keep = 1 - FADE - MORE * strength
    const l = luma(r, g, b)
    // grain: the same for a pixel every time, different from its neighbours
    let h = (Math.imul(i, 374761393) + Math.imul(seed, 668265263)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    const grain = ((((h ^ (h >>> 16)) >>> 0) / 4294967295) - 0.5) * GRAIN
    r = l + (r - l) * keep
    g = l + (g - l) * keep
    b = l + (b - l) * keep
    data[o] = 128 + (r - 128) * CONTRAST + grain + 1.5
    data[o + 1] = 128 + (g - 128) * CONTRAST + grain
    data[o + 2] = 128 + (b - 128) * CONTRAST + grain - 2.5
  }
}

/** Both steps. `ink` is false for plain ground textures, which have no outlines to soften. */
export function naturalLook(data: Uint8ClampedArray, width: number, height: number, seed = 1, ink = true): void {
  if (ink) softenInk(data, width, height)
  gradeNatural(data, width, height, seed)
}
