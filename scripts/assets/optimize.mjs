#!/usr/bin/env node
// Turns the master PNGs in art/ into the small WebP files the game loads (public/sprites) and the app icons (public/icons).
//   node scripts/assets/optimize.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ROOT } from './manifest.mjs'

const SRC = path.join(ROOT, 'art')
const OUT = path.join(ROOT, 'public', 'sprites')
const ICONS = path.join(ROOT, 'public', 'icons')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(ICONS, { recursive: true })

const files = fs.readdirSync(SRC, { recursive: true }).map(String).filter((f) => f.endsWith('.png')).sort()
const list = []
let before = 0
let after = 0
for (const file of files) {
  const source = path.join(SRC, file)
  before += fs.statSync(source).size
  if (file.startsWith('app/icon-')) {
    fs.copyFileSync(source, path.join(ICONS, path.basename(file)))
    continue
  }
  // The old fixed terrain tiles are no longer used: the game builds the ground from textures and scattered objects.
  if (/^terrain\/(beach|grass|forest|mountain)_/.test(file)) continue
  const target = path.join(OUT, file.replace(/\.png$/, '.webp'))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await sharp(source).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(target)
  after += fs.statSync(target).size
  list.push(file.replace(/\.png$/, '.webp'))
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(list))
const padsFile = path.join(SRC, 'pads.json')
if (fs.existsSync(padsFile)) fs.copyFileSync(padsFile, path.join(OUT, 'pads.json'))
// favicon from the app icon
await sharp(path.join(SRC, 'app', 'icon-192.png')).resize(64, 64).png().toFile(path.join(ICONS, 'favicon.png'))
await sharp(path.join(SRC, 'app', 'icon-512.png')).resize(180, 180).png().toFile(path.join(ICONS, 'apple-touch-icon.png'))
console.log(`${list.length} Sprites, ${(before / 1e6).toFixed(1)} MB PNG -> ${(after / 1e6).toFixed(1)} MB WebP`)
