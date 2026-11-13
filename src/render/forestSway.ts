// Wind in the forest. The trees of a forest are painted into the pictures of the ground once and kept, so they
// cannot be drawn anew in every frame. Instead the crown of every other tree is taken out of that picture as it
// stands - with its light, its shade and whatever overlaps it - and laid over the same place a little to one side,
// more at the top than further down, and differently from moment to moment. The eye reads that as a crown moving.
import { swayOf } from './decorDraw'

/** Numbers kept per tree: left, top, width and height of its picture in world pixels within the ground picture. */
const FIELDS = 4
/** Below this zoom a crown would move by less than a screen pixel: nothing is drawn. */
export const SWAY_FROM_ZOOM = 0.75

const trees = new WeakMap<HTMLCanvasElement, number[]>()

/** Whether a tree at this place moves in the wind: every other one, so a forest does not sway as one. Pure. */
export function swaysHere(kind: string, wx: number, wy: number): boolean {
  return (kind === 'tree' || kind === 'pine' || kind === 'palm') && (Math.round(wx / 3) + Math.round(wy / 3)) % 2 === 0
}

/** Remembers a tree that was painted into a ground picture. */
export function noteTree(canvas: HTMLCanvasElement, left: number, top: number, width: number, height: number): void {
  const list = trees.get(canvas)
  if (list) list.push(left, top, width, height)
  else trees.set(canvas, [left, top, width, height])
}

/**
 * The two parts of a crown that are moved and by how much, for a tree `height` world pixels high that leans by
 * `lean` (world pixels per world pixel of height): [share of the height where the part begins, where it ends, its
 * shift]. The trunk and the foot of the crown stay where they are. Pure.
 */
export function crownParts(height: number, lean: number): [number, number, number][] {
  return [[0, 0.3, lean * height * 0.82], [0.3, 0.58, lean * height * 0.5]]
}

/** Moves the crowns in a ground picture that was just drawn at (x, y) in the world, `w` world pixels wide. */
export function swayForest(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, w: number, now: number): void {
  const list = trees.get(canvas)
  if (!list) return
  const k = canvas.width / w
  for (let i = 0; i < list.length; i += FIELDS) {
    const [left, top, width, height] = [list[i], list[i + 1], list[i + 2], list[i + 3]]
    const lean = swayOf('tree', now, left * 3.1 + top * 1.7)
    for (const [from, to, shift] of crownParts(height, lean)) {
      // only what lies inside the picture can be taken from it
      const sx = Math.max(0, left * k)
      const sy = Math.max(0, (top + height * from) * k)
      const sw = Math.min(canvas.width, (left + width) * k) - sx
      const sh = Math.min(canvas.height, (top + height * to) * k) - sy
      if (sw < 2 || sh < 2) continue
      ctx.drawImage(canvas, sx, sy, sw, sh, x + sx / k + shift, y + sy / k, sw / k, sh / k)
    }
  }
}
