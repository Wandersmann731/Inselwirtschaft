import type { GameState } from '../sim/state'

const SEA_COLOR = '#1d4e6b'

/**
 * Draws the map on a canvas. Lives outside React: React only mounts and destroys it.
 * Phase 0 draws an empty sea; terrain and isometric tiles follow in later phases.
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement
  private getState: () => GameState
  private ctx: CanvasRenderingContext2D
  private rafId = 0
  private resizeObserver: ResizeObserver

  constructor(canvas: HTMLCanvasElement, getState: () => GameState) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.canvas = canvas
    this.getState = getState
    this.ctx = ctx
    this.resizeObserver = new ResizeObserver(() => this.resize())
  }

  start(): void {
    this.resizeObserver.observe(this.canvas)
    this.resize()
    this.rafId = requestAnimationFrame(this.frame)
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    this.resizeObserver.disconnect()
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr))
  }

  private frame = (): void => {
    this.draw(this.getState())
    this.rafId = requestAnimationFrame(this.frame)
  }

  private draw(_state: GameState): void {
    const { ctx, canvas } = this
    ctx.fillStyle = SEA_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}
