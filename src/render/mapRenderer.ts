import { world } from '../data'
import type { ToolSnapshot } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { inMap, TERRAIN_NAMES, type GameMap } from '../world/terrain'
import {
  centerCamera,
  clampCamera,
  panCamera,
  screenToWorld,
  visibleWorldRect,
  zoomCameraAt,
  type Camera,
  type Viewport,
} from './camera'
import { mapBounds, tileToWorld, worldToTile, type Bounds, type Point } from './iso'
import { drawBuildings, drawRoads, type TileRange } from './buildingRenderer'
import { OverlayRenderer } from './overlayRenderer'
import { sprites } from './sprites'
import { WaterPattern } from './water'
import { groundTextures } from './groundTextures'
import { CHUNK_H, CHUNK_W, TerrainCache } from './terrainCache'
import { SEA_COLOR, diamondPath, paintTile } from './terrainStyle'

const SELECTION_COLOR = '#ffd23f'
const ZOOM_LIMITS = { min: world.minZoom, max: world.maxZoom }
/** Above this device-pixels-per-world-pixel the chunk bitmaps are rendered at 2x. */
const HIGH_RES_THRESHOLD = 1.6

/**
 * Draws the map on a canvas. Lives outside React: React only mounts and destroys it.
 * Owns the camera and the selected tile, which are view state and not part of IslandState.
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement
  private getState: () => IslandState
  private getTool: () => ToolSnapshot
  private debug: boolean
  private ctx: CanvasRenderingContext2D
  private resizeObserver: ResizeObserver
  private cache = new TerrainCache()
  private overlay = new OverlayRenderer()
  private water: WaterPattern | null = null
  private rafId = 0
  private dpr = 1
  private viewport: Viewport = { width: 1, height: 1 }
  private camera: Camera = { x: 0, y: 0, zoom: 1 }
  private cameraMap: GameMap | null = null
  private selected: Point | null = null
  private fps = 0
  private frameCount = 0
  private fpsSince = 0
  private chunksDrawn = 0

  constructor(
    canvas: HTMLCanvasElement,
    getState: () => IslandState,
    getTool: () => ToolSnapshot,
    debug = false,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.canvas = canvas
    this.getState = getState
    this.getTool = getTool
    this.debug = debug
    this.ctx = ctx
    this.resizeObserver = new ResizeObserver(() => this.resize())
  }

  start(): void {
    this.resizeObserver.observe(this.canvas)
    this.resize()
    this.fpsSince = performance.now()
    this.rafId = requestAnimationFrame(this.frame)
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    this.resizeObserver.disconnect()
  }

  /** Drags the map by a screen-pixel delta. */
  panBy(dx: number, dy: number): void {
    this.camera = panCamera(this.camera, dx, dy, this.viewport, this.bounds())
  }

  /** Zooms by a factor around a screen point (CSS pixels relative to the canvas). */
  zoomAt(factor: number, sx: number, sy: number): void {
    this.camera = zoomCameraAt(this.camera, factor, sx, sy, this.viewport, this.bounds(), ZOOM_LIMITS)
  }

  /** The part of the world that is on screen right now. */
  visibleRect(): Bounds {
    return visibleWorldRect(this.camera, this.viewport)
  }

  /** Moves the camera so that a world point is in the middle of the screen. */
  centerOnWorld(wx: number, wy: number): void {
    this.camera = clampCamera({ ...this.camera, x: wx, y: wy }, this.viewport, this.bounds())
  }

  /** The map tile under a screen point (CSS pixels relative to the canvas), or null outside the map. */
  tileAt(sx: number, sy: number): Point | null {
    const w = screenToWorld(this.camera, this.viewport, sx, sy)
    const tile = worldToTile(w.x, w.y)
    const x = Math.floor(tile.x)
    const y = Math.floor(tile.y)
    return inMap(this.getState().map, x, y) ? { x, y } : null
  }

  /** Highlights the tile under a screen point, or clears the selection outside the map. */
  selectAt(sx: number, sy: number): void {
    this.selected = this.tileAt(sx, sy)
  }

  private bounds() {
    return mapBounds(this.getState().map)
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.viewport = { width: rect.width, height: rect.height }
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr))
    this.camera = clampCamera(this.camera, this.viewport, this.bounds())
  }

  private frame = (now: number): void => {
    this.draw()
    this.updateFps(now)
    this.rafId = requestAnimationFrame(this.frame)
  }

  private updateFps(now: number): void {
    this.frameCount++
    if (now - this.fpsSince >= 500) {
      this.fps = (this.frameCount * 1000) / (now - this.fpsSince)
      this.frameCount = 0
      this.fpsSince = now
    }
  }

  private draw(): void {
    const { ctx, canvas, dpr, viewport } = this
    const map = this.getState().map
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = SEA_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (map.width === 0) return
    const now = performance.now()

    if (map !== this.cameraMap) {
      this.cameraMap = map
      this.selected = null
      this.camera = centerCamera(mapBounds(map), 1, viewport)
    }

    const { zoom } = this.camera
    this.cache.prepare(map, zoom * dpr > HIGH_RES_THRESHOLD ? 2 : 1)

    // World -> device pixel transform.
    const k = dpr * zoom
    ctx.setTransform(k, 0, 0, k, dpr * (viewport.width / 2 - this.camera.x * zoom), dpr * (viewport.height / 2 - this.camera.y * zoom))
    const range = this.visibleTileRange(map)
    this.drawWater(now)
    const state = this.getState()
    this.drawTerrain(map, state)
    drawRoads(ctx, state, range)
    drawBuildings(ctx, state, range, now)
    this.overlay.draw(ctx, state, this.getTool())
    this.drawSelection()

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.debug) this.drawDebug(map)
  }

  /** The sea: an animated pattern over the visible part of the world. */
  private drawWater(now: number): void {
    if (!sprites.ready) return
    this.water ??= new WaterPattern(this.ctx)
    const pattern = this.water.at(now)
    if (!pattern) return
    const rect = visibleWorldRect(this.camera, this.viewport)
    this.ctx.fillStyle = pattern
    this.ctx.fillRect(rect.minX - 2, rect.minY - 2, rect.maxX - rect.minX + 4, rect.maxY - rect.minY + 4)
  }

  private visibleTileRange(map: GameMap): TileRange {
    const rect = visibleWorldRect(this.camera, this.viewport)
    const corners = [
      worldToTile(rect.minX, rect.minY),
      worldToTile(rect.maxX, rect.minY),
      worldToTile(rect.minX, rect.maxY),
      worldToTile(rect.maxX, rect.maxY),
    ]
    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
    return {
      minI: clamp(Math.floor(Math.min(...corners.map((c) => c.x))), map.width - 1),
      maxI: clamp(Math.floor(Math.max(...corners.map((c) => c.x))), map.width - 1),
      minJ: clamp(Math.floor(Math.min(...corners.map((c) => c.y))), map.height - 1),
      maxJ: clamp(Math.floor(Math.max(...corners.map((c) => c.y))), map.height - 1),
    }
  }

  /**
   * The land: rectangles of ground and scattered objects (see terrainChunk.ts). Rectangles that are not made yet
   * are shown as flat coloured tiles for a moment.
   */
  private drawTerrain(map: GameMap, state: IslandState): void {
    const rect = visibleWorldRect(this.camera, this.viewport)
    const textures = groundTextures()
    const bounds = mapBounds(map)
    const wanted: { rx: number; ry: number }[] = []
    for (let ry = Math.floor(rect.minY / CHUNK_H); ry <= Math.floor(rect.maxY / CHUNK_H); ry++) {
      for (let rx = Math.floor(rect.minX / CHUNK_W); rx <= Math.floor(rect.maxX / CHUNK_W); rx++) {
        const x0 = rx * CHUNK_W
        const y0 = ry * CHUNK_H
        if (x0 > bounds.maxX + 150 || x0 + CHUNK_W < bounds.minX - 150 || y0 > bounds.maxY + 60 || y0 + CHUNK_H < bounds.minY - 300) continue
        wanted.push({ rx, ry })
      }
    }

    const request = textures
      ? { map, seed: state.id, climate: state.climate, occupancy: state.occupancy, roads: state.roads, textures }
      : null
    if (request) {
      for (const { rx, ry } of wanted) this.cache.request(rx, ry, request)
      this.cache.process(10)
    }

    this.chunksDrawn = 0
    for (const { rx, ry } of wanted) {
      const entry = request ? this.cache.get(rx, ry) : null
      if (entry?.canvas) {
        this.ctx.drawImage(entry.canvas, rx * CHUNK_W, ry * CHUNK_H, CHUNK_W, CHUNK_H)
        this.chunksDrawn++
      }
      if (!entry?.ready) this.drawFlatTiles(map, rx, ry)
    }
  }

  /** Coloured diamonds for the tiles of one rectangle, until its real picture exists. */
  private drawFlatTiles(map: GameMap, rx: number, ry: number): void {
    const x0 = rx * CHUNK_W
    const y0 = ry * CHUNK_H
    const corners = [[x0, y0], [x0 + CHUNK_W, y0], [x0, y0 + CHUNK_H], [x0 + CHUNK_W, y0 + CHUNK_H]].map(([wx, wy]) => worldToTile(wx, wy))
    const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x))))
    const maxX = Math.min(map.width - 1, Math.ceil(Math.max(...corners.map((c) => c.x))))
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y))))
    const maxY = Math.min(map.height - 1, Math.ceil(Math.max(...corners.map((c) => c.y))))
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const top = tileToWorld(tx, ty)
        if (top.x < x0 || top.x >= x0 + CHUNK_W || top.y < y0 || top.y >= y0 + CHUNK_H) continue
        paintTile(this.ctx, map.tiles[ty * map.width + tx], top.x, top.y)
      }
    }
  }

  private drawSelection(): void {
    if (!this.selected) return
    const top = tileToWorld(this.selected.x, this.selected.y)
    const { ctx } = this
    diamondPath(ctx, top.x, top.y)
    ctx.fillStyle = 'rgba(255, 210, 63, 0.25)'
    ctx.fill()
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 3 / this.camera.zoom
    ctx.stroke()
  }

  private drawDebug(map: GameMap): void {
    const { ctx } = this
    const lines = [
      `${this.fps.toFixed(0)} FPS · Zoom ${this.camera.zoom.toFixed(2)} · Chunks ${this.chunksDrawn}`,
      `Karte ${map.width}x${map.height}`,
    ]
    if (this.selected) {
      const terrain = map.tiles[this.selected.y * map.width + this.selected.x]
      lines.push(`Kachel ${this.selected.x}, ${this.selected.y}: ${TERRAIN_NAMES[terrain]}`)
    }
    ctx.font = '14px monospace'
    ctx.textBaseline = 'top'
    lines.forEach((line, index) => {
      const y = 64 + index * 20
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(8, y - 2, ctx.measureText(line).width + 8, 20)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(line, 12, y)
    })
  }
}

