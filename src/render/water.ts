// The sea is made here, not painted: a painted wave pattern reads as a drawing however it is moved. Two pictures
// are worked out once from noise that joins itself at the edges: the body of the water, with long low swells that
// are darker in their troughs and small wind waves on them (short, wide, a little lighter on their backs), and the
// light on it, small glints where a ripple faces the sun. Both repeat over the whole sea, drift against each other
// and are never seen in the same place twice.

/** Pixels of one picture, and how many world pixels it covers. */
const RES = 512
const SPAN = 384
/** Deep water, the back of a swell, and a glint. */
const DEEP = [22, 68, 94]
const CREST = [54, 116, 134]
const GLINT = [214, 232, 234]
/** How much darker the trough between two wind waves is, and how much lighter the back of one. */
const FURROW = 0.2
const BACK = 0.42
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
  const lit = Math.min(1, Math.max(0, (fine - 0.67) / 0.15))
  return { swell, glint: lit * lit * Math.min(1, Math.max(0, (swell - 0.4) * 3.2)) }
}

/**
 * The small wind waves at one point of the repeating picture, -1 in a trough to 1 on a crest: short waves that lie
 * across the screen, wide and low, with still smaller ones on them. A crest is a narrow, sharp line, a trough is
 * broad. Pure.
 */
export function rippleAt(u: number, v: number): number {
  const wave = 0.55 * tiling(u * 14, v * 84, 14, 84, 21) + 0.45 * tiling(u * 30, v * 170, 30, 170, 23)
  const centred = Math.max(-1, Math.min(1, (wave - 0.5) * 4.6))
  return centred > 0 ? centred * centred * centred : -Math.sqrt(-centred)
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
      const ripple = rippleAt(u, v)
      // wind waves show most on the lit back of a swell
      const shade = 1 + (ripple < 0 ? ripple * FURROW : ripple * BACK) * (0.5 + 0.5 * mix)
      for (let c = 0; c < 3; c++) out[o + c] = (DEEP[c] + (CREST[c] - DEEP[c]) * mix) * shade
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

/** Pixels of a foam picture. How many world pixels it covers is up to the surf. */
export const LACE_RES = 256
const FOAM = [244, 250, 248]

/**
 * How much foam lies at a point of the repeating foam picture (u, v from 0 to 1), 0 to 1: a net of white lines with
 * clear water in its meshes, as foam spreads behind a broken wave. `dense` is fresh froth: small meshes, thick
 * lines, and most of them closed. Pure.
 */
export function laceAt(u: number, v: number, dense = false): number {
  // the lines of a net are where a noise passes its middle: `off` is the distance from such a line
  const off = (cells: number, seed: number): number =>
    Math.abs(2 * (0.65 * tiling(u * cells, v * cells * 2, cells, cells * 2, seed) + 0.35 * tiling(u * cells * 2, v * cells * 4, cells * 2, cells * 4, seed + 1)) - 1)
  const thick = tiling(u * 4, v * 8, 4, 8, dense ? 19 : 17)
  const line = (distance: number, width: number): number => {
    const t = Math.min(1, distance / width)
    return 1 - t * t * (3 - 2 * t)
  }
  // a wide-meshed net, a finer one that fills in, and where the foam is thickest the meshes close
  const grow = dense ? 2 : 1
  const lines = Math.max(line(off(6, 11), (0.1 + 0.2 * thick) * grow), 0.8 * line(off(13, 13), (0.08 + 0.16 * thick) * grow))
  const closed = Math.min(1, Math.max(0, (thick - (dense ? 0.6 : 0.58)) / 0.22)) * (dense ? 0.9 : 0.8)
  // froth is not even: a fine grain breaks it up
  const grain = 0.82 + 0.18 * tiling(u * 64, v * 64, 64, 64, 29)
  return Math.min(1, Math.max(lines, closed)) * grain
}

/** The foam picture as a repeating fill, made once by the surf (see surf.ts). */
export function makeLace(ctx: CanvasRenderingContext2D, dense = false): CanvasPattern | null {
  const canvas = document.createElement('canvas')
  canvas.width = LACE_RES
  canvas.height = LACE_RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const image = g.createImageData(LACE_RES, LACE_RES)
  for (let y = 0; y < LACE_RES; y++) {
    for (let x = 0; x < LACE_RES; x++) {
      const o = (y * LACE_RES + x) * 4
      image.data[o] = FOAM[0]
      image.data[o + 1] = FOAM[1]
      image.data[o + 2] = FOAM[2]
      image.data[o + 3] = 255 * laceAt((x + 0.5) / LACE_RES, (y + 0.5) / LACE_RES, dense)
    }
  }
  g.putImageData(image, 0, 0)
  return ctx.createPattern(canvas, 'repeat')
}
