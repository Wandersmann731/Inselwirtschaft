// Chimney smoke, painted by code: puffs that leave the chimney small and dense, rise, drift with the wind, grow and
// thin out. Twelve pictures make one loop that has no seam: every puff of a picture is the puff before it, a twelfth
// of its way further up.
import { hash2 } from '../world/noise2d'

export const SMOKE_FRAMES = 12
/** Size of a smoke picture, and where in it the smoke leaves the chimney (picture pixels). */
export const SMOKE_SIZE = { w: 128, h: 192 }
export const SMOKE_SOURCE = { x: 64, y: 124 }
const PUFFS = 6

/** One puff of the smoke in a picture of the loop: where it is, how large and how thick. Pure. */
export function puffAt(frame: number, puff: number): { x: number; y: number; r: number; alpha: number } {
  // how far it is on its way from the chimney (0) to where it is gone (1)
  const way = (((frame % SMOKE_FRAMES) / SMOKE_FRAMES + puff / PUFFS) % 1 + 1) % 1
  return {
    x: SMOKE_SOURCE.x + Math.sin(way * 5 + puff * 1.7) * 9 * way + way * way * 22,
    y: SMOKE_SOURCE.y - way * 112,
    r: 9 + 26 * way,
    // it fades in as it leaves the chimney and thins out as it rises
    alpha: 0.95 * Math.min(1, way * 7) * (1 - way) ** 1.1,
  }
}

const frames = new Map<number, HTMLCanvasElement | null>()

/** One picture of the loop, or null where there is no canvas. */
export function smokeFrame(frame: number): HTMLCanvasElement | null {
  const key = ((frame % SMOKE_FRAMES) + SMOKE_FRAMES) % SMOKE_FRAMES
  const hit = frames.get(key)
  if (hit !== undefined) return hit
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = SMOKE_SIZE.w
  canvas.height = SMOKE_SIZE.h
  const g = canvas.getContext('2d')
  if (g) {
    // the oldest puffs first: the young ones lie before them
    const puffs = Array.from({ length: PUFFS }, (_, i) => ({ i, ...puffAt(key, i) })).sort((a, b) => a.y - b.y)
    for (const puff of puffs) {
      // a puff is a few balls of smoke, not one: lit from the left, grey in its own shade
      for (let k = 0; k < 4; k++) {
        const turn = hash2(puff.i, k, 801) * Math.PI * 2
        const far = k === 0 ? 0 : puff.r * 0.5
        const x = puff.x + Math.cos(turn) * far
        const y = puff.y + Math.sin(turn) * far * 0.7
        const r = puff.r * (k === 0 ? 1 : 0.66)
        const ball = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
        ball.addColorStop(0, `rgba(240, 236, 228, ${puff.alpha})`)
        ball.addColorStop(0.6, `rgba(206, 202, 198, ${puff.alpha * 0.85})`)
        ball.addColorStop(1, 'rgba(150, 150, 158, 0)')
        g.fillStyle = ball
        g.fillRect(x - r, y - r, r * 2, r * 2)
      }
    }
  }
  frames.set(key, g ? canvas : null)
  return g ? canvas : null
}
