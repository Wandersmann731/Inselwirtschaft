// What is built on to a house and makes it this house and no other: a wing with its own gable, a bay that hangs on
// an upper storey, a turret on the corner, a beam to hoist goods to the loft, a sign over the street, a hood over
// the door, and the grass that grows along the foot of its walls.
import { hash2 } from '../../world/noise2d'
import { DUSK, px, trace, type P3, type Scene, type Surface } from './kit'
import { facade, STOREY, windowPane, type Facade, type WindowStyle } from './facade'
import { baseColour, material, type Mat } from './materials'
import type { Body, Built } from './parts'
import { cone, cylinder } from './round'
import { gable } from './roofs'

/** The two walls one sees: 'sw' looks left and is in the sun, 'se' looks right and is in the shade. */
export type Side = 'sw' | 'se'

/** A place on a wall: `along` it, `out` of it. On the left wall that is (u, v), on the right one (v, u). */
const place = (side: Side, along: number, out: number): [number, number] => (side === 'sw' ? [along, out] : [out, along])

/** A box between two places along a wall and two distances out of it. */
function wallBox(scene: Scene, side: Side, a0: number, a1: number, o0: number, o1: number, z0: number, z1: number, front: Surface | null, flank: Surface | null, top: Surface | Mat | null = null, shadow = true): void {
  if (side === 'sw') scene.box(a0, o0, a1, o1, z0, z1, front, flank, top, shadow)
  else scene.box(o0, a0, o1, a1, z0, z1, flank, front, top, shadow)
}

/**
 * The shadow that something standing `out` tiles before the sunlit wall throws on that wall: it falls to the right
 * and down. `a0` to `a1` is the thing along the wall, `z0` to `z1` its height; the shadow ends at `limit` along the wall.
 */
export function wallShade(scene: Scene, a0: number, a1: number, wall: number, out: number, z0: number, z1: number, limit: number): void {
  const right = Math.min(limit, a1 + out * 0.9)
  const drop = Math.min(out * 38, z1 - z0 + out * 38)
  if (right <= a1 + 0.005) return
  const low = Math.max(0, z0 - drop)
  const pts: P3[] = [[a1, wall + 0.002, z1], [right, wall + 0.002, z1 - drop], [right, wall + 0.002, low], [a0, wall + 0.002, low], [a0, wall + 0.002, z0], [a1, wall + 0.002, z0]]
  scene.item(pts, (g) => {
    g.fillStyle = `rgba(${DUSK}, 0.34)`
    trace(g, pts.map((p) => px(p[0], p[1], p[2])))
    g.fill()
  }, false)
}

export interface Wing {
  side: Side
  /** From where to where along the wall, and how far it stands out of it (tiles). */
  from: number
  to: number
  out: number
  /** Its front wall. */
  front: Facade
  /** Height of its roof: not higher than the roof it runs into. */
  rise: number
  roof?: Mat
}

/**
 * A wing that stands out of a wall, as high as the house, under its own saddle roof that runs back into the roof of
 * the house. Its gable looks the way the wall does.
 */
export function wing(scene: Scene, b: Body, main: Built, w: Wing): void {
  const z = b.z ?? 0
  const storey = b.sw.storey ?? STOREY
  const sw = w.side === 'sw'
  const ground = sw ? b.at[3] : b.at[2]
  const wall = sw ? main.top[3] : main.top[2]
  // it must stand clear of the eaves of the house
  const front = wall + Math.max(w.out, main.over + 0.05)
  const plain: Surface = { mat: b.wall, tint: b.tint }
  const levels = Math.max(1, b.sw.storeys)
  // its narrow side wall: the stone of the ground floor and the beams between the storeys, a post at the corner
  const flank = (level: number | null, corner: boolean): Surface['detail'] => (g, width, h) => {
    const f = w.front
    const bottom = (l: number): number => (level === null ? h - l * storey : h + (level - l) * storey)
    if (f.ground) {
      g.fillStyle = material(f.ground)
      g.fillRect(0, bottom(0) - storey, width, storey)
    } else if (f.base) {
      g.fillStyle = material(f.base[0])
      g.fillRect(0, bottom(0) - f.base[1], width, f.base[1])
    }
    if (!f.timber) return
    g.fillStyle = material('timber')
    for (let l = f.ground ? 1 : 0; l < levels; l++) {
      g.fillRect(0, bottom(l) - 1.5, width, 1.5)
      g.fillRect(0, bottom(l) - storey, width, 1.3)
      const posts = sw ? [0, width - 1.5] : [width - 1.5, 0]
      if (corner) g.fillRect(posts[0], bottom(l) - storey, 1.5, storey)
      g.fillRect(posts[1], bottom(l) - storey, 1.5, storey)
    }
  }
  // what lies under the eaves of the house is built storey by storey, so it is drawn before that roof
  for (let level = 0; level < levels; level++) {
    const from = level === 0 ? ground : wall
    if (wall + main.over - from > 0.005) wallBox(scene, w.side, w.from, w.to, from, wall + main.over, z + level * storey, z + (level + 1) * storey, null, { ...plain, raised: level > 0, detail: flank(level, false) })
  }
  const face: Surface = { ...plain, detail: facade(scene, w.front, 5) }
  if (sw) wallShade(scene, w.from, w.to, wall, front - wall, z, main.eaves, main.top[2])
  wallBox(scene, w.side, w.from, w.to, wall + main.over, front, z, main.eaves, face, { ...plain, detail: flank(null, true) })
  const half = (w.to - w.from) / 2
  const rise = Math.min(w.rise * scene.pitch, main.rise)
  // its eaves must not hang lower than those of the house
  const over = Math.min(0.05, ((main.eaves - main.low) * half) / rise)
  const drop = (rise * over) / half
  const aligned = main.shape === 'hip' || (sw ? main.shape === 'u' : main.shape === 'v')
  const join = aligned ? { ridge: wall - (main.span * rise) / main.rise, eave: wall + (main.span * drop) / main.rise } : { ridge: wall, eave: wall }
  const roof: Surface = { mat: w.roof ?? b.roof, tint: b.roofTint }
  const end: Surface = {
    ...plain,
    detail: (g, width, h) => {
      if (rise > 11) windowPane(scene, g, width / 2 - 1.9, h - 8.4, 3.8, 5.2, w.front.window)
    },
  }
  if (sw) gable(scene, w.from, wall, w.to, front, main.eaves, rise, 'v', over, roof, end, join)
  else gable(scene, wall, w.from, front, w.to, main.eaves, rise, 'u', over, roof, end, join)
}

export interface Oriel {
  side: Side
  /** Its middle along the wall, the wall it hangs on (the wall of that storey), half its width, how far it stands out. */
  at: number
  wall: number
  half?: number
  out?: number
  /** From which height to which. */
  z0: number
  z1: number
  mat: Mat
  tint?: string
  roof: Mat
  window?: WindowStyle
}

/** A bay that hangs on an upper storey, on two brackets, under a small lean-to roof. */
export function oriel(scene: Scene, o: Oriel): void {
  const half = o.half ?? 0.13
  const out = o.out ?? 0.1
  const plain: Surface = { mat: o.mat, tint: o.tint, raised: true }
  const high = o.z1 - o.z0
  const front: Surface = {
    ...plain,
    detail: (g, w, h) => {
      const pane = Math.min(3.6, (w - 2.4) / 2)
      for (const x of [w / 2 - pane - 0.4, w / 2 + 0.4]) windowPane(scene, g, x, h * 0.5 - 3.4, pane, Math.min(6.4, high - 4), { ...o.window, shutters: undefined, flowers: false })
    },
  }
  const flank: Surface = { ...plain, detail: (g, w, h) => windowPane(scene, g, w / 2 - 1, h * 0.5 - 3.4, 2, Math.min(6.4, high - 4), { ...o.window, shutters: undefined, flowers: false }) }
  if (o.side === 'sw') wallShade(scene, o.at - half, o.at + half, o.wall, out, o.z0, o.z1 + 2, o.at + half + 0.3)
  for (const d of [-half + 0.02, half - 0.045]) wallBox(scene, o.side, o.at + d, o.at + d + 0.025, o.wall, o.wall + out * 0.7, o.z0 - 2.6, o.z0, { mat: 'timber' }, { mat: 'timber' }, null, false)
  wallBox(scene, o.side, o.at - half, o.at + half, o.wall, o.wall + out, o.z0, o.z1, front, flank)
  leanTo(scene, o.side, o.at - half - 0.02, o.at + half + 0.02, o.wall, out + 0.025, o.z1 + 3.4, o.z1 - 0.3, o.roof)
}

/** A small roof that leans on a wall: over a bay, a door, a shed. It falls from `zTop` at the wall to `zLow` at its edge. */
export function leanTo(scene: Scene, side: Side, a0: number, a1: number, wall: number, out: number, zTop: number, zLow: number, roof: Surface | Mat, cheek?: Mat): void {
  const at = (along: number, o: number, z: number): P3 => [...place(side, along, o), z]
  if (cheek) {
    // the triangle of wall under the slope, on the end one sees
    const tri: P3[] = [at(a1 - 0.02, wall, zLow), at(a1 - 0.02, wall, zTop), at(a1 - 0.02, wall + out - 0.03, zLow)]
    scene.item(tri, (g) => {
      g.fillStyle = baseColour(cheek, side === 'sw' ? 0.56 : 0.86)
      trace(g, tri.map((p) => px(p[0], p[1], p[2])))
      g.fill()
    }, false)
  }
  // around the face, starting top left on screen
  if (side === 'sw') scene.quad([at(a0, wall, zTop), at(a1, wall, zTop), at(a1, wall + out, zLow), at(a0, wall + out, zLow)], roof, 'lit')
  else scene.quad([at(a1, wall, zTop), at(a0, wall, zTop), at(a0, wall + out, zLow), at(a1, wall + out, zLow)], roof, 'shade')
}

/**
 * A round turret on the corner where the two walls meet, from the height `z0` up beyond the eaves, under a pointed
 * roof. It is built in the storeys of the house, so that each part is drawn after the walls of its storey.
 */
export function turret(scene: Scene, b: Body, main: Built, z0: number, r: number, mat: Surface, roof: Mat, window?: WindowStyle): void {
  const storey = b.sw.storey ?? STOREY
  const u = main.top[2] - 0.02
  const v = main.top[3] - 0.02
  const stops = [z0]
  for (let z = (b.z ?? 0) + storey; z < main.low; z += storey) if (z > z0 + 1) stops.push(z)
  stops.push(main.low, main.eaves + 6)
  for (let i = 0; i + 1 < stops.length; i++) {
    const high = stops[i + 1] - stops[i]
    const side: Surface = {
      ...mat,
      detail: (g, w, h) => {
        mat.detail?.(g, w, h)
        if (high > 12) for (const share of [0.3, 0.62]) windowPane(scene, g, w * share - 1.4, h / 2 - 3.4, 2.8, 6.2, { ...window, shutters: undefined, flowers: false })
      },
    }
    cylinder(scene, u, v, r, stops[i], stops[i + 1], side)
  }
  // a bracket of stone under it
  cylinder(scene, u, v, r * 0.5, z0 - 3, z0, { mat: 'stone' }, null, 2)
  cone(scene, u, v, r + 0.03, main.eaves + 6, 17, roof)
}

/** A shed that leans on a wall: low walls of boards or stone under a roof that falls away from the house. */
export function shed(scene: Scene, side: Side, a0: number, a1: number, wall: number, out: number, high: number, mat: Surface, roof: Mat, front?: Facade): void {
  const face: Surface = front ? { ...mat, detail: facade(scene, front, 8) } : mat
  if (side === 'sw') wallShade(scene, a0, a1, wall, out, 0, high + 4, a1 + 0.3)
  wallBox(scene, side, a0, a1, wall, wall + out, 0, high, face, mat)
  leanTo(scene, side, a0 - 0.03, a1 + 0.03, wall, out + 0.05, high + 5.5, high - 0.6, roof, mat.mat)
}

/** A roof on four posts with no walls under it: a place to work or to keep things in the dry. */
export function shelter(scene: Scene, u0: number, v0: number, u1: number, v1: number, high: number, rise: number, axis: 'u' | 'v', roof: Mat): void {
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) scene.box(u - 0.016, v - 0.016, u + 0.016, v + 0.016, 0, high, { mat: 'timber' }, { mat: 'timber' }, null, false)
  // the beams the roof lies on, along the two sides one sees
  scene.box(u0, v1 - 0.016, u1, v1 + 0.016, high - 1.4, high, { mat: 'timber' }, { mat: 'timber' }, null, false)
  scene.box(u1 - 0.016, v0, u1 + 0.016, v1, high - 1.4, high, { mat: 'timber' }, { mat: 'timber' }, null, false)
  gable(scene, u0, v0, u1, v1, high, rise, axis, 0.05, roof, null)
}

/** A beam that sticks out of a gable at the height `z`, with a rope and a bale on its hook. */
export function hoist(scene: Scene, side: Side, at: number, wall: number, z: number, rope: number): void {
  const long = 0.2
  wallBox(scene, side, at - 0.014, at + 0.014, wall, wall + long, z, z + 1.3, { mat: 'timber' }, { mat: 'timber' }, { mat: 'timber' }, false)
  const [u, v] = place(side, at, wall + long - 0.03)
  scene.item([[u - 0.03, v - 0.03, z - rope], [u + 0.03, v + 0.03, z]], (g) => {
    const [x, y] = px(u, v, z)
    g.fillStyle = 'rgb(92, 78, 58)'
    g.fillRect(x - 0.15, y, 0.3, rope - 3)
    // the bale, tied up in sackcloth
    g.fillStyle = 'rgb(176, 150, 106)'
    g.beginPath()
    g.ellipse(x, y + rope - 1.6, 1.7, 1.9, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(40, 34, 40, 0.3)'
    g.beginPath()
    g.ellipse(x + 0.6, y + rope - 1.3, 1.1, 1.5, 0, 0, Math.PI * 2)
    g.fill()
  }, false)
}

/** A painted board that hangs over the street on an iron arm, at the height `z`. */
export function sign(scene: Scene, side: Side, at: number, wall: number, z: number, colour: string): void {
  wallBox(scene, side, at - 0.006, at + 0.006, wall, wall + 0.17, z + 4.6, z + 5.1, { mat: 'timber', tint: 'rgb(90, 90, 100)' }, { mat: 'timber', tint: 'rgb(90, 90, 100)' }, null, false)
  const board: Surface = {
    mat: 'boards',
    tint: colour,
    wear: 0,
    detail: (g, w, h) => {
      g.fillStyle = 'rgba(244, 226, 170, 0.9)'
      g.beginPath()
      g.ellipse(w / 2, h / 2, w * 0.24, h * 0.28, 0, 0, Math.PI * 2)
      g.fill()
    },
  }
  wallBox(scene, side, at - 0.008, at + 0.008, wall + 0.04, wall + 0.16, z, z + 4.4, board, board, null, false)
}

/** Grass and weeds along the foot of a wall from one place to another: no house meets the ground in a clean line. */
/**
 * Where people walk in and out the grass is gone: a patch of bare, trodden earth before a door at `along` of a wall,
 * widest at the threshold and running out a third of a tile from it, lighter where the feet go most.
 */
export function threshold(scene: Scene, side: Side, along: number, wall: number, seed: number): void {
  const [u0, v0] = place(side, along - 0.3, wall)
  const [u1, v1] = place(side, along + 0.3, wall + 0.42)
  scene.ground([[u0, v0, 0], [u1, v1, 0]], (g) => {
    for (let i = 0; i < 150; i++) {
      const out = hash2(i, seed, 481) ** 1.5 * 0.36
      const off = (hash2(i, seed, 482) - 0.5) * (0.36 - out * 0.6)
      const [x, y] = px(...place(side, along + off, wall + 0.01 + out))
      const tone = 0.86 + 0.26 * hash2(i, seed, 483)
      g.fillStyle = `rgba(${Math.round(158 * tone)}, ${Math.round(128 * tone)}, ${Math.round(88 * tone)}, ${0.5 - out * 0.9})`
      g.beginPath()
      g.ellipse(x, y, 1.4 + 1.6 * hash2(i, seed, 484), 0.7 + 0.7 * hash2(i, seed, 485), 0, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/**
 * What lies about a house on bare ground: pebbles, chips of wood from the chopping, dead leaves, a path worn from
 * the walls outward. All of it flat on the ground around the walls (u0, v0)-(u1, v1), nothing anyone could trip over.
 */
export function yardLitter(scene: Scene, u0: number, v0: number, u1: number, v1: number, seed: number): void {
  scene.ground([[u0 - 0.3, v0 - 0.3, 0], [u1 + 0.3, v1 + 0.3, 0]], (g) => {
    for (let i = 0; i < 70; i++) {
      // before the two walls one sees, up to a third of a tile out
      const front = hash2(i, seed, 491) < 0.5
      const along = hash2(i, seed, 492)
      const out = 0.03 + 0.3 * hash2(i, seed, 493) ** 1.4
      const [x, y] = front ? px(u0 + (u1 - u0 + 0.2) * along, v1 + out) : px(u1 + out, v0 + (v1 - v0 + 0.2) * along)
      const kind = hash2(i, seed, 494)
      const turn = hash2(i, seed, 495) * Math.PI
      g.fillStyle = kind < 0.4 ? 'rgba(150, 146, 136, 0.8)' : kind < 0.7 ? 'rgba(206, 176, 124, 0.8)' : 'rgba(96, 78, 50, 0.6)'
      g.beginPath()
      g.ellipse(x, y, kind < 0.4 ? 0.55 : 0.9, kind < 0.4 ? 0.4 : 0.26, turn, 0, Math.PI * 2)
      g.fill()
      if (kind < 0.4) {
        g.fillStyle = 'rgba(30, 28, 40, 0.3)'
        g.beginPath()
        g.ellipse(x + 0.35, y + 0.2, 0.5, 0.25, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
  })
}

export function tufts(scene: Scene, side: Side, a0: number, a1: number, wall: number, seed: number, gap?: [number, number]): void {
  const greens = ['rgb(74, 98, 52)', 'rgb(96, 118, 60)', 'rgb(122, 134, 72)', 'rgb(140, 128, 84)']
  const [ua, va] = place(side, a0, wall)
  const [ub, vb] = place(side, a1, wall + 0.03)
  scene.item([[ua, va, 0], [ub, vb, 0]], (g) => {
    const n = Math.round((a1 - a0) * 26)
    for (let i = 0; i < n; i++) {
      const luck = hash2(i, seed, 471)
      if (luck < 0.3) continue
      const along = a0 + ((i + hash2(i, seed, 472)) / n) * (a1 - a0)
      // nothing grows where people walk in and out
      if (gap && along > gap[0] && along < gap[1]) continue
      const [x, y] = px(...place(side, along, wall + 0.012))
      const high = 1 + 2.4 * (luck - 0.3)
      g.fillStyle = `rgba(40, 44, 36, 0.3)`
      g.beginPath()
      g.ellipse(x, y + 0.1, 1.3, 0.5, 0, 0, Math.PI * 2)
      g.fill()
      for (let k = -1; k <= 1; k++) {
        g.fillStyle = greens[Math.floor(hash2(i, k + 2, seed) * greens.length)]
        g.beginPath()
        g.moveTo(x + k * 0.5 - 0.35, y + 0.2)
        g.lineTo(x + k * 0.5 + 0.35, y + 0.2)
        g.lineTo(x + k * 0.95 + (hash2(i, k + 7, seed) - 0.5) * 0.8, y - high * (k === 0 ? 1 : 0.7))
        g.closePath()
        g.fill()
      }
    }
  }, false)
}
