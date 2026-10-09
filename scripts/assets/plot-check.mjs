// Finds plot sprites whose ground is not a flat diamond (drawn as a block with vertical sides, or sticking out of the canvas).
//   node scripts/assets/plot-check.mjs [--list]
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ROOT } from './manifest.mjs'

/** Above this share of empty diamond tips a plot counts as a block instead of a flat diamond. */
export const TIP_LIMIT = 0.25

/** Below this width a plot counts as a cut-off hexagon instead of a full diamond. */
export const MIN_WIDTH = 0.8

const BODY = [[150, 150, 150], [182, 182, 182], [226, 226, 226]]

/** Share (0..1) of the canvas that is opaque but lies outside the ground diamond and outside the building block. */
export async function strayShare(file, guideFile) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const guide = await sharp(guideFile).resize(w, h, { kernel: 'nearest' }).removeAlpha().raw().toBuffer()
  const top = h - w / 2
  const cx = w / 2
  const cy = top + w / 4
  const inDiamond = (x, y, grow) => Math.abs(x - cx) / (w / 2) + Math.abs(y - cy) / (w / 4) <= 1 + grow
  const body = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = guide[i * 3]
    const g = guide[i * 3 + 1]
    const b = guide[i * 3 + 2]
    if (BODY.some(([cr, cg, cb]) => Math.abs(r - cr) < 3 && Math.abs(g - cg) < 3 && Math.abs(b - cb) < 3)) body[i] = 1
  }
  // grow the building block by 26 px in all directions
  const near = (x, y) => {
    for (let dy = -26; dy <= 26; dy += 6) {
      for (let dx = -26; dx <= 26; dx += 6) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && body[ny * w + nx]) return true
      }
    }
    return false
  }
  let stray = 0
  let opaque = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 128) continue
      opaque++
      if (!inDiamond(x, y, 0.06) && !near(x, y)) stray++
    }
  }
  return { stray: stray / (w * h), opaque: opaque / (w * h) }
}

/**
 * Share (0..1) of the canvas that is opaque in the upper left and right corners beside the ground diamond. A flat diamond
 * leaves them empty; a ground drawn as a block with vertical sides (a "hexagon") fills them.
 */
export async function hexShare(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const cx = w / 2
  const cy = h - w / 2 + w / 4
  let wedge = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 128) continue
      const outside = Math.abs(x - cx) / (w / 2) + Math.abs(y - cy) / (w / 4) > 1.08
      if (outside && y < cy && Math.abs(x - cx) > w * 0.3) wedge++
    }
  }
  return wedge / (w * h)
}

/**
 * How much of the canvas width the ground reaches at the height of the diamond's side corners (0..1). A full diamond
 * reaches almost all of it; a ground drawn too small, with its corners cut off (a "hexagon"), reaches clearly less.
 */
export async function middleWidth(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const cy = Math.round(h - w / 4)
  let best = 0
  for (let y = cy - Math.round(w * 0.04); y <= cy + Math.round(w * 0.04); y++) {
    let left = -1
    let right = -1
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= 20) continue
      if (left < 0) left = x
      right = x
    }
    if (left >= 0) best = Math.max(best, (right - left) / w)
  }
  return best
}

if (process.argv[1]?.endsWith('plot-check.mjs')) {
  const plots = JSON.parse(fs.readFileSync(path.join(ROOT, 'art-raw', 'plot-ids.json'), 'utf8'))
  const rows = []
  for (const id of plots) {
    const base = id.replace(/_\d+$/, '')
    const file = path.join(ROOT, 'art', 'buildings', `${id}.png`)
    if (!fs.existsSync(file)) continue
    const { stray } = await strayShare(file, path.join(ROOT, 'docs', 'vorlagen', 'buildings', `${base}_guide.png`))
    rows.push([id, stray, await middleWidth(file)])
  }
  rows.sort((a, b) => b[1] - a[1])
  console.log(rows.filter((r) => r[1] > 0.02).length, 'of', rows.length, 'above 2 % stray ground')
  console.log(rows.slice(0, 15).map(([id, v]) => `${id} ${(v * 100).toFixed(1)}%`).join('\n'))
  rows.sort((a, b) => a[2] - b[2])
  const narrow = rows.filter((r) => r[2] < MIN_WIDTH)
  console.log(narrow.length, 'of', rows.length, `narrower than ${MIN_WIDTH * 100} % of the canvas (hexagon)`)
  console.log(rows.slice(0, 25).map(([id, , v]) => `${id} ${(v * 100).toFixed(0)}%`).join('\n'))
}
