// What a town house with a garden keeps along the edge of its plot: a clipped hedge or a low wall of stone on the
// two sides one sees, with a gate before every door, posts of dressed stone beside the gate, a border of flowers
// along the house and a few flags from the gate to the door. The grass between them is the ground of the map
// (see ../townGround.ts); which plan has a garden at all says plots.ts.
import { hash2 } from '../../world/noise2d'
import { paintBorder, paintHedge } from '../gardenSprites'
import { px, type P3, type Scene } from './kit'
import { block, fill } from './props'
import { cone } from './round'

/** Where the gates of a plot are: at this place along its left side (u) and along its right side (v), in tiles. */
export interface Gates {
  sw?: number
  se?: number
}

/** The enclosure runs this far inside the edge of the plot (tiles); a gate is twice this wide. */
const INSET = 0.07
const GATE = 0.17
/** A wall: knee high (world pixels) and a hand thick (tiles), with a coping of dressed stone. */
const WALL = { high: 3.8, thick: 0.05, cope: 0.9 }
/** A gate post (tiles across, world pixels high). */
const POST = { size: 0.07, high: 6.2 }

/** The stretches of a side from `from` to `to` that are closed: all of it, or what a gate at `gate` leaves. Pure. */
export function stretches(from: number, to: number, gate?: number): [number, number][] {
  if (gate === undefined) return [[from, to]]
  return ([[from, gate - GATE], [gate + GATE, to]] as [number, number][]).filter(([a, b]) => b - a > 0.1)
}

/** A hedge from one place to another: leaves in clumps, as high as a man's hip. */
function hedge(scene: Scene, u0: number, v0: number, u1: number, v1: number): void {
  const w = 0.07
  const pts: P3[] = []
  for (const z of [0, 8]) pts.push([Math.min(u0, u1) - w, Math.min(v0, v1) - w, z], [Math.max(u0, u1) + w, Math.min(v0, v1) - w, z], [Math.max(u0, u1) + w, Math.max(v0, v1) + w, z], [Math.min(u0, u1) - w, Math.max(v0, v1) + w, z])
  scene.item(pts, (g) => paintHedge(g, [u0, v0, u1, v1], scene.seed + Math.round(u0 * 31 + v0 * 17)))
}

/** A low wall from one place to another along u or along v: rough stone under a coping. */
function wall(scene: Scene, u0: number, v0: number, u1: number, v1: number): void {
  const t = WALL.thick / 2
  const lip = 0.012
  const stone = { mat: 'stone' as const }
  const cope = { mat: 'ashlar' as const }
  const [a0, b0, a1, b1] = v0 === v1 ? [u0, v0 - t, u1, v0 + t] : [u0 - t, v0, u0 + t, v1]
  scene.box(a0, b0, a1, b1, 0, WALL.high, stone, stone, null)
  scene.box(a0 - lip, b0 - lip, a1 + lip, b1 + lip, WALL.high, WALL.high + WALL.cope, cope, cope, cope, false)
}

/** A gate post of dressed stone with a cap, and a point on it where the house is a fine one. */
function post(scene: Scene, u: number, v: number, fine: boolean): void {
  block(scene, u, v, POST.size, POST.size, POST.high, 'ashlar')
  block(scene, u, v, POST.size + 0.028, POST.size + 0.028, 0.9, 'ashlar', undefined, POST.high)
  if (fine) cone(scene, u, v, 0.034, POST.high + 0.9, 2.4, 'ashlar')
}

/**
 * Closes the two sides of a plot one sees with a hedge or a wall, leaving a gate where `gates` says, with a post on
 * either side of it. `size` is the plot in tiles, `fine` gives the posts their points.
 */
export function enclose(scene: Scene, kind: 'hedge' | 'wall', gates: Gates, fine = false, size = 2): void {
  const [near, far] = [INSET, size - INSET]
  const run = kind === 'hedge' ? hedge : wall
  for (const [a, b] of stretches(near, far, gates.sw)) run(scene, a, far, b, far)
  for (const [a, b] of stretches(near, far, gates.se)) run(scene, far, a, far, b)
  // a hedge needs no posts unless the house is a fine one; a wall always ends in them
  if (kind === 'hedge' && !fine) return
  if (gates.sw !== undefined) for (const u of [gates.sw - GATE, gates.sw + GATE]) post(scene, u, far, fine)
  if (gates.se !== undefined) for (const v of [gates.se - GATE, gates.se + GATE]) post(scene, far, v, fine)
}

/** A few flags on the ground from the wall of the house (at `wall`, in tiles) to the gate at `along` of the left side. */
export function path(scene: Scene, along: number, wall: number, size = 2): void {
  const far = size - INSET
  const slabs = Math.max(1, Math.round((far - wall - 0.04) / 0.11))
  scene.ground([[along - 0.14, wall, 0], [along + 0.14, far, 0]], (g) => {
    for (let k = 0; k < slabs; k++) {
      const v = wall + 0.03 + ((far - wall - 0.05) * k) / slabs
      const deep = (far - wall - 0.05) / slabs - 0.014
      const off = (hash2(k, 1, scene.seed + 771) - 0.5) * 0.03
      const tone = 0.86 + 0.2 * hash2(k, 2, scene.seed + 772)
      const [a, b] = [along - 0.11 + off, along + 0.11 + off]
      // the earth around the slab, then the slab, then the edge of it that lies away from the sun
      fill(g, [px(a - 0.012, v - 0.008), px(b + 0.012, v - 0.008), px(b + 0.012, v + deep + 0.008), px(a - 0.012, v + deep + 0.008)], 'rgba(86, 76, 58, 0.55)')
      fill(g, [px(a, v), px(b, v), px(b, v + deep), px(a, v + deep)], `rgb(${Math.round(170 * tone)}, ${Math.round(158 * tone)}, ${Math.round(136 * tone)})`)
      fill(g, [px(b - 0.014, v), px(b, v), px(b, v + deep), px(b - 0.014, v + deep)], 'rgba(40, 40, 60, 0.22)')
    }
  })
}

/**
 * A border of flowers along the left wall of a house (at `wall`), from `from` to `to` along it, with room left
 * before the door at `door`.
 */
export function border(scene: Scene, from: number, to: number, wall: number, door?: number): void {
  for (const [a, b] of stretches(from, to, door)) {
    const v = wall + 0.075
    scene.item([[a, v - 0.05, 0], [b, v + 0.05, 0], [a, v - 0.05, 3], [b, v + 0.05, 3]], (g) => paintBorder(g, a, v, b, v, scene.seed + Math.round(a * 53)), false)
  }
}
