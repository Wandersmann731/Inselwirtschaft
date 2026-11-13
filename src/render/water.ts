// The sea is made here, not painted: a painted wave pattern reads as a drawing however it is moved. Two pictures
// are worked out once from noise that joins itself at the edges: the body of the water, with long low swells that
// are darker in their troughs, and the light on it, small glints where a ripple faces the sun. Both repeat over the
// whole sea, drift against each other and are never seen in the same place twice.

/** Pixels of one picture, and how many world pixels it covers. */
const RES = 256
const SPAN = 384
/** Deep water, the back of a swell, and a glint. */
const DEEP = [30, 70, 96]
const CREST = [58, 106, 124]
const GLINT = [206, 226, 232]
/** How far the layers wander (world pixels), their speed (radians per second) and how strongly the glints show. */
const DRIFT = 22
const SPEED = 0.22
const GLINT_ALPHA = 0.5
/** The glints are smaller than the swells, so the two never line up and the pattern does not seem to repeat. */
const GLINT_SCALE = 0.62
/** Slow patches of lighter and darker water over everything: size of one picture (world pixels) and strength. */
const PATCH_SIZE = 1700
const PATCH_ALPHA = 0.4
const PATCH_RES = 192

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Smooth noise from 0 to 1 that repeats after `px` cells across and `py` cells down. */
function tiling(x: number, y: number, px: number, py: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const at = (ix: number, iy: number): number => hash(((ix % px) + px) % px, ((iy % py) + py) % py, seed)
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
  return top + (bottom - top) * sy
}

/**
 * The water at one point of the repeating picture (u, v from 0 to 1): `swell` is the height of the long waves,
 * `glint` how strongly a ripple catches the light, both 0 to 1. Waves lie across the screen: wide and short. Pure.
 */
export function seaAt(u: number, v: number): { swell: number; glint: number } {
  const swell = 0.55 * tiling(u * 5, v * 12, 5, 12, 1) + 0.3 * tiling(u * 10, v * 26, 10, 26, 2) + 0.15 * tiling(u * 22, v * 54, 22, 54, 3)
  // a ripple that faces the sun is a short streak of light; only the ripples on the back of a swell catch it
  const fine = 0.7 * tiling(u * 16, v * 84, 16, 84, 4) + 0.3 * tiling(u * 40, v * 150, 40, 150, 5)
  const lit = Math.min(1, Math.max(0, (fine - 0.7) / 0.16))
  return { swell, glint: lit * lit * Math.min(1, Math.max(0, (swell - 0.4) * 3.2)) }
}

function picture(paint: (u: number, v: number, out: Uint8ClampedArray, o: number) => void): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = RES
  canvas.height = RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const image = g.createImageData(RES, RES)
  for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) paint((x + 0.5) / RES, (y + 0.5) / RES, image.data, (y * RES + x) * 4)
  g.putImageData(image, 0, 0)
  return canvas
}

/** The sea as two repeating pictures, made once. */
export class WaterPattern {
  private body: CanvasPattern | null = null
  private light: CanvasPattern | null = null
  private patches: CanvasPattern | null = null

  constructor(ctx: CanvasRenderingContext2D) {
    const body = picture((u, v, out, o) => {
      const { swell } = seaAt(u, v)
      const t = Math.min(1, Math.max(0, (swell - 0.25) / 0.55))
      const mix = t * t * (3 - 2 * t)
      for (let c = 0; c < 3; c++) out[o + c] = DEEP[c] + (CREST[c] - DEEP[c]) * mix
      out[o + 3] = 255
    })
    const light = picture((u, v, out, o) => {
      const { glint } = seaAt(u, v)
      for (let c = 0; c < 3; c++) out[o + c] = GLINT[c]
      out[o + 3] = 255 * glint
    })
    this.body = body && ctx.createPattern(body, 'repeat')
    this.light = light && ctx.createPattern(light, 'repeat')
    this.patches = makePatches(ctx)
  }

  /**
   * Fills the area with the sea. Animated: the swells and the glints wander in opposite circles, so the light
   * runs over the water instead of standing on it. Still: the swells alone. Returns false without a canvas.
   */
  fill(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number, animated: boolean): boolean {
    if (!this.body) return false
    const t = (animated ? now : 0) / 1000
    const scale = SPAN / RES
    this.body.setTransform(new DOMMatrix().translate(Math.sin(t * SPEED) * DRIFT, (Math.cos(t * SPEED * 0.6) * DRIFT) / 2).scale(scale))
    ctx.fillStyle = this.body
    ctx.fillRect(area.x, area.y, area.w, area.h)
    if (!animated) return true
    if (this.light) {
      this.light.setTransform(new DOMMatrix().translate(Math.cos(t * SPEED * 0.8) * -DRIFT + t * 5, (Math.sin(t * SPEED * 1.2) * -DRIFT) / 2 + t * 2).scale(scale * GLINT_SCALE))
      ctx.save()
      ctx.globalAlpha = GLINT_ALPHA
      ctx.fillStyle = this.light
      ctx.fillRect(area.x, area.y, area.w, area.h)
      ctx.restore()
    }
    if (this.patches) {
      // large soft patches drift very slowly: lighter and darker water, so no two places look alike
      const patch = PATCH_SIZE / PATCH_RES
      this.patches.setTransform(new DOMMatrix().translate(t * 6, t * 3).scale(patch))
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
      image.data[o] = light ? 150 : 6
      image.data[o + 1] = light ? 196 : 24
      image.data[o + 2] = light ? 210 : 52
      image.data[o + 3] = Math.min(255, Math.abs(value) * 255 * 0.7)
    }
  }
  g.putImageData(image, 0, 0)
  return ctx.createPattern(canvas, 'repeat')
}

/** How dark the open sea gets at the edge of the map, 0 to 1. */
const DEPTH = 0.42

/**
 * Deep water: the sea turns darker from the island towards the open sea, so it reads as depth and the repeating
 * ripples fade into the distance. One gradient over the visible area; `bounds` is the box of the map in world pixels.
 */
export function fillDepth(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const reach = (bounds.maxX - bounds.minX) / 2
  ctx.save()
  // the map is a diamond twice as wide as high: squash the circle to match
  ctx.translate(cx, cy)
  ctx.scale(1, 0.5)
  const gradient = ctx.createRadialGradient(0, 0, reach * 0.42, 0, 0, reach * 1.05)
  gradient.addColorStop(0, 'rgba(6, 28, 66, 0)')
  gradient.addColorStop(1, `rgba(6, 28, 66, ${DEPTH})`)
  ctx.fillStyle = gradient
  ctx.fillRect(area.x - cx, (area.y - cy) * 2, area.w, area.h * 2)
  ctx.restore()
}
