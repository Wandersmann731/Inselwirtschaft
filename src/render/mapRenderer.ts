import { world } from '../data'
import type { ToolSnapshot } from '../game/buildController'
import type { GameState } from '../sim/state'
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
import { mapBounds, tileToWorld, worldToTile, type Point } from './iso'
import { drawBuildings, drawRoads, type TileRange } from './buildingRenderer'
import { OverlayRenderer } from './overlayRenderer'
import { CHUNK_PX_H, CHUNK_PX_W, TerrainCache, chunkOrigin } from './terrainCache'
import { SEA_COLOR, diamondPath } from './terrainStyle'

const SELECTION_COLOR = '#ffd23f'
const ZOOM_LIMITS = { min: world.minZoom, max: world.maxZoom }
/** Above this device-pixels-per-world-pixel the chunk bitmaps are rendered at 2x. */
const HIGH_RES_THRESHOLD = 1.6

/**
 * Draws the map on a canvas. Lives outside React: React only mounts and destroys it.
 * Owns the camera and the selected tile, which are view state and not part of GameState.
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement
  private getState: () => GameState
  private getTool: () => ToolSnapshot
  private debug: boolean
  private ctx: CanvasRenderingContext2D
  private resizeObserver: ResizeObserver
  private cache = new TerrainCache()
  private overlay = new OverlayRenderer()
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
    getState: () => GameState,
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
    this.drawTerrain(range)
    const state = this.getState()
    drawRoads(ctx, state, range)
    drawBuildings(ctx, state, range)
    this.overlay.draw(ctx, state, this.getTool())
    this.drawSelection()

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.debug) this.drawDebug(map)
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

  private drawTerrain({ minI, maxI, minJ, maxJ }: TileRange): void {
    const size = world.chunkSize
    this.chunksDrawn = 0
    for (let cy = Math.floor(minJ / size); cy <= Math.floor(maxJ / size); cy++) {
      for (let cx = Math.floor(minI / size); cx <= Math.floor(maxI / size); cx++) {
        const chunk = this.cache.getChunk(cx, cy)
        if (!chunk) continue
        const origin = chunkOrigin(cx, cy)
        this.ctx.drawImage(chunk, origin.x, origin.y, CHUNK_PX_W, CHUNK_PX_H)
        this.chunksDrawn++
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

