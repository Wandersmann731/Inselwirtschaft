// The shore, seen from the land outwards: dry sand that turns damp (the ground itself), a band of bare wet sand, the
// edge of froth that runs up and back over it, shallow water that turns from turquoise to blue-green with the
// distance from the coast, and waves that roll in and break. What lies still (the shallows and the wet sand) is
// worked out once per rectangle of sea and kept (shoreMade.ts). The froth is a few shapes along the coast, drawn
// anew in every frame and filled with the foam pictures (foam.ts).
import type { TileRange } from './buildingRenderer'
import { buildPieces, toWorld, type Piece, type Solid } from './coastLine'
import { BARE_SAND, renderShore, SHALLOW_REACH, SHORE_H, SHORE_W, type ShorePicture } from './shoreMade'
import { LACE_RES, makeFroth, makeLace } from './foam'
import { Terrain, type GameMap } from '../world/terrain'

export { findCoastLines, type TilePoint } from './coastLine'

/** Seconds one wave needs to roll in. */
const WAVE_SECONDS = 5
/** How far out a wave starts, in tiles. */
const REACH = 1.7
/** Foam of similar strength is drawn in one go: this many strengths are told apart. */
const LEVELS = 6
const FOAM = '244, 250, 248'
/** The froth edge runs up the bare wet sand (see shoreMade.ts) and back: between these distances from the land, in tiles. */
const SWASH = { near: 0.12, far: 0.4 }
/** The thin film of water a wave leaves on the sand behind its froth, the shade the froth throws, the dark water before a breaking wave and its lit back. */
const FILM = 'rgba(96, 176, 172, 0.3)'
const SHADE = 'rgba(58, 44, 30, 0.3)'
const TROUGH = 'rgba(8, 46, 66, 0.1)'
const BACK = 'rgba(150, 214, 204, 0.08)'
/** World pixels the foam pictures cover before they repeat: the net that drifts off behind a wave, and froth. */
const LACE_SPAN = { wide: 150, froth: 132 }
/** How far the tongues and bays of a froth edge reach from its middle line, in tiles. */
const FRAY = 0.2
/** Shore pictures made per frame at most: the rest follows in the next frames. */
const SHORE_PER_FRAME = 3

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
  /** For each point how far the edge of the froth is pushed in or out there, -0.5 to 0.5 (see Piece.fray). */
  fray: number[]
  /** For each point how much froth is heaped up there, 0 to 1 (see Piece.tuft): the back of a band of froth is as ragged as this. */
  tuft: number[]
  /** Strength of the wave, of its breaking and of the froth edge in the middle of the run, as levels from 0 (nothing to draw) to LEVELS. */
  waveLevel: number
  breakLevel: number
  swashLevel: number
}

type Offset = (run: Run, index: number) => number

function makeRun(piece: Piece, all: number[], first: number, last: number): Run {
  const progress = all.slice(first, last + 1)
  const fray = piece.fray.slice(first, last + 1).map((value) => value - 0.5)
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
    // a wave front is no ruled line either: it runs ahead in one place and hangs back in the next
    out: progress.map((p, i) => SWASH.far + (REACH - SWASH.far) * (1 - p) + FRAY * 0.8 * fray[i]),
    edge: climb.map((share, i) => SWASH.far - (SWASH.far - SWASH.near) * share + 0.05 * (piece.rough[first + i] - 0.5) + FRAY * fray[i]),
    climb,
    rough: piece.rough.slice(first, last + 1),
    fray,
    tuft: piece.tuft.slice(first, last + 1),
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
  pictures: Map<string, ShorePicture | null>
  /** Pictures of the coast before it last changed: shown until their new ones are made, so the shore never blinks. */
  stale: Map<string, ShorePicture | null>
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
  private lace: CanvasPattern | null | undefined
  private froth: CanvasPattern[] | null | undefined

  /**
   * Draws the shore of the visible sea. `layout` are the buildings and roads of the island. `between` is called
   * after the still water and before the foam: what is drawn there lies on the water and under the froth.
   */
  draw(ctx: CanvasRenderingContext2D, map: GameMap, seed: number, range: TileRange, now: number, animated: boolean, layout?: ShoreLayout, between?: () => void): void {
    const shore = this.shoreOf(map, seed, layout)
    const reach = Math.ceil(SHALLOW_REACH) + 1
    const visible = shore.pieces.filter((p) => p.maxU >= range.minI - reach && p.minU <= range.maxI + reach && p.maxV >= range.minJ - reach && p.minV <= range.maxJ + reach)
    if (visible.length > 0) this.drawStill(ctx, shore, range, seed, 'water')
    between?.()
    if (visible.length === 0) return
    // the bare wet sand lies over the shallows, over the waves that cross them and over what is mirrored in them
    this.drawStill(ctx, shore, range, seed, 'sand')
    // the foam pictures are worked out once, one kind per frame: both at once would hold the first frame up twice as long
    if (this.lace === undefined) {
      this.lace = makeLace(ctx, false)
      return
    }
    if (this.froth === undefined) {
      this.froth = makeFroth(ctx)
      return
    }
    if (!this.lace || !this.froth) return
    const foam = { lace: this.lace, froth: this.froth }

    const t = animated ? now / 1000 : 0
    foam.lace.setTransform(new DOMMatrix().translate(t * 2.6, t * 1.3).scale(LACE_SPAN.wide / LACE_RES))
    // the three densities of froth are one heap of bubbles: they move as one
    for (const froth of foam.froth) froth.setTransform(new DOMMatrix().translate(t * 1.6, t * 0.8).scale(LACE_SPAN.froth / LACE_RES))
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
      if (breaking.length > 0) {
        // where it breaks: the net of foam it trails behind (thinning out seawards), and froth that is thin at its rim and closed on the crest
        this.fillBand(ctx, breaking, (run, i) => run.out[i] + 0.04, (run, i) => run.out[i] + 0.34 + 0.5 * run.progress[i], foam.lace, 0.4 * share)
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - 0.05, (run, i) => run.out[i] + 0.26 + 0.2 * run.progress[i], foam.froth[0], 0.8 * share)
        // the same clumps laid on twice, the second time closer to the crest: the froth thickens towards it without an edge
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - 0.03, (run, i) => run.out[i] + 0.06 + 0.2 * run.tuft[i], foam.froth[1], 0.6 * share)
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - 0.02, (run, i) => run.out[i] + 0.03 + 0.12 * run.tuft[i], foam.froth[1], 0.6 * share)
        this.fillBand(ctx, breaking, (run, i) => run.out[i] - 0.012, (run, i) => run.out[i] + 0.08 * Math.max(0, run.tuft[i] - 0.35), foam.froth[2], 0.85 * share)
      }
    }
    for (let level = 1; level <= LEVELS; level++) {
      const share = level / LEVELS
      const swash = runs.filter((run) => run.swashLevel === level)
      if (swash.length === 0) continue
      // on the sand: a film of water, the net of foam the last wave left, and the froth: flecks ahead of it, clumps, and a closed white edge
      // the film ends where the bare sand ends: beyond it lies water anyway, and no edge of it shows in the shallows
      this.fillBand(ctx, swash, (run, i) => run.edge[i], (run, i) => Math.max(run.edge[i], BARE_SAND + 0.1), FILM, 1)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] + 0.05, (run, i) => run.edge[i] + 0.34 + 0.35 * run.climb[i], foam.lace, 0.35 + 0.3 * share)
      // the froth throws a little shade on the sand in front of it
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.04 - 0.015 * run.rough[i], (run, i) => run.edge[i] - 0.005, SHADE, 0.35 + 0.4 * share)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.02, (run, i) => run.edge[i] + 0.24 + 0.16 * run.climb[i], foam.froth[0], 0.7 + 0.2 * share)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.014, (run, i) => run.edge[i] + 0.06 + 0.2 * run.tuft[i], foam.froth[1], 0.55 + 0.15 * share)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.01, (run, i) => run.edge[i] + 0.03 + 0.12 * run.tuft[i], foam.froth[1], 0.55 + 0.15 * share)
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.008, (run, i) => run.edge[i] + 0.012 + 0.1 * Math.max(0, run.tuft[i] - 0.3), foam.froth[2], 0.8 + 0.15 * share)
      // the very edge is white only where the froth is thick: it swells, thins out and breaks off
      this.fillBand(ctx, swash, (run, i) => run.edge[i] - 0.012 * tornFoam(run.rough[i]), (run, i) => run.edge[i] + (0.008 + 0.03 * run.rough[i]) * tornFoam(run.rough[i]), solidFoam, 0.6 + 0.3 * share)
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
  private drawStill(ctx: CanvasRenderingContext2D, shore: Shore, range: TileRange, seed: number, part: 'water' | 'sand'): void {
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
        if (picture === undefined && part === 'water' && made < SHORE_PER_FRAME) {
          made++
          picture = renderShore(shore.pieces, rx, ry, seed)
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
        ctx.drawImage(picture[part], left, top, right - left, bottom - top)
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
