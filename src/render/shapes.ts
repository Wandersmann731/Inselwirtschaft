import { tileToWorld } from './iso'

export interface TileRect {
  x: number
  y: number
  w: number
  h: number
}

/** Adds the diamond outline of a tile rectangle, lifted up by `lift` world pixels. */
export function rectPath(ctx: CanvasRenderingContext2D, rect: TileRect, lift = 0): void {
  const top = tileToWorld(rect.x, rect.y)
  const right = tileToWorld(rect.x + rect.w, rect.y)
  const bottom = tileToWorld(rect.x + rect.w, rect.y + rect.h)
  const left = tileToWorld(rect.x, rect.y + rect.h)
  ctx.moveTo(top.x, top.y - lift)
  ctx.lineTo(right.x, right.y - lift)
  ctx.lineTo(bottom.x, bottom.y - lift)
  ctx.lineTo(left.x, left.y - lift)
  ctx.closePath()
}

/** Multiplies the RGB channels of a #rrggbb colour. */
export function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(Math.min(255, ((value >> shift) & 255) * factor))
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

/** Draws a simple isometric box on a tile rectangle (placeholder for building sprites). */
export function drawBox(ctx: CanvasRenderingContext2D, rect: TileRect, height: number, color: string): void {
  const right = tileToWorld(rect.x + rect.w, rect.y)
  const bottom = tileToWorld(rect.x + rect.w, rect.y + rect.h)
  const left = tileToWorld(rect.x, rect.y + rect.h)

  ctx.fillStyle = shade(color, 0.75)
  ctx.beginPath()
  ctx.moveTo(left.x, left.y)
  ctx.lineTo(bottom.x, bottom.y)
  ctx.lineTo(bottom.x, bottom.y - height)
  ctx.lineTo(left.x, left.y - height)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = shade(color, 0.55)
  ctx.beginPath()
  ctx.moveTo(bottom.x, bottom.y)
  ctx.lineTo(right.x, right.y)
  ctx.lineTo(right.x, right.y - height)
  ctx.lineTo(bottom.x, bottom.y - height)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = color
  ctx.beginPath()
  rectPath(ctx, rect, height)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1
  ctx.stroke()
}

/** Placeholder height of a building box, growing with its footprint. */
export function boxHeight(rect: TileRect, category: string): number {
  if (category === 'housing') return 26
  return Math.min(56, 14 + 4 * Math.max(rect.w, rect.h))
}
