// Ground for a building that was painted without a plot and is drawn smaller than its footprint (see
// picture-scale.json): a yard of packed earth in the footprint diamond, uneven, with pebbles, and with a rim that
// runs out raggedly into the colour of its surroundings.

function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Smooth noise from 0 to 1. */
function noise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = hash(x0, y0, seed) + (hash(x0 + 1, y0, seed) - hash(x0, y0, seed)) * sx
  const bottom = hash(x0, y0 + 1, seed) + (hash(x0 + 1, y0 + 1, seed) - hash(x0, y0 + 1, seed)) * sx
  return top + (bottom - top) * sy
}

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** How far the rim runs out (in tiles) and how far the fringe colour reaches in. */
const RIM = 0.1
const FRINGE = 0.42

/**
 * Lays the yard under what is painted, in place. `geometry` is the footprint (w, h in tiles) and the border of the
 * picture beyond it, `ground` the colour of the yard and of its fringe. The picture has 64 pixels per half tile.
 */
export function layGround(image, geometry, ground, seed = 1) {
  const { data, width, height } = image
  const { w, h, pads } = geometry
  const topX = pads.l + h * 64
  const topY = height - pads.b - (w + h) * 32
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = (x + 0.5 - topX) / 64
      const b = (y + 0.5 - topY) / 32
      const u = (a + b) / 2
      const v = (b - a) / 2
      // distance to the edge of the footprint in tiles, made ragged
      const edge = Math.min(u, w - u, v, h - v) + (noise(x / 14, y / 7, seed) - 0.5) * 0.12
      if (edge <= 0) continue
      const o = (y * width + x) * 4
      const paint = data[o + 3] / 255
      if (paint >= 1) continue
      const cover = smooth(edge / RIM)
      const inner = smooth((edge - 0.04) / FRINGE)
      // broad patches, finer flecks, and here and there a pebble
      let shade = 0.9 + 0.16 * noise(x / 24, y / 12, seed + 1) + 0.08 * noise(x / 6, y / 3.2, seed + 2)
      const pebble = hash(x >> 1, y >> 1, seed + 3)
      if (pebble > 0.985) shade *= 1.16
      else if (pebble < 0.012) shade *= 0.86
      const alpha = paint + cover * (1 - paint)
      for (let c = 0; c < 3; c++) {
        const colour = Math.min(255, (ground.fringe[c] + (ground.colour[c] - ground.fringe[c]) * inner) * shade)
        data[o + c] = Math.round((data[o + c] * paint + colour * cover * (1 - paint)) / Math.max(alpha, 1e-6))
      }
      data[o + 3] = Math.round(255 * alpha)
    }
  }
}
