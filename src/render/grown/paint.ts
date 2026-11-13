// Small tools for everything that grows or lies about and is painted by code: numbers that follow from a seed,
// colours between colours, a dab of paint. All pictures are painted in world pixels, lit from the top left.
import { hash2 } from '../../world/noise2d'

export type Ctx = CanvasRenderingContext2D
export type Rgb = [number, number, number]
/** What a shape is filled with: one colour, or a run of colours. */
export type Paint = string | CanvasGradient

/** Numbers from 0 to 1, always the same row for the same seed. */
export function numbers(seed: number): () => number {
  let i = 0
  return () => hash2(i++, seed, 977)
}

/** The colour `t` of the way from `a` to `b`, made lighter or darker by `light` (1 leaves it). */
export function mix(a: Rgb, b: Rgb, t: number, light = 1): Rgb {
  const k = Math.max(0, Math.min(1, t))
  return [(a[0] + (b[0] - a[0]) * k) * light, (a[1] + (b[1] - a[1]) * k) * light, (a[2] + (b[2] - a[2]) * k) * light]
}

export const css = (c: Rgb, alpha = 1): string => `rgba(${Math.round(Math.max(0, Math.min(255, c[0])))}, ${Math.round(Math.max(0, Math.min(255, c[1])))}, ${Math.round(Math.max(0, Math.min(255, c[2])))}, ${alpha})`

/** A small ellipse of colour, turned by `turn`. */
export function dab(g: Ctx, x: number, y: number, rx: number, ry: number, colour: Paint, turn = 0): void {
  g.fillStyle = colour
  g.beginPath()
  g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
  g.fill()
}

/** A filled shape between points. */
export function shape(g: Ctx, points: [number, number][], colour: Paint): void {
  g.fillStyle = colour
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.fill()
}

/** The soft dark where something stands on the ground. */
export function contact(g: Ctx, x: number, y: number, rx: number, ry: number, strength = 0.3): void {
  const shade = g.createRadialGradient(x, y, 0, x, y, rx)
  shade.addColorStop(0, `rgba(20, 28, 48, ${strength})`)
  shade.addColorStop(1, 'rgba(20, 28, 48, 0)')
  g.save()
  g.translate(x, y)
  g.scale(1, ry / rx)
  g.translate(-x, -y)
  g.fillStyle = shade
  g.fillRect(x - rx, y - rx, rx * 2, rx * 2)
  g.restore()
}
