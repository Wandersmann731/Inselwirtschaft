// What a house is put together from: a body of walls under a roof, storey by storey, with chimneys and dormers.
// What stands on its walls is in facade.ts, what is built on to it (bays, wings, turrets) in extras.ts.
import { hash2 } from '../../world/noise2d'
import { DUSK, EDGE, px, trace, type P2, type P3, type Scene, type Surface } from './kit'
import { facade, STOREY, windowPane, doorway, type Facade, type WindowStyle } from './facade'
import { material, type Mat } from './materials'
import { gable, hip, type Join } from './roofs'
import { threshold, tufts, yardLitter } from './extras'

export { DOOR, STOREY, facade, windowPane, doorway, type Facade, type Frame, type WindowStyle } from './facade'

/** A whole building body: walls and a roof over them. */
export interface Body {
  /** Footprint in tiles: u0, v0, u1, v1. */
  at: [number, number, number, number]
  /** The height it stands on (default the ground). */
  z?: number
  wall: Mat
  tint?: string
  /** The two walls one sees: the left one (in the sun) and the right one (in the shade). */
  sw: Facade
  se: Facade
  roof: Mat
  roofTint?: string
  /** Height of the roof, and its shape: a saddle roof with the ridge along 'u' or 'v', or a hipped one. */
  rise: number
  shape?: 'u' | 'v' | 'hip'
  /** How far the roof reaches beyond the walls, in tiles. */
  over?: number
  /** A window in the gable. */
  attic?: boolean
  /** Every storey reaches this many tiles further out over the street than the one below it. */
  jetty?: number
  /** A loft door in the gable instead of a window: goods are hoisted up to it. */
  loft?: boolean
  /** No grass along the foot of the walls: it stands on a floor of stone or planks. */
  paved?: boolean
  /** It stands in a garden: grass along its walls, but no trodden earth and nothing lying about. */
  garden?: boolean
  /** Its roof runs back into the slope of another roof (a nave into its transept). */
  join?: Join
  /** How much it leans (1 is an old timber house, 0 a wall that stands true); by default that follows from its walls. */
  lean?: number
}

/** How much a house of these walls has settled over the years: timber gives, dressed stone and brick do not. */
const LEAN: Partial<Record<Mat, number>> = { plaster: 1, logs: 0.9, boards: 0.9, planks: 0.7, stone: 0.35 }
/** How far a storey of an old timber house may lean, in tiles. */
const LEAN_PER_STOREY = 0.017

/** By how much the top of one storey of a body stands beside its foot, in tiles along u and v. Pure. */
export function leanOf(wall: Mat, seed: number, strength?: number): P2 {
  const most = (strength ?? LEAN[wall] ?? 0) * LEAN_PER_STOREY
  if (most === 0) return [0, 0]
  return [(hash2(seed, 5, 462) - 0.5) * 2 * most, (hash2(seed, 6, 463) - 0.5) * 2 * most]
}

/** What a body tells those who build on to it. */
export interface Built {
  /** Height of the eaves (where the walls end) and of the ridge. */
  eaves: number
  ridge: number
  /** The footprint of the top storey, which the roof stands on: wider than the ground floor if the storeys jut out. */
  top: [number, number, number, number]
  /** The height of the lowest edge of the roof, and how far the roof rises over which distance from a wall. */
  low: number
  rise: number
  span: number
  over: number
  shape: 'u' | 'v' | 'hip'
}

/** Builds a body. */
export function body(scene: Scene, b: Body): Built {
  const [u0, v0, u1, v1] = b.at
  const z = b.z ?? 0
  const storey = b.sw.storey ?? STOREY
  const storeys = b.sw.storeys
  const eaves = z + storeys * storey
  const jetty = storeys > 1 ? (b.jetty ?? 0) : 0
  const [lu, lv] = leanOf(b.wall, scene.seed + Math.round(u0 * 31 + v0 * 17), b.lean)
  if (jetty > 0) {
    for (let level = 0; level < storeys; level++) {
      const wall = (f: Facade, salt: number): Surface => ({
        mat: b.wall,
        tint: b.tint,
        raised: level > 0,
        detail: (g, w, h) => {
          facade(scene, f, salt, level)(g, w, h)
          // the ends of the floor beams that carry the storey above
          if (level === storeys - 1) return
          g.fillStyle = material('timber')
          for (let x = 1.2; x < w - 1.5; x += 4.1) g.fillRect(x, 0.8, 1.2, 1.3)
        },
      })
      scene.leaning(u0, v0, u1 + jetty * level, v1 + jetty * level, z + level * storey, z + (level + 1) * storey, wall(b.sw, 1), wall(b.se, 2), null, true, [lu * level, lv * level], [lu * (level + 1), lv * (level + 1)])
    }
  } else {
    const wall = (f: Facade, salt: number): Surface => ({ mat: b.wall, tint: b.tint, detail: facade(scene, f, salt) })
    scene.leaning(u0, v0, u1, v1, z, eaves, wall(b.sw, 1), wall(b.se, 2), null, true, [0, 0], [lu * storeys, lv * storeys])
  }
  if (z === 0 && !b.paved) {
    const doorGap = (f: Facade, from: number, to: number): [number, number] | undefined => (f.door === null || f.door === undefined ? undefined : [from + (to - from) * f.door - 0.14, from + (to - from) * f.door + 0.14])
    tufts(scene, 'sw', u0, u1, v1, scene.seed + 3, doorGap(b.sw, u0, u1))
    // on the right wall a place along it runs from the front corner to the back one
    tufts(scene, 'se', v0, v1, u1, scene.seed + 4, doorGap(b.se, v1, v0))
    if (!b.garden) {
      yardLitter(scene, u0, v0, u1, v1, scene.seed + 7)
      // and before every door the ground is trodden bare
      if (typeof b.sw.door === 'number') threshold(scene, 'sw', u0 + (u1 - u0) * b.sw.door, v1, scene.seed + 5)
      if (typeof b.se.door === 'number') threshold(scene, 'se', v1 + (v0 - v1) * b.se.door, u1, scene.seed + 6)
    }
  }
  const out = jetty * (storeys - 1)
  const top: [number, number, number, number] = [u0 + lu * storeys, v0 + lv * storeys, u1 + out + lu * storeys, v1 + out + lv * storeys]
  const roof: Surface = { mat: b.roof, tint: b.roofTint }
  const over = b.over ?? 0.07
  const shape = b.shape ?? 'u'
  const span = (shape === 'u' ? top[3] - top[1] : shape === 'v' ? top[2] - top[0] : Math.min(top[2] - top[0], top[3] - top[1])) / 2
  if (shape === 'hip') hip(scene, top[0], top[1], top[2], top[3], eaves, b.rise, over, roof)
  else {
    const side = shape === 'u' ? b.se : b.sw
    const width = (shape === 'u' ? top[3] - top[1] : top[2] - top[0]) * EDGE
    const pattern = hash2(scene.seed, 3, 461)
    const end: Surface = {
      mat: b.wall,
      tint: b.tint,
      detail: (g, w, h) => {
        if (side.timber) {
          g.fillStyle = material('timber')
          g.fillRect(0, h - 1.4, w, 1.4)
          g.fillRect(w / 2 - 0.75, 0, 1.5, h)
          g.fillRect(w * 0.22, h * 0.56, w * 0.56, 1.1)
          // struts from the tie beam up to the rafters: on some houses, not on others
          if (pattern < 0.6) {
            for (const dir of [-1, 1]) {
              g.beginPath()
              g.moveTo(w / 2 + dir * w * 0.3, h - 1.4)
              g.lineTo(w / 2 + dir * (w * 0.3 - 1.3), h - 1.4)
              g.lineTo(w / 2 + dir * (w * 0.12 - 1.3), h * 0.56)
              g.lineTo(w / 2 + dir * w * 0.12, h * 0.56)
              g.closePath()
              g.fill()
            }
          }
        }
        if (b.loft && b.rise > 13) doorway(g, width / 2 - 2.3, h - 1.2, 4.6, 8.4, 'rgb(118, 92, 68)')
        else if (b.attic && b.rise > 13) windowPane(scene, g, width / 2 - 2, h - 9.5, 4, 5.5, side.window)
      },
    }
    gable(scene, top[0], top[1], top[2], top[3], eaves, b.rise, shape, over, roof, end, b.join)
  }
  return { eaves, ridge: eaves + b.rise, top, low: eaves - (b.rise * over) / span, rise: b.rise, span, over, shape }
}

/** A chimney that stands on a roof at the height `z` and rises `high` above it. Smoke comes out of it if `smokes`. */
export function chimney(scene: Scene, u: number, v: number, z: number, high: number, mat: Mat = 'brick', smokes = false): void {
  const r = 0.055
  // soot has blackened its top
  const soot: Surface = {
    mat,
    wear: 0,
    detail: (g, w) => {
      const dark = g.createLinearGradient(0, 0, 0, 5)
      dark.addColorStop(0, 'rgba(30, 26, 26, 0.5)')
      dark.addColorStop(1, 'rgba(30, 26, 26, 0)')
      g.fillStyle = dark
      g.fillRect(0, 0, w, 5)
    },
  }
  scene.box(u - r, v - r, u + r, v + r, z, z + high, soot, soot, null, false)
  scene.box(u - r - 0.012, v - r - 0.012, u + r + 0.012, v + r + 0.012, z + high, z + high + 1.4, 'stone', 'stone', { mat: 'stone', tint: 'rgb(70, 62, 58)' }, false)
  // a pot of fired clay on some of them
  if (hash2(Math.round(u * 50), Math.round(v * 50), scene.seed + 7) < 0.5) scene.box(u - 0.022, v - 0.022, u + 0.022, v + 0.022, z + high + 1.4, z + high + 3.6, { mat: 'tile', wear: 0 }, { mat: 'tile', wear: 0 }, { mat: 'tile', tint: 'rgb(60, 50, 46)' }, false)
  if (smokes) scene.smokeAt(u, v, z + high + 2)
}

/** A dormer on the left slope of a roof whose ridge runs along u: a small gabled window that looks left. */
export function dormer(scene: Scene, u: number, v: number, z: number, wall: Mat, roof: Mat, tint?: string, window?: WindowStyle): void {
  const half = 0.085
  const deep = 0.16
  const face: Surface = { mat: wall, tint, wear: 0, detail: (g, w, h) => windowPane(scene, g, w / 2 - 1.9, h - 6.6, 3.8, 5.4, window) }
  scene.box(u - half, v - deep, u + half, v, z, z + 7, face, { mat: wall, tint }, null, false)
  gable(scene, u - half, v - deep, u + half, v, z + 7, 3.4, 'v', 0.02, roof, { mat: wall, tint })
}

/** How high the roof of a body is over a place (u, v): for what stands on it. */
export function roofAt(main: Built, u: number, v: number): number {
  const [u0, v0, u1, v1] = main.top
  const d = main.shape === 'u' ? Math.min(v - v0, v1 - v) : main.shape === 'v' ? Math.min(u - u0, u1 - u) : Math.min(u - u0, u1 - u, v - v0, v1 - v)
  return main.eaves + main.rise * Math.max(0, Math.min(1, d / main.span))
}

/** The shadow that something on a roof throws on it: the places (u, v) around it, in order. */
export function roofShade(scene: Scene, main: Built, around: P2[]): void {
  const edge = main.top[2] + main.over - 0.01
  const pts: P3[] = around.map(([u, v]) => [Math.min(u, edge), v, roofAt(main, Math.min(u, edge), v) + 0.05])
  scene.item(pts, (g) => {
    g.fillStyle = `rgba(${DUSK}, 0.36)`
    trace(g, pts.map((p) => px(p[0], p[1], p[2])))
    g.fill()
  }, false)
}

/** How far the shadow of something `high` world pixels tall reaches over a roof, in tiles along u and v. */
export const SHADE_REACH: P2 = [0.021, -0.004]

/** How high a saddle roof is at a distance `d` (tiles) from its ridge: for what stands on it. */
export function roofHeight(eaves: number, rise: number, half: number, d: number): number {
  return eaves + rise * Math.max(0, 1 - Math.abs(d) / half)
}
