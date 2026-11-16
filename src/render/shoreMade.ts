// What lies still along a coast, worked out for every picture point: the wet sand the last wave left, the sand that
// shows through the first clear water, the green of the shallows and the blue they turn into further out. How far a
// point lies from the coast decides what it is; noise moves every one of these borders and lays dark beds of weed
// into the shallows, so no coast is a run of even bands. One picture per rectangle of sea, made once and kept.
import { fbm } from '../world/noise2d'
import type { Piece } from './coastLine'
import { HALF_H, HALF_W } from './iso'

/** How far the shallows reach from the coast, in tiles. */
export const SHALLOW_REACH = 3.3
/** The static part of the shore is kept in pictures that cover this many world pixels. */
export const SHORE_W = 512
export const SHORE_H = 256
/** Picture pixels per world pixel: what lies under water is soft, half the size is enough. */
const SHORE_RES = 0.5
/** World pixels along a tile axis on the ground plane (a tile is 64 by 32 on screen, so 45 on the ground). */
const TILE_GROUND = Math.hypot(HALF_W, 2 * HALF_H)
/** How finely the distance from the coast is told apart. */
const STEPS = 48

/**
 * The shore by its distance from the coast, as [tiles out, red, green, blue, cover]: damp sand at the land's edge,
 * the dark sand a wave has just left, sand under a film of water, the light green of the shallows, turquoise, and
 * the blue-green that lets the open sea through at last.
 */
const STOPS: [number, number, number, number, number][] = [
  [0, 168, 138, 88, 1],
  [0.2, 136, 110, 74, 1],
  [0.4, 134, 136, 106, 1],
  [0.72, 110, 164, 142, 0.95],
  [1.25, 64, 140, 140, 0.8],
  [2.05, 42, 102, 120, 0.46],
  [SHALLOW_REACH, 36, 80, 100, 0],
]
/** A bed of weed or dark stones on the sea floor. */
const WEED = [30, 66, 70]

/** Up to here (tiles from the coast) the sand lies bare between two waves; its picture ends softly a little further out. */
export const BARE_SAND = 0.3

/**
 * The colour of the still shore at a distance from the coast (tiles): red, green, blue and cover (0 to 1) into
 * `out`. `wobble` (-0.5 to 0.5) pushes the bands in or out, less the closer to the land, so the coast itself stays
 * where it is; `weed` (0 to 1) darkens the shallows where something grows on the floor. Returns the distance the
 * colour was taken at, after the push. Pure.
 */
export function shoreColour(tiles: number, wobble: number, weed: number, out: number[]): number {
  const far = Math.max(0, tiles + wobble * 0.9 * Math.min(1, tiles / 0.7))
  let k = 1
  while (k < STOPS.length - 1 && STOPS[k][0] < far) k++
  const [from, to] = [STOPS[k - 1], STOPS[k]]
  const t = Math.min(1, Math.max(0, (far - from[0]) / (to[0] - from[0])))
  for (let c = 0; c < 4; c++) out[c] = from[c + 1] + (to[c + 1] - from[c + 1]) * t
  // weed grows where the water is deep enough to stay and shallow enough to be seen through
  const grown = weed * Math.min(1, Math.max(0, (far - 0.5) / 0.3)) * Math.min(1, Math.max(0, (2.7 - far) / 0.9)) * 0.62
  for (let c = 0; c < 3; c++) out[c] += (WEED[c] - out[c]) * grown
  return far
}

/** The still shore of a rectangle of sea: the shallows, and the bare wet sand that lies over them at the land's edge. */
export interface ShorePicture {
  water: HTMLCanvasElement
  sand: HTMLCanvasElement
}

const colour = [0, 0, 0, 0]

/**
 * The still shore of one rectangle of sea. The distance from the coast is drawn first: the coast line stroked many
 * times, wide and dark first, then narrower and lighter, on the ground plane (twice as high as on screen), so a
 * distance is the same in every direction on the ground. Then every point gets its colour from that distance. The
 * wet sand is a picture of its own: the waves that run over the shallows must not run over it. What falls on the
 * land is hidden by the ground picture. Null without a coast near.
 */
export function renderShore(pieces: Piece[], rx: number, ry: number, seed: number): ShorePicture | null {
  const x0 = rx * SHORE_W
  const y0 = ry * SHORE_H
  const reach = SHALLOW_REACH * TILE_GROUND
  const near = pieces.filter((p) => p.box.maxX > x0 - reach && p.box.minX < x0 + SHORE_W + reach && p.box.maxY > y0 - reach / 2 && p.box.minY < y0 + SHORE_H + reach / 2)
  if (near.length === 0) return null
  const [w, h] = [SHORE_W * SHORE_RES, SHORE_H * SHORE_RES]
  const water = document.createElement('canvas')
  const sand = document.createElement('canvas')
  water.width = sand.width = w
  water.height = sand.height = h
  const g = water.getContext('2d')
  const s = sand.getContext('2d')
  if (!g || !s) return null
  g.fillStyle = '#000'
  g.fillRect(0, 0, w, h)
  g.save()
  g.scale(SHORE_RES, SHORE_RES)
  g.translate(-x0, -y0)
  g.scale(1, 0.5)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  for (const piece of near) {
    g.moveTo(piece.x[0], piece.y[0] * 2)
    for (let k = 1; k < piece.x.length; k++) g.lineTo(piece.x[k], piece.y[k] * 2)
  }
  for (let step = 1; step <= STEPS; step++) {
    const value = Math.round((255 * step) / STEPS)
    g.strokeStyle = `rgb(${value}, ${value}, ${value})`
    g.lineWidth = 2 * SHALLOW_REACH * (1 - (step - 1) / STEPS) * TILE_GROUND
    g.stroke()
  }
  g.restore()
  const image = g.getImageData(0, 0, w, h)
  const bare = s.createImageData(w, h)
  const data = image.data
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4
      if (data[o] === 0) {
        data[o + 3] = 0
        continue
      }
      // noise by the place on the ground, so the pictures of two rectangles join
      const gx = (x0 + (i + 0.5) / SHORE_RES) / TILE_GROUND
      const gy = ((y0 + (j + 0.5) / SHORE_RES) * 2) / TILE_GROUND
      const wobble = fbm(gx * 0.55 + 17, gy * 0.55 + 5, seed + 71, 3) - 0.5
      const patch = fbm(gx * 1.3 + 3, gy * 1.3 + 29, seed + 73, 3)
      const weed = Math.min(1, Math.max(0, (patch - 0.56) / 0.08))
      const far = shoreColour(SHALLOW_REACH * (1 - data[o] / 255), wobble, weed, colour)
      data[o] = colour[0]
      data[o + 1] = colour[1]
      data[o + 2] = colour[2]
      data[o + 3] = 255 * colour[3]
      if (far < BARE_SAND + 0.14) {
        bare.data[o] = colour[0]
        bare.data[o + 1] = colour[1]
        bare.data[o + 2] = colour[2]
        bare.data[o + 3] = 255 * Math.min(1, (BARE_SAND + 0.14 - far) / 0.14)
      }
    }
  }
  g.putImageData(image, 0, 0)
  s.putImageData(bare, 0, 0)
  return { water, sand }
}
