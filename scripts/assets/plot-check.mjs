// Finds plot sprites whose ground is not a flat diamond (drawn as a block with vertical sides, or sticking out of the canvas).
//   node scripts/assets/plot-check.mjs [--list]
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ROOT } from './manifest.mjs'

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

if (process.argv[1].endsWith('plot-check.mjs')) {
  const plots = JSON.parse(fs.readFileSync(path.join(ROOT, 'art-raw', 'plot-ids.json'), 'utf8'))
  const rows = []
  for (const id of plots) {
    const base = id.replace(/_\d+$/, '')
    const file = path.join(ROOT, 'art', 'buildings', `${id}.png`)
    if (!fs.existsSync(file)) continue
    const { stray } = await strayShare(file, path.join(ROOT, 'docs', 'vorlagen', 'buildings', `${base}_guide.png`))
    rows.push([id, stray])
  }
  rows.sort((a, b) => b[1] - a[1])
  console.log(rows.filter((r) => r[1] > 0.02).length, 'of', rows.length, 'above 2 %')
  console.log(rows.slice(0, 40).map(([id, v]) => `${id} ${(v * 100).toFixed(1)}%`).join('\n'))
}
