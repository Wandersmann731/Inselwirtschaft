// Roads, made by code: a road is no row of square tiles but a path that runs through the middles of its tiles in
// curves, with a ragged edge. Out in the country it is a cart track of trodden earth with two ruts and pebbles; near
// the houses of a town and its public buildings it is paved with cobbles. The roads of each rectangle of the map are
// worked out once, kept as a picture and made again only when a road or a house near it changes.
import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { tierIndex } from '../sim/tiers'
import { hash2, valueNoise } from '../world/noise2d'
import type { TileRange } from './buildingRenderer'
import { HALF_H, HALF_W } from './iso'
import { roadTextures, TEX, TEX_TILES } from './roadTextures'

/** The roads are kept in pictures of this many world pixels. */
const RECT_W = 512
const RECT_H = 256
/** Road tiles this far outside a rectangle (world pixels) still reach into it. */
const MARGIN = 56
/** Pictures made per frame at most: the rest follows in the next frames, the old ones stay until then. */
const PER_FRAME = 1
/** World pixels along a tile axis on the ground plane (a tile is 64 by 32 on screen, so 45 on the ground). */
const TILE_GROUND = Math.hypot(HALF_W, 2 * HALF_H)
/**
 * The path is stroked this many times, from wide to narrow (widths in tiles), each stroke adding STEP of what is
 * missing: the sum is a profile across the road, low at its edge and high in its middle.
 */
const WIDTHS = [0.98, 0.86, 0.74, 0.62, 0.5, 0.38, 0.26, 0.14]
const STEP = 0.2
const level = (strokes: number): number => 1 - Math.pow(1 - STEP, strokes)
/** Where on that profile a track ends, where a paved road ends, where the ruts of a track lie and where its grassy middle begins. */
const EDGE = { track: (level(2) + level(3)) / 2, paved: (level(1) + level(2)) / 2 + 0.02 }
/** The same for the paving of a road: it reaches this far beyond the last paved tile and is full from the narrowest stroke on. */
const PAVING_WIDTHS = [2.0, 1.86, 1.72, 1.58, 1.44, 1.3, 1.16, 1.02]
const PAVING_FULL = level(PAVING_WIDTHS.length)
/** How unevenly the paving ends: each stone has its own idea of where (in shares of that run). */
const FRAY = 0.95
/** The share of stones that are missing from a pavement: earth shows there. */
const MISSING = 0.05
const RUT = level(5)
const MIDDLE = level(7)
/** Houses from this tier on and public buildings pave the roads within this many tiles. */
const PAVED_FROM = tierIndex('settlers')
const PAVED_REACH = 2
/** How far the middle of a road tile is moved off its centre, in tiles: no road is drawn with a ruler. */
const WANDER = 0.1

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** The tiles whose roads are paved: those near a house of a town or a public building (1), all others 0. */
export function pavedTiles(state: Pick<IslandState, 'map' | 'buildings'>): Uint8Array {
  const { width, height } = state.map
  const paved = new Uint8Array(width * height)
  for (const building of state.buildings) {
    const town = building.house ? !building.house.ruin && tierIndex(building.house.tier) >= PAVED_FROM : getBuilding(building.type).category === 'public'
    if (!town) continue
    const rect = buildingRect(building)
    for (let y = Math.max(0, rect.y - PAVED_REACH); y < Math.min(height, rect.y + rect.h + PAVED_REACH); y++) {
      for (let x = Math.max(0, rect.x - PAVED_REACH); x < Math.min(width, rect.x + rect.w + PAVED_REACH); x++) paved[y * width + x] = 1
    }
  }
  return paved
}

/** The middle of the road on a tile, on the ground plane (world x, twice the world y). */
function node(x: number, y: number, seed: number): [number, number] {
  const u = x + 0.5 + (hash2(x, y, seed + 801) - 0.5) * 2 * WANDER
  const v = y + 0.5 + (hash2(x, y, seed + 802) - 0.5) * 2 * WANDER
  return [(u - v) * HALF_W, (u + v) * HALF_H * 2]
}

/**
 * Adds the paths of the given road tiles to the current path of `g`: through a tile the road runs in a curve from
 * the middle of one neighbour's edge to the next, so bends are round and crossings widen a little.
 */
function trace(g: CanvasRenderingContext2D, state: Pick<IslandState, 'map' | 'roads' | 'id'>, tiles: number[]): void {
  const { width, height } = state.map
  const isRoad = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && state.roads[y * width + x] !== 0
  for (const index of tiles) {
    const x = index % width
    const y = (index - x) / width
    const [nx, ny] = node(x, y, state.id)
    const mids: [number, number][] = []
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      if (!isRoad(x + dx, y + dy)) continue
      const [ox, oy] = node(x + dx, y + dy, state.id)
      mids.push([(nx + ox) / 2, (ny + oy) / 2])
    }
    if (mids.length === 0) {
      g.moveTo(nx, ny)
      g.lineTo(nx + 0.01, ny)
    } else if (mids.length === 1) {
      g.moveTo(nx, ny)
      g.lineTo(mids[0][0], mids[0][1])
    } else {
      for (let a = 0; a < mids.length; a++) {
        for (let b = a + 1; b < mids.length; b++) {
          g.moveTo(mids[a][0], mids[a][1])
          g.quadraticCurveTo(nx, ny, mids[b][0], mids[b][1])
        }
      }
    }
  }
}

/** Indices of the road tiles that reach into rectangle (rx, ry). */
function roadTilesOf(state: Pick<IslandState, 'map' | 'roads'>, rx: number, ry: number): number[] {
  const { width, height } = state.map
  const minX = rx * RECT_W - MARGIN
  const maxX = (rx + 1) * RECT_W + MARGIN
  const minY = ry * RECT_H - MARGIN
  const maxY = (ry + 1) * RECT_H + MARGIN
  const us: number[] = []
  const vs: number[] = []
  for (const [wx, wy] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) {
    us.push((wy / HALF_H + wx / HALF_W) / 2)
    vs.push((wy / HALF_H - wx / HALF_W) / 2)
  }
  const found: number[] = []
  for (let y = Math.max(0, Math.floor(Math.min(...vs))); y <= Math.min(height - 1, Math.ceil(Math.max(...vs))); y++) {
    for (let x = Math.max(0, Math.floor(Math.min(...us))); x <= Math.min(width - 1, Math.ceil(Math.max(...us))); x++) {
      if (state.roads[y * width + x] === 0) continue
      const cx = (x - y) * HALF_W
      const cy = (x + y + 1) * HALF_H
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) found.push(y * width + x)
    }
  }
  return found
}

/** Changes when a road tile of the list comes or goes or changes between track and pavement. */
export function roadSignature(tiles: number[], paved: Uint8Array): number {
  let hash = 0
  for (const index of tiles) hash = (Math.imul(hash, 31) + index * 2 + paved[index] + 1) | 0
  return hash
}

/**
 * The picture of the roads of one rectangle at `scale` picture pixels per world pixel, or null if no road reaches it.
 * It is only as large as the part of the rectangle the roads lie in; (x, y) is where that part begins, in world pixels.
 */
function renderRoads(state: IslandState, tiles: number[], paved: Uint8Array, rx: number, ry: number, scale: number): { canvas: HTMLCanvasElement; x: number; y: number } | null {
  if (tiles.length === 0) return null
  const w = RECT_W * scale
  const h = RECT_H * scale
  const profile = document.createElement('canvas')
  const stone = document.createElement('canvas')
  const canvas = document.createElement('canvas')
  for (const layer of [profile, stone]) {
    layer.width = w
    layer.height = h
  }
  const p = profile.getContext('2d', { willReadFrequently: true })
  const s = stone.getContext('2d', { willReadFrequently: true })
  const out = canvas.getContext('2d')
  if (!p || !s || !out) return null
  // on the ground plane, which is twice as high as the screen: a width is the same in every direction on the ground
  for (const g of [p, s]) {
    g.setTransform(scale, 0, 0, scale * 0.5, -rx * RECT_W * scale, -ry * RECT_H * scale)
    g.lineCap = 'round'
    g.lineJoin = 'round'
  }
  p.beginPath()
  trace(p, state, tiles)
  p.strokeStyle = `rgba(255, 255, 255, ${STEP})`
  for (const width of WIDTHS) {
    p.lineWidth = width * TILE_GROUND
    p.stroke()
  }
  // where the road is paved: the same many strokes, much wider, so the paving runs out over half a tile
  s.beginPath()
  trace(s, state, tiles.filter((index) => paved[index] === 1))
  s.strokeStyle = `rgba(255, 255, 255, ${STEP})`
  for (const width of PAVING_WIDTHS) {
    s.lineWidth = width * TILE_GROUND
    s.stroke()
  }

  // only the part of the rectangle the roads lie in is worked on
  const { width } = state.map
  let left = w
  let right = 0
  let top = h
  let bottom = 0
  const reach = HALF_W * 1.4
  for (const index of tiles) {
    const tx = index % width
    const ty = (index - tx) / width
    const cx = ((tx - ty) * HALF_W - rx * RECT_W) * scale
    const cy = ((tx + ty + 1) * HALF_H - ry * RECT_H) * scale
    left = Math.min(left, cx - reach * scale)
    right = Math.max(right, cx + reach * scale)
    top = Math.min(top, cy - reach * scale)
    bottom = Math.max(bottom, cy + reach * scale)
  }
  const bx = Math.max(0, Math.floor(left))
  const by = Math.max(0, Math.floor(top))
  const bw = Math.min(w, Math.ceil(right)) - bx
  const bh = Math.min(h, Math.ceil(bottom)) - by
  if (bw <= 0 || bh <= 0) return null
  canvas.width = bw
  canvas.height = bh
  const across = p.getImageData(bx, by, bw, bh).data
  const paving = s.getImageData(bx, by, bw, bh).data
  const image = out.createImageData(bw, bh)
  const tex = roadTextures()
  const { cobble, track } = tex
  const seed = state.id
  const x0 = rx * RECT_W
  const y0 = ry * RECT_H
  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const o = (py * bw + px) * 4
      const a = across[o + 3] / 255
      if (a < 0.1) continue
      const wx = x0 + (bx + px + 0.5) / scale
      const wy = y0 + (by + py + 0.5) / scale
      const u = (wy / HALF_H + wx / HALF_W) / 2
      const v = (wy / HALF_H - wx / HALF_W) / 2
      const tx = Math.floor((((u / TEX_TILES) % 1) + 1) % 1 * TEX)
      const ty = Math.floor((((v / TEX_TILES) % 1) + 1) % 1 * TEX)
      const texel = ty * TEX + tx
      const t = texel * 3
      const slow = 0.9 + 0.2 * valueNoise(u * 0.9, v * 0.9, seed + 813)

      // Pavement is laid stone by stone: a stone is there or it is not, decided where its middle lies. So the
      // paving ends in loose single stones, and the side of a paved road is a row of whole stones.
      let stone = 0
      if (paving[o + 3] > 0) {
        const du = tex.du[texel]
        const dv = tex.dv[texel]
        const cx = Math.max(0, Math.min(bw - 1, Math.round(px + (du - dv) * HALF_W * scale)))
        const cy = Math.max(0, Math.min(bh - 1, Math.round(py + (du + dv) * HALF_H * scale)))
        const c = (cy * bw + cx) * 4
        const pick = tex.pick[texel] / 255
        const luck = tex.luck[texel] / 255
        const laid = paving[c + 3] / 255 / PAVING_FULL + (pick - 0.5) * FRAY > 0.5
        const onRoad = across[c + 3] / 255 + (luck - 0.5) * 0.12 > EDGE.paved
        const there = luck > MISSING || pick > 0.5
        // in the joints the ground below shows
        if (laid && onRoad && there) stone = smooth((tex.body[texel] / 255) * 2.2)
      }

      const ragged = valueNoise(u * 4.3, v * 4.3, seed + 811) - 0.5 + (valueNoise(u * 13, v * 13, seed + 812) - 0.5) * 0.5
      const cover = smooth((a + ragged * 0.15 - EDGE.track) / 0.07 + 0.5)
      if (cover <= 0 && stone <= 0) continue
      // the track: darker in its two ruts, and grass comes back in its middle where no wheel runs
      const rut = 1 - 0.2 * (1 - smooth(Math.abs(a - RUT) / 0.035))
      const grass = smooth((a - MIDDLE) / 0.05) * smooth((valueNoise(u * 2.6, v * 2.6, seed + 814) - 0.35) / 0.3) * 0.6
      // the rim lies a little lower and in shade
      const rim = (0.84 + 0.16 * smooth((a - EDGE.track) / 0.12)) * slow * rut
      let r = track[t] * rim
      let g = track[t + 1] * rim
      let b = track[t + 2] * rim
      r += (118 - r) * grass
      g += (132 - g) * grass
      b += (76 - b) * grass
      if (stone > 0) {
        // worn a little lighter where everybody walks
        const worn = slow * (1 + 0.07 * smooth((a - RUT) / 0.1))
        const mix = cover > 0 ? stone : 1
        r += (cobble[t] * worn - r) * mix
        g += (cobble[t + 1] * worn - g) * mix
        b += (cobble[t + 2] * worn - b) * mix
      }
      image.data[o] = r
      image.data[o + 1] = g
      image.data[o + 2] = b
      image.data[o + 3] = 255 * Math.max(cover, stone)
    }
  }
  out.putImageData(image, 0, 0)
  return { canvas, x: bx / scale, y: by / scale }
}

interface Entry {
  canvas: HTMLCanvasElement | null
  /** Where the picture begins in its rectangle, in world pixels. */
  x: number
  y: number
  signature: number
  scale: number
  /** The check of roads and houses this picture was last compared with. */
  checked: object | null
  tiles: number[]
}

/** How many road pictures are kept at a picture scale: as with the ground, a sharp one weighs 2 MB. Pure. */
export function keptRoads(scale: number): number {
  return scale > 1 ? 28 : 80
}

/** Keeps the road pictures of an island and draws those in view. */
export class RoadLayer {
  private entries = new Map<string, Entry>()
  private island = -1
  private roads: number[] | null = null
  private buildings: unknown = null
  private paved: Uint8Array = new Uint8Array(0)
  private stamp: object = {}

  /** Draws the roads over the ground. `scale` is the picture scale the terrain uses right now (1 or 2). */
  draw(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, scale: number): void {
    if (state.id !== this.island) {
      this.entries.clear()
      this.island = state.id
      this.roads = null
    }
    if (state.roads !== this.roads || state.buildings !== this.buildings) {
      this.roads = state.roads
      this.buildings = state.buildings
      this.paved = pavedTiles(state)
      this.stamp = {}
    }
    const corners = [[range.minI, range.minJ], [range.maxI + 1, range.minJ], [range.minI, range.maxJ + 1], [range.maxI + 1, range.maxJ + 1]].map(([u, v]) => [(u - v) * HALF_W, (u + v) * HALF_H])
    const minX = Math.min(...corners.map((c) => c[0]))
    const maxX = Math.max(...corners.map((c) => c[0]))
    const minY = Math.min(...corners.map((c) => c[1]))
    const maxY = Math.max(...corners.map((c) => c[1]))
    let made = 0
    const shown = new Set<string>()
    for (let ry = Math.floor(minY / RECT_H); ry <= Math.floor(maxY / RECT_H); ry++) {
      for (let rx = Math.floor(minX / RECT_W); rx <= Math.floor(maxX / RECT_W); rx++) {
        const key = `${rx},${ry}`
        let entry = this.entries.get(key)
        // moved to the end: the pictures used longest ago are the first to go
        if (entry) this.entries.delete(key)
        else entry = { canvas: null, x: 0, y: 0, signature: 0, scale: 0, checked: null, tiles: [] }
        this.entries.set(key, entry)
        if (entry.checked !== this.stamp || entry.scale !== scale) {
          if (entry.checked !== this.stamp) entry.tiles = roadTilesOf(state, rx, ry)
          const signature = roadSignature(entry.tiles, this.paved)
          if (signature === entry.signature && entry.scale === scale) entry.checked = this.stamp
          else if (made < PER_FRAME || entry.tiles.length === 0) {
            if (entry.tiles.length > 0) made++
            const road = renderRoads(state, entry.tiles, this.paved, rx, ry, scale)
            entry.canvas = road?.canvas ?? null
            entry.x = road?.x ?? 0
            entry.y = road?.y ?? 0
            entry.signature = signature
            entry.scale = scale
            entry.checked = this.stamp
          }
        }
        shown.add(key)
        if (entry.canvas) ctx.drawImage(entry.canvas, rx * RECT_W + entry.x, ry * RECT_H + entry.y, entry.canvas.width / entry.scale, entry.canvas.height / entry.scale)
      }
    }
    // pictures out of view are dropped, those used longest ago first: sharp ones are four times as heavy, so fewer are kept
    const limit = Math.max(keptRoads(scale), shown.size)
    for (const key of this.entries.keys()) {
      if (this.entries.size <= limit) break
      if (!shown.has(key)) this.entries.delete(key)
    }
  }
}
