// What people, oxen and carts are painted with (figures.ts, cartFigures.ts): the measure of the figures, their
// colours, small shapes, and the store of poses that are painted once and kept.

/**
 * World pixels per unit of the figures' drawing grid. A person is 12.5 units tall and a house door 13 world pixels
 * high (DOOR in built/facade.ts), so people fit through the doors.
 */
export const FIGURE_SCALE = 0.95

export type Ctx = CanvasRenderingContext2D

/** Picture pixels per unit. */
export const RES = 4

export const SKIN = '#d9b08a'
export const HAIR = '#3a2a1e'
export const BOOT = '#2e2620'
export const TROUSERS = '#51463a'
/** Laid over what faces away from the light. */
export const SHADE = 'rgba(22, 18, 30, 0.34)'
export const LIGHT = 'rgba(255, 240, 210, 0.2)'
export const WOOD = '#8f6c46'
export const WOOD_DARK = '#5a432c'
export const IRON = '#3c3a3e'

const sprites = new Map<string, HTMLCanvasElement | null>()

/** A picture `w` by `h` units with its ground point at (ox, oy), painted once by `paint` and kept under `key`. */
export function sprite(key: string, w: number, h: number, ox: number, oy: number, paint: (g: Ctx) => void): HTMLCanvasElement | null {
  const hit = sprites.get(key)
  if (hit !== undefined) return hit
  let made: HTMLCanvasElement | null = null
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = w * RES
    canvas.height = h * RES
    const g = canvas.getContext('2d')
    if (g) {
      g.scale(RES, RES)
      g.translate(ox, oy)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      paint(g)
      made = canvas
    }
  }
  sprites.set(key, made)
  return made
}

export function lay(ctx: Ctx, made: HTMLCanvasElement | null, px: number, py: number, w: number, h: number, ox: number, oy: number): void {
  if (made) ctx.drawImage(made, px - ox * FIGURE_SCALE, py - oy * FIGURE_SCALE, w * FIGURE_SCALE, h * FIGURE_SCALE)
}

/** The shadow on the ground: soft, and it falls to the right, away from the light. */
export function shadow(g: Ctx, x: number, rx: number, ry: number): void {
  const run = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  run.addColorStop(0, 'rgba(14, 20, 34, 0.42)')
  run.addColorStop(0.6, 'rgba(14, 20, 34, 0.2)')
  run.addColorStop(1, 'rgba(14, 20, 34, 0)')
  g.save()
  g.translate(x, 0.2)
  g.rotate(-0.1)
  g.scale(rx, ry)
  g.fillStyle = run
  g.fillRect(-1, -1, 2, 2)
  g.restore()
}

export function limb(g: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, colour: string): void {
  g.strokeStyle = colour
  g.lineWidth = width
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.stroke()
}

export function oval(g: Ctx, x: number, y: number, rx: number, ry: number, colour: string, turn = 0): void {
  g.fillStyle = colour
  g.beginPath()
  g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
  g.fill()
}

export function shape(g: Ctx, points: number[], colour: string): void {
  g.fillStyle = colour
  g.beginPath()
  for (let i = 0; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
  g.closePath()
  g.fill()
}

/** Lays light over the upper left and shade over the lower right of what is painted inside the box. */
export function round(g: Ctx, x: number, y: number, w: number, h: number): void {
  const run = g.createLinearGradient(x, y, x + w * 0.7, y + h)
  run.addColorStop(0, 'rgba(255, 240, 210, 0.26)')
  run.addColorStop(0.45, 'rgba(255, 240, 210, 0)')
  run.addColorStop(1, 'rgba(18, 14, 30, 0.44)')
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = run
  g.fillRect(x, y, w, h)
  g.restore()
}
