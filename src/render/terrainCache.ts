import { world } from '../data'
import type { GameMap } from '../world/terrain'
import { Terrain } from '../world/terrain'
import { HALF_H, HALF_W } from './iso'
import { paintTile } from './terrainStyle'

const CHUNK = world.chunkSize
export const CHUNK_PX_W = CHUNK * world.tileWidth
export const CHUNK_PX_H = CHUNK * world.tileHeight

/** World position of the top-left corner of a chunk's bitmap. */
export function chunkOrigin(cx: number, cy: number): { x: number; y: number } {
  const i0 = cx * CHUNK
  const j0 = cy * CHUNK
  return { x: (i0 - j0 - CHUNK) * HALF_W, y: (i0 + j0) * HALF_H }
}

/**
 * Caches static terrain as offscreen bitmaps, one per chunk of chunkSize x chunkSize
 * tiles, created when first visible. Chunks that are only water are stored as null.
 * Least recently used chunks are dropped once maxCachedChunks is exceeded.
 */
export class TerrainCache {
  private chunks = new Map<number, HTMLCanvasElement | null>()
  private map: GameMap | null = null
  private scale = 1

  /** Drops everything if the map object or the bitmap scale changed. */
  prepare(map: GameMap, scale: number): void {
    if (map !== this.map || scale !== this.scale) {
      this.chunks.clear()
      this.map = map
      this.scale = scale
    }
  }

  getChunk(cx: number, cy: number): HTMLCanvasElement | null {
    const map = this.map
    if (!map) return null
    const key = cy * Math.ceil(map.width / CHUNK) + cx
    if (this.chunks.has(key)) {
      const hit = this.chunks.get(key) ?? null
      this.chunks.delete(key)
      this.chunks.set(key, hit)
      return hit
    }
    const canvas = this.render(map, cx, cy)
    this.chunks.set(key, canvas)
    if (this.chunks.size > world.maxCachedChunks) {
      this.chunks.delete(this.chunks.keys().next().value!)
    }
    return canvas
  }

  private render(map: GameMap, cx: number, cy: number): HTMLCanvasElement | null {
    const i0 = cx * CHUNK
    const j0 = cy * CHUNK
    const i1 = Math.min(map.width, i0 + CHUNK)
    const j1 = Math.min(map.height, j0 + CHUNK)
    let hasLand = false
    for (let j = j0; j < j1 && !hasLand; j++) {
      for (let i = i0; i < i1; i++) {
        if (map.tiles[j * map.width + i] !== Terrain.Water) {
          hasLand = true
          break
        }
      }
    }
    if (!hasLand) return null

    const canvas = document.createElement('canvas')
    canvas.width = CHUNK_PX_W * this.scale
    canvas.height = CHUNK_PX_H * this.scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(this.scale, this.scale)
    const origin = chunkOrigin(cx, cy)
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) {
        const terrain = map.tiles[j * map.width + i]
        if (terrain === Terrain.Water) continue
        paintTile(ctx, terrain, (i - j) * HALF_W - origin.x, (i + j) * HALF_H - origin.y)
      }
    }
    return canvas
  }
}
