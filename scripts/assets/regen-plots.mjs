#!/usr/bin/env node
// Makes plot sprites again until their ground is a full diamond (see plot-check.mjs), keeping the best try.
//   node regen-plots.mjs id,id,... [--tries 4] [--min 0.76]
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { middleWidth } from './plot-check.mjs'
import { ROOT } from './manifest.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const ids = args[0].split(',').filter(Boolean)
const tries = Number(option('tries', '4'))
const min = Number(option('min', '0.76'))

for (const id of ids) {
  const png = path.join(ROOT, 'art', 'buildings', `${id}.png`)
  const raw = path.join(ROOT, 'art-raw', `${id}.webp`)
  const keep = path.join(ROOT, 'art-raw', `${id}.best.webp`)
  let best = -1
  for (let attempt = 1; attempt <= tries; attempt++) {
    const result = spawnSync('node', [path.join(here, 'generate.mjs'), '--only', id, '--force', '--parallel', '1'], { encoding: 'utf8' })
    if (!fs.existsSync(png) || result.status !== 0) {
      console.log(`${id} try ${attempt}: failed`)
      continue
    }
    const width = await middleWidth(png)
    console.log(`${id} try ${attempt}: ground ${(width * 100).toFixed(0)} %`)
    if (width > best) {
      best = width
      fs.copyFileSync(raw, keep)
    }
    if (width >= min) break
  }
  if (fs.existsSync(keep)) {
    fs.copyFileSync(keep, raw)
    fs.unlinkSync(keep)
    const result = spawnSync('node', [path.join(here, 'generate.mjs'), '--only', id, '--reprocess'], { encoding: 'utf8' })
    if (result.status !== 0) console.log(`${id}: reprocess failed`)
  }
  console.log(`${id}: kept ${(best * 100).toFixed(0)} %`)
}
process.exit(0)
