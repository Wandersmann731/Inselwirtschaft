import { HALF_H, HALF_W } from './iso'
import type { TileRange } from './buildingRenderer'
import { coastWarp, landField } from '../world/ground'
import { Terrain, type GameMap } from '../world/terrain'

/** Number of wave groups along a coast. Each group runs a little later than the one before, so waves roll along the shore. */
const BUCKETS = 6
/** Seconds one wave needs to roll in. */
const WAVE_SECONDS = 4
/** How far out a wave starts, in tiles. */
const REACH = 0.9
/** Points per piece of coast; pieces share their end points, so the foam is one line. */
const PIECE = 8
const FOAM = '255, 255, 255'

export type TilePoint = [number, number]

/**
 * The coast lines of a map as closed polylines in tile coordinates: the 0.5 line of the land field (see landField),
 * found by marching squares over the tile centres. Every line is closed, the first point is repeated at the end.
 */
export function findCoastLines(map: GameMap): TilePoint[][] {
  const isLand = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] !== Terrain.Water
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
const toWorld = (du: number, dv: number): [number, number] => [(du - dv) * HALF_W, (du + dv) * HALF_H]

interface Piece {
  /** Shore points in world pixels, and for each the direction out to sea (world pixels per tile). */
  x: number[]
  y: number[]
  nx: number[]
  ny: number[]
  bucket: number
  minU: number
  maxU: number
  minV: number
  maxV: number
}

/** Pieces of coast with the sea direction at every point; the points are moved as the ground is moved by noise. */
function buildPieces(map: GameMap, seed: number): Piece[] {
  const pieces: Piece[] = []
  for (const line of findCoastLines(map)) {
    // where the ground picture really shows the coast: the lookup is shifted by the warp, so the line moves back
    const shore = line.map(([u, v]): TilePoint => {
      const [du, dv] = coastWarp(u, v, seed)
      return [u - du, v - dv]
    })
    const last = shore.length - 1
    const dirs = shore.map((p, k): TilePoint => {
      const [pu, pv] = shore[k === 0 ? last - 1 : k - 1]
      const [qu, qv] = shore[k === last ? 1 : k + 1]
      const length = Math.hypot(qu - pu, qv - pv) || 1
      let nu = -(qv - pv) / length
      let nv = (qu - pu) / length
      if (landField(map, p[0] + nu * 0.3, p[1] + nv * 0.3) > landField(map, p[0] - nu * 0.3, p[1] - nv * 0.3)) {
        nu = -nu
        nv = -nv
      }
      return [nu, nv]
    })
    for (let from = 0; from < last; from += PIECE - 1) {
      const to = Math.min(last, from + PIECE - 1)
      const piece: Piece = { x: [], y: [], nx: [], ny: [], bucket: 0, minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity }
      for (let k = from; k <= to; k++) {
        const [u, v] = shore[k]
        const [wx, wy] = toWorld(u, v)
        const [nx, ny] = toWorld(dirs[k][0], dirs[k][1])
        piece.x.push(wx)
        piece.y.push(wy)
        piece.nx.push(nx)
        piece.ny.push(ny)
        piece.minU = Math.min(piece.minU, u)
        piece.maxU = Math.max(piece.maxU, u)
        piece.minV = Math.min(piece.minV, v)
        piece.maxV = Math.max(piece.maxV, v)
      }
      const [u, v] = shore[from]
      piece.bucket = Math.floor((((u * 0.35 + v * 0.2) % 1) + 1) % 1 * BUCKETS)
      pieces.push(piece)
    }
  }
  return pieces
}

/** Foam along the coasts: a thin line at the shore and waves that roll in along the rounded coast line and fade out. */
export class Surf {
  private cache = new WeakMap<GameMap, Piece[]>()

  draw(ctx: CanvasRenderingContext2D, map: GameMap, seed: number, range: TileRange, now: number, animated: boolean): void {
    let pieces = this.cache.get(map)
    if (!pieces) {
      pieces = buildPieces(map, seed)
      this.cache.set(map, pieces)
    }
    const visible = pieces.filter((p) => p.maxU >= range.minI - 1 && p.minU <= range.maxI + 2 && p.maxV >= range.minJ - 1 && p.minV <= range.maxJ + 2)
    if (visible.length === 0) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(${FOAM}, ${animated ? 0.28 + 0.1 * Math.sin(now / 900) : 0.28})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (const piece of visible) addPiece(ctx, piece, 0.04)
    ctx.stroke()
    if (animated) {
      for (let bucket = 0; bucket < BUCKETS; bucket++) {
        // 0 = far out, 1 = at the shore; the group is offset by its place along the coast
        const progress = (now / 1000 / WAVE_SECONDS + bucket / BUCKETS) % 1
        const alpha = Math.sin(progress * Math.PI) * 0.5
        if (alpha < 0.02) continue
        ctx.strokeStyle = `rgba(${FOAM}, ${alpha})`
        ctx.lineWidth = 2 + 2 * progress
        ctx.beginPath()
        for (const piece of visible) if (piece.bucket === bucket) addPiece(ctx, piece, REACH * (1 - progress) + 0.04)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

/** Adds a piece of coast to the path, moved `out` tiles towards the sea, with rounded bends. */
function addPiece(ctx: CanvasRenderingContext2D, piece: Piece, out: number): void {
  const n = piece.x.length
  const px = (k: number): number => piece.x[k] + piece.nx[k] * out
  const py = (k: number): number => piece.y[k] + piece.ny[k] * out
  ctx.moveTo(px(0), py(0))
  for (let k = 1; k < n - 1; k++) ctx.quadraticCurveTo(px(k), py(k), (px(k) + px(k + 1)) / 2, (py(k) + py(k + 1)) / 2)
  ctx.lineTo(px(n - 1), py(n - 1))
}
