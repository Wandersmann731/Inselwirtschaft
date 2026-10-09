#!/usr/bin/env node
// Contact sheet of finished graphics for a quick visual check: node sheet.mjs <folder under public/art> [columns] [cell]
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ROOT } from './manifest.mjs'

const folder = process.argv[2] ?? 'buildings'
const columns = Number(process.argv[3] ?? 5)
const cell = Number(process.argv[4] ?? 220)
const dir = path.join(ROOT, 'art', folder)
const files = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.png')).sort()
const rows = Math.ceil(files.length / columns)
const layers = []
for (const [i, file] of files.entries()) {
  const x = (i % columns) * cell
  const y = Math.floor(i / columns) * (cell + 18)
  const image = await sharp(path.join(dir, String(file))).resize(cell - 8, cell - 8, { fit: 'inside' }).png().toBuffer()
  layers.push({ input: image, left: x + 4, top: y + 4 })
  const label = String(file).replace('.png', '').replace(/&/g, '&amp;')
  layers.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="18"><text x="4" y="13" font-size="12" font-family="sans-serif" fill="#fff">${label}</text></svg>`),
    left: x,
    top: y + cell - 2,
  })
}
const out = path.join(ROOT, 'art-raw', `sheet_${folder.replace(/\//g, '_')}.png`)
await sharp({ create: { width: columns * cell, height: rows * (cell + 18), channels: 3, background: { r: 70, g: 110, b: 60 } } })
  .composite(layers)
  .png()
  .toFile(out)
console.log(out)
