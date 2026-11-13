// The sun on the sea: small sparks of light that flare up and go out on the waves, each in its own place and beat.
// They are drawn on the open water before shore and land, so what lies over the water covers them.
import { hash2 } from '../world/noise2d'

/** Size of the cells the sea is divided into, in world pixels: one spark may flare in each. */
const CELL = { w: 46, h: 23 }

/** How bright the spark of a cell is at a time (milliseconds): 0 most of the time, up to 1 for a moment. Pure. */
export function sparkAt(cx: number, cy: number, now: number): number {
  const beat = 1500 + 2600 * hash2(cx, cy, 771)
  const wave = Math.sin((now / beat + hash2(cx, cy, 772)) * Math.PI * 2)
  return wave > 0.9 ? (wave - 0.9) * 10 : 0
}

/** Draws the sparks in a part of the world (world pixels). */
export function drawGlitter(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number): void {
  ctx.fillStyle = 'rgb(255, 250, 226)'
  for (let cy = Math.floor(area.y / CELL.h); cy <= Math.floor((area.y + area.h) / CELL.h); cy++) {
    for (let cx = Math.floor(area.x / CELL.w); cx <= Math.floor((area.x + area.w) / CELL.w); cx++) {
      const spark = sparkAt(cx, cy, now)
      if (spark <= 0) continue
      const x = (cx + hash2(cx, cy, 773)) * CELL.w
      const y = (cy + hash2(cx, cy, 774)) * CELL.h
      ctx.globalAlpha = 0.75 * spark
      ctx.beginPath()
      ctx.ellipse(x, y, 1.1 + 1.6 * spark, 0.45 + 0.3 * spark, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}
