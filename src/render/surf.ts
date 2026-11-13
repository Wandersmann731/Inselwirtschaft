// The shore, seen from the land outwards: dry sand that turns damp (the ground itself), a band of wet sand, the edge
// of froth that runs up and back over it, shallow water that turns from turquoise to blue-green with the distance
// from the coast, and waves that roll in and break. The shallow water never changes: it is drawn once per rectangle
// of sea and kept. Wet sand and foam are a few shapes along the coast, drawn anew in every frame.
import type { TileRange } from './buildingRenderer'
import { buildPieces, toWorld, type Piece, type Solid } from './coastLine'
import { HALF_H, HALF_W } from './iso'
import { LACE_RES, makeLace } from './water'
import { Terrain, type GameMap } from '../world/terrain'

export { findCoastLines, type TilePoint } from './coastLine'

/** Seconds one wave needs to roll in. */
const WAVE_SECONDS = 5
/** How far out a wave starts, in tiles. */
const REACH = 1.7
/** Foam of similar strength is drawn in one go: this many strengths are told apart. */
const LEVELS = 6
const FOAM = '244, 250, 248'
/** Wet sand reaches this far from the land (tiles); the froth edge runs between `SWASH.near` and `SWASH.far`. */
const WET_SAND = 0.4
const SWASH = { near: 0.12, far: 0.4 }
/** The thin film of water a wave leaves on the sand behind its froth, the shade the froth throws, the dark water before a breaking wave and its lit back. */
const FILM = 'rgba(96, 176, 172, 0.3)'
const SHADE = 'rgba(58, 44, 30, 0.3)'
const TROUGH = 'rgba(8, 46, 66, 0.14)'
const BACK = 'rgba(150, 214, 204, 0.1)'
/** World pixels the two foam nets cover before they repeat: a close one for fresh froth, a wide one for what drifts off. */
const LACE_SPAN = { dense: 96, wide: 150 }
/** Shallow water: how far it reaches (tiles), its colour at the sand and far out, and how much of the sea it covers at the sand. */
const SHALLOW = { reach: 3.2, near: [92, 176, 160], far: [40, 120, 136], cover: 0.72, steps: 16 }
/** Wet sand, and its outer edge that is already under water. Drawn in every frame, over the reflections. */
const SAND = { wet: 'rgb(184, 150, 104)', edge: 'rgb(150, 142, 116)' }
/** The static part of the shore is kept in pictures of this many world pixels. */
const SHORE_W = 512
const SHORE_H = 256
/** Shore pictures made per frame at most: the rest follows in the next frames. */
const SHORE_PER_FRAME = 3
/** World pixels along a tile axis on the ground plane (a tile is 64 by 32 on screen, so 45 on the ground). */
const TILE_GROUND = Math.hypot(HALF_W, 2 * HALF_H)

/**
 * The shallow water of one rectangle of sea, by its distance from the coast line. The coast is stroked many times, wide and faint first, then narrower: the strokes add up to
 * a smooth run of colour. It is drawn on the ground plane (twice as high as on screen), so a distance is the same
 * in every direction on the ground. What falls on the land is hidden by the ground picture. Null without a coast.
 */
function renderShore(pieces: Piece[], rx: number, ry: number): HTMLCanvasElement | null {
  const x0 = rx * SHORE_W
  const y0 = ry * SHORE_H
  const reach = SHALLOW.reach * TILE_GROUND
  const near = pieces.filter((p) => p.box.maxX > x0 - reach && p.box.minX < x0 + SHORE_W + reach && p.box.maxY > y0 - reach / 2 && p.box.minY < y0 + SHORE_H + reach / 2)
  if (near.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = SHORE_W
  canvas.height = SHORE_H
  const g = canvas.getContext('2d')
  if (!g) return null
  g.translate(-x0, -y0)
  g.scale(1, 0.5)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  for (const piece of near) {
    g.moveTo(piece.x[0], piece.y[0] * 2)
    for (let k = 1; k < piece.x.length; k++) g.lineTo(piece.x[k], piece.y[k] * 2)
  }
  // every step adds the same share of what is still missing, so the cover grows evenly to the sand
  const share = 1 - Math.pow(1 - SHALLOW.cover, 1 / SHALLOW.steps)
  for (let step = 0; step < SHALLOW.steps; step++) {
    const t = step / (SHALLOW.steps - 1)
    // more steps close to the sand, where the colour changes fastest
    const tiles = WET_SAND + (SHALLOW.reach - WET_SAND) * (1 - t) * (1 - t)
    const colour = SHALLOW.far.map((far, c) => Math.round(far + (SHALLOW.near[c] - far) * t * t))
    g.strokeStyle = `rgba(${colour.join(', ')}, ${share})`
    g.lineWidth = 2 * tiles * TILE_GROUND
    g.stroke()
  }
  return canvas
}

/** A stretch of coast along which one wave front runs unbroken. */
interface Run {
  piece: Piece
  /** First point of the piece and number of points. */
  first: number
  count: number
  /** For each point: the moment of the wave (0 far out, 1 at the shore), where its crest is and where the froth edge on the sand is (tiles from the coast). */
  progress: number[]
  out: number[]
  edge: number[]
  /** For each point how far the froth edge has run up the sand, 0 to 1. */
  climb: number[]
  /** For each point how thick the froth is there, 0 to 1 (see Piece.rough). */
  rough: number[]
  /** Strength of the wave, of its breaking and of the froth edge in the middle of the run, as levels from 0 (nothing to draw) to LEVELS. */
  waveLevel: number
  breakLevel: number
  swashLevel: number
}

type Offset = (run: Run, index: number) => number

/** A whole piece of coast as a run with no wave on it: for what lies still along the shore. */
function stillRun(piece: Piece): Run {
  const none = piece.x.map(() => 0)
  return { piece, first: 0, count: piece.x.length, progress: none, out: none, edge: none, climb: none, rough: piece.rough, waveLevel: 0, breakLevel: 0, swashLevel: 0 }
}

function makeRun(piece: Piece, all: number[], first: number, last: number): Run {
  const progress = all.slice(first, last + 1)
  // the froth edge on the sand runs up as the wave arrives and drains back slowly
  const climb = progress.map((p) => Math.sin(Math.PI * Math.min(1, p * 1.6)) ** 2)
  const middle = progress.length >> 1
  const wave = Math.sin(progress[middle] * Math.PI)
  // a wave only breaks into froth on its last stretch before the sand
  const breaking = Math.min(1, Math.max(0, (progress[middle] - 0.42) / 0.25)) * wave
  return {
    piece,
    first,
    count: progress.length,
    progress,
    out: progress.map((p) => SWASH.far + (REACH - SWASH.far) * (1 - p)),
    edge: climb.map((share, i) => SWASH.far - (SWASH.far - SWASH.near) * share + 0.05 * (piece.rough[first + i] - 0.5)),
    climb,
    rough: piece.rough.slice(first, last + 1),
    waveLevel: Math.round(wave * LEVELS),
    breakLevel: Math.round(breaking * LEVELS),
    swashLevel: Math.max(1, Math.round(climb[middle] * LEVELS)),
  }
}

interface Shore {
  /** What the coast was built from: the sea line changes when something is built or torn down at the water. */
  signature: number
  pieces: Piece[]
  /** The static shore pictures by rectangle; null where no coast is near. */
  pictures: Map<string, HTMLCanvasElement | null>
  /** Pictures of the coast before it last changed: shown until their new ones are made, so the shore never blinks. */
  stale: Map<string, HTMLCanvasElement | null>
}

/** Buildings and roads of an island, as the surf needs them: the sand reaches out around those at the water. */
export interface ShoreLayout {
  occupancy: number[]
  roads: number[]
}

/** Changes when a building or road appears or disappears on a tile at the water. */
function shoreSignature(map: GameMap, layout: ShoreLayout): number {
  const { width, height, tiles } = map
  let hash = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (layout.occupancy[index] === 0 && layout.roads[index] === 0) continue
      let atWater = false
      for (let dy = -1; dy <= 1 && !atWater; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || tiles[ny * width + nx] === Terrain.Water) atWater = true
        }
      }
      if (atWater) hash = (Math.imul(hash, 31) + index + 1) | 0
    }
  }
  return hash
}

/**
 * How much of its width the white edge of the froth keeps where the froth is `thick` (0 to 1): all of it where it is
 * thick, none where it is thin. So the edge is no drawn line: it swells, thins out and breaks off. Pure.
 */
export function tornFoam(thick: number): number {
  return Math.max(0, Math.min(1, (thick - 0.2) / 0.3))
}

/**
 * The shore: wet sand and shallow water around every coast (kept pictures), over them the foam: an edge of froth
 * that runs up the sand and back, the net of foam it leaves, and waves that roll in along the coast and break.
 */
export class Surf {
  private cache = new WeakMap<GameMap, Shore>()
  private signatures = new WeakMap<number[], { roads: number[]; value: number }>()
  private lace: { dense: CanvasPattern; wide: CanvasPattern } | null | undefined

  /**
   * Draws the shore of the visible sea. `layout` are the buildings and roads of the island. `between` is called
   * after the still water and before the foam: what is drawn there lies on the water and under the froth.
   */
  draw(ctx: CanvasRenderingContext2D, map: GameMap, seed: number, range: TileRange, now: number, animated: boolean, layout?: ShoreLayout, between?: () => void): void {
    const shore = this.shoreOf(map, seed, layout)
    const reach = Math.ceil(SHALLOW.reach) + 1
    const visible = shore.pieces.filter((p) => p.maxU >= range.minI - reach && p.minU <= range.maxI + reach && p.maxV >= range.minJ - reach && p.minV <= range.maxJ + reach)
    if (visible.length > 0) this.drawStill(ctx, shore, range)
    between?.()
    if (visible.length === 0) return
    // wet sand over the shallows (and over what is mirrored in them), with a soft outer edge that is already under water
    const still = visible.map(stillRun)
    this.fillBand(ctx, still, () => -0.06, () => WET_SAND + 0.12, SAND.edge, 0.35)
    this.fillBand(ctx, still, () => -0.06, () => WET_SAND + 0.05, SAND.edge, 0.6)
    this.fillBand(ctx, still, () => -0.06, () => WET_SAND - 0.04, SAND.wet, 0.7)
    this.fillBand(ctx, still, () => -0.06, () => WET_SAND * 0.6, SAND.wet, 0.8)
    if (this.lace === undefined) {
      const dense = makeLace(ctx, true)
      const wide = makeLace(ctx, false)
      this.lace = dense && wide ? { dense, wide } : null
    }

    const t = animated ? now / 1000 : 0
    if (this.lace) {
      this.lace.dense.setTransform(new DOMMatrix().translate(t * 1.6, t * 0.8).scale(LACE_SPAN.dense / LACE_RES))
      this.lace.wide.setTransform(new DOMMatrix().translate(t * 2.6, t * 1.3).scale(LACE_SPAN.wide / LACE_RES))
    }
    // A wave is one front along the whole coast: at every point it is at another moment of its run. `progress` is
    // 0 far out and 1 at the shore. Still water shows a fixed moment.
    const clock = animated ? t / WAVE_SECONDS : 0.35
    const runs: Run[] = []
    for (const piece of visible) {
      const n = piece.x.length
      const progress = piece.lag.map((lag) => (((clock - lag) % 1) + 1) % 1)
      let from = 0
      for (let k = 1; k <= n; k++) {
        // where one wave has arrived and the next starts far out, the front is cut
        if (k < n && Math.abs(progress[k] - progress[k - 1]) < 0.5) continue
        if (k - from >= 2) runs.push(makeRun(piece, progress, from, k - 1))
        from = k
      }
    }
    const solidFoam = `rgb(${FOAM})`
    for (let level = 1; level <= LEVELS; level++) {
      const share = level / LEVELS
      const wave = runs.filter((run) => run.waveLevel === level)
      if (wave.length > 0) {
        // the swell itself: darker water before it, its back catches the light
        this.fillBand(ctx, wave, (run, i) => run.out[i] - 0.16, (run, i) => run.out[i] - 0.02, TROUGH, share)
        this.fillBand(ctx, wave, (run, i) => run.out[i], (run, i) => run.out[i] + 0.2, BACK, share)
      }
      const breaking = runs.filter((run) => run.breakLevel === level)
      if (breaking.length > 0 && this.lace) {
        // where it breaks: the net of foam it trails behind (thinning out seawards), and froth on the crest
        this.fillBand(ctx, breaking, (run, i) => run.out[i] + 0.04, (run, i) => run.out[i] + 0.3 + 0.5 * run.progress[i], this.lace.wide, 0.35 * share)
        this.fillBand(ctx, breaking, (run, i) => run.out[i] + 0.02, (run, i) => run.out[i] + 0.16 + 0.25 * run.progress[i], this.lace.wide, 0.45 * share)
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - 0.01, (run, i) => run.out[i] + 0.07 + 0.14 * (1 - run.rough[i]), this.lace.dense, 0.9 * share)
        // the crest is white only where the wave is breaking hardest: elsewhere the line tears and only the net of foam is left
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - (0.015 + 0.02 * (1 - run.rough[i])) * tornFoam(1 - run.rough[i]), (run, i) => run.out[i] + (0.01 + 0.05 * (1 - run.rough[i])) * tornFoam(1 - run.rough[i]), solidFoam, 0.72 * share)
      }
    }
    for (let level = 1; level <= LEVELS; level++) {
      const share = level / LEVELS
      const swash = runs.filter((run) => run.swashLevel === level)
      if (swash.length === 0) continue
      // on the sand: a film of water, the net of foam the last wave left, and the edge of froth with its shade
      this.fillBand(ctx, swash, (run, i) => run.edge[i], () => WET_SAND + 0.1, FILM, 1)
      if (this.lace) {
        this.fillBand(ctx, swash, (run, i) => run.edge[i] + 0.05, (run, i) => run.edge[i] + 0.3 + 0.35 * run.climb[i], this.lace.wide, 0.3 + 0.25 * share)
        this.fillBand(ctx, swash, (run, i) => run.edge[i] + 0.03, (run, i) => run.edge[i] + 0.16 + 0.2 * run.climb[i], this.lace.wide, 0.4 + 0.3 * share)
        this.fillBand(ctx, swash, (run, i) => run.edge[i], (run, i) => run.edge[i] + 0.06 + 0.14 * run.rough[i] + 0.08 * run.climb[i], this.lace.dense, 0.8 + 0.2 * share)
      }
      // the froth is thick in one place and thin in the next
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.045 - 0.015 * run.rough[i], (run, i) => run.edge[i] - 0.01, SHADE, 0.4 + 0.5 * share)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - (0.016 + 0.012 * run.rough[i]) * tornFoam(run.rough[i]), (run, i) => run.edge[i] + (0.012 + 0.065 * run.rough[i]) * tornFoam(run.rough[i]), solidFoam, 0.66 + 0.24 * share)
    }
  }

  /** The coast of a map with the buildings on it. Built again when something changes at the water. */
  private shoreOf(map: GameMap, seed: number, layout?: ShoreLayout): Shore {
    let signature = 0
    let solid: Solid | undefined
    if (layout) {
      let known = this.signatures.get(layout.occupancy)
      if (!known || known.roads !== layout.roads) {
        known = { roads: layout.roads, value: shoreSignature(map, layout) }
        this.signatures.set(layout.occupancy, known)
      }
      signature = known.value
      solid = (x, y) => layout.occupancy[y * map.width + x] !== 0 || layout.roads[y * map.width + x] !== 0
    }
    let shore = this.cache.get(map)
    if (!shore || shore.signature !== signature) {
      shore = { signature, pieces: buildPieces(map, seed, solid), pictures: new Map(), stale: shore ? new Map([...shore.stale, ...shore.pictures]) : new Map() }
      this.cache.set(map, shore)
    }
    return shore
  }

  /** Draws the kept shore pictures of the visible sea and makes a few of the missing ones. */
  private drawStill(ctx: CanvasRenderingContext2D, shore: Shore, range: TileRange): void {
    const corners = [toWorld(range.minI, range.minJ), toWorld(range.maxI + 1, range.minJ), toWorld(range.minI, range.maxJ + 1), toWorld(range.maxI + 1, range.maxJ + 1)]
    const minX = Math.min(...corners.map((c) => c[0]))
    const maxX = Math.max(...corners.map((c) => c[0]))
    const minY = Math.min(...corners.map((c) => c[1]))
    const maxY = Math.max(...corners.map((c) => c[1]))
    let made = 0
    const view = ctx.getTransform()
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (let ry = Math.floor(minY / SHORE_H); ry <= Math.floor(maxY / SHORE_H); ry++) {
      for (let rx = Math.floor(minX / SHORE_W); rx <= Math.floor(maxX / SHORE_W); rx++) {
        const key = `${rx},${ry}`
        let picture = shore.pictures.get(key)
        if (picture === undefined && made < SHORE_PER_FRAME) {
          made++
          picture = renderShore(shore.pieces, rx, ry)
          shore.pictures.set(key, picture)
          shore.stale.delete(key)
        }
        picture ??= shore.stale.get(key)
        if (!picture) continue
        // on whole device pixels: two see-through pictures must neither overlap nor leave a gap, both would show as a line
        const left = Math.round(view.a * rx * SHORE_W + view.e)
        const top = Math.round(view.d * ry * SHORE_H + view.f)
        const right = Math.round(view.a * (rx + 1) * SHORE_W + view.e)
        const bottom = Math.round(view.d * (ry + 1) * SHORE_H + view.f)
        ctx.drawImage(picture, left, top, right - left, bottom - top)
      }
    }
    ctx.restore()
  }

  /** Fills the strip of sea between two distances from the coast (tiles, per point). All runs are one shape: no seams. */
  private fillBand(ctx: CanvasRenderingContext2D, runs: Run[], from: Offset, to: Offset, style: string | CanvasPattern, alpha: number): void {
    ctx.beginPath()
    for (const run of runs) {
      const { piece } = run
      for (let i = 0; i < run.count; i++) {
        const k = run.first + i
        const out = from(run, i)
        if (i === 0) ctx.moveTo(piece.x[k] + piece.nx[k] * out, piece.y[k] + piece.ny[k] * out)
        else ctx.lineTo(piece.x[k] + piece.nx[k] * out, piece.y[k] + piece.ny[k] * out)
      }
      for (let i = run.count - 1; i >= 0; i--) {
        const k = run.first + i
        const out = to(run, i)
        ctx.lineTo(piece.x[k] + piece.nx[k] * out, piece.y[k] + piece.ny[k] * out)
      }
      ctx.closePath()
    }
    ctx.globalAlpha = alpha
    ctx.fillStyle = style
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
