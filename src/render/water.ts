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
/** The light layer has bigger ripples than the base, so the two never line up and the pattern does not seem to repeat. */
const LIGHT_SCALE = 1.45
/** Slow patches of lighter and darker water over everything: size of one picture (world pixels) and strength. */
const PATCH_SIZE = 1700
const PATCH_ALPHA = 0.5
const PATCH_RES = 192

/**
 * The sea as a repeating pattern. All water tiles look the same and join without a seam, so one pattern of
 * the size of a tile fills the whole sea. One pattern per animation frame, made once.
 */
export class WaterPattern {
  private patterns: (CanvasPattern | null)[] = []
  private transform: DOMMatrix
  private patches: CanvasPattern | null = null

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
    this.patches = makePatches(ctx)
    // Pattern pixels are sprite pixels (2x); the cell starts at the left edge of tile (0, 0).
    this.transform = new DOMMatrix().translate(-cellW / 2, 0).scale(cellW / (sprites.get(waterKey(0))?.width ?? cellW), cellH / (sprites.get(waterKey(0))?.height ?? cellH))
  }

  /** A pattern shifted by (dx, dy) in world pixels. */
  private shifted(index: number, dx: number, dy: number, scale = 1): CanvasPattern | null {
    const pattern = this.patterns[index]
    pattern?.setTransform(new DOMMatrix().translate(dx, dy).scale(scale).multiply(this.transform))
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
    const light = this.shifted(LIGHT_FRAME, Math.cos(t * SPEED * 0.8) * -DRIFT, (Math.sin(t * SPEED * 1.2) * -DRIFT) / 2, LIGHT_SCALE)
    if (!light) return true
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = LIGHT_ALPHA
    ctx.fillStyle = light
    ctx.fillRect(area.x, area.y, area.w, area.h)
    ctx.restore()
    if (this.patches) {
      // large soft patches drift very slowly: lighter and darker water, so no two places look alike
      const scale = PATCH_SIZE / PATCH_RES
      this.patches.setTransform(new DOMMatrix().translate(t * 6, t * 3).scale(scale))
      ctx.save()
      ctx.globalAlpha = PATCH_ALPHA
      ctx.fillStyle = this.patches
      ctx.fillRect(area.x, area.y, area.w, area.h)
      ctx.restore()
    }
    return true
  }
}

/** Seamless cloud picture: waves of whole-number frequencies add up, so the picture joins itself on all sides. */
function makePatches(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const canvas = document.createElement('canvas')
  canvas.width = PATCH_RES
  canvas.height = PATCH_RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const waves: [number, number, number, number][] = [
    [1, 0, 1, 0.3], [0, 1, 1, 1.7], [1, 1, 0.8, 2.9], [2, -1, 0.7, 4.1], [1, 2, 0.6, 0.9],
    [3, 1, 0.45, 5.3], [-2, 3, 0.4, 2.2], [4, -2, 0.3, 3.6], [2, 4, 0.25, 1.1],
  ]
  const total = waves.reduce((sum, wave) => sum + wave[2], 0)
  const image = g.createImageData(PATCH_RES, PATCH_RES)
  for (let y = 0; y < PATCH_RES; y++) {
    for (let x = 0; x < PATCH_RES; x++) {
      let value = 0
      for (const [fx, fy, amplitude, phase] of waves) value += amplitude * Math.sin(2 * Math.PI * ((fx * x + fy * y) / PATCH_RES) + phase)
      value /= total
      const o = (y * PATCH_RES + x) * 4
      const light = value > 0
      image.data[o] = light ? 215 : 5
      image.data[o + 1] = light ? 240 : 30
      image.data[o + 2] = light ? 255 : 80
      image.data[o + 3] = Math.min(255, Math.abs(value) * 255 * 0.7)
    }
  }
  g.putImageData(image, 0, 0)
  return ctx.createPattern(canvas, 'repeat')
}
