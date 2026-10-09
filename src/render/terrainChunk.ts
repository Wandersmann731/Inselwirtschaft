import { decorForTile, type DecorItem } from '../world/decor'
import { groundPixel, type GroundTextures } from '../world/ground'
import { Terrain, type GameMap } from '../world/terrain'
import { sprites } from './sprites'

/** The terrain is drawn in rectangles of this size (world pixels). Each rectangle is its own picture. */
export const CHUNK_W = 512
export const CHUNK_H = 256

const HALF_W = 32
const HALF_H = 16
/** Objects reach beyond the rectangle: wide trees sideways, tall peaks upwards. */
const EXPAND_X = 150
const EXPAND_UP = 270
const EXPAND_DOWN = 24

export interface ChunkContext {
  map: GameMap
  seed: number
  climate: string
  occupancy: number[]
  roads: number[]
  textures: GroundTextures
}

/** Indices of the tiles whose objects can reach into the rectangle (rx, ry). */
export function chunkTiles(map: GameMap, rx: number, ry: number): number[] {
  const x0 = rx * CHUNK_W
  const y0 = ry * CHUNK_H
  const minX = x0 - EXPAND_X
  const maxX = x0 + CHUNK_W + EXPAND_X
  const minY = y0 - EXPAND_DOWN
  const maxY = y0 + CHUNK_H + EXPAND_UP
  const us: number[] = []
  const vs: number[] = []
  for (const [wx, wy] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) {
    us.push((wy / HALF_H + wx / HALF_W) / 2)
    vs.push((wy / HALF_H - wx / HALF_W) / 2)
  }
  const tx0 = Math.max(0, Math.floor(Math.min(...us)) - 1)
  const tx1 = Math.min(map.width - 1, Math.ceil(Math.max(...us)) + 1)
  const ty0 = Math.max(0, Math.floor(Math.min(...vs)) - 1)
  const ty1 = Math.min(map.height - 1, Math.ceil(Math.max(...vs)) + 1)
  const found: number[] = []
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ax = (tx - ty) * HALF_W
      const ay = (tx + ty + 1) * HALF_H
      if (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) found.push(ty * map.width + tx)
    }
  }
  return found
}

/** Changes when a building or road appears or disappears on one of the tiles. */
export function layoutSignature(tiles: number[], occupancy: number[], roads: number[]): number {
  let hash = 0
  for (const index of tiles) {
    if (occupancy[index] !== 0 || roads[index] !== 0) hash = (Math.imul(hash, 31) + index * 3 + (roads[index] ? 1 : 2)) | 0
  }
  return hash
}

/** All objects (trees, peaks, tufts ...) of the given tiles with their base position in world pixels. */
export function decorOf(ctx: ChunkContext, tiles: number[]): { item: DecorItem; wx: number; wy: number }[] {
  const { map } = ctx
  const decorCtx = {
    map,
    seed: ctx.seed,
    climate: ctx.climate,
    blocked: (x: number, y: number) => ctx.occupancy[y * map.width + x] !== 0 || ctx.roads[y * map.width + x] !== 0,
  }
  const result: { item: DecorItem; wx: number; wy: number }[] = []
  for (const index of tiles) {
    const tx = index % map.width
    const ty = (index - tx) / map.width
    for (const item of decorForTile(decorCtx, tx, ty)) {
      result.push({ item, wx: (item.x - item.y) * HALF_W, wy: (item.x + item.y) * HALF_H })
    }
  }
  return result
}

/**
 * Draws one rectangle of the terrain: the ground pixel by pixel from noise-warped textures, then every object that
 * reaches into the rectangle, back to front. Returns null if there is no land in or near it.
 */
export function renderChunk(rx: number, ry: number, tiles: number[], ctx: ChunkContext, scale: number): HTMLCanvasElement | null {
  const { map } = ctx
  if (!tiles.some((index) => map.tiles[index] !== Terrain.Water)) return null
  const x0 = rx * CHUNK_W
  const y0 = ry * CHUNK_H

  const ground = document.createElement('canvas')
  ground.width = CHUNK_W
  ground.height = CHUNK_H
  const groundCtx = ground.getContext('2d')
  if (!groundCtx) return null
  const image = groundCtx.createImageData(CHUNK_W, CHUNK_H)
  for (let y = 0; y < CHUNK_H; y++) {
    for (let x = 0; x < CHUNK_W; x++) {
      groundPixel(map, ctx.textures, ctx.seed, x0 + x + 0.5, y0 + y + 0.5, image.data, (y * CHUNK_W + x) * 4)
    }
  }
  groundCtx.putImageData(image, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = CHUNK_W * scale
  canvas.height = CHUNK_H * scale
  const out = canvas.getContext('2d')
  if (!out) return null
  out.imageSmoothingEnabled = true
  out.drawImage(ground, 0, 0, canvas.width, canvas.height)
  out.scale(scale, scale)

  const objects = decorOf(ctx, tiles).sort((a, b) => a.wy - b.wy || a.wx - b.wx)
  for (const { item, wx, wy } of objects) {
    const sprite = sprites.get(`decor/${item.kind}_${item.variant}`)
    if (!sprite) continue
    const width = (sprite.width / 2) * item.scale
    const height = (sprite.height / 2) * item.scale
    const left = wx - x0 - width / 2
    const top = wy - y0 - height
    if (left > CHUNK_W || left + width < 0 || top > CHUNK_H || top + height < 0) continue
    if (item.flip) {
      out.save()
      out.translate(left + width, top)
      out.scale(-1, 1)
      out.drawImage(sprite, 0, 0, width, height)
      out.restore()
    } else {
      out.drawImage(sprite, left, top, width, height)
    }
  }
  return canvas
}
