import { world } from '../data'
import { sprites } from './sprites'
import { waterKey, WATER_FRAMES } from './spriteKeys'

/** Two ripple pictures are laid over each other and drift apart: the light patterns of the sea keep changing. */
const BASE_FRAME = 0
const LIGHT_FRAME = 4
/** How far the layers wander (world pixels), their speed (radians per second) and how strongly the light layer shows. */
const DRIFT = 14
const SPEED = 0.35
const LIGHT_ALPHA = 0.3

/**
 * The sea as a repeating pattern. All water tiles look the same and join without a seam, so one pattern of
 * the size of a tile fills the whole sea. One pattern per animation frame, made once.
 */
export class WaterPattern {
  private patterns: (CanvasPattern | null)[] = []
  private transform: DOMMatrix

  constructor(ctx: CanvasRenderingContext2D) {
    const cellW = world.tileWidth
    const cellH = world.tileHeight
    // The pattern cell is the box of tile (0, 0): the tile in the middle and the corners of its four neighbours around it.
    for (let frame = 0; frame < WATER_FRAMES; frame++) {
      const image = sprites.get(waterKey(frame))
      if (!image) {
        this.patterns.push(null)
        continue
      }
      const cell = document.createElement('canvas')
      cell.width = image.width
      cell.height = image.height
      const cellCtx = cell.getContext('2d')
      if (!cellCtx) {
        this.patterns.push(null)
        continue
      }
      const halfW = image.width / 2
      const halfH = image.height / 2
      for (const [dx, dy] of [[0, 0], [halfW, halfH], [-halfW, halfH], [halfW, -halfH], [-halfW, -halfH]]) {
        cellCtx.drawImage(image, dx, dy)
      }
      this.patterns.push(ctx.createPattern(cell, 'repeat'))
    }
    // Pattern pixels are sprite pixels (2x); the cell starts at the left edge of tile (0, 0).
    this.transform = new DOMMatrix().translate(-cellW / 2, 0).scale(cellW / (sprites.get(waterKey(0))?.width ?? cellW), cellH / (sprites.get(waterKey(0))?.height ?? cellH))
  }

  /** A pattern shifted by (dx, dy) in world pixels. */
  private shifted(index: number, dx: number, dy: number): CanvasPattern | null {
    const pattern = this.patterns[index]
    pattern?.setTransform(new DOMMatrix().translate(dx, dy).multiply(this.transform))
    return pattern
  }

  /**
   * Fills the area with the sea. Animated: a base layer and a light layer (blended with "screen") wander in
   * opposite circles, so ripples cross and shimmer instead of switching between pictures. Still: one picture.
   * Returns false if the sprites are missing.
   */
  fill(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number, animated: boolean): boolean {
    const t = (animated ? now : 0) / 1000
    const base = this.shifted(BASE_FRAME, Math.sin(t * SPEED) * DRIFT, (Math.cos(t * SPEED * 0.6) * DRIFT) / 2)
    if (!base) return false
    ctx.fillStyle = base
    ctx.fillRect(area.x, area.y, area.w, area.h)
    if (!animated) return true
    const light = this.shifted(LIGHT_FRAME, Math.cos(t * SPEED * 0.8) * -DRIFT, (Math.sin(t * SPEED * 1.2) * -DRIFT) / 2)
    if (!light) return true
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = LIGHT_ALPHA
    ctx.fillStyle = light
    ctx.fillRect(area.x, area.y, area.w, area.h)
    ctx.restore()
    return true
  }
}
