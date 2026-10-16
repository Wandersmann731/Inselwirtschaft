// Cleans the ground plot of a building picture when it is loaded. The pictures are painted by an image model: their
// ground diamond often misses a corner, or loose bits of earth stick out over its edges. Both show as a frayed rim on
// the map. Here everything below the lower edges of the footprint is cut away, a plot that has gaps is filled with
// its own ground colour, and loose ground-coloured bits just above the upper edges are removed.

import type { Pads } from './sprites'

/** Picture pixels per tile: the pictures are drawn at twice the game's tile size (64x32). */
const TILE_W = 128
const TILE_H = 64
/** A picture counts as having a plot when this share of the band along the inside of the diamond edge is painted. */
const PLOT_SHARE = 0.55
/** The band along the inside of the edge (in tiles) whose colour is the plot colour. */
const RING_FROM = 0.04
const RING_TO = 0.22
/** Above the upper edges: ground-coloured pixels connected to the edge, up to this far (in tiles), are loose earth. */
const FRINGE_REACH = 1.2
const FRINGE_COLOUR = 45

export interface PlotGeometry {
  /** Footprint in tiles, as in the building data. */
  w: number
  h: number
  pads: Pads
}

export interface PlotResult {
  /** True if the picture has a ground plot (and it was filled). */
  plot: boolean
  /** The plot colour, if there is one. */
  colour: [number, number, number] | null
}

/** Corners of the footprint diamond in picture pixels. */
function corners(width: number, height: number, geometry: PlotGeometry) {
  const { w, h, pads } = geometry
  // the picture may be a little larger or smaller than twice the tile size: measure the footprint box
  const scale = (width - pads.l - pads.r) / ((w + h) * (TILE_W / 2))
  const tw = (TILE_W / 2) * scale
  const th = (TILE_H / 2) * scale
  const bottom = height - pads.b
  const top = { x: pads.l + h * tw, y: bottom - (w + h) * th }
  return { tw, th, top, leftX: pads.l, rightX: width - pads.r, bottom }
}

/**
 * Works on RGBA pixels in place. `clip` cuts away what lies below the lower diamond edges (only for pictures without
 * an overhang border, whose border is meant to be there). Pure: no canvas, so it can be tested.
 */
export function cleanPlotPixels(data: Uint8ClampedArray, width: number, height: number, geometry: PlotGeometry, clip: boolean): PlotResult {
  const { w, h } = geometry
  const { tw, th, top, leftX, rightX } = corners(width, height, geometry)
  // position in tiles relative to the top corner: u along the right going edge, v along the left going edge
  const tileOf = (x: number, y: number): [number, number] => {
    const a = (x - top.x) / tw
    const b = (y - top.y) / th
    return [(a + b) / 2, (b - a) / 2]
  }
  const edgeDistance = (u: number, v: number): number => Math.min(u, w - u, v, h - v)

  // 1. the plot colour: median of the band along the inside of the edge
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []
  let ring = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [u, v] = tileOf(x + 0.5, y + 0.5)
      const e = edgeDistance(u, v)
      if (e < RING_FROM || e > RING_TO) continue
      ring++
      const o = (y * width + x) * 4
      if (data[o + 3] < 200) continue
      reds.push(data[o])
      greens.push(data[o + 1])
      blues.push(data[o + 2])
    }
  }
  const plot = ring > 0 && reds.length / ring >= PLOT_SHARE
  const median = (list: number[]): number => list.sort((p, q) => p - q)[Math.floor(list.length / 2)] ?? 0
  const colour: [number, number, number] | null = plot ? [median(reds), median(greens), median(blues)] : null

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const [u, v] = tileOf(x + 0.5, y + 0.5)
      // below the lower edges or beside the footprint: outside the picture's own room
      if (clip) {
        const below = Math.max(u - w, v - h) * th * 2 // picture pixels below the lower edge (roughly)
        const beside = Math.max(leftX - (x + 0.5), x + 0.5 - rightX)
        const cut = Math.max(below, beside)
        if (cut >= 0.5) {
          data[o + 3] = 0
          continue
        }
        if (cut > -0.5) data[o + 3] = Math.round(data[o + 3] * (0.5 - cut))
      }
      if (!colour) continue
      const e = edgeDistance(u, v)
      if (e >= 0) {
        // inside the diamond: fill the gaps of the plot with its colour, under what is painted
        const alpha = data[o + 3] / 255
        if (alpha >= 1) continue
        const grain = (((x * 73856093) ^ (y * 19349663)) & 15) - 7
        const cover = Math.min(1, e * th * 2 + 0.5)
        for (let k = 0; k < 3; k++) data[o + k] = Math.round(data[o + k] * alpha + (colour[k] + grain) * (1 - alpha))
        data[o + 3] = Math.round(255 * Math.max(alpha, cover))
      }
    }
  }
  if (clip && colour) removeLooseGround(data, width, height, colour, (x, y) => {
    const [u, v] = tileOf(x + 0.5, y + 0.5)
    return edgeDistance(u, v)
  })
  return { plot, colour }
}

/**
 * Ground painted above the upper edges of the diamond (a plot drawn as a block, or loose earth): starting at the
 * edge, every connected pixel in the plot colour is removed, up to FRINGE_REACH tiles away. The fill stops at walls,
 * roofs and everything else that is not ground-coloured, so the building stays.
 */
function removeLooseGround(data: Uint8ClampedArray, width: number, height: number, colour: [number, number, number], edge: (x: number, y: number) => number): void {
  const isGround = (i: number): boolean => {
    const o = i * 4
    if (data[o + 3] === 0) return false
    return Math.abs(data[o] - colour[0]) + Math.abs(data[o + 1] - colour[1]) + Math.abs(data[o + 2] - colour[2]) < FRINGE_COLOUR
  }
  const outside = (x: number, y: number): boolean => {
    const e = edge(x, y)
    return e < 0 && -e <= FRINGE_REACH
  }
  const seen = new Uint8Array(width * height)
  const queue: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // seeds: outside pixels right at the edge (their neighbour below lies inside the diamond)
      if (y + 1 >= height || !outside(x, y) || edge(x, y + 1) < 0) continue
      const i = y * width + x
      if (isGround(i)) {
        seen[i] = 1
        queue.push(i)
      }
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!
    data[i * 4 + 3] = 0
    const x = i % width
    const y = (i - x) / width
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const n = ny * width + nx
      if (seen[n] || !outside(nx, ny) || !isGround(n)) continue
      seen[n] = 1
      queue.push(n)
    }
  }
}

/** The ground diamond as painted in a picture: its left and right corner (x, at row cornerY) and its bottom row. */
export interface MeasuredPlot {
  left: number
  right: number
  cornerY: number
  bottom: number
}

/**
 * Finds the ground diamond of a picture of a square building: the lowest painted row is the bottom corner, the widest
 * painted row in the lower part gives the left and right corner. Null if the shape is not a diamond (then the picture
 * is left as it is).
 */
export function measurePlot(data: Uint8ClampedArray, width: number, height: number): MeasuredPlot | null {
  const span = (y: number): [number, number] | null => {
    let first = -1
    let last = -1
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 128) continue
      if (first < 0) first = x
      last = x
    }
    return first < 0 ? null : [first, last]
  }
  let bottom = -1
  for (let y = height - 1; y >= 0 && bottom < 0; y--) if (span(y)) bottom = y
  if (bottom < 0) return null
  let best: { left: number; right: number; y: number } | null = null
  for (let y = bottom; y >= Math.max(0, bottom - width * 0.4); y--) {
    const row = span(y)
    if (row && (!best || row[1] - row[0] > best.right - best.left)) best = { left: row[0], right: row[1], y }
  }
  if (!best) return null
  const plotWidth = best.right - best.left + 1
  // a diamond is half as high as wide: the corners lie a quarter of the width above the bottom corner
  const rise = bottom - best.y
  if (plotWidth < width * 0.5 || rise < plotWidth * 0.18 || rise > plotWidth * 0.33) return null
  return { left: best.left, right: best.right, cornerY: best.y, bottom }
}
