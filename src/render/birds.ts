// Gulls over the harbour: a few white birds that circle above the trading post, each on its own round, beating
// their wings and gliding, with a small shadow that follows them over roofs and water. Nothing in the game depends
// on them; they are there because a harbour without gulls is a picture of a harbour.
import { LIGHT } from './built/light'

/** How many gulls circle over a trading post. */
export const GULLS = 4

/**
 * Where gull `n` is at a time (milliseconds), in world pixels from the middle of its rounds: its place over the
 * ground, how high it flies, which way it heads (1 right, -1 left) and where its wings are in their beat (-1 to 1). Pure.
 */
export function gullAt(n: number, now: number): { x: number; y: number; high: number; heading: number; flap: number } {
  const round = 21000 + n * 5300
  const turn = (now / round + n * 0.31) * Math.PI * 2 * (n % 2 ? -1 : 1)
  const wide = 150 + n * 55
  // it beats its wings for a while and then glides
  const beating = Math.sin(now / 2900 + n * 2.1) > -0.2
  return {
    x: Math.cos(turn) * wide + Math.sin(turn * 2.3 + n) * 40,
    y: Math.sin(turn) * wide * 0.5,
    high: 54 + 16 * Math.sin(turn * 1.7 + n),
    heading: -Math.sin(turn) * (n % 2 ? -1 : 1) >= 0 ? 1 : -1,
    flap: beating ? Math.sin(now / 95 + n) : 0.25,
  }
}

/** Draws the gulls around (cx, cy), the trading post of the island, in world pixels. */
export function drawGulls(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number): void {
  ctx.lineCap = 'round'
  for (let n = 0; n < GULLS; n++) {
    const gull = gullAt(n, now)
    const [x, y] = [cx + gull.x, cy + gull.y]
    // its shadow on whatever lies under it
    ctx.fillStyle = 'rgba(18, 24, 44, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + gull.high * LIGHT.x * 0.5, y + gull.high * LIGHT.y * 0.5, 2.6, 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    const top = y - gull.high
    // two wings that are the bird: light above, each bent at its wrist
    for (const side of [-1, 1]) {
      ctx.strokeStyle = side * gull.heading < 0 ? 'rgb(214, 218, 224)' : 'rgb(250, 250, 246)'
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.quadraticCurveTo(x + side * 2, top - 1.2 - gull.flap * 1.4, x + side * 4.4, top - gull.flap * 2.2 + 0.4)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgb(246, 246, 240)'
    ctx.beginPath()
    ctx.ellipse(x, top + 0.2, 1.5, 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgb(226, 170, 60)'
    ctx.fillRect(x + gull.heading * 1.5 - 0.25, top - 0.1, 0.7, 0.4)
  }
}
