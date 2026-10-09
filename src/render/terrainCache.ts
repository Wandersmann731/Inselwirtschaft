import type { GroundTextures } from '../world/ground'
import type { GameMap } from '../world/terrain'
import { CHUNK_H, CHUNK_W, chunkTiles, layoutSignature, renderChunk } from './terrainChunk'

interface Entry {
  tiles: number[]
  canvas: HTMLCanvasElement | null
  /** True once a picture was made (it may be null for rectangles without land). */
  ready: boolean
  signature: number
  queued: boolean
}

export interface ChunkRequest {
  map: GameMap
  seed: number
  climate: string
  occupancy: number[]
  roads: number[]
  yard: Float32Array | null
  textures: GroundTextures
}

/**
 * Keeps the pictures of the terrain rectangles. They are made a few at a time, so the game does not stall when
 * you scroll or zoom out, and made again when a building or road changes on their tiles.
 */
export class TerrainCache {
  private entries = new Map<string, Entry>()
  private queue: { rx: number; ry: number }[] = []
  private map: GameMap | null = null
  private scale = 1
  private latest: ChunkRequest | null = null

  /** Drops everything if the map or the picture scale changed. */
  prepare(map: GameMap, scale: number): void {
    if (map !== this.map || scale !== this.scale) {
      this.entries.clear()
      this.queue = []
      this.map = map
      this.scale = scale
    }
  }

  /** Asks for a rectangle. Returns what can be drawn now (null while it is being made) and whether a picture exists. */
  request(rx: number, ry: number, request: ChunkRequest): { canvas: HTMLCanvasElement | null; ready: boolean; tiles: number[] } {
    this.latest = request
    const key = `${rx},${ry}`
    let entry = this.entries.get(key)
    if (!entry) {
      entry = { tiles: chunkTiles(request.map, rx, ry), canvas: null, ready: false, signature: 0, queued: false }
    } else {
      this.entries.delete(key) // move to the end: most recently used
    }
    this.entries.set(key, entry)
    const signature = layoutSignature(entry.tiles, request.occupancy, request.roads)
    if ((!entry.ready || signature !== entry.signature) && !entry.queued) {
      entry.queued = true
      this.queue.push({ rx, ry })
    }
    this.evict()
    return { canvas: entry.canvas, ready: entry.ready, tiles: entry.tiles }
  }

  /** The current state of a rectangle without asking for it. */
  get(rx: number, ry: number): { canvas: HTMLCanvasElement | null; ready: boolean; tiles: number[] } | null {
    const entry = this.entries.get(`${rx},${ry}`)
    return entry ? { canvas: entry.canvas, ready: entry.ready, tiles: entry.tiles } : null
  }

  /** Makes queued rectangles until the time budget is used up. */
  process(budgetMs: number): void {
    const started = performance.now()
    while (this.queue.length > 0 && performance.now() - started < budgetMs) {
      const job = this.queue.shift()!
      const entry = this.entries.get(`${job.rx},${job.ry}`)
      const request = this.latest
      if (!entry || !request) continue
      entry.canvas = renderChunk(job.rx, job.ry, entry.tiles, request, this.scale)
      entry.signature = layoutSignature(entry.tiles, request.occupancy, request.roads)
      entry.ready = true
      entry.queued = false
    }
  }

  /** Rectangles waiting to be made. */
  get pending(): number {
    return this.queue.length
  }

  private evict(): void {
    const limit = this.scale > 1 ? 28 : 80
    while (this.entries.size > limit) {
      const oldest = this.entries.keys().next().value!
      this.entries.delete(oldest)
    }
    this.queue = this.queue.filter((job) => this.entries.has(`${job.rx},${job.ry}`))
  }
}

export { CHUNK_H, CHUNK_W }
