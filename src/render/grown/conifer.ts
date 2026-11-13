// Firs and palms, heaped up in space like the broad-leaved trees (volume.ts). A fir is a stem with tiers of boughs
// around it; every bough is a row of flat masses of needles that hang down and outward, and the tier above keeps
// the light off the one below. A palm is a leaning stem of rings under a fountain of fronds, each frond a rib with
// leaflets to either side.
import { contact, mix, numbers, type Ctx, type Rgb } from './paint'
import { needles, Volume, type V3 } from './volume'

const NEEDLES: Rgb[] = [[36, 62, 44], [44, 66, 40], [32, 58, 50]]
const STEM: Rgb = [78, 60, 46]

/** How far the boughs of a fir reach at `t` of its height (0 the lowest tier, 1 the tip), as a share of the widest. Pure. */
export function firReach(t: number): number {
  return (1 - t) ** 0.85 * 0.94 + 0.06
}

/** A fir in a picture `w` by `h` world pixels. Three shapes: slender, full, and one whose top leans. */
export function pine(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 43 + 7)
  const tone = NEEDLES[(variant - 1) % NEEDLES.length]
  const cx = w / 2
  const base = h - 2.5
  const tiers = variant === 2 ? 8 : 9
  const widest = variant === 1 ? w * 0.29 : w * 0.37
  const lean = variant === 3 ? 3 : 0
  const top = 4
  contact(g, cx + 1.5, base, 10, 3)
  const v = new Volume(w, h)
  v.limb([cx, base, 0], [cx + lean, top + 2, 0], 1.9, 0.35, STEM)
  const look = needles()
  const span = base - 15 - top - 5
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const reach = widest * firReach(t)
    const y = base - 15 - t * span
    const x = cx + lean * t * t
    // the dark around the stem, so that one does not look through the tree between its tiers
    v.mass(x, y + 1, 0, reach * 0.34 + 0.8, span / tiers * 0.7, reach * 0.34 + 0.8, mix(tone, [8, 18, 20], 0.6), look, 0, 1)
    const boughs = Math.max(5, Math.round(5 + reach * 0.3))
    for (let k = 0; k < boughs; k++) {
      const turn = ((k + (i % 2) * 0.5) / boughs) * Math.PI * 2 + (next() - 0.5) * 0.5
      const long = reach * (0.8 + 0.3 * next())
      const [ax, ad] = [Math.cos(turn), Math.sin(turn)]
      const green = mix(tone, [72, 98, 50], next() * 0.45)
      const parts = long > 9 ? 4 : long > 4 ? 3 : 2
      for (let part = 1; part <= parts; part++) {
        // a bough runs out and down, and its tip lifts again; what is nearer the viewer lies lower in the picture
        const f = 0.2 + (0.8 * part) / parts
        const drop = long * (0.52 * f * f - 0.16 * f ** 4)
        const wide = long * 0.17 * (1.2 - f * 0.5) + 0.7
        v.mass(x + ax * long * f, y + drop + ad * long * f * 0.3, ad * long * f, wide * (0.75 + 0.25 * Math.abs(ad)) + 0.3, 1.3 + wide * 0.3, wide, green, look, ax * 0.5, 0.25, [ax * 0.55, -0.35, ad * 0.55])
      }
    }
  }
  // the leader
  v.mass(cx + lean, top + 3, 0, 0.9, 3, 0.9, mix(tone, [72, 98, 50], 0.3), look, 0, 0.3)
  v.paint(g)
}

/** A palm in a picture `w` by `h` world pixels. Two shapes: one leans to the left, one to the right. */
export function palm(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 47 + 9)
  const dir = variant === 1 ? -1 : 1
  const base = h - 2.5
  const foot: [number, number] = [w / 2 - dir * 5, base]
  const head: [number, number] = [w / 2 + dir * 3, h * 0.36]
  const bend: [number, number] = [w / 2 - dir * 9, h * 0.6]
  const along = (t: number): V3 => [(1 - t) ** 2 * foot[0] + 2 * (1 - t) * t * bend[0] + t * t * head[0], (1 - t) ** 2 * foot[1] + 2 * (1 - t) * t * bend[1] + t * t * head[1], 0]
  contact(g, foot[0] + 2, base, 9, 3)
  const v = new Volume(w, h)
  // the stem: a little thicker at the foot, ringed where every old frond sat
  const parts = 10
  for (let i = 0; i < parts; i++) v.limb(along(i / parts), along((i + 1) / parts), 2.5 - (1.1 * i) / parts + (i === 0 ? 0.9 : 0), 2.5 - (1.1 * (i + 1)) / parts, [124, 104, 80], 2.2)
  // the heart of the crown, and the nuts under it
  v.limb([head[0], head[1] + 0.5, 0], [head[0], head[1] + 0.5, 0], 2.8, 2.8, [74, 86, 46])
  for (const [dx, dy, dd] of [[-1.8, 2.8, 1.5], [1.4, 3.2, 1.8], [0, 4.2, 2.4]]) v.limb([head[0] + dx, head[1] + dy, dd], [head[0] + dx, head[1] + dy, dd], 1.4, 1.4, [84, 60, 38])
  // fronds all around: each rises from the heart, arches over and hangs
  const count = 14
  for (let i = 0; i < count; i++) {
    const turn = (i / count) * Math.PI * 2 + (next() - 0.5) * 0.5
    const long = w * (0.3 + 0.16 * next())
    // the young fronds in the middle stand up, the old ones hang
    const young = next()
    const rise = 3 + 13 * young
    const droop = 20 - 12 * young + next() * 5
    const [ax, ad] = [Math.cos(turn), Math.sin(turn)]
    const rib = (s: number): V3 => [head[0] + ax * long * s * (1 - 0.25 * young), head[1] + ad * long * s * 0.36 - rise * Math.sin(s * Math.PI * 0.6) + droop * s * s, ad * long * s]
    const leaf = mix([38, 66, 32], [70, 98, 40], young * 0.7 + next() * 0.3)
    const steps = 18
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      const [here, before] = [rib(s), rib(s - 1 / steps)]
      v.limb(before, here, 0.42, 0.36, [108, 112, 62])
      v.shade(here[0], here[1] + 1.2, here[2], 1.7)
      // leaflets hang from the rib to either side, longest in its middle; the frond is folded along the rib
      const reach = 1.4 + 6.4 * Math.sin(Math.PI * Math.min(1, s * 1.08)) ** 0.7
      const [tx, ty] = [here[0] - before[0], here[1] - before[1]]
      const tl = Math.hypot(tx, ty) || 1
      for (const side of [-1, 1]) {
        const tip: V3 = [here[0] + (-ty / tl) * side * reach * 0.8 + (tx / tl) * reach * 0.5, here[1] + (tx / tl) * side * reach * 0.45 + reach * 0.62, here[2] + side * ax * reach * 0.5 - 0.6]
        v.blade(before, here, tip, mix(leaf, [30, 54, 30], next() * 0.6), [ax * (0.2 + s * 0.7) - side * ad * 0.5, -(1.05 - s * 0.7), 0.3 + ad * 0.5 * s + side * ax * 0.5])
      }
    }
  }
  v.paint(g)
}
