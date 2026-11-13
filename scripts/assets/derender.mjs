// Takes the comic look out of a painted picture: the ink outlines are painted over with the surfaces beside them and
// come back as soft contact shading, flat colour fields get the fine unevenness of plaster, wood and stone, and the
// colours are graded like a photograph in daylight. Works on RGBA pixels in place, at the full size of the raw picture.

const luma = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b

/** Offsets of a round neighbourhood. */
function disc(radius) {
  const list = []
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius + 1) list.push([dx, dy])
  return list
}

/** Largest (or smallest) value in a round neighbourhood, over opaque pixels only. */
function round(values, solid, width, height, radius, max) {
  const out = new Float32Array(values.length)
  const around = disc(radius)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!solid[i]) continue
      let best = values[i]
      for (const [dx, dy] of around) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const n = ny * width + nx
        if (!solid[n]) continue
        const v = values[n]
        if (max ? v > best : v < best) best = v
      }
      out[i] = best
    }
  }
  return out
}

/** Box blur of a float field, three passes: close to a Gaussian of about the given radius. */
function blur(field, width, height, radius) {
  let source = field
  for (let round = 0; round < 3; round++) {
    const rows = new Float32Array(source.length)
    for (let y = 0; y < height; y++) {
      let sum = 0
      for (let x = -radius; x <= radius; x++) sum += source[y * width + Math.min(width - 1, Math.max(0, x))]
      for (let x = 0; x < width; x++) {
        rows[y * width + x] = sum / (2 * radius + 1)
        sum += source[y * width + Math.min(width - 1, x + radius + 1)] - source[y * width + Math.max(0, x - radius)]
      }
    }
    const cols = new Float32Array(source.length)
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let y = -radius; y <= radius; y++) sum += rows[Math.min(height - 1, Math.max(0, y)) * width + x]
      for (let y = 0; y < height; y++) {
        cols[y * width + x] = sum / (2 * radius + 1)
        sum += rows[Math.min(height - 1, y + radius + 1) * width + x] - rows[Math.max(0, y - radius) * width + x]
      }
    }
    source = cols
  }
  return source
}

function hash(i, seed) {
  let h = (Math.imul(i, 374761393) + Math.imul(seed, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Smooth noise from -1 to 1. */
function noise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const at = (ix, iy) => hash(ix * 7919 + iy * 104729, seed)
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
  return (top + (bottom - top) * sy) * 2 - 1
}

export const DEFAULTS = {
  /** Dark lines thinner than twice this are outlines (pixels of the raw picture). */
  ink: 4,
  /** A pixel belongs to a line when the surface beside it is this much lighter. */
  step: 24,
  /** Below this brightness a line is black ink, above `shade` it is only a darker joint of its surface. */
  black: 52,
  shade: 84,
  /** How much of an ink line is painted over: 1 removes it. */
  cover: 0.94,
  /** Joints between roof tiles, planks and stones are kept this much, so the surface keeps its build. */
  joint: 0.5,
  /** Soft shading where the ink lines were: strength and width. */
  crease: 0.2,
  creaseWidth: 4,
  /** Unevenness of the surfaces: broad, fine and grain. */
  mottle: 0.05,
  grit: 0.03,
  grain: 5,
  /** Colours lose this share of their strength, strong colours more. */
  fade: 0.2,
  more: 0.26,
  contrast: 1.08,
}

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * Paints over the ink outlines of RGBA pixels in place. `scale` is the size of the picture relative to a raw picture
 * of 1024 pixels, so the same line widths are found in smaller pictures. Returns how much each pixel was ink (0 to 1).
 */
export function deink(data, width, height, { scale = 1, ...custom } = {}) {
  const o = { ...DEFAULTS, ...custom }
  const count = width * height
  const solid = new Uint8Array(count)
  const light = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    solid[i] = data[i * 4 + 3] > 128 ? 1 : 0
    light[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }
  const radius = Math.max(1, Math.round(o.ink * scale))
  // the brightness without thin dark shapes
  const closed = round(round(light, solid, width, height, radius, true), solid, width, height, radius, false)
  // how much each pixel is a line (0 to 1) and how much of that is black ink
  const line = new Float32Array(count)
  const ink = new Float32Array(count)
  const weight = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    if (!solid[i]) continue
    line[i] = smooth((closed[i] - light[i] - o.step * 0.4) / o.step)
    ink[i] = line[i] * smooth((o.shade - light[i]) / (o.shade - o.black))
    weight[i] = 1 - line[i]
  }
  // what is left of the magenta background clings to the silhouette as a purple seam: it goes like ink
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!solid[i]) continue
      const p = i * 4
      if (data[p] - data[p + 1] < 24 || data[p + 2] - data[p + 1] < 24) continue
      let rim = false
      for (let d = 1; d <= radius && !rim; d++) {
        rim = x - d < 0 || x + d >= width || y - d < 0 || y + d >= height || !solid[i - d] || !solid[i + d] || !solid[i - d * width] || !solid[i + d * width]
      }
      if (rim) line[i] = ink[i] = 1
    }
  }
  // the colour of the surfaces beside a line: grown into the line from both sides, ring by ring, so two surfaces
  // meet in the middle of the line with a clean edge
  const fill = [0, 1, 2].map((c) => {
    const channel = new Float32Array(count)
    for (let i = 0; i < count; i++) channel[i] = data[i * 4 + c]
    return channel
  })
  const found = new Uint8Array(count)
  let open = []
  for (let i = 0; i < count; i++) {
    if (!solid[i]) continue
    if (line[i] < 0.35) found[i] = 1
    else open.push(i)
  }
  for (let ring = 0; ring < radius * 2 + 3 && open.length > 0; ring++) {
    const rest = []
    const done = []
    for (const i of open) {
      const x = i % width
      const y = (i - x) / width
      let sum = [0, 0, 0]
      let total = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = ny * width + nx
          if (!found[n]) continue
          const w = dx === 0 || dy === 0 ? 1 : 0.7
          for (let c = 0; c < 3; c++) sum[c] += fill[c][n] * w
          total += w
        }
      }
      if (total === 0) rest.push(i)
      else done.push([i, sum[0] / total, sum[1] / total, sum[2] / total])
    }
    for (const [i, r, g, b] of done) {
      fill[0][i] = r
      fill[1][i] = g
      fill[2][i] = b
      found[i] = 1
    }
    open = rest
  }
  for (let i = 0; i < count; i++) {
    if (!solid[i] || line[i] === 0 || !found[i]) continue
    const p = i * 4
    const amount = ink[i] * o.cover + (line[i] - ink[i]) * (1 - o.joint)
    for (let c = 0; c < 3; c++) data[p + c] = Math.round(data[p + c] + (fill[c][i] - data[p + c]) * amount)
  }
  // soft shading where the lines were, as in the creases of a real object
  const crease = blur(ink, width, height, Math.max(1, Math.round(o.creaseWidth * scale)))
  for (let i = 0; i < count; i++) {
    if (!solid[i] || crease[i] < 0.01) continue
    const shade = 1 - o.crease * Math.min(1, crease[i] * 1.6)
    for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(data[i * 4 + c] * shade)
  }
  return ink
}

/**
 * Grades RGBA pixels in place like a photograph in daylight: uneven surfaces, calmer colours, a little more depth
 * and a fine grain. `scale` as in deink.
 */
export function grade(data, width, height, { seed = 1, scale = 1, ...custom } = {}) {
  const o = { ...DEFAULTS, ...custom }
  const count = width * height
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
  for (let i = 0; i < count; i++) {
    const p = i * 4
    if (data[p + 3] === 0) continue
    const x = i % width
    const y = (i - x) / width
    const u = x / scale
    const v = y / scale
    const uneven = 1 + o.mottle * noise(u / 46, v / 30, seed) + o.grit * noise(u / 5, v / 3.4, seed + 3)
    let r = data[p] * uneven
    let g = data[p + 1] * uneven
    let b = data[p + 2] * uneven
    const max = Math.max(r, g, b)
    const strength = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    const keep = 1 - o.fade - o.more * strength
    const l = luma(r, g, b)
    r = l + (r - l) * keep
    g = l + (g - l) * keep
    b = l + (b - l) * keep
    // light parts turn a little warm, dark parts a little cool, as in daylight
    const t = l / 255
    const grain = (hash(i, seed + 11) - 0.5) * o.grain
    data[p] = clamp(128 + (r - 128) * o.contrast + grain + 5 * t - 2 * (1 - t))
    data[p + 1] = clamp(128 + (g - 128) * o.contrast + grain + 1 * t)
    data[p + 2] = clamp(128 + (b - 128) * o.contrast + grain - 5 * t + 4 * (1 - t))
  }
}

/** Both steps: outlines out, then graded. */
export function derender(data, width, height, options = {}) {
  deink(data, width, height, options)
  grade(data, width, height, options)
}
