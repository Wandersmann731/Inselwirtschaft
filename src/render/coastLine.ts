// The coast as lines: where the land of the ground picture ends (see landShare in groundTextures.ts), followed
// point by point, smooth, with the direction out to sea at every point. The surf and the shore are drawn along it.
import { valueNoise } from '../world/noise2d'
import { Terrain, type GameMap } from '../world/terrain'
import { landShare } from './groundTextures'
import { HALF_H, HALF_W } from './iso'

export type TilePoint = [number, number]
/** Tells which tiles carry a building or road: they are land, and sand reaches out around them. */
export type Solid = (x: number, y: number) => boolean

/** Points per piece of coast; pieces share their end points, so the foam is one line. */
const PIECE = 14
/** A wave reaches the shore this much later per point of coast, in wave periods: its front meets the land at an angle. */
const LAG = 0.011
/** How far from its first place a point may be moved onto the real coast, in tiles, and the steps of the search. */
const SNAP = 0.55
const SNAP_STEPS = 6

/**
 * The coast lines of a map as closed polylines in tile coordinates: the border between land and sea tiles, found by
 * marching squares over the tile centres. Every line is closed, the first point is repeated at the end.
 */
export function findCoastLines(map: GameMap, solid?: Solid): TilePoint[][] {
  const isLand = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < map.width && y < map.height && (map.tiles[y * map.width + x] !== Terrain.Water || solid?.(x, y) === true)
  const links = new Map<string, string[]>()
  const points = new Map<string, TilePoint>()
  const key = (x: number, y: number): string => {
    const id = `${x * 2},${y * 2}`
    points.set(id, [x, y])
    return id
  }
  const link = (a: string, b: string): void => {
    links.set(a, [...(links.get(a) ?? []), b])
    links.set(b, [...(links.get(b) ?? []), a])
  }
  for (let j = -1; j < map.height; j++) {
    for (let i = -1; i < map.width; i++) {
      const a = isLand(i, j)
      const b = isLand(i + 1, j)
      const c = isLand(i, j + 1)
      const d = isLand(i + 1, j + 1)
      const crossings: string[] = []
      // midpoints of the cell edges (the corners are tile centres, at +0.5)
      if (a !== b) crossings.push(key(i + 1, j + 0.5))
      if (b !== d) crossings.push(key(i + 1.5, j + 1))
      if (c !== d) crossings.push(key(i + 1, j + 1.5))
      if (a !== c) crossings.push(key(i + 0.5, j + 1))
      if (crossings.length === 2) link(crossings[0], crossings[1])
      else if (crossings.length === 4) {
        link(crossings[0], crossings[3])
        link(crossings[1], crossings[2])
      }
    }
  }

  const lines: TilePoint[][] = []
  const used = new Set<string>()
  for (const start of links.keys()) {
    if (used.has(start)) continue
    const line: TilePoint[] = []
    let previous = ''
    let current = start
    for (;;) {
      used.add(current)
      line.push(points.get(current)!)
      const next = (links.get(current) ?? []).find((id) => id !== previous && !used.has(id))
      if (!next) break
      previous = current
      current = next
    }
    line.push(line[0])
    if (line.length > 3) lines.push(line)
  }
  return lines
}

/** Tile vector to world vector. */
export const toWorld = (du: number, dv: number): [number, number] => [(du - dv) * HALF_W, (du + dv) * HALF_H]

/** A closed line (first point repeated at the end) with a point added in the middle of every stretch. */
function halved(line: TilePoint[]): TilePoint[] {
  const out: TilePoint[] = []
  for (let k = 0; k < line.length - 1; k++) {
    out.push(line[k], [(line[k][0] + line[k + 1][0]) / 2, (line[k][1] + line[k + 1][1]) / 2])
  }
  out.push(out[0])
  return out
}

/** A closed line with its corners cut (Chaikin): twice the points, and bends become curves. */
export function rounded(line: TilePoint[]): TilePoint[] {
  const out: TilePoint[] = []
  for (let k = 0; k < line.length - 1; k++) {
    const [au, av] = line[k]
    const [bu, bv] = line[k + 1]
    out.push([au * 0.75 + bu * 0.25, av * 0.75 + bv * 0.25], [au * 0.25 + bu * 0.75, av * 0.25 + bv * 0.75])
  }
  out.push(out[0])
  return out
}

/** For every point of a closed line the unit vector across the line (to its left as the line runs). */
function across(line: TilePoint[]): TilePoint[] {
  const last = line.length - 1
  return line.map((_, k): TilePoint => {
    const [pu, pv] = line[k === 0 ? last - 1 : k - 1]
    const [qu, qv] = line[k === last ? 1 : k + 1]
    const length = Math.hypot(qu - pu, qv - pv) || 1
    return [-(qv - pv) / length, (qu - pu) / length]
  })
}

/**
 * The coast of the ground picture as smooth closed lines in tile coordinates, and for each point the unit vector out
 * to sea. The lines between land and sea tiles are moved onto the real coast, the 0.5 line of landShare: every point
 * looks along its normal for the place where the land ends.
 */
export function coastCurves(map: GameMap, seed: number, solid?: Solid): { line: TilePoint[]; out: TilePoint[] }[] {
  const share = (u: number, v: number): number => landShare(map, seed, u, v, solid)
  return findCoastLines(map, solid).map((raw) => {
    const line = halved(raw)
    const normals = across(line)
    const last = line.length - 1
    for (let k = 0; k < last; k++) {
      const [u, v] = line[k]
      let [nu, nv] = normals[k]
      let inner = share(u - nu * SNAP, v - nv * SNAP)
      let outer = share(u + nu * SNAP, v + nv * SNAP)
      if (inner < outer) {
        // the land lies on the other side
        nu = -nu
        nv = -nv
        ;[inner, outer] = [outer, inner]
      }
      // no coast across this point within reach: leave it where it is
      if (inner < 0.5 || outer >= 0.5) continue
      let low = -SNAP
      let high = SNAP
      for (let step = 0; step < SNAP_STEPS; step++) {
        const middle = (low + high) / 2
        if (share(u + nu * middle, v + nv * middle) >= 0.5) low = middle
        else high = middle
      }
      line[k] = [u + nu * ((low + high) / 2), v + nv * ((low + high) / 2)]
    }
    line[last] = line[0]
    const smooth = rounded(line)
    // which side is the sea: asked at a few points, the line never changes sides
    const out = across(smooth)
    let votes = 0
    const stride = Math.max(1, Math.floor(smooth.length / 12))
    for (let k = 0; k < smooth.length - 1; k += stride) {
      const [u, v] = smooth[k]
      const [nu, nv] = out[k]
      votes += share(u + nu * 0.35, v + nv * 0.35) < share(u - nu * 0.35, v - nv * 0.35) ? 1 : -1
    }
    return { line: smooth, out: votes >= 0 ? out : out.map(([nu, nv]): TilePoint => [-nu, -nv]) }
  })
}

export interface Piece {
  /** Shore points in world pixels, and for each the direction out to sea (world pixels per tile). */
  x: number[]
  y: number[]
  nx: number[]
  ny: number[]
  /** For each point how much later a wave arrives there, in wave periods: it grows along the coast. */
  lag: number[]
  /** For each point a value from 0 to 1 that changes slowly along the coast: where the froth is thick and where thin. */
  rough: number[]
  minU: number
  maxU: number
  minV: number
  maxV: number
  /** Box of the shore points in world pixels. */
  box: { minX: number; maxX: number; minY: number; maxY: number }
}

/** The coast in pieces of a few points each, for drawing only what is on screen. */
export function buildPieces(map: GameMap, seed: number, solid?: Solid): Piece[] {
  const pieces: Piece[] = []
  for (const { line, out } of coastCurves(map, seed, solid)) {
    const last = line.length - 1
    for (let from = 0; from < last; from += PIECE - 1) {
      const to = Math.min(last, from + PIECE - 1)
      const piece: Piece = { x: [], y: [], nx: [], ny: [], lag: [], rough: [], minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity, box: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity } }
      for (let k = from; k <= to; k++) {
        const [u, v] = line[k]
        const [wx, wy] = toWorld(u, v)
        const [nx, ny] = toWorld(out[k][0], out[k][1])
        piece.x.push(wx)
        piece.y.push(wy)
        piece.nx.push(nx)
        piece.ny.push(ny)
        piece.lag.push(k * LAG)
        piece.rough.push(valueNoise(k * 0.27, line.length * 0.37, seed + 61))
        piece.minU = Math.min(piece.minU, u)
        piece.maxU = Math.max(piece.maxU, u)
        piece.minV = Math.min(piece.minV, v)
        piece.maxV = Math.max(piece.maxV, v)
        piece.box.minX = Math.min(piece.box.minX, wx)
        piece.box.maxX = Math.max(piece.box.maxX, wx)
        piece.box.minY = Math.min(piece.box.minY, wy)
        piece.box.maxY = Math.max(piece.box.maxY, wy)
      }
      pieces.push(piece)
    }
  }
  return pieces
}
