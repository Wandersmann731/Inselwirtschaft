#!/usr/bin/env node
// Turns the master PNGs in art/ into the WebP files the game loads (public/sprites) and the app icons (public/icons).
// The game itself draws everything by code now; this script only still makes the app icons and the preview picture.
//   node scripts/assets/optimize.mjs [--only bakery,house_citizens]
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { bakeBuilding, bakeSprite, lookOf } from './bake.mjs'
import { ROOT } from './manifest.mjs'

const SRC = path.join(ROOT, 'art')
const OUT = path.join(ROOT, 'public', 'sprites')
const ICONS = path.join(ROOT, 'public', 'icons')

// --only bakery,house_citizens: makes just the pictures whose name starts with one of these again, the rest stays
const onlyAt = process.argv.indexOf('--only')
const only = onlyAt >= 0 ? process.argv[onlyAt + 1].split(',') : null
const kept = (name) => (only && fs.existsSync(path.join(OUT, name)) ? JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')) : null)
if (!only) fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(ICONS, { recursive: true })

// everything the game shows is made by code (src/render: roadLayer.ts, built, grown, vessel, smokeFrames.ts, groundMade.ts, icons; the title in index.html): the old pictures in art/ are not shipped any more.
// What is left are the app icons a phone needs as files, and app/splash for the preview a link shows.
const BY_CODE = ['roads/', 'buildings/', 'quarters/', 'decor/', 'ships/', 'effects/', 'ground/', 'icons/', 'app/logo']
const files = fs.readdirSync(SRC, { recursive: true }).map(String).filter((f) => f.endsWith('.png') && !BY_CODE.some((dir) => f.split(path.sep).join('/').startsWith(dir))).sort()
const list = kept('index.json') ?? []
/** Border of a building picture beyond its footprint box, in pixels of the finished picture. */
const pads = kept('pads.json') ?? {}
/** Where the chimney of a shrunk building picture opens, as a share of the finished picture (see `smoke` in buildings.json). */
const smoke = kept('smoke.json') ?? {}
let before = 0
let after = 0
for (const file of files) {
  if (only && !only.some((name) => path.basename(file).startsWith(name))) continue
  const source = path.join(SRC, file)
  before += fs.statSync(source).size
  if (file.startsWith('app/icon-')) {
    fs.copyFileSync(source, path.join(ICONS, path.basename(file)))
    continue
  }
  // The fixed terrain tiles are no longer used: the game builds the ground from textures and scattered objects and
  // makes the sea itself (src/render/water.ts).
  if (file.startsWith('terrain/')) continue
  const target = path.join(OUT, file.replace(/\.png$/, '.webp'))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const [group, name] = [file.split('/')[0], path.basename(file, '.png')]
  let image = null
  if (group === 'buildings') {
    const baked = await bakeBuilding(name, (line) => console.log(line))
    if (!baked) continue
    image = baked.image
    if (baked.pads) pads[name] = baked.pads
    if (baked.smoke) smoke[name] = baked.smoke.map((share) => Math.round(share * 1000) / 1000)
  } else if (group === 'decor' || (group === 'ships' && name !== 'ship_top')) {
    image = (await bakeSprite(file, group === 'ships' ? 0.85 : undefined)) ?? (await lookOf(source))
  } else if (group === 'quarters' || group === 'roads') {
    image = await lookOf(source, { flat: true })
  } else if (group === 'ground') {
    image = await lookOf(source, { outlines: false, flat: true })
  }
  const picture = image ? sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), { raw: { width: image.width, height: image.height, channels: 4 } }) : sharp(source)
  await picture.webp({ quality: group === 'buildings' ? 84 : 88, alphaQuality: 100, effort: 5 }).toFile(target)
  after += fs.statSync(target).size
  if (!list.includes(file.replace(/\.png$/, '.webp'))) list.push(file.replace(/\.png$/, '.webp'))
  if (list.length % 50 === 0) console.log(`${list.length} ...`)
}
// the game loads no picture any more: its list stays empty (the splash is only the preview picture of a link)
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(list.filter((file) => !file.startsWith('app/')).sort()))
fs.writeFileSync(path.join(OUT, 'pads.json'), JSON.stringify(pads))
fs.writeFileSync(path.join(OUT, 'smoke.json'), JSON.stringify(smoke))
// favicon from the app icon
await sharp(path.join(SRC, 'app', 'icon-192.png')).resize(64, 64).png().toFile(path.join(ICONS, 'favicon.png'))
await sharp(path.join(SRC, 'app', 'icon-512.png')).resize(180, 180).png().toFile(path.join(ICONS, 'apple-touch-icon.png'))
console.log(`${list.length} Sprites, ${(before / 1e6).toFixed(1)} MB PNG -> ${(after / 1e6).toFixed(1)} MB WebP`)
