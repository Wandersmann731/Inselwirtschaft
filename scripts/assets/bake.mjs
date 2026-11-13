// Makes the building pictures the game loads: twice as sharp as the masters in art/, without the comic outlines, at
// one common scale and with a clean ground plot. Everything the game used to do to a picture when it was loaded is
// done here once, so the game only has to draw.
//
// A master in art/buildings is 256 pixels wide for a house; the raw picture it was cut from has more than three
// times as many pixels. The cut-out, the plot repair and the ground are worked out on the master as before. Then the
// same part of the raw picture is taken at twice the size, its outlines are painted over (derender.mjs), and
// everything the work on the master changed (cut edges, faded rims, added ground) is laid over it.
import './ts-loader.mjs'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { compose } from './compose.mjs'
import { deink, grade } from './derender.mjs'
import { layGround } from './ground-fill.mjs'
import { fillPinholes } from './house-cut.mjs'
import { fitInto, removeBackground, shrinkMatte, SIZE } from './image-tools.mjs'
import { loadJobs, ROOT } from './manifest.mjs'

const { cleanPlotPixels, measurePlot } = await import('../../src/render/plotCleanup.ts')
const { isCutOff } = await import('../../src/render/cutCheck.ts')
const { growPlot, planFit } = await import('../../src/render/plotFit.ts')
const { clearPaintedWater } = await import('../../src/render/waterPlot.ts')

/** The game pictures have this many pixels per pixel of a master in art/. */
export const RES = 2
const ART = path.join(ROOT, 'art', 'buildings')
const RAW = path.join(ROOT, 'art-raw')
const buildings = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'buildings.json'), 'utf8'))
const scales = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'picture-scale.json'), 'utf8'))
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {})
const padData = readJson(path.join(ROOT, 'art', 'pads.json'))
const geometry = readJson(path.join(ROOT, 'art', 'geometry.json'))

const blank = (width, height) => ({ data: new Uint8ClampedArray(width * height * 4), width, height })

async function read(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height }
}

async function resize(image, width, height) {
  if (width === image.width && height === image.height) return { ...image, data: image.data.slice() }
  const data = await sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), { raw: { width: image.width, height: image.height, channels: 4 } })
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer()
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width, height }
}

/** Copies a picture onto an empty canvas with its top left corner at (dx, dy). What falls outside is dropped. */
function place(image, width, height, dx, dy) {
  const out = blank(width, height)
  for (let y = Math.max(0, -dy); y < image.height && y + dy < height; y++) {
    const from = Math.max(0, -dx)
    const to = Math.min(image.width, width - dx)
    if (to <= from) continue
    out.data.set(image.data.subarray((y * image.width + from) * 4, (y * image.width + to) * 4), ((y + dy) * width + from + dx) * 4)
  }
  return out
}

/** The raw picture of a building without its background, 1024 pixels square. Null if it is not on this computer. */
async function rawCut(name) {
  const file = path.join(RAW, `${name}.webp`)
  if (!fs.existsSync(file) || !geometry[name]) return null
  const cut = await removeBackground(await sharp(file).resize(SIZE, SIZE, { fit: 'fill' }).png().toBuffer())
  const { data } = await cut.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  fillPinholes(data, SIZE, SIZE)
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: SIZE, height: SIZE }
}

/** How much smaller than painted a picture is drawn, from the height of its door (see picture-scale.json). */
export function pictureScale(name) {
  const door = scales.doors[name.replace('_q_', '_')]
  return door ? Math.min(1, Math.max(scales.min, scales.door / door)) : 1
}

/**
 * Scales a picture and lays it into a canvas: `plan` holds the factor, where the top left corner of the scaled
 * picture goes and the height of the canvas, all in pixels of the master. `res` is 2 for the sharp picture.
 */
async function fit(image, plan, width, res) {
  const scaled = await resize(image, Math.round(image.width * plan.scale), Math.round(image.height * plan.scale))
  return place(scaled, width * res, plan.height * res, Math.round(plan.dx) * res, Math.round(plan.dy ?? 0) * res)
}

/** A plan that shrinks a picture towards the point (cx, cy), the middle of its footprint, and drops the empty rows on top. */
function shrinkPlan(height, scale, cx, cy) {
  const drop = Math.floor(cy * (1 - scale))
  return { scale, dx: cx * (1 - scale), dy: cy * (1 - scale) - drop, height: height - drop }
}

/**
 * Bakes one building picture (the name of a master in art/buildings, without ".png"). Returns the finished picture
 * with its border beyond the footprint and, if it was shrunk, the place of its chimney, or null if the game does not
 * get this picture.
 */
export async function bakeBuilding(name, log = () => {}) {
  const source = name.replace('_q_', '_')
  if (scales.leaveOut.includes(source)) return null
  const base = name.replace(/(_q)?(_\d+)?$/, '')
  const tier = base.startsWith('house_') ? base.slice('house_'.length) : null
  const def = tier ? buildings.find((entry) => entry.houseTier === tier) ?? buildings.find((entry) => entry.houseTier) : buildings.find((entry) => entry.id === base)
  let after = await read(path.join(ART, `${name}.png`))
  const master = { width: after.width, height: after.height }
  const raw = await rawCut(source)
  let before
  let sharpPicture
  if (raw) {
    const region = geometry[source]
    const cut = (image) => place(image, region.width, region.height, -region.left, -region.top)
    before = await resize(cut(raw), after.width, after.height)
    deink(raw.data, raw.width, raw.height)
    sharpPicture = await resize(cut(raw), after.width * RES, after.height * RES)
  } else {
    // without the raw picture the master itself is enlarged: no sharper, but in the same look
    log(`${name}: kein Rohbild in art-raw/, der Master wird nur vergrößert`)
    before = { ...after, data: after.data.slice() }
    sharpPicture = await resize(after, after.width * RES, after.height * RES)
    deink(sharpPicture.data, sharpPicture.width, sharpPicture.height, { scale: (after.width * RES) / 900 })
  }
  if (!def) return { image: compose(sharpPicture, before, after, RES), pads: null }

  if (tier && isCutOff(after.data, after.width, after.height)) {
    log(`${name}: abgeschnitten, bleibt draußen`)
    return null
  }
  const pads = padData[name] ?? null
  const [w, h] = def.size
  const shrink = pictureScale(name)
  const block = /_q(_\d+)?$/.test(name)
  let plan = null
  let grown = null
  if (w === h && !pads && !block) {
    // a painted plot is fitted to the footprint; one that stays smaller gets ground around it (see plotFit.ts)
    const measured = measurePlot(after.data, after.width, after.height)
    if (measured) {
      plan = planFit(measured, after.width, shrink)
      grown = plan.plot
    }
  } else if (shrink < 1) {
    const box = pads ?? { l: 0, r: 0, t: 0, b: 0 }
    plan = block ? shrinkPlan(after.height, shrink, after.width / 2, after.height - after.width / 4) : shrinkPlan(after.height, shrink, box.l + (w + h) * 32, after.height - box.b - (w + h) * 16)
  }
  if (plan) {
    after = await fit(after, plan, master.width, 1)
    before = await fit(before, plan, master.width, 1)
    sharpPicture = await fit(sharpPicture, plan, master.width, RES)
    const seed = name.length * 31 + name.charCodeAt(name.length - 1)
    if (grown) growPlot(after.data, after.width, after.height, grown, seed)
    else if (!block && scales.ground[base]) layGround(after, { w, h, pads: pads ?? { l: 0, r: 0, t: 0, b: 0 } }, scales.ground[base], seed)
  }
  // a pier painted on a block of water: the block goes, the real sea shows instead
  if (def.pier) clearPaintedWater(after.data, after.width, after.height)
  // a picture with an overhang border is meant to reach beyond its footprint: it is not cut, only filled
  cleanPlotPixels(after.data, after.width, after.height, { w, h, pads: pads ?? { l: 0, r: 0, t: 0, b: 0 } }, !pads)
  const image = compose(sharpPicture, before, after, RES)
  grade(image.data, image.width, image.height, { seed: name.length, scale: (master.width * RES) / 900 })
  // where the chimney opening of the master lies in the finished picture
  const smoke = def.smoke && plan && !block ? [(def.smoke[0] * master.width * plan.scale + Math.round(plan.dx)) / after.width, (def.smoke[1] * master.height * plan.scale + Math.round(plan.dy ?? 0)) / after.height] : null
  return { image, pads: pads ? { l: pads.l * RES, r: pads.r * RES, t: pads.t * RES, b: pads.b * RES } : null, smoke }
}

const jobs = new Map(loadJobs().map((job) => [job.file, job]))

/**
 * A tree, a rock or a ship (`file` as in art/, e.g. "decor/tree_1.png") at twice the size of its master, cut from
 * its raw picture in the same way as the master was, without outlines. `ink` is how much of an outline goes: the
 * rigging of a ship is thin dark lines too, and stays in part. Returns RGBA pixels, or null without a raw picture.
 */
export async function bakeSprite(file, ink = 0.94) {
  const job = jobs.get(file)
  const rawFile = job ? path.join(RAW, `${job.id}.webp`) : ''
  if (!job || !fs.existsSync(rawFile) || (job.kind !== 'decor' && job.kind !== 'sprite')) return null
  const input = await sharp(rawFile).png().toBuffer()
  const cut = job.kind === 'decor' ? await shrinkMatte(await removeBackground(input, { low: 62, high: 125 }), 2) : await removeBackground(input)
  const { data, info } = await cut.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  deink(data, info.width, info.height, { scale: info.width / SIZE, cover: ink })
  const clean = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  const fitted = await fitInto(clean, job.width * RES, job.height * RES, job.kind === 'decor' ? { margin: 0.02, align: 'bottom' } : { margin: 0.04 })
  const image = await read(fitted)
  grade(image.data, image.width, image.height, { seed: file.length, scale: (image.width / SIZE) * 2 })
  return image
}

/** Any other picture of the map in the same look. `flat` pictures (ground, water, paving) repeat: they get no blotches. */
export async function lookOf(file, { outlines = true, flat = false } = {}) {
  const image = await read(file)
  if (outlines) deink(image.data, image.width, image.height, { scale: 0.3 })
  grade(image.data, image.width, image.height, { seed: 3, scale: 0.5, ...(flat ? { mottle: 0, grit: 0 } : {}) })
  return image
}
