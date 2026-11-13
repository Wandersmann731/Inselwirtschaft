// The tools all symbols of the game are drawn with. A symbol is painted by code into a square of 64 by 64 units:
// round, soft shapes, lit from the top left, each a run of colour from light to dark, with a gloss where the light
// falls. No outline is drawn around anything; a soft shade behind the whole symbol sets it off from its background.
import { hash2 } from '../../world/noise2d'

export type Ctx = CanvasRenderingContext2D
export type Rgb = [number, number, number]
export type Paint = string | CanvasGradient
export type Draw = (g: Ctx) => void

const clamp = (v: number): number => Math.round(Math.max(0, Math.min(255, v)))

/** A colour made lighter (k > 1) or darker (k < 1), as CSS. */
export const tone = (c: Rgb, k = 1, alpha = 1): string => `rgba(${clamp(c[0] * k)}, ${clamp(c[1] * k)}, ${clamp(c[2] * k)}, ${alpha})`

/** A run of colour over the box (x, y, w, h): light at its top left, dark at its bottom right. */
export function lit(g: Ctx, x: number, y: number, w: number, h: number, c: Rgb, depth = 0.34): CanvasGradient {
  const run = g.createLinearGradient(x, y, x + w * 0.7, y + h)
  run.addColorStop(0, tone(c, 1 + depth))
  run.addColorStop(0.5, tone(c))
  run.addColorStop(1, tone(c, 1 - depth))
  return run
}

/** A shape through points given as x, y, x, y ... */
export function poly(g: Ctx, pts: number[], paint: Paint): void {
  g.fillStyle = paint
  g.beginPath()
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i], pts[i + 1])
    else g.lineTo(pts[i], pts[i + 1])
  }
  g.closePath()
  g.fill()
}

/** A shape through points, lit like everything else. */
export function solid(g: Ctx, pts: number[], c: Rgb, depth = 0.34): void {
  const xs = pts.filter((_, i) => i % 2 === 0)
  const ys = pts.filter((_, i) => i % 2 === 1)
  const [x, y] = [Math.min(...xs), Math.min(...ys)]
  poly(g, pts, lit(g, x, y, Math.max(...xs) - x, Math.max(...ys) - y, c, depth))
}

/** A box with round corners. */
export function box(g: Ctx, x: number, y: number, w: number, h: number, r: number, c: Rgb | Paint, depth = 0.34): void {
  g.fillStyle = Array.isArray(c) ? lit(g, x, y, w, h, c, depth) : c
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
}

/** An oval, turned by `turn`. */
export function oval(g: Ctx, x: number, y: number, rx: number, ry: number, c: Rgb | Paint, turn = 0, depth = 0.34): void {
  g.fillStyle = Array.isArray(c) ? lit(g, x - rx, y - ry, rx * 2, ry * 2, c, depth) : c
  g.beginPath()
  g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
  g.fill()
}

/** A ball: light where the sun is on it, dark at its lower right, and a little light from the ground on its underside. */
export function ball(g: Ctx, x: number, y: number, r: number, c: Rgb): void {
  const run = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r)
  run.addColorStop(0, tone(c, 1.56))
  run.addColorStop(0.24, tone(c, 1.2))
  run.addColorStop(0.62, tone(c, 0.9))
  run.addColorStop(0.9, tone(c, 0.56))
  run.addColorStop(1, tone(c, 0.7))
  g.fillStyle = run
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  oval(g, x - r * 0.36, y - r * 0.42, r * 0.2, r * 0.12, 'rgba(255, 255, 255, 0.5)', -0.6)
}

/** Small flecks scattered over the oval (x, y, rx, ry), only where something is painted: the grain of stone, the skin of a potato, crumbs. */
export function speckle(g: Ctx, x: number, y: number, rx: number, ry: number, count: number, colour: string, seed: number, size = 0.5): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = colour
  for (let i = 0; i < count; i++) {
    const turn = hash2(i, 1, seed) * Math.PI * 2
    const far = Math.sqrt(hash2(i, 2, seed))
    const r = size * (0.5 + hash2(i, 3, seed))
    g.beginPath()
    g.ellipse(x + Math.cos(turn) * far * rx, y + Math.sin(turn) * far * ry, r, r * 0.7, turn, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/** The grain of wood over the box (x, y, w, h), along its length, only where something is painted: thin lines that waver, and a knot. */
export function woodGrain(g: Ctx, x: number, y: number, w: number, h: number, seed: number, upright = false): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  const lines = Math.max(3, Math.round((upright ? w : h) / 1.7))
  for (let i = 0; i < lines; i++) {
    const across = (i + 0.2 + 0.6 * hash2(i, 1, seed)) / lines
    g.strokeStyle = hash2(i, 2, seed) < 0.6 ? 'rgba(50, 30, 16, 0.26)' : 'rgba(255, 226, 180, 0.2)'
    g.lineWidth = 0.3 + 0.4 * hash2(i, 3, seed)
    g.beginPath()
    for (let k = 0; k <= 6; k++) {
      const along = k / 6
      const waver = (hash2(i, 10 + k, seed) - 0.5) * 0.9
      const [px, py] = upright ? [x + across * w + waver, y + along * h] : [x + along * w, y + across * h + waver]
      if (k === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.stroke()
  }
  g.restore()
}

/** The line of an oval: a hoop, a ring of a tree, the rim of a bowl. */
export function ring(g: Ctx, x: number, y: number, rx: number, ry: number, width: number, colour: string): void {
  g.strokeStyle = colour
  g.lineWidth = width
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  g.stroke()
}

/** Light from above and shade below over the box (x, y, w, h), only where something is painted: what lies there is round. */
export function rounded(g: Ctx, x: number, y: number, w: number, h: number, strength = 1): void {
  const run = g.createLinearGradient(0, y, 0, y + h)
  run.addColorStop(0, `rgba(255, 240, 210, ${0.3 * strength})`)
  run.addColorStop(0.42, 'rgba(255, 240, 210, 0)')
  run.addColorStop(1, `rgba(20, 14, 34, ${0.46 * strength})`)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = run
  g.fillRect(x, y, w, h)
  g.restore()
}

/** A gleam of light on something smooth. */
export function gloss(g: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.5, turn = -0.5): void {
  oval(g, x, y, rx, ry, `rgba(255, 255, 255, ${alpha})`, turn)
}

/** A line that is a thing itself (a stalk, a handle, a rope), with round ends. */
export function line(g: Ctx, pts: number[], width: number, colour: string): void {
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i], pts[i + 1])
    else g.lineTo(pts[i], pts[i + 1])
  }
  g.stroke()
}

/** A curve from (x0, y0) to (x1, y1) that bends towards (cx, cy). */
export function bend(g: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number, colour: string): void {
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(cx, cy, x1, y1)
  g.stroke()
}

/** A sack tied at the neck, standing around (x, base): coarse cloth with its weave, folds that run to the tie, a seam down its side. */
export function sack(g: Ctx, x: number, base: number, w: number, h: number, c: Rgb = [196, 170, 124]): void {
  g.fillStyle = lit(g, x - w / 2, base - h, w, h, c)
  g.beginPath()
  g.moveTo(x - w * 0.34, base - h)
  g.bezierCurveTo(x - w * 0.7, base - h * 0.5, x - w * 0.62, base, x - w * 0.3, base)
  g.lineTo(x + w * 0.3, base)
  g.bezierCurveTo(x + w * 0.62, base, x + w * 0.7, base - h * 0.5, x + w * 0.34, base - h)
  g.closePath()
  g.fill()
  // the weave: fine threads across and down, only on the cloth
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (let k = 1; k < 12; k++) {
    const y = base - (h * k) / 12
    bend(g, x - w * 0.6, y, x, y + 2.4, x + w * 0.6, y, 0.3, tone(c, 0.6, 0.3))
  }
  for (let k = -6; k <= 6; k++) bend(g, x + k * w * 0.03, base - h, x + k * w * 0.1, base - h * 0.5, x + k * w * 0.075, base, 0.3, tone(c, k < 0 ? 1.3 : 0.62, 0.26))
  // the round of the sack: light on its left shoulder, dark down its right side and under its belly
  const round = g.createRadialGradient(x - w * 0.22, base - h * 0.62, 1, x, base - h * 0.4, w * 0.74)
  round.addColorStop(0, 'rgba(255, 244, 214, 0.34)')
  round.addColorStop(0.5, 'rgba(255, 244, 214, 0)')
  round.addColorStop(1, 'rgba(30, 20, 30, 0.4)')
  g.fillStyle = round
  g.fillRect(x - w, base - h, w * 2, h)
  g.restore()
  // folds that run down from the tie, and the seam
  for (const [dx, k] of [[-0.24, 0.72], [-0.06, 0.8], [0.14, 0.66], [0.27, 0.6]]) bend(g, x + w * dx * 0.7, base - h * 0.96, x + w * dx * 1.5, base - h * 0.62, x + w * dx * 1.1, base - h * 0.34, 0.8, tone(c, k, 0.6))
  for (let k = 0; k < 7; k++) line(g, [x + w * 0.4, base - h * 0.7 + k * h * 0.09, x + w * 0.44, base - h * 0.67 + k * h * 0.09], 0.6, tone(c, 1.36, 0.8))
}

/** A barrel standing around (x, base): staves with their grain, iron hoops, round in the light. */
export function barrel(g: Ctx, x: number, base: number, w: number, h: number, c: Rgb = [140, 96, 58]): void {
  const side = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  side.addColorStop(0, tone(c, 0.9))
  side.addColorStop(0.24, tone(c, 1.34))
  side.addColorStop(0.6, tone(c, 0.92))
  side.addColorStop(1, tone(c, 0.5))
  g.fillStyle = side
  g.beginPath()
  g.moveTo(x - w * 0.4, base - h)
  g.quadraticCurveTo(x - w * 0.6, base - h / 2, x - w * 0.4, base)
  g.quadraticCurveTo(x, base + h * 0.07, x + w * 0.4, base)
  g.quadraticCurveTo(x + w * 0.6, base - h / 2, x + w * 0.4, base - h)
  g.closePath()
  g.fill()
  woodGrain(g, x - w / 2, base - h, w, h, Math.round(x * 7 + base), true)
  // the joints between the staves follow the belly of the barrel
  for (const dx of [-0.3, -0.16, 0, 0.16, 0.3]) bend(g, x + w * dx, base - h + 1, x + w * dx * 1.5, base - h / 2, x + w * dx, base - 0.5, 0.55, tone(c, 0.42, 0.7))
  for (const t of [0.16, 0.5, 0.84]) {
    const wide = w * (0.42 + 0.085 * Math.sin(t * Math.PI))
    const y = base - h * t
    const hoop = g.createLinearGradient(x - wide, 0, x + wide, 0)
    hoop.addColorStop(0, 'rgb(74, 72, 80)')
    hoop.addColorStop(0.26, 'rgb(170, 170, 178)')
    hoop.addColorStop(1, 'rgb(40, 40, 50)')
    g.strokeStyle = hoop
    g.lineWidth = t === 0.5 ? 1.5 : 2.2
    g.beginPath()
    g.moveTo(x - wide, y - 1)
    g.quadraticCurveTo(x, y + h * 0.07, x + wide, y - 1)
    g.stroke()
  }
  // the head of the barrel inside the rim of the staves
  oval(g, x, base - h, w * 0.4, h * 0.1, tone(c, 0.56))
  oval(g, x, base - h + 0.6, w * 0.34, h * 0.075, [c[0] * 0.92, c[1] * 0.92, c[2] * 0.92], 0, 0.2)
}

/** A stone of flat faces around (x, y): each face turned to the light its own way, its edges catching it, a crack, and the grain of the stone. */
export function rock(g: Ctx, x: number, y: number, r: number, c: Rgb): void {
  const k = (i: number): number => 0.86 + 0.26 * hash2(Math.round(x * 3) + i, Math.round(y * 3), 77)
  const p = [[-1, 0.2], [-0.62, -0.62], [0.1, -0.92], [0.9, -0.34], [1, 0.5], [0.3, 0.86], [-0.62, 0.8]].map(([px, py], i) => [x + px * r * k(i), y + py * r * k(i + 9)])
  const mid = [x - r * 0.1 * k(20), y - r * 0.12]
  const low = [x + r * 0.26, y + r * 0.34 * k(21)]
  poly(g, p.flat(), tone(c, 0.6))
  poly(g, [...p[1], ...p[2], ...p[3], ...mid], tone(c, 1.34))
  poly(g, [...p[0], ...p[1], ...mid, ...low, ...p[6]], tone(c, 1.04))
  poly(g, [...p[3], ...p[4], ...p[5], ...low, ...mid], tone(c, 0.76))
  poly(g, [...p[6], ...low, ...p[5]], tone(c, 0.58))
  // edges where two faces meet catch the light
  line(g, [...p[1], ...mid, ...low], Math.max(0.35, r * 0.045), tone(c, 1.6, 0.7))
  line(g, [...mid, ...p[3]], Math.max(0.3, r * 0.035), tone(c, 1.5, 0.45))
  if (r > 7) line(g, [p[0][0] + r * 0.3, p[0][1] + r * 0.1, x - r * 0.4, y + r * 0.34, x - r * 0.26, y + r * 0.6], 0.4, tone(c, 0.44, 0.7))
  speckle(g, x, y, r, r * 0.9, Math.round(r * 2.2), tone(c, 0.5, 0.36), Math.round(x * 5 + y), 0.36)
  speckle(g, x, y, r, r * 0.9, Math.round(r * 1.4), tone(c, 1.7, 0.4), Math.round(x * 3 + y * 7), 0.3)
}

/** A leaf from (x, y) pointing along `turn`, `long` long: two halves in different light, a rib and the veins that run from it. */
export function leaf(g: Ctx, x: number, y: number, long: number, turn: number, c: Rgb = [84, 132, 60]): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = tone(c, 1.16)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(long * 0.5, -long * 0.42, long, 0)
  g.closePath()
  g.fill()
  g.fillStyle = tone(c, 0.82)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(long * 0.5, long * 0.42, long, 0)
  g.closePath()
  g.fill()
  line(g, [0, 0, long * 0.94, 0], Math.max(0.4, long * 0.035), tone(c, 1.5, 0.7))
  for (let k = 1; k < 5; k++) {
    const at = (long * k) / 5.4
    const far = long * 0.17 * Math.sin((Math.PI * k) / 5.4)
    for (const side of [-1, 1]) line(g, [at, 0, at + long * 0.1, side * far], 0.3, tone(c, side < 0 ? 0.74 : 0.56, 0.7))
  }
  g.restore()
}

/** Size of the square a symbol is drawn in. */
export const UNITS = 64
