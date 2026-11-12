// Fits a building picture to its footprint. Many pictures were painted with a plot smaller than the footprint. The
// game used to enlarge such a picture until its plot filled the footprint: by up to 40 %, which blurred it and made
// houses of one tier differ in size. Now a picture is enlarged only a little; where its plot is still too small,
// the picture stands in the middle of the footprint and the missing ground around it is made here, in the colour
// of the painted plot.
import { fadePixels } from './coastFade'
import { HALF_W } from './iso'
import type { MeasuredPlot } from './plotCleanup'

/** A picture is enlarged by no more than this. */
export const MAX_FIT = 1.12

/** The painted plot inside the fitted picture: the middle of its diamond and half its width, in picture pixels. */
export interface PaintedPlot {
  cx: number
  cy: number
  half: number
}

export interface FitPlan {
  scale: number
  /** Where the left edge of the scaled picture goes. */
  dx: number
  /** Height of the fitted picture: the footprint diamond ends at its bottom. */
  height: number
  /** Set when the painted plot stays smaller than the footprint and ground must be added around it. */
  plot: PaintedPlot | null
}

/**
 * How a picture of the given width is laid into a canvas of the same width, from its measured plot. `shrink` (below
 * 1, from the building data) makes the picture that much smaller than its plot would ask for. Pure.
 */
export function planFit(measured: MeasuredPlot, width: number, shrink = 1): FitPlan {
  const plotWidth = measured.right - measured.left + 1
  const full = width / plotWidth
  const scale = Math.min(full, MAX_FIT) * shrink
  const middle = ((measured.left + measured.right + 1) / 2) * scale
  // the side corners of the painted plot lie on the row of the side corners of the footprint
  const height = Math.ceil(measured.cornerY * scale + width / 4)
  const grown = shrink < 1 || full > MAX_FIT + 1e-6
  return {
    scale,
    dx: width / 2 - middle,
    height,
    plot: grown ? { cx: width / 2, cy: measured.cornerY * scale, half: (plotWidth * scale) / 2 } : null,
  }
}

/** Smooth noise from 0 to 1 that repeats nowhere near a picture's size. */
function noise(x: number, y: number, seed: number): number {
  const hash = (ix: number, iy: number): number => {
    let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx
  const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx
  return top + (bottom - top) * sy
}

/** The band inside the lower edges of the painted plot whose colour is the ground colour, as a share of the plot. */
/** A side of the plot counts as cut off if more than this share of its half width is painted in the outermost column. */
const CUT_SIDE = 0.22
/** A cut side runs out over this share of the half width. */
const SIDE_FADE = 0.3
const SAMPLE_FROM = 0.84
const SAMPLE_TO = 0.97

/**
 * Adds ground around a painted plot that is smaller than the footprint. Works on RGBA pixels in place; the
 * footprint diamond is as wide as the picture and ends at its bottom. The slab the plot was painted on (its side
 * walls below the lower edges) is removed, the rim of the plot runs out softly, and the whole footprint is filled
 * under the painting with mottled ground in the colour of the rim of the plot. Returns false (and changes nothing) if the
 * plot shows too little ground to take a colour from. Pure: no canvas, so it can be tested.
 */
export function growPlot(data: Uint8ClampedArray, width: number, height: number, plot: PaintedPlot, seed = 1): boolean {
  // distance to the diamond of the painted plot: below 1 inside, 1 on its edge
  const inPlot = (x: number, y: number): number => Math.abs(x + 0.5 - plot.cx) / plot.half + Math.abs(y + 0.5 - plot.cy) / (plot.half / 2)
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []
  for (let y = Math.floor(plot.cy); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = inPlot(x, y)
      if (d < SAMPLE_FROM || d > SAMPLE_TO) continue
      const o = (y * width + x) * 4
      if (data[o + 3] < 250) continue
      reds.push(data[o])
      greens.push(data[o + 1])
      blues.push(data[o + 2])
    }
  }
  if (reds.length < 40) return false
  const median = (list: number[]): number => list.sort((p, q) => p - q)[Math.floor(list.length / 2)]
  const colour = [median(reds), median(greens), median(blues)]

  // some pictures were cut off straight at the sides, through the middle of their plot: such a side runs out softly
  for (const side of [-1, 1]) {
    const limit = plot.cx + side * plot.half
    const probe = Math.round(limit - side * 2.5)
    let painted = 0
    for (let y = 0; y < height; y++) if (probe >= 0 && probe < width && data[(y * width + probe) * 4 + 3] > 200) painted++
    if (painted <= plot.half * CUT_SIDE) continue
    const reach = plot.half * SIDE_FADE
    for (let y = Math.max(0, Math.floor(plot.cy - plot.half * 0.6)); y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = side * (limit - (x + 0.5))
        if (distance >= reach) continue
        const t = Math.max(0, distance / reach)
        data[(y * width + x) * 4 + 3] = Math.round(data[(y * width + x) * 4 + 3] * t * t * (3 - 2 * t))
      }
    }
  }

  // the painting runs out softly at the rim of its plot, front and back (the back only where open ground lies at
  // the edge, see coastFade.ts), and what was painted below the lower edges, the side walls of its slab, goes
  const frame = { originX: plot.cx, originY: plot.cy - plot.half / 2, scale: plot.half / (2 * HALF_W), w: 2, h: 2, mirrored: false }
  fadePixels(data, width, height, frame, { ne: true, se: true, sw: true, nw: true }, false)

  const fcx = width / 2
  const fcy = height - width / 4
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const paint = data[o + 3] / 255
      // the added ground: inside the footprint diamond, with a soft outer edge of one pixel
      const f = Math.abs(x + 0.5 - fcx) / (width / 2) + Math.abs(y + 0.5 - fcy) / (width / 4)
      const cover = Math.max(0, Math.min(1, (1 - f) * (width / 4) + 0.5))
      if (cover <= 0) continue
      // mottled ground: broad patches, finer flecks and a little grain
      const shade = 0.9 + 0.14 * noise(x / 22, y / 11, seed) + 0.08 * noise(x / 6, y / 3.2, seed + 7) + 0.03 * noise(x, y, seed + 13)
      const alpha = paint + cover * (1 - paint)
      for (let k = 0; k < 3; k++) {
        const ground = Math.min(255, colour[k] * shade)
        data[o + k] = Math.round((data[o + k] * paint + ground * cover * (1 - paint)) / Math.max(alpha, 1e-6))
      }
      data[o + 3] = Math.round(255 * alpha)
    }
  }
  return true
}
