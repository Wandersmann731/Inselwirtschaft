// Cutting house pictures out of the raw pictures of the image model: to the plot that was really painted, and with
// everything that stands on it, also where the house is wider or taller than the grey block of the guide.
import sharp from 'sharp'

const BODY_COLORS = [[150, 150, 150], [182, 182, 182], [226, 226, 226]] // wall, wall, roof of the guide block

/** Pixels of the guide block in a guide picture (RGB, already scaled to the picture). */
export function guideBody(guide, width, height) {
  const body = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = guide[i * 3]
    const g = guide[i * 3 + 1]
    const b = guide[i * 3 + 2]
    if (BODY_COLORS.some(([cr, cg, cb]) => Math.abs(r - cr) < 3 && Math.abs(g - cg) < 3 && Math.abs(b - cb) < 3)) body[i] = 1
  }
  return body
}

/**
 * Removing the background also takes pinkish specks out of walls and leaves pinholes, through which the meadow
 * would show. A transparent pixel with paint close by on all four sides is such a hole: it gets the colour around it.
 */
function fillPinholes(data, W, H, reach = 4) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 200
  const fills = []
  for (let y = reach; y < H - reach; y++) {
    for (let x = reach; x < W - reach; x++) {
      if (data[(y * W + x) * 4 + 3] >= 128) continue
      const around = []
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let d = 1; d <= reach; d++) {
          if (!solid(x + dx * d, y + dy * d)) continue
          around.push(((y + dy * d) * W + x + dx * d) * 4)
          break
        }
      }
      if (around.length < 4) continue
      fills.push([(y * W + x) * 4, [0, 1, 2].map((k) => Math.round(around.reduce((sum, o) => sum + data[o + k], 0) / 4))])
    }
  }
  for (const [o, colour] of fills) data.set([...colour, 255], o)
}

/**
 * Cuts a house picture to its own painted plot instead of to the guide. The model rarely paints the plot exactly as
 * large as the guide: a larger one used to be cropped at the picture border, a smaller one had to be enlarged by the
 * game. Here the corners of the painted ground slab are measured, its earth side is cut away, and the picture is
 * scaled so that the top of the slab fills the footprint diamond: left corner at the left border, right corner at
 * the right border, both on the row of the footprint's side corners. `image` is the square picture with a
 * transparent background.
 * `floor` (share of the picture height) is for the rare picture where the model left the grey guide plot standing
 * below its own plot: everything from that row down is ignored.
 * Returns the finished PNG in width x height, or null if no plot can be measured.
 */
export async function cropToPlot(image, width, height, floor = 1) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  // a left-over of the guide below the painted plot is dropped first
  for (let i = Math.round(floor * H) * W; i < W * H; i++) data[i * 4 + 3] = 0
  fillPinholes(data, W, H)
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128
  const rowCount = (y) => {
    let n = 0
    for (let x = 0; x < W; x++) if (solid(x, y)) n++
    return n
  }
  let bottom = H - 1
  while (bottom > 0 && rowCount(bottom) < 3) bottom--
  if (bottom < H * 0.4) return null
  // side corners of the slab: the widest reach of the lower part (trees and roofs higher up do not count)
  const sides = (fromRow) => {
    let left = W
    let right = -1
    for (let y = fromRow; y <= bottom; y++) {
      for (let x = 0; x < W; x++) {
        if (!solid(x, y)) continue
        if (x < left) left = x
        if (x > right) right = x
      }
    }
    return [left, right]
  }
  let [left, right] = sides(0)
  ;[left, right] = sides(Math.round(bottom - (right - left) * 0.3))
  const span = right - left + 1
  if (span < W * 0.45) return null
  // At a side corner the slab is as high as its earth side; a little further in, the top surface adds one pixel per
  // pixel. So the height of the painted run there gives the thickness, and its upper end the corner of the top.
  const measure = (step) => {
    const tips = []
    const thick = []
    for (let d = 3; d <= 9; d++) {
      const x = step > 0 ? left + d : right - d
      let low = bottom
      while (low > 0 && !solid(x, low)) low--
      let high = low
      while (high > 0 && solid(x, high - 1)) high--
      tips.push(high + d / 2)
      thick.push(low - high + 1 - d)
    }
    const median = (list) => list.sort((p, q) => p - q)[Math.floor(list.length / 2)]
    return { tip: median(tips), thick: Math.max(0, median(thick)) }
  }
  const l = measure(1)
  const r = measure(-1)
  // something standing on a corner (a tree, a lamp) makes it look higher and thicker: trust the plainer side
  const thick = Math.min(l.thick, r.thick)
  const tipL = Math.abs(l.tip - r.tip) > span * 0.04 ? Math.max(l.tip, r.tip) : l.tip
  const tipR = Math.abs(l.tip - r.tip) > span * 0.04 ? Math.max(l.tip, r.tip) : r.tip
  const middle = (left + right) / 2
  let front = bottom - thick
  const ratio = (front - (tipL + tipR) / 2) / (span / 2)
  if (ratio < 0.4 || ratio > 0.62) front = (tipL + tipR) / 2 + span / 4
  // the earth side goes: everything below the lower edges of the top surface, with the dark line along them
  const TRIM = 4
  for (let x = 0; x < W; x++) {
    const limit = (x < middle ? tipL + ((front - tipL) * (x - left)) / (middle - left) : tipR + ((front - tipR) * (right - x)) / (right - middle)) - TRIM
    for (let y = Math.max(0, Math.ceil(limit)); y < H; y++) data[(y * W + x) * 4 + 3] = 0
  }
  // The region of the picture that becomes width x height. The outermost pixels of the side corners are left out:
  // there the outline of the slab runs around the corner.
  const INSET = 10
  const regionLeft = left + INSET
  const regionWidth = span - 2 * INSET
  const scale = width / regionWidth
  const regionHeight = Math.round(height / scale)
  // The side corners of the painted plot go onto the side corners of the footprint. A plot painted steeper than the
  // tiles then reaches a little below the footprint in front; that tip is cut off with the earth side.
  const regionTop = Math.round((tipL + tipR) / 2 - (height - width / 4) / scale)
  const region = Buffer.alloc(regionWidth * regionHeight * 4)
  for (let y = 0; y < regionHeight; y++) {
    const sy = regionTop + y
    if (sy < 0 || sy >= H) continue
    data.copy(region, y * regionWidth * 4, (sy * W + regionLeft) * 4, (sy * W + regionLeft + regionWidth) * 4)
  }
  const buffer = await sharp(region, { raw: { width: regionWidth, height: regionHeight, channels: 4 } }).resize(width, height, { fit: 'fill' }).png().toBuffer()
  // where the corners of the painted plot lie in the finished picture
  const toY = (row) => (row - regionTop) * scale
  return { buffer, scale, ratio, thick, plot: { tipL: toY(tipL), tipR: toY(tipR), front: toY(front) } }
}

/** Ground that the model painted a little beyond the back edges of the diamond is at most this high (picture pixels). */
const OVERHANG = 14
/** Paint must go on this far above the ground strip to count as something standing (see standingMask). */
const REACH = 6
/** A rim counts as straight when it keeps the tile direction over this many columns (see standingMask). */
const RIM_RUN = 8
/** Columns between two standing parts that are closer than this belong to the building too. */
const COLUMN_GAP = 4

/** The colour of a plot: the middle value of the band along the inside of the footprint's edge. RGBA in, [r, g, b] out. */
export function plotColour(data, width, height) {
  const cx = width / 2
  const cy = height - width / 4
  const band = [[], [], []]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = (1 - Math.abs(x + 0.5 - cx) / (width / 2) - Math.abs(y + 0.5 - cy) / (width / 4)) * (width / 4)
      const o = (y * width + x) * 4
      if (inside < 3 || inside > 14 || data[o + 3] < 200) continue
      for (let k = 0; k < 3; k++) band[k].push(data[o + k])
    }
  }
  return band.map((list) => list.sort((p, q) => p - q)[Math.floor(list.length / 2)] ?? 0)
}

/** True for a colour close to the plot's own, or plainly the green of a lawn. */
export function nearPlot(plot) {
  return (r, g, b) => greenShare(r, g, b) > 0.5 || Math.abs(r - plot[0]) + Math.abs(g - plot[1]) + Math.abs(b - plot[2]) < 60
}

/** How much a colour is the green of grass and leaves: 0 for walls, paving and earth, 1 for a lawn. */
export function greenShare(r, g, b) {
  const unit = (v) => Math.max(0, Math.min(1, v))
  return unit((g - r + 12) / 24) * unit((g - b - 20) / 30)
}

/**
 * What stands up in a house picture, found in the picture itself: the model often paints a house wider or taller
 * than the guide block (wings, towers, wide roofs). Everything painted above the back edges of the ground diamond
 * stands up, except a low strip of ground right on the edge (`overhangAt(x)` says how high ground may reach there).
 * With `feet`, the building also goes on below those edges, down to its foot: in every column the first ground
 * (`feet.groundLike`) ends it, but it reaches at least to the line of the guide block's front walls and at most to
 * the row of its front corner, both plus `feet.margin`. `data` is RGBA, `body` the guide block.
 */
export function standingMask(data, body, width, height, { overhangAt = () => OVERHANG, feet = null } = {}) {
  const standing = new Uint8Array(width * height)
  const top = height - width / 2
  const cx = width / 2
  const alpha = (x, y) => data[(y * width + x) * 4 + 3]
  const edges = new Int32Array(width)
  const zones = new Int32Array(width)
  const tall = new Uint8Array(width)
  // per column: does something come down into the strip above the edge, and where does the paint in the strip begin
  const reaches = new Uint8Array(width)
  const tops = new Float64Array(width).fill(NaN)
  for (let x = 0; x < width; x++) {
    const edge = Math.min(height, Math.floor(top + Math.abs(x + 0.5 - cx) * 0.5))
    edges[x] = edge
    zones[x] = Math.max(0, Math.floor(edge - overhangAt(x)))
    // paint that goes on for a while above the strip comes from something standing; a few pixels more are only
    // the rim of the ground, which then lies a little higher than expected
    let above = 0
    while (zones[x] - 1 - above >= 0 && alpha(x, zones[x] - 1 - above) > 100) above++
    reaches[x] = above >= REACH ? 1 : 0
    if (reaches[x]) continue
    zones[x] -= above
    while (zones[x] > 0 && alpha(x, zones[x] - 1) > 0) zones[x]--
    let y = zones[x]
    while (y < edge && alpha(x, y) <= 100) y++
    if (y < edge) tops[x] = y
  }
  // The rim of the painted plot runs dead straight along the tile direction; the side of a tree's crown, which
  // also ends inside the strip, does not. Only a straight rim is ground.
  const straight = (x) => {
    const rise = x < cx ? -0.5 : 0.5
    for (const dir of [1, -1]) {
      const far = x + dir * RIM_RUN
      const near = x + (dir * RIM_RUN) / 2
      if (far < 0 || far >= width || (x < cx) !== (far < cx)) continue
      if (Math.abs(tops[far] - tops[x] - rise * dir * RIM_RUN) <= 1.5 && Math.abs(tops[near] - tops[x] - (rise * dir * RIM_RUN) / 2) <= 1.5) return true
    }
    return false
  }
  // The strip right above the edge is ground, unless something comes down into it from above (a wall, a trunk)
  // or ends in it without being a rim (a crown, a bush).
  const ground = new Uint8Array(width)
  for (let x = 0; x < width; x++) ground[x] = !reaches[x] && (Number.isNaN(tops[x]) || straight(x)) ? 1 : 0
  // a single column left between ground on both sides is a crumb of the rim, not a crown
  const near = (x, dir) => [1, 2, 3].some((d) => ground[x + dir * d] === 1)
  for (let x = 0; x < width; x++) if (!ground[x] && !reaches[x] && near(x, 1) && near(x, -1)) ground[x] = 2
  for (let x = 0; x < width; x++) {
    // (two rows more than the edge: so the soft rim of the ground does not draw a line across a wall)
    const limit = ground[x] ? zones[x] : Math.min(height, edges[x] + 2)
    for (let y = 0; y < limit; y++) {
      if (alpha(x, y) === 0) continue
      standing[y * width + x] = 1
      if (y < zones[x] && alpha(x, y) > 100) tall[x] = 1
    }
  }
  if (!feet) return standing
  // close small gaps between standing columns
  for (let x = 0; x < width; x++) {
    if (tall[x]) continue
    let left = 0
    let right = 0
    for (let d = 1; d <= COLUMN_GAP; d++) {
      if (x - d >= 0 && tall[x - d] === 1) left = 1
      if (x + d < width && tall[x + d] === 1) right = 1
    }
    if (left && right) tall[x] = 2
  }
  // front corner of the guide block: its lowest pixels
  let frontY = -1
  let frontX = cx
  for (let y = height - 1; y >= 0 && frontY < 0; y--) {
    let sum = 0
    let count = 0
    for (let x = 0; x < width; x++) {
      if (body[y * width + x]) {
        sum += x
        count++
      }
    }
    if (count > 0) {
      frontY = y
      frontX = sum / count
    }
  }
  if (frontY < 0) return standing
  for (let x = 0; x < width; x++) {
    if (!tall[x]) continue
    const least = Math.round(frontY - Math.abs(x - frontX) * 0.5 + feet.margin)
    const most = Math.min(height - 1, frontY + feet.margin)
    let foot = edges[x]
    let ground = 0
    for (let y = edges[x]; y <= most; y++) {
      const o = (y * width + x) * 4
      ground = data[o + 3] <= 100 || feet.groundLike(data[o], data[o + 1], data[o + 2]) ? ground + 1 : 0
      if (ground >= 3) break
      if (ground === 0) foot = y
    }
    foot = Math.min(most, Math.max(least, foot))
    for (let y = edges[x]; y <= foot; y++) standing[y * width + x] = 1
  }
  return standing
}
