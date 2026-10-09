import { world } from '../data'
import { sprites } from './sprites'
import { waterKey, WATER_FRAMES } from './spriteKeys'

/** How long one picture of the water animation stays on screen. */
const FRAME_MS = 200

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

  /** The pattern for a point in time, or null if the sprites are missing. */
  at(now: number): CanvasPattern | null {
    const pattern = this.patterns[Math.floor(now / FRAME_MS) % WATER_FRAMES]
    pattern?.setTransform(this.transform)
    return pattern
  }
}
