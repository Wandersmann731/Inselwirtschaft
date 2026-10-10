#!/usr/bin/env node
// Pictures for house quarters, made only from pictures that already exist (no image generation, no cost):
//   1. Every house without its own plot (art/buildings/house_<tier>_q_<n>.png). The house and a narrow strip
//      around it stay, the rest of the plot fades out, so the houses of a quarter stand on one shared yard.
//   2. The shared yards for blocks of 1x2 up to 3x3 houses (art/quarters/yard_<style>_<a>x<b>_<v>.png):
//      "village" from the ground textures with a trodden path around, "town" paved with the road stones.
//      Bushes, flowers, tufts and pebbles from art/decor sit in the gaps between the houses.
//   node scripts/assets/quarters.mjs            (then node scripts/assets/optimize.mjs)
//   node scripts/assets/quarters.mjs --preview  (also writes art-raw/quarter_preview.png)
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { tileableTexture } from './image-tools.mjs'
import { ROOT } from './manifest.mjs'

const TILE_W = 128 // tile size in the pictures (twice the game's 64 x 32)
const TILE_H = 64
const TIERS = ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats']
const BODY_COLORS = [[150, 150, 150], [182, 182, 182], [226, 226, 226]] // walls and roof of the guide block
const KEEP = 16 // picture pixels around the house that stay fully visible (porch, shadow, a bit of garden)
const FADE = 30 // then the plot fades out over this many pixels
export const BLOCK_SIZES = [[1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2], [3, 3]]
const STYLES = { village: 3, town: 2 } // pictures per size

const art = (...parts) => path.join(ROOT, 'art', ...parts)

/** Distance (in pixels, chamfer 3-4) from every pixel to the nearest pixel of the mask. */
function distanceTo(mask, width, height) {
  const far = 1e9
  const d = new Float64Array(width * height)
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : far
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? far : d[y * width + x])
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3
  return d
}

/** A house picture without its plot: the building stays, the ground around it fades out. */
async function cutHouse(file, guideFile, out) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const guide = await sharp(guideFile).resize(width, height, { kernel: 'nearest' }).removeAlpha().raw().toBuffer()
  const body = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = [guide[i * 3], guide[i * 3 + 1], guide[i * 3 + 2]]
    if (BODY_COLORS.some(([cr, cg, cb]) => Math.abs(r - cr) < 3 && Math.abs(g - cg) < 3 && Math.abs(b - cb) < 3)) body[i] = 1
  }
  const distance = distanceTo(body, width, height)
  for (let i = 0; i < width * height; i++) {
    const f = Math.max(0, Math.min(1, 1 - (distance[i] - KEEP) / FADE))
    data[i * 4 + 3] = Math.round(data[i * 4 + 3] * f * f * (3 - 2 * f))
  }
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(out)
}

/** Small deterministic random numbers, so the same size always gives the same picture. */
function random(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0
    return (s >>> 8) / 16777216
  }
}

function valueNoise(seed) {
  const cell = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = cell(x0, y0) * (1 - sx) + cell(x0 + 1, y0) * sx
    const bottom = cell(x0, y0 + 1) * (1 - sx) + cell(x0 + 1, y0 + 1) * sx
    return top * (1 - sy) + bottom * sy
  }
}

async function texture(name) {
  const { data, info } = await sharp(art('ground', `${name}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, size: info.width }
}

const sample = (tex, x, y) => {
  const s = tex.size
  const i = ((((Math.floor(y) % s) + s) % s) * s + (((Math.floor(x) % s) + s) % s)) * 3
  return [tex.data[i], tex.data[i + 1], tex.data[i + 2]]
}

/**
 * The yard of a block of a x b houses. It covers the houses and half a tile around them, which is half of the lane
 * to the next block: the paths of neighbouring blocks meet there.
 */
async function yard(style, a, b, variant, textures) {
  const W = 2 * a + 1
  const H = 2 * b + 1
  const width = (W + H) * (TILE_W / 2)
  const height = (W + H) * (TILE_H / 2)
  const rand = random(a * 1000 + b * 100 + variant * 7 + (style === 'town' ? 50000 : 0))
  const noise = valueNoise(a * 31 + b * 17 + variant)
  const data = Buffer.alloc(width * height * 4)

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // picture pixel -> tile coordinates inside the yard (0..W, 0..H)
      const sx = (px - H * (TILE_W / 2)) / (TILE_W / 2)
      const sy = py / (TILE_H / 2)
      const u = (sx + sy) / 2
      const v = (sy - sx) / 2
      if (u < 0 || v < 0 || u > W || v > H) continue
      const edge = Math.min(u, v, W - u, H - v) // tiles to the yard border
      const o = (py * width + px) * 4
      let rgb
      if (style === 'town') {
        // paved with the stones of the roads, laid along the tile axes, a bit lighter and greyer than a road
        const stone = sample(textures.paving, u * 260, v * 260)
        const grey = (stone[0] + stone[1] + stone[2]) / 3
        const light = (edge < 0.5 ? 0.92 : 1.08) * (0.94 + 0.12 * noise(u * 1.3, v * 1.3))
        rgb = stone.map((c) => (c * 0.7 + grey * 0.3) * light)
      } else {
        // village: grass between the houses, trodden earth around them and a path along the border
        const grass = sample(textures.grass, px * 0.9, py * 0.9)
        const earth = sample(textures.sand, px * 0.8 + 97, py * 0.8 + 31).map((c, k) => c * [0.78, 0.72, 0.66][k])
        const n = noise(u * 2.2, v * 2.2)
        const path = edge < 0.42 ? 1 : edge < 0.62 ? (0.62 - edge) / 0.2 : 0
        const trodden = Math.max(path, Math.max(0, 0.5 - n) * 0.9)
        rgb = grass.map((c, k) => c * (1 - trodden) + earth[k] * trodden)
      }
      // only the outer rim fades, so neighbouring yards meet in the lane without a hard line
      const alpha = Math.max(0, Math.min(1, edge / 0.22))
      data[o] = Math.min(255, rgb[0])
      data[o + 1] = Math.min(255, rgb[1])
      data[o + 2] = Math.min(255, rgb[2])
      data[o + 3] = Math.round(255 * alpha)
    }
  }

  // decor in the gaps between the houses and along the path, back to front
  const items = []
  const tileTop = (u, v) => [(u - v) * (TILE_W / 2) + H * (TILE_W / 2), (u + v) * (TILE_H / 2)]
  const put = (kind, count, u, v, scale) => items.push({ file: art('decor', `${kind}_${1 + Math.floor(rand() * count)}.png`), u, v, scale })
  const small = style === 'town' ? [['bush', 3], ['flowers', 2]] : [['flowers', 2], ['tuft', 3], ['pebbles', 2], ['bush', 3]]
  const pick = () => small[Math.floor(rand() * small.length)]
  // where four houses meet and where two houses meet on the border
  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      const inner = i > 0 && i < a && j > 0 && j < b
      if (!inner && rand() < 0.45) continue
      const [kind, count] = pick()
      put(kind, count, 0.5 + 2 * i, 0.5 + 2 * j, inner ? 0.75 : 0.55)
    }
  }
  // a few things along the path
  for (let k = 0; k < a + b; k++) {
    const side = rand() < 0.5
    const t = 0.8 + rand() * ((side ? W : H) - 1.6)
    const [kind, count] = style === 'town' ? ['flowers', 2] : rand() < 0.5 ? ['pebbles', 2] : ['tuft', 3]
    put(kind, count, side ? t : 0.25, side ? 0.25 : t, 0.45)
  }
  items.sort((p, q) => p.u + p.v - (q.u + q.v))
  const composites = []
  for (const item of items) {
    const meta = await sharp(item.file).metadata()
    const w = Math.max(1, Math.round(meta.width * item.scale))
    const h = Math.max(1, Math.round(meta.height * item.scale))
    const [cx, cy] = tileTop(item.u, item.v)
    const left = Math.round(cx - w / 2)
    const top = Math.round(cy - h * 0.85)
    if (left < 0 || top < 0 || left + w > width || top + h > height) continue
    composites.push({ input: await sharp(item.file).resize(w, h).png().toBuffer(), left, top })
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).composite(composites).png().toBuffer()
}

// The paving is the stone texture the roads were made from (art-raw/road_texture.webp), kept in art/ground.
const pavingFile = art('ground', 'paving.png')
if (!fs.existsSync(pavingFile)) {
  const { data, size } = await tileableTexture(path.join(ROOT, 'art-raw', 'road_texture.webp'), 512)
  await sharp(data, { raw: { width: size, height: size, channels: 3 } }).png().toFile(pavingFile)
}
const textures = { grass: await texture('grass'), sand: await texture('sand'), paving: await texture('paving') }

let cut = 0
for (const tier of [...TIERS, 'ruin']) {
  const guide = path.join(ROOT, 'docs', 'vorlagen', 'buildings', `house_${tier}_guide.png`)
  for (let n = 1; n <= 16; n++) {
    const file = art('buildings', `house_${tier}_${n}.png`)
    if (!fs.existsSync(file) || !fs.existsSync(guide)) continue
    await cutHouse(file, guide, art('buildings', `house_${tier}_q_${n}.png`))
    cut++
  }
}
console.log(`${cut} houses without plot`)

fs.mkdirSync(art('quarters'), { recursive: true })
let yards = 0
for (const [style, count] of Object.entries(STYLES)) {
  for (const [a, b] of BLOCK_SIZES) {
    for (let v = 1; v <= count; v++) {
      fs.writeFileSync(art('quarters', `yard_${style}_${a}x${b}_${v}.png`), await yard(style, a, b, v, textures))
      yards++
    }
  }
}
console.log(`${yards} yards`)

if (process.argv.includes('--preview')) {
  // a 3 x 2 village block and a 2 x 2 town block with houses on them, as the game draws them
  const out = []
  let offsetX = 0
  for (const [style, tier, a, b] of [['village', 'pioneers', 3, 2], ['town', 'citizens', 2, 2]]) {
    const W = 2 * a + 1
    const H = 2 * b + 1
    const yardFile = art('quarters', `yard_${style}_${a}x${b}_1.png`)
    const layers = [{ input: yardFile, left: offsetX, top: 120 }]
    const houses = []
    for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) houses.push([0.5 + 2 * i, 0.5 + 2 * j, 1 + ((5 * i * 2 + 7 * j * 2) % 16)])
    houses.sort((p, q) => p[0] + p[1] - (q[0] + q[1]))
    for (const [u, v, n] of houses) {
      const file = art('buildings', `house_${tier}_q_${n}.png`)
      const meta = await sharp(file).metadata()
      const x = (u - v) * 64 + H * 64 - 2 * 64 + offsetX
      const y = (u + v) * 32 + 120 - (meta.height - 4 * 32)
      layers.push({ input: file, left: Math.round(x), top: Math.round(y) })
    }
    out.push(...layers)
    offsetX += (W + H) * 64 + 40
  }
  await sharp({ create: { width: offsetX, height: 700, channels: 4, background: '#6f8f3a' } })
    .composite(out)
    .png()
    .toFile(path.join(ROOT, 'art-raw', 'quarter_preview.png'))
  console.log('preview in art-raw/quarter_preview.png')
}
