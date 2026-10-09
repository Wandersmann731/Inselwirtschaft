#!/usr/bin/env node
// Makes the game graphics with the ImageGen MCP server and turns them into game-ready PNGs in public/art.
//
//   node generate.mjs [--group "Gelände,Straßen"] [--only id,id] [--force] [--reprocess]
//                     [--parallel 4] [--provider mai-image-2.6-flash] [--dry]
//
// Raw results are kept in art-raw/ (not in git), so --reprocess can redo the cut-out without new API calls.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fitInto, maskPolygon, padToSquare, removeBackground, roadTile, smokeFrame, SIZE, tileableTexture, waterFrame } from './image-tools.mjs'
import { startServer } from './mcp-client.mjs'
import { loadJobs, ROOT } from './manifest.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const RAW = path.join(ROOT, 'art-raw')
const OUT = path.join(ROOT, 'public', 'art')
const provider = option('provider', 'mai-image-2.6-flash')
const parallel = Number(option('parallel', '4'))
const groups = option('group', '')?.split(',').filter(Boolean)
const only = option('only', '')?.split(',').filter(Boolean)

let jobs = loadJobs()
if (groups?.length) jobs = jobs.filter((job) => groups.includes(job.group))
if (only?.length) jobs = jobs.filter((job) => only.includes(job.id))
console.log(`${jobs.length} Aufträge, Modell ${provider}, ${parallel} parallel`)
if (flag('dry')) {
  for (const job of jobs) console.log(`${job.id} [${job.kind}] ${job.width}x${job.height}\n  ${job.prompt.slice(0, 160)}`)
  process.exit(0)
}

fs.mkdirSync(path.join(RAW, 'inputs'), { recursive: true })
fs.mkdirSync(path.join(RAW, 'server'), { recursive: true })

// slightly inside the tile so no edge pixels of the background show
const textures = {}
const DIAMOND = [[64, 1], [127, 32], [64, 63], [1, 32]]

/** Produces the raw picture for a job (one API call). Returns the path of the raw file. */
async function makeRaw(job, server) {
  const rawFile = path.join(RAW, `${job.id}.webp`)
  if (fs.existsSync(rawFile) && !flag('force')) return rawFile
  let result
  if (job.guide) {
    const { buffer } = await padToSquare(path.join(ROOT, job.guide))
    const input = path.join(RAW, 'inputs', `${job.id}.png`)
    fs.writeFileSync(input, buffer)
    result = await server.edit({ prompt: job.prompt, inputImage: input, aspectRatio: job.aspectRatio, saveMode: 'persistent' })
  } else {
    result = await server.generate({ prompt: job.prompt, aspectRatio: job.aspectRatio, saveMode: 'persistent' })
  }
  fs.copyFileSync(result.absolutePath, rawFile)
  return rawFile
}

/** Cuts the raw picture out and saves the finished PNG. Returns a note about the result. */
async function finish(job, rawFile) {
  const target = path.join(OUT, job.file)
  if (job.kind !== 'texture' && job.kind !== 'puff') fs.mkdirSync(path.dirname(target), { recursive: true })
  const load = async () => sharp(rawFile).resize(SIZE, SIZE, { fit: 'fill' }).png().toBuffer()

  if (job.kind === 'texture') return 'Rohbild gespeichert'

  if (job.kind === 'puff') {
    const cut = await removeBackground(await sharp(rawFile).png().toBuffer())
    fs.writeFileSync(path.join(RAW, `${job.id}.png`), await fitInto(cut, 128, 128, { margin: 0.05 }))
    return 'Wolke gespeichert'
  }

  if (job.kind === 'water') {
    textures.water ??= await tileableTexture(path.join(RAW, 'water_texture.webp'))
    fs.writeFileSync(target, await waterFrame(textures.water, job.frame, job.frames))
    return 'ok'
  }

  if (job.kind === 'smoke') {
    const puffs = [1, 2, 3].map((n) => path.join(RAW, `smoke_puff_${n}.png`))
    for (const puff of puffs) await waitFor(puff)
    fs.writeFileSync(target, await smokeFrame(puffs, job.frame, job.frames))
    return 'ok'
  }

  if (job.kind === 'road') {
    const buffer = await roadTile(path.join(RAW, `${job.derivedFrom}.webp`), job.id.replace('road_', ''))
    fs.writeFileSync(target, buffer)
    return 'ok'
  }

  if (job.kind === 'building' || job.kind === 'tile') {
    const { box } = await padToSquare(path.join(ROOT, job.guide))
    let image = sharp(await load())
    if (job.kind === 'building') image = await removeBackground(await image.png().toBuffer())
    let buffer = await image.extract(box).resize(job.width, job.height).png().toBuffer()
    if (job.kind === 'tile') buffer = await maskPolygon(buffer, job.width, job.height, DIAMOND)
    fs.writeFileSync(target, buffer)
    const { channels } = await sharp(buffer).stats()
    return `deckt ${Math.round((channels[3].mean / 255) * 100)} %`
  }

  if (job.kind === 'icon' || job.kind === 'sprite') {
    const cut = await removeBackground(await sharp(rawFile).png().toBuffer())
    fs.writeFileSync(target, await fitInto(cut, job.width, job.height, { margin: job.kind === 'icon' ? 0.08 : 0.04 }))
    return 'ok'
  }

  if (job.kind === 'app') {
    if (job.id === 'logo') {
      const cut = await removeBackground(await sharp(rawFile).png().toBuffer())
      fs.writeFileSync(target, await fitInto(cut, job.width, job.height, { margin: 0.03 }))
    } else if (job.id === 'splash') {
      fs.writeFileSync(target, await sharp(rawFile).resize(job.width, job.height, { fit: 'cover' }).png().toBuffer())
    } else if (job.id === 'icon_maskable_512') {
      // Maskable icons need the picture inside the central 80 percent, with plain colour around it.
      const inner = Math.round(job.width * 0.8)
      const picture = await sharp(path.join(RAW, `${job.derivedFrom}.webp`)).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
      const offset = Math.round((job.width - inner) / 2)
      const frame = await sharp({ create: { width: job.width, height: job.height, channels: 3, background: { r: 64, g: 150, b: 214 } } })
        .composite([{ input: picture, left: offset, top: offset }])
        .png()
        .toBuffer()
      fs.writeFileSync(target, frame)
    } else {
      const source = job.derivedFrom ? path.join(RAW, `${job.derivedFrom}.webp`) : rawFile
      fs.writeFileSync(target, await sharp(source).resize(job.width, job.height, { fit: 'cover' }).png().toBuffer())
    }
    return 'ok'
  }
  throw new Error(`unknown kind ${job.kind}`)
}

/** Waits until a file exists, for jobs that are made from another job's picture. */
async function waitFor(file, seconds = 600) {
  for (let i = 0; i < seconds && !fs.existsSync(file); i++) await new Promise((resolve) => setTimeout(resolve, 1000))
  if (!fs.existsSync(file)) throw new Error(`missing ${path.basename(file)}`)
}

const queue = [...jobs]
let done = 0
const failures = []

async function worker(number) {
  const server = flag('reprocess') ? null : startServer({ workspace: ROOT, provider, outputDir: 'art-raw/server' })
  if (server) await server.init()
  while (queue.length > 0) {
    const job = queue.shift()
    const started = Date.now()
    let note = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (job.derivedFrom) await waitFor(path.join(RAW, `${job.derivedFrom}.webp`))
        const rawFile = job.derivedFrom || flag('reprocess') ? path.join(RAW, `${job.derivedFrom ?? job.id}.webp`) : await makeRaw(job, server)
        note = await finish(job, rawFile)
        break
      } catch (error) {
        note = `Fehler: ${String(error.message).slice(0, 160)}`
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 4000 * attempt))
        else failures.push(job.id)
      }
    }
    done++
    console.log(`[${done}/${jobs.length}] #${number} ${job.id} ${Math.round((Date.now() - started) / 1000)}s ${note}`)
  }
  server?.close()
}

await Promise.all(Array.from({ length: Math.min(parallel, jobs.length || 1) }, (_, i) => worker(i + 1)))
console.log(failures.length ? `Fehlgeschlagen: ${failures.join(', ')}` : 'Alles fertig')
