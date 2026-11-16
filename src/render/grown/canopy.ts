// Broad-leaved trees and bushes. A tree is a trunk that forks into boughs; around the end of every bough hangs a
// cluster of masses of leaves, and a few more fill the top. That is all that is said here: where the light falls,
// where the crown is dark and where one sees into it follows from the heap itself (volume.ts).
import { contact, mix, numbers, type Ctx, type Rgb } from './paint'
import { Volume, type V3 } from './volume'

/** The greens of a crown: its leaves are of a colour between `mid` and `light`. Muted: afternoon light, not spring. */
export interface Greens {
  mid: Rgb
  light: Rgb
}

export const GREENS: Greens[] = [
  { mid: [58, 73, 36], light: [100, 112, 48] },
  { mid: [66, 75, 34], light: [112, 116, 48] },
  { mid: [50, 69, 38], light: [90, 108, 52] },
  { mid: [62, 71, 34], light: [106, 108, 44] },
]

const BARK: Rgb = [86, 68, 52]

/** A crown: its middle, and how far it reaches to the sides and upward, in world pixels. */
export interface Crown {
  x: number
  y: number
  rx: number
  ry: number
}

/** Where the boughs of a crown end: `count` places spread around its middle, most of them in its upper half. Pure. */
export function boughEnds(c: Crown, count: number, next: () => number): V3[] {
  return Array.from({ length: count }, (_, i) => {
    const turn = (i / count) * Math.PI * 2 + next() * 0.8
    const rise = -0.5 + 1.3 * next()
    const far = 0.5 + 0.16 * next()
    const flat = Math.cos(rise * 1.2)
    const d = Math.sin(turn) * flat * c.rx * far
    // what is nearer to the viewer lies lower in the picture: one looks down on a crown
    return [c.x + Math.cos(turn) * flat * c.rx * far, c.y - Math.sin(rise * 1.2) * c.ry * far * 0.9 + d * 0.3, d]
  })
}

/** The way out of a crown at a place in it, shortened: it turns the leaves there a little towards the outside. Pure. */
export function outOf(c: Crown, at: V3): V3 {
  const [x, y, d] = [(at[0] - c.x) / c.rx, (at[1] - at[2] * 0.3 - c.y) / c.ry, at[2] / c.rx]
  const far = Math.hypot(x, y, d) || 1
  const pull = Math.min(1, far) * 0.95
  return [(x / far) * pull, (y / far) * pull, (d / far) * pull]
}

/**
 * Hangs a crown into the volume: boughs from `fork` to their ends, clusters of leaves around those (`perBough` of
 * them), and `heart` larger masses at its middle, so that nobody looks through it.
 */
function crown(v: Volume, c: Crown, fork: V3 | null, boughs: number, size: [number, number], greens: Greens, next: () => number, perBough = 10, heart = 5, shell = 0): void {
  const ends = boughEnds(c, boughs, next)
  for (const end of ends) {
    if (fork) v.limb(fork, end, 1.5, 0.7, BARK)
    // the leaves of one bough are of one green: some boughs stand in better earth than others
    const tone = mix(greens.mid, greens.light, next())
    for (let k = 0; k < perBough; k++) {
      const r = size[0] + next() ** 1.6 * (size[1] - size[0])
      const turn = next() * Math.PI * 2
      const lift = next() * 2 - 1
      const far = k === 0 ? 0 : c.rx * (0.14 + 0.24 * next())
      const at: V3 = [end[0] + Math.cos(turn) * far * Math.sqrt(1 - lift * lift * 0.6), end[1] - lift * far * 0.8 + Math.sin(turn) * far * 0.3, end[2] + Math.sin(turn) * far]
      v.mass(at[0], at[1], at[2], r, r * 0.84, r, tone, undefined, 0, 0.5, outOf(c, at))
    }
  }
  // the heart of the crown and its top
  for (let k = 0; k < heart; k++) {
    const r = size[1] * (0.9 + 0.2 * next())
    const at: V3 = [c.x + (next() - 0.5) * c.rx * 0.6, c.y - c.ry * (0.1 + 0.4 * next()), (next() - 0.3) * c.rx * 0.4]
    v.mass(at[0], at[1], at[2], r, r * 0.9, r, mix(greens.mid, greens.light, next()), undefined, 0, 0.5, outOf(c, at))
  }
  // and leaves all around it, a little inside its outline: an old crown is closed, the boughs do not stand out of it one by one
  for (let k = 0; k < shell; k++) {
    const turn = (k / shell) * Math.PI * 2 + next() * 0.5
    const rise = -0.3 + 1.25 * next()
    const flat = Math.cos(rise)
    const far = 0.66 + 0.1 * next()
    const d = Math.sin(turn) * flat * c.rx * far
    const at: V3 = [c.x + Math.cos(turn) * flat * c.rx * far, c.y - Math.sin(rise) * c.ry * far * 0.92 + d * 0.3, d]
    const r = size[0] + (0.5 + 0.5 * next()) * (size[1] - size[0])
    v.mass(at[0], at[1], at[2], r, r * 0.86, r, mix(greens.mid, greens.light, next()), undefined, 0, 0.5, outOf(c, at))
  }
}

/**
 * A broad-leaved tree in a picture `w` by `h` world pixels; its foot stands at the lower edge. Four shapes. An old
 * tree as it stands at the edge of a town: as tall as a house, its crown wide and heavy and hanging low over a
 * short trunk, made of many small clusters of leaves.
 */
export function tree(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 37 + 3)
  const greens = GREENS[(variant - 1) % GREENS.length]
  const cx = w / 2
  const base = h - 2.5
  // round, wide, tall, or of two crowns
  const form: Crown = variant === 2 ? { x: cx, y: h * 0.62, rx: w * 0.46, ry: h * 0.37 } : variant === 3 ? { x: cx, y: h * 0.56, rx: w * 0.36, ry: h * 0.47 } : { x: cx, y: h * 0.59, rx: w * 0.43, ry: h * 0.44 }
  contact(g, cx + 3, base, 17, 4.6)
  const v = new Volume(w, h)
  const lean = (next() - 0.5) * 6
  const fork: V3 = [cx + lean, form.y + form.ry * 0.42, 0]
  const knee: V3 = [cx + lean * 0.3, (base + fork[1]) / 2, 0]
  v.limb([cx, base, 0], knee, variant === 3 ? 3.1 : 3.6, 2.7, BARK)
  v.limb(knee, fork, 2.7, 2.2, BARK)
  // roots that run out into the ground
  for (const [dx, dd] of [[-5.6, 0.4], [5, 1.4], [1, 4.2]]) v.limb([cx + dx * 0.1, base - 5.5, 0], [cx + dx, base + dd * 0.3, dd], 1.9, 0.45, BARK)
  if (variant === 4) {
    crown(v, { x: cx + w * 0.17, y: h * 0.7, rx: w * 0.28, ry: h * 0.23 }, fork, 7, [3.3, 6.6], greens, next, 9, 5, 12)
    crown(v, { x: cx - w * 0.08, y: h * 0.5, rx: w * 0.36, ry: h * 0.36 }, fork, 10, [3.4, 7], greens, next, 9, 8, 18)
  } else crown(v, form, fork, variant === 3 ? 12 : 13, [3.4, 7.2], greens, next, 9, 9, 26)
  v.paint(g)
}

/** A bush: a low mound of leaves, one kind with berries, one in flower. */
export function bush(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 41 + 5)
  const greens = GREENS[(variant + 1) % GREENS.length]
  contact(g, w / 2 + 1.5, h - 3.5, w * 0.42, 5, 0.34)
  const v = new Volume(w, h)
  const form: Crown = { x: w / 2, y: h * 0.6, rx: w * 0.4, ry: h * 0.34 }
  crown(v, form, [w / 2, h - 4, 0], variant === 3 ? 6 : 5, [2.4, 4.6], greens, next)
  if (variant !== 3) {
    // berries or blossoms sit on the outside of the leaves, towards the viewer
    const spot: Rgb = variant === 1 ? [150, 40, 38] : [224, 220, 208]
    for (let i = 0; i < 16; i++) {
      const turn = next() * Math.PI * 2
      const far = Math.sqrt(next())
      const at: V3 = [form.x + Math.cos(turn) * far * form.rx * 0.9, form.y - 1 + Math.sin(turn) * far * form.ry * 0.8, form.rx * (1.1 - far * 0.5)]
      v.limb(at, at, 0.8, 0.8, spot)
    }
  }
  v.paint(g)
}
