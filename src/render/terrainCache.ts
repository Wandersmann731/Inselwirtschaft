import type { GroundTextures } from '../world/ground'
import type { GameMap } from '../world/terrain'
import { CHUNK_H, CHUNK_W, chunkDependencies, chunkTiles, layoutSignature, renderChunk } from './terrainChunk'

interface Entry {
  tiles: number[]
  /** Tiles whose buildings and roads change the picture (wider than `tiles`: the village yard reaches further). */
  deps: number[]
  canvas: HTMLCanvasElement | null
  /** True once a picture was made (it may be null for rectangles without land). */
  ready: boolean
  /** Picture scale the canvas was made at. An old-scale picture is still drawn until the new one is ready. */
  scale: number
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

/** Pictures kept besides the ones on screen, per picture scale. */
const KEEP = { low: 80, high: 28 }

/**
 * Keeps the pictures of the terrain rectangles. They are made a few at a time, so the game does not stall when
 * you scroll or zoom out, and made again when a building or road changes on or near their tiles.
 */
export class TerrainCache {
  private entries = new Map<string, Entry>()
  private queue: { rx: number; ry: number }[] = []
  private map: GameMap | null = null
  private scale = 1
  private latest: ChunkRequest | null = null
  /** Rectangles asked for since the last process(): they are never thrown away. */
  private frameKeys = new Set<string>()

  /** Drops everything if the map changed. A new picture scale only makes the rectangles again, one by one. */
  prepare(map: GameMap, scale: number): void {
    if (map !== this.map) {
      this.entries.clear()
      this.queue = []
      this.map = map
    }
    this.scale = scale
  }

  /** Asks for a rectangle. Returns what can be drawn now (null while it is being made) and whether a picture exists. */
  request(rx: number, ry: number, request: ChunkRequest): { canvas: HTMLCanvasElement | null; ready: boolean; tiles: number[] } {
    this.latest = request
    const key = `${rx},${ry}`
    let entry = this.entries.get(key)
    if (!entry) {
      const tiles = chunkTiles(request.map, rx, ry)
      const deps = chunkDependencies(request.map, rx, ry)
      entry = { tiles, deps, canvas: null, ready: false, scale: this.scale, signature: 0, queued: false }
    } else {
      this.entries.delete(key) // move to the end: most recently used
    }
    this.entries.set(key, entry)
    this.frameKeys.add(key)
    const signature = layoutSignature(entry.deps, request.occupancy, request.roads)
    if ((!entry.ready || signature !== entry.signature || entry.scale !== this.scale) && !entry.queued) {
      entry.queued = true
      this.queue.push({ rx, ry })
    }
    return { canvas: entry.canvas, ready: entry.ready, tiles: entry.tiles }
  }

  /** The current state of a rectangle without asking for it. */
  get(rx: number, ry: number): { canvas: HTMLCanvasElement | null; ready: boolean; tiles: number[] } | null {
    const entry = this.entries.get(`${rx},${ry}`)
    return entry ? { canvas: entry.canvas, ready: entry.ready, tiles: entry.tiles } : null
  }

  /** Call once per frame after all requests: drops old pictures, then makes queued rectangles until the time budget is used up. */
  process(budgetMs: number): void {
    this.evict()
    const started = performance.now()
    while (this.queue.length > 0 && performance.now() - started < budgetMs) {
      const job = this.queue.shift()!
      const entry = this.entries.get(`${job.rx},${job.ry}`)
      const request = this.latest
      if (!entry || !request) continue
      entry.canvas = renderChunk(job.rx, job.ry, entry.tiles, request, this.scale)
      entry.signature = layoutSignature(entry.deps, request.occupancy, request.roads)
      entry.scale = this.scale
      entry.ready = true
      entry.queued = false
    }
  }

  /** Rectangles waiting to be made. */
  get pending(): number {
    return this.queue.length
  }

  /** Drops the least recently used pictures beyond the limit, but never one asked for in this frame. */
  private evict(): void {
    const limit = Math.max(this.scale > 1 ? KEEP.high : KEEP.low, this.frameKeys.size)
    for (const key of this.entries.keys()) {
      if (this.entries.size <= limit) break
      if (!this.frameKeys.has(key)) this.entries.delete(key)
    }
    this.frameKeys.clear()
    this.queue = this.queue.filter((job) => this.entries.has(`${job.rx},${job.ry}`))
  }
}

export { CHUNK_H, CHUNK_W }
