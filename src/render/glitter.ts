// What lies on the waves one by one: the sun as small sparks of light that flare up and go out, and the white caps
// of crests that break, stand a moment and are gone. Each has its own place and beat, so nothing in them repeats,
// which the pictures of the waves below must do. They are drawn on the open water before shore and land, so what
// lies over the water covers them.
import { hash2 } from '../world/noise2d'

/** Size of the cells the sea is divided into, in world pixels: one spark may flare in each, and one crest may break. */
const CELL = { w: 46, h: 23 }
/** The share of its beat during which a crest shows white, and how far it runs on with the waves meanwhile (world pixels). */
const CAP = { share: 0.5, run: [6, 3.4] }
/** Caps of similar strength are drawn in one go: this many strengths are told apart. */
const LEVELS = 3
/** Device pixels per world pixel at which a cell is as large as it is meant; seen from further off the cells grow. */
const NEAR = 2.6

/** How bright the spark of a cell is at a time (milliseconds): 0 most of the time, up to 1 for a moment. Pure. */
export function sparkAt(cx: number, cy: number, now: number): number {
  const beat = 1500 + 2600 * hash2(cx, cy, 771)
  const wave = Math.sin((now / beat + hash2(cx, cy, 772)) * Math.PI * 2)
  return wave > 0.9 ? (wave - 0.9) * 10 : 0
}

/** Where a cell stands in the beat of its breaking crest at a time (milliseconds), 0 to 1. Each cell has its own beat. */
function turnOf(cx: number, cy: number, now: number): number {
  const beat = 4600 + 5400 * hash2(cx, cy, 781)
  return (((now / beat + hash2(cx, cy, 782)) % 1) + 1) % 1
}

/** How much of the crest shows at that place in its beat: it breaks, stands a moment and fades. Some cells break harder than others. */
function capOf(cx: number, cy: number, turn: number): number {
  return turn >= CAP.share ? 0 : Math.sin((turn / CAP.share) * Math.PI) ** 1.4 * (0.35 + 0.65 * hash2(cx, cy, 783))
}

/**
 * How much of a breaking crest shows in a cell at a time (milliseconds), 0 to 1: it breaks, stands a moment and
 * fades, and for the rest of its beat the water there is smooth. Pure.
 */
export function capAt(cx: number, cy: number, now: number): number {
  return capOf(cx, cy, turnOf(cx, cy, now))
}

/**
 * How many times larger the cells are drawn at a view of `scale` device pixels per world pixel: seen from far off
 * the same sea holds four or nine times the cells, and a screen full of them is neither wanted nor quick. So a
 * screen shows about as many sparks and caps from afar as from near. Pure.
 */
export function cellGrowth(scale: number): number {
  return Math.max(1, Math.min(4, Math.round(NEAR / scale)))
}

/** Several numbers from 0 to 1 out of one: cheaper than a new hash for every one of them. */
const part = (seed: number, k: number): number => {
  const value = seed * (17.3 + k * 91.7)
  return value - Math.floor(value)
}

/** A piece of froth on a crest: pointed at both ends, heaped up towards the top of the screen, lying at a slant. */
function lens(path: Path2D, x: number, y: number, long: number, thick: number, tilt: number): void {
  const [ax, ay] = [Math.cos(tilt) * long, Math.sin(tilt) * long]
  path.moveTo(x - ax, y - ay)
  path.quadraticCurveTo(x, y - thick * 2, x + ax, y + ay)
  path.quadraticCurveTo(x, y + thick * 0.7, x - ax, y - ay)
}

/** Draws the caps and the sparks in a part of the world (world pixels). */
export function drawGlitter(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number): void {
  const grow = cellGrowth(ctx.getTransform().a)
  const [w, h] = [CELL.w * grow, CELL.h * grow]
  const caps = Array.from({ length: LEVELS }, () => new Path2D())
  ctx.fillStyle = 'rgb(255, 250, 226)'
  for (let cy = Math.floor(area.y / h); cy <= Math.floor((area.y + area.h) / h); cy++) {
    for (let cx = Math.floor(area.x / w); cx <= Math.floor((area.x + area.w) / w); cx++) {
      // cells of another size are other cells: they must not flare in step with the small ones
      const turn = turnOf(cx, cy + grow * 4096, now)
      const cap = capOf(cx, cy + grow * 4096, turn)
      if (cap > 0.08) {
        const seed = hash2(cx, cy, 784 + grow)
        // it runs on with the waves while it lasts
        const x = (cx + part(seed, 0)) * w + (CAP.run[0] * turn) / CAP.share
        const y = (cy + part(seed, 1)) * h + (CAP.run[1] * turn) / CAP.share
        const long = (1.5 + 2.8 * part(seed, 2)) * (0.6 + 0.4 * cap)
        const path = caps[Math.min(LEVELS - 1, Math.floor(cap * LEVELS))]
        const tilt = (part(seed, 3) - 0.5) * 0.5
        lens(path, x, y, long, 0.5 + 0.4 * cap, tilt)
        // froth is torn: a smaller piece beside the first, lying its own way
        lens(path, x + (part(seed, 4) - 0.5) * long * 2.6, y + (part(seed, 5) - 0.4) * 1.7, long * (0.3 + 0.35 * part(seed, 6)), 0.34 + 0.26 * cap, -tilt)
      }
      const spark = sparkAt(cx, cy + grow * 4096, now)
      if (spark <= 0) continue
      const seed = hash2(cx, cy, 773 + grow)
      ctx.globalAlpha = 0.75 * spark
      ctx.beginPath()
      ctx.ellipse((cx + part(seed, 0)) * w, (cy + part(seed, 1)) * h, 1.1 + 1.6 * spark, 0.45 + 0.3 * spark, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgb(238, 245, 242)'
  caps.forEach((path, level) => {
    ctx.globalAlpha = 0.34 + (0.5 * (level + 1)) / LEVELS
    ctx.fill(path)
  })
  ctx.globalAlpha = 1
}
