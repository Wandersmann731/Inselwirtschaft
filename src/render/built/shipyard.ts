// The shipyard: a boat shed on a platform of planks, and before it a ship on the slip. Its hull is half planked:
// aft the strakes are on, forward the ribs still stand bare and one looks through them into the hull. Shores hold
// it upright, a scaffold runs along its far side, a crane lifts the timbers.
import { px, type P2, type Scene } from './kit'
import { shed } from './extras'
import { body } from './parts'
import { bar, barrel, crate, fill, flag, vat, woodpile } from './props'
import { crane } from './yardProps'

/** A platform of planks on posts: what the buildings of the harbour stand on. */
export function deck(scene: Scene, high = 2.4): void {
  const { w, h } = scene
  scene.box(0.04, 0.04, w - 0.04, h - 0.04, 0, high, { mat: 'boards', tint: 'rgb(170, 150, 130)' }, { mat: 'boards', tint: 'rgb(170, 150, 130)' }, 'deck', false)
  // the piles it stands on: along its two open sides, down into the water or the sand, the heads a little above the planks
  const pile = { mat: 'timber' as const, tint: 'rgb(150, 124, 98)' }
  for (let k = 0; k <= Math.round(w / 0.48); k++) scene.box(0.05 + (k * (w - 0.16)) / Math.round(w / 0.48), h - 0.045, 0.11 + (k * (w - 0.16)) / Math.round(w / 0.48), h + 0.015, -5, high + 1.4, pile, pile, 'timber', false)
  for (let k = 0; k < Math.round(h / 0.48); k++) scene.box(w - 0.045, 0.05 + (k * (h - 0.16)) / Math.round(h / 0.48), w + 0.015, 0.11 + (k * (h - 0.16)) / Math.round(h / 0.48), -5, high + 1.4, pile, pile, 'timber', false)
}

/** How wide the hull is at a place along its keel (0 stern, 1 bow), as a share of its greatest half-breadth. Pure. */
export function breadthAt(t: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.55 * (t > 0.5 ? 1 - 0.25 * (t - 0.5) : 1)
}

/** How high the upper edge of the hull stands over its keel at a place along it: it rises towards both ends. Pure. */
export function sheerAt(t: number, high: number): number {
  return high * (1 + 0.38 * (2 * t - 1) ** 2)
}

/** A hull on the slip, its keel along u from `ua` to `ub` at `v`, standing on the height `z`. */
function hull(scene: Scene, ua: number, ub: number, v: number, z: number): void {
  const half = 0.3
  const high = 14
  const base = z + 2
  const at = (t: number, side: number, up: number): P2 => px(ua + (ub - ua) * t, v + side * half * breadthAt(t), base + up)
  const steps = 28
  const line = (make: (t: number) => P2, from = 0, to = 1): P2[] => Array.from({ length: steps + 1 }, (_, i) => make(from + ((to - from) * i) / steps))
  const sheerNear = (t: number): P2 => at(t, 1, sheerAt(t, high))
  const sheerFar = (t: number): P2 => at(t, -1, sheerAt(t, high))
  const bilge = (t: number): P2 => at(t, 0.5, 0)
  // a place on the near side of the hull: `down` 0 at its upper edge, 1 at the turn of the bilge
  const side = (t: number, down: number): P2 => {
    const a = sheerNear(t)
    const b = bilge(t)
    return [a[0] + (b[0] - a[0]) * down, a[1] + (b[1] - a[1]) * down]
  }
  scene.item([[ua - 0.1, v - half - 0.2, z], [ub + 0.1, v + half + 0.2, z], [ub + 0.1, v, base + high * 1.8]], (g) => {
    // the scaffold along the far side: posts and a walk of planks
    for (let k = 0; k <= 4; k++) {
      const u = ua + 0.2 + ((ub - ua - 0.4) * k) / 4
      bar(g, px(u, v - half - 0.14, z), px(u, v - half - 0.14, base + high + 7), 0.8, 'rgb(112, 88, 62)')
    }
    bar(g, px(ua + 0.2, v - half - 0.14, base + high + 3), px(ub - 0.2, v - half - 0.14, base + high + 3), 1.3, 'rgb(170, 140, 100)')
    // the blocks the keel lies on
    for (let k = 0; k <= 5; k++) {
      const [x, y] = px(ua + 0.1 + ((ub - ua - 0.2) * k) / 5, v, z)
      fill(g, [[x - 2.6, y - 0.4], [x + 1, y - 2.2], [x + 2.6, y - 1.4], [x - 1, y + 0.4]], 'rgb(96, 76, 56)')
    }
    // looking into the hull: the inside of its far side, with the ribs on it
    fill(g, [...line(sheerFar), ...line(bilge).reverse()], 'rgb(78, 58, 42)')
    for (let k = 1; k < 20; k++) bar(g, sheerFar(k / 20), at(k / 20, -0.2, 1), 0.8, 'rgb(128, 98, 68)')
    // the beams that will carry the deck, from side to side
    for (let k = 2; k < 19; k += 2) bar(g, sheerFar(k / 20), sheerNear(k / 20), 0.9, 'rgb(168, 134, 94)')
    // the near side. Forward the ribs stand bare, in the light
    for (let k = 11; k < 20; k++) bar(g, sheerNear(k / 20), bilge(k / 20), 1.1, 'rgb(214, 178, 128)')
    // aft the strakes are on: every plank ends a little further forward than the one above it
    const strakes = 6
    for (let s = 0; s < strakes; s++) {
      const end = 0.52 + 0.035 * s
      const tone = s % 2 === 0 ? 'rgb(150, 108, 68)' : 'rgb(134, 94, 58)'
      fill(g, [...line((t) => side(t, s / strakes), 0, end), ...line((t) => side(t, (s + 1) / strakes), 0, end).reverse()], tone)
      // the lower edge of a plank lies in the shade of the next
      fill(g, [...line((t) => side(t, (s + 0.86) / strakes), 0, end), ...line((t) => side(t, (s + 1) / strakes), 0, end).reverse()], 'rgba(16, 20, 44, 0.2)')
    }
    // the hull turns under towards the keel: darker there
    fill(g, [...line((t) => side(t, 0.62), 0, 0.7), ...line((t) => side(t, 1), 0, 0.7).reverse()], 'rgba(16, 20, 44, 0.22)')
    // the wale: a thick light plank along the upper edge
    for (let i = 0; i < steps; i++) bar(g, sheerNear(i / steps), sheerNear((i + 1) / steps), 1.3, 'rgb(226, 192, 140)')
    // keel, sternpost and stem: the stem sweeps up high over the bow
    bar(g, at(0, 0, -0.6), at(1, 0, -0.6), 1.2, 'rgb(104, 80, 56)')
    bar(g, at(0, 0, -0.6), px(ua - 0.05, v, base + sheerAt(0, high) + 2.4), 1.5, 'rgb(128, 98, 68)')
    bar(g, at(1, 0, -0.6), px(ub + 0.08, v, base + sheerAt(1, high) + 5), 1.6, 'rgb(150, 116, 80)')
    // shores: poles that lean against the hull and hold it upright
    for (const t of [0.2, 0.5, 0.8]) bar(g, px(ua + (ub - ua) * t + 0.03, v + half * breadthAt(t) + 0.16, z), side(t, 0.4), 0.8, 'rgb(112, 88, 62)')
  })
}

export function shipyard(scene: Scene): void {
  const z = 2.4
  deck(scene, z)
  const wood = 'rgb(232, 204, 170)'
  const b = { at: [0.3, 0.3, 1.56, 1.14] as [number, number, number, number], z, wall: 'boards' as const, tint: wood, sw: { storeys: 1, storey: 18, windows: 2, door: 0.7, doorStyle: 'barn' as const }, se: { storeys: 1, storey: 18, windows: 2 }, roof: 'shingle' as const, rise: 17, over: 0.08, loft: true, paved: true }
  body(scene, b)
  shed(scene, 'se', 0.46, 1.04, b.at[2], 0.24, z + 9, { mat: 'boards', tint: wood }, 'shingle')
  hull(scene, 0.4, 2.56, 2.2, z)
  crane(scene, 2.74, 1.56, z, 26)
  // timber for the ship, a trestle with a baulk on it, pitch and rope
  woodpile(scene, 2.2, 0.56, 0.8, false, 6)
  woodpile(scene, 2.56, 0.8, 0.7, false, 5)
  for (const u of [1.0, 1.5]) scene.box(u - 0.02, 1.42, u + 0.02, 1.6, z, z + 3.4, 'timber', 'timber', 'timber', false)
  scene.box(0.86, 1.47, 1.66, 1.55, z + 3.4, z + 5.2, 'timber', 'timber', { mat: 'boards', tint: 'rgb(236, 210, 170)' }, false)
  vat(scene, 2.0, 1.2, 0.1, z + 3.4, 'rgb(32, 28, 30)', 'stone')
  for (const [u, v] of [[1.84, 0.5], [2.0, 0.42], [2.74, 2.5]]) barrel(scene, u, v)
  crate(scene, 0.4, 1.4, 0.2)
  flag(scene, 0.93, 0.72, z + 35, 10, 'rgb(190, 70, 60)')
}
