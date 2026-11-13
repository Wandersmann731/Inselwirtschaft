// Roofs: saddle roofs and hipped ones, and a saddle roof that runs into the slope of another (a wing, a dormer).
// None of them is new: a long ridge hangs a little, the eaves end tile by tile in an uneven line, the ridge is capped
// with its own row of tiles, and a board runs along the verge. A roof has no outline: what sets it off is the shade
// under its eaves and the light on its ridge.
import { hash2 } from '../../world/noise2d'
import { AR, AU, AV, DOWN, DUSK, EDGE, px, surface, trace, type Ctx, type Face, type P2, type P3, type Scene, type Surface } from './kit'
import { baseColour, type Mat } from './materials'
import { hull } from './shadowCast'

/** How far single tiles reach beyond the line of the eaves, in world pixels: thatch is shaggy, slate cut clean. */
const RAGGED: Partial<Record<Mat, number>> = { thatch: 1.3, shingle: 0.7, tile: 0.5, slate: 0.34, boards: 0.3, planks: 0.3 }
/** How much a ridge of this roofing gives way over the years (a copper or a stone roof does not). */
const SAG: Partial<Record<Mat, number>> = { thatch: 1.5, shingle: 1.3, tile: 1, slate: 0.65, boards: 0.9, planks: 0.9 }

/** How deep the ridge of a roof hangs in its middle, in world pixels, for a ridge `length` world pixels long. Pure. */
export function ridgeSag(mat: Mat, length: number, luck: number): number {
  if (length < 18) return 0
  return (SAG[mat] ?? 0) * length * 0.024 * (0.5 + luck)
}

/** The line of a ridge from `a` to `b` that hangs `sag` deep, cap by cap. The ends stay where they are. Pure. */
export function ridgeLine(a: P2, b: P2, sag: number, seed: number): P2[] {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.3))
  // where it hangs lowest: never quite the middle
  const low = 0.36 + 0.28 * hash2(seed, 2, 442)
  const line: P2[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const bow = Math.sin(((t < low ? t / low : (1 - t) / (1 - low)) * Math.PI) / 2)
    const wobble = sag > 0 && i > 0 && i < n ? 0.16 * (hash2(i, seed, 443) - 0.5) : 0
    line.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * bow + wobble])
  }
  return line
}

/** The line of an eave from `a` to `b`: every tile ends a little further down the slope (`dir`) than the line, or not. Pure. */
export function eaveLine(a: P2, b: P2, dir: P2, amount: number, seed: number, soft = false, bow = 0): P2[] {
  if (amount <= 0 && bow <= 0) return [a, b]
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (soft ? 2.6 : 1.7)))
  const line: P2[] = []
  for (let i = 0; i < n; i++) {
    const d = amount * hash2(i, seed, 444)
    // an old roof hangs between its ends at the eaves too
    for (const t of soft ? [(i + 0.5) / n] : [i / n, (i + 1) / n]) line.push([a[0] + (b[0] - a[0]) * t + dir[0] * d, a[1] + (b[1] - a[1]) * t + dir[1] * d + bow * Math.sin(Math.PI * t)])
  }
  return soft ? [a, ...line, b] : line
}

/** A roof face with the thickness of its eave: the ends of the lowest row lie in their own shade. */
function withEave(roof: Surface | Mat, slope: number, ragged: number): Surface {
  const s = surface(roof)
  return {
    ...s,
    detail: (g, w, h) => {
      s.detail?.(g, w, h)
      g.fillStyle = `rgba(${DUSK}, 0.4)`
      g.fillRect(-1, slope - 1.1, w + 2, 1.3 + ragged)
    },
  }
}

/** The sun on a ridge or a hip: a thin line of light, never a dark one. */
function glint(g: Ctx, a: P2, b: P2, strength = 0.34): void {
  g.strokeStyle = `rgba(255, 238, 206, ${strength})`
  g.lineWidth = 0.7
  g.beginPath()
  g.moveTo(a[0], a[1])
  g.lineTo(b[0], b[1])
  g.stroke()
}

/** The row of tiles that caps a ridge: each one of its own tone, light on top. On thatch it is a thick roll of straw. */
function ridgeCaps(g: Ctx, line: P2[], mat: Mat, seed: number): void {
  const thick = mat === 'thatch' ? 1.9 : 1.05
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]]
    g.fillStyle = baseColour(mat, 0.86 + 0.34 * hash2(i, seed, 445))
    trace(g, [[a[0], a[1] - 0.4], [b[0], b[1] - 0.4], [b[0], b[1] + thick], [a[0], a[1] + thick]])
    g.fill()
    g.fillStyle = 'rgba(255, 238, 206, 0.3)'
    trace(g, [[a[0], a[1] - 0.4], [b[0], b[1] - 0.4], [b[0], b[1] - 0.05], [a[0], a[1] - 0.05]])
    g.fill()
  }
}

/** The board along the verge of a roof from the ridge `r` down to the eave `e` (on thatch: the cut edge of the straw). */
function verge(g: Ctx, r: P2, e: P2, mat: Mat, lit: boolean, rise: number): void {
  const thatch = mat === 'thatch'
  const thick = Math.min(thatch ? 1.9 : 1.15, rise * 0.13)
  g.fillStyle = thatch ? baseColour(mat, lit ? 0.84 : 0.56) : lit ? 'rgb(146, 116, 88)' : 'rgb(86, 70, 64)'
  trace(g, [r, e, [e[0], e[1] + thick], [r[0], r[1] + thick]])
  g.fill()
}

/** Where a roof runs into the slope of another: how far back its ridge and its eaves reach, along its axis. */
export interface Join {
  ridge: number
  eave: number
}

/**
 * A saddle roof over (u0, v0)-(u1, v1) from the height `z`, `rise` high, its ridge along `axis`, reaching `over`
 * tiles beyond the walls. `end` is the triangle of wall under the ridge that faces the viewer. With `join` its
 * back end is not free but lies on the slope of another roof.
 */
export function gable(scene: Scene, u0: number, v0: number, u1: number, v1: number, z: number, rise: number, axis: 'u' | 'v', over: number, roof: Surface | Mat, end: Face, join?: Join): void {
  const o = over
  const mat = surface(roof).mat
  const half = (axis === 'u' ? v1 - v0 : u1 - u0) / 2
  const drop = (rise * o) / half
  const ze = z - drop
  const zr = z + rise
  const slope = Math.hypot((half + o) * EDGE, rise + drop)
  const mid = axis === 'u' ? (v0 + v1) / 2 : (u0 + u1) / 2
  const front = (axis === 'u' ? u1 : v1) + o
  const backR = join ? join.ridge : (axis === 'u' ? u0 : v0) - o
  const backE = join ? join.eave : backR
  const near = (axis === 'u' ? v1 : u1) + o
  const far = (axis === 'u' ? v0 : u0) - o
  const at3 = (along: number, across: number, zz: number): P3 => (axis === 'u' ? [along, across, zz] : [across, along, zz])
  const at = (p: P3): P2 => px(p[0], p[1], p[2])
  const all: P3[] = [at3(backR, mid, zr), at3(front, mid, zr), at3(backE, near, ze), at3(front, near, ze), at3(backE, far, ze), at3(front, far, ze)]
  const [rb, rf, nb, nf, fb, ff] = all.map(at)
  // on screen from left to right: a ridge along u starts at its back end, one along v at its front end
  const flip = axis === 'v'
  const [RL, RR, NL, NR, FL, FR] = flip ? [rf, rb, nf, nb, ff, fb] : [rb, rf, nb, nf, fb, ff]
  const ax = flip ? AR : AU
  const origin = flip ? rf : at(at3(Math.min(backR, backE), mid, zr))
  const along = (front - Math.min(backR, backE)) * EDGE
  const seed = scene.seed * 13 + Math.round((u0 + v0 * 7) * 20 + z)
  const sag = join ? 0 : ridgeSag(mat, Math.hypot(RR[0] - RL[0], RR[1] - RL[1]), hash2(seed, 1, 441))
  const ridge = ridgeLine(RL, RR, sag, seed)
  const top = at(at3(0, mid, zr))
  const nearEave = at(at3(0, near, ze))
  const farEave = at(at3(0, far, ze))
  const down: P2 = [(nearEave[0] - top[0]) / slope, (nearEave[1] - top[1]) / slope]
  const screen = Math.hypot(nearEave[0] - top[0], nearEave[1] - top[1])
  const ragged = Math.min(RAGGED[mat] ?? 0, rise * 0.06)
  scene.item(all, (g) => {
    // the far slope: seen from above if the roof is flat enough, else only its dark underside shows at the verge
    if (farEave[1] < top[1]) {
      const up: P2 = [(farEave[0] - top[0]) / slope, (farEave[1] - top[1]) / slope]
      scene.face(g, [...ridge, FR, FL], origin, ax, up, along, slope, roof, flip ? 'lit' : 'top', 'roof')
    } else {
      g.fillStyle = baseColour(mat, 0.5)
      trace(g, [...ridge, FR, FL])
      g.fill()
    }
    if (end) {
      const wall: Surface = { ...surface(end), raised: true }
      if (axis === 'u') scene.face(g, [px(u1, v1, z), px(u1, mid, zr), px(u1, v0, z)], px(u1, v1, zr), AR, DOWN, (v1 - v0) * EDGE, rise, wall, 'shade', 'wall')
      else scene.face(g, [px(u0, v1, z), px(mid, v1, zr), px(u1, v1, z)], px(u0, v1, zr), AU, DOWN, (u1 - u0) * EDGE, rise, wall, 'lit', 'wall')
    }
    verge(g, flip ? RL : RR, flip ? FL : FR, mat, flip, rise)
    const eave = eaveLine(NR, NL, [down[0] * (slope / screen), down[1] * (slope / screen)], ragged, seed, mat === 'thatch', sag * 0.6)
    scene.face(g, [...ridge, ...eave], origin, ax, down, along, slope + ragged + sag, withEave(roof, slope, ragged + sag * 0.6), flip ? 'shade' : 'lit', 'roof')
    verge(g, flip ? RL : RR, flip ? NL : NR, mat, flip, rise)
    if (rise > 6) ridgeCaps(g, ridge, mat, seed)
    else glint(g, RL, RR)
  })
}

/** A hipped roof (a pyramid over a square): four slopes that meet in a ridge along the longer side. */
export function hip(scene: Scene, u0: number, v0: number, u1: number, v1: number, z: number, rise: number, over: number, roof: Surface | Mat): void {
  const o = over
  const mat = surface(roof).mat
  const a = u1 - u0
  const b = v1 - v0
  const span = Math.min(a, b) / 2
  const ze = z - (rise * o) / span
  const zr = z + rise
  const slope = Math.hypot((span + o) * EDGE, zr - ze)
  // the ridge, from its end at the back to its end in front
  const r3: P3[] = a >= b ? [[u0 + span, v0 + span, zr], [u1 - span, v0 + span, zr]] : [[u0 + span, v0 + span, zr], [u0 + span, v1 - span, zr]]
  const c3: P3[] = [[u0 - o, v0 - o, ze], [u1 + o, v0 - o, ze], [u1 + o, v1 + o, ze], [u0 - o, v1 + o, ze]]
  const at = (p: P3): P2 => px(p[0], p[1], p[2])
  const [c00, c10, c11, c01] = c3.map(at)
  const [rb, rf] = r3.map(at)
  const seed = scene.seed * 13 + Math.round((u0 + v0 * 7) * 20 + z)
  const ragged = Math.min(RAGGED[mat] ?? 0, rise * 0.06)
  scene.item([...r3, ...c3], (g) => {
    g.fillStyle = baseColour(mat, 0.9)
    trace(g, hull([c00, c10, c11, c01, rb, rf]))
    g.fill()
    // the two slopes that look away from the viewer face the sun; one sees them if the roof is flat enough
    const farO = px(u0 - o, v0 + span, zr)
    if (c00[1] < farO[1]) {
      const farUp: P2 = [(c00[0] - farO[0]) / slope, (c00[1] - farO[1]) / slope]
      scene.face(g, a >= b ? [c00, c10, rf, rb] : [c00, c10, rb], farO, AU, farUp, (a + 2 * o) * EDGE, slope, roof, 'top', 'roof')
      const sideO = px(u0 + span, v0 - o, zr)
      const sideUp: P2 = [(c00[0] - sideO[0]) / slope, (c00[1] - sideO[1]) / slope]
      scene.face(g, a >= b ? [c00, c01, rb] : [c00, c01, rf, rb], sideO, AV, sideUp, (b + 2 * o) * EDGE, slope, roof, 'lit', 'roof')
    }
    const unit = (from: P2, to: P2): P2 => {
      const d = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
      return [(to[0] - from[0]) / d, (to[1] - from[1]) / d]
    }
    const leftO = px(u0 - o, v1 + o - span - o, zr)
    const leftDown: P2 = [(c01[0] - leftO[0]) / slope, (c01[1] - leftO[1]) / slope]
    // the slope that looks left: it ends at the ridge (a >= b) or in its front end
    const leftEave = eaveLine(c11, c01, unit(leftO, c01), ragged, seed)
    scene.face(g, a >= b ? [rb, rf, ...leftEave] : [rf, ...leftEave], leftO, AU, leftDown, (a + 2 * o) * EDGE, slope + ragged, withEave(roof, slope, ragged), 'lit', 'roof')
    const rightO = px(u1 + o - span - o, v1 + o, zr)
    const rightDown: P2 = [(c11[0] - rightO[0]) / slope, (c11[1] - rightO[1]) / slope]
    const rightEave = eaveLine(c10, c11, unit(rightO, c11), ragged, seed + 1)
    scene.face(g, a >= b ? [rf, ...rightEave] : [...rightEave, rf, rb], rightO, AR, rightDown, (b + 2 * o) * EDGE, slope + ragged, withEave(roof, slope, ragged), 'shade', 'roof')
    if (rise > 6 && Math.hypot(rf[0] - rb[0], rf[1] - rb[1]) > 4) ridgeCaps(g, ridgeLine(rb[0] < rf[0] ? rb : rf, rb[0] < rf[0] ? rf : rb, 0, seed), mat, seed)
    glint(g, rf, c11, 0.2)
    glint(g, rb, c01, 0.2)
  })
}
