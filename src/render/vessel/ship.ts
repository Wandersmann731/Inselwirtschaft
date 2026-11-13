// The trading ship, built by code: a carrack with a round hull of strakes, a forecastle, a quarterdeck and a poop,
// three masts, square sails that belly in the wind and a lateen sail aft, shrouds, stays and pennants. It is built
// once as faces and bars (see solid.ts) and painted for each of the eight headings it can sail on, so the sun is on
// its left on every one of them.
import { hash2 } from '../../world/noise2d'
import { Solid, type P3, type Rgb } from './solid'

/** Picture pixels per world pixel, as for buildings and trees. */
export const RES = 4
/** Size of a ship picture in world pixels, and where the middle of its water line lies in it (shares of the size). */
export const SHIP_SIZE = 168
export const SHIP_ORIGIN = { x: 0.5, y: 0.74 }

/** Half the length of the hull in tiles. */
const HALF = 1.25
const STATIONS = 26

/** Half the breadth of the hull at a place along it (0 stern, 1 bow), in tiles: full aft, round at the bow. Pure. */
export function halfBeam(t: number): number {
  if (t <= 0.3) return 0.21 + 0.09 * Math.sin((t / 0.3) * Math.PI * 0.5)
  if (t <= 0.6) return 0.3
  return 0.3 * Math.max(0, 1 - ((t - 0.6) / 0.4) ** 1.7)
}

/** Height of the rail of the main deck over the water at a place along the hull: it rises to both ends. Pure. */
export function sheer(t: number): number {
  return 12.5 + (t < 0.5 ? 8.5 : 6.5) * (2 * t - 1) ** 2
}

/** How much higher than the main deck the ship is built up at a place along it: poop, quarterdeck, forecastle. Pure. */
export function castle(t: number): number {
  return t < 0.15 ? 15 : t < 0.33 ? 8 : t > 0.8 ? 7 : 0
}

/** How wide the hull is at a share of its height (0 water line, 1 rail), against its greatest breadth: it bellies out and draws in again. */
const girth = (f: number): number => (f < 0.5 ? 0.86 + 0.28 * f : 1 - 0.13 * (f - 0.5) * 2)

const STRAKES: Rgb[] = [[62, 48, 40], [76, 58, 44], [92, 70, 50], [158, 124, 84], [116, 86, 58], [132, 66, 50], [124, 94, 62]]
const UPPER: Rgb = [150, 116, 78]
const DECK: Rgb = [182, 156, 118]
const SAIL: Rgb = [238, 228, 204]
const SPAR = 'rgb(112, 86, 60)'
const ROPE = 'rgba(58, 48, 42, 0.62)'
const GILT = 'rgb(222, 184, 92)'
const IRON = 'rgb(48, 46, 54)'

/** The face between corners, turned so that it looks the way of `out`. */
function wall(solid: Solid, pts: P3[], colour: Rgb, out: P3, near = 0): void {
  const [a, b, c] = pts
  const u = [b[0] - a[0], b[1] - a[1], (b[2] - a[2]) / 45]
  const v = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) / 45]
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  solid.face(n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? [...pts].reverse() : pts, colour, false, near)
}

function hull(solid: Solid): void {
  const at = (i: number): number => i / STATIONS
  const x = (t: number): number => -HALF + 2 * HALF * t
  const bands = STRAKES.length
  for (let i = 0; i < STATIONS; i++) {
    const [t0, t1] = [at(i), at(i + 1)]
    const mid = (t0 + t1) / 2
    const up = castle(mid)
    for (const side of [-1, 1]) {
      const point = (t: number, f: number): P3 => [x(t), side * halfBeam(t) * girth(f), sheer(t) * f]
      // the strakes of the hull, from the water up to the rail of the main deck
      for (let j = 0; j < bands; j++) {
        const tone = 0.95 + 0.1 * (((i * 7 + j * 3) % 5) / 4)
        wall(solid, [point(t0, j / bands), point(t1, j / bands), point(t1, (j + 1) / bands), point(t0, (j + 1) / bands)], STRAKES[j].map((c) => c * tone) as Rgb, [0, side, 0])
      }
      // the castles: lighter planking above the rail, with a painted band along its foot
      const rim = (t: number, add: number): P3 => [x(t), side * halfBeam(t) * girth(1), sheer(t) + add]
      if (up > 0) {
        wall(solid, [rim(t0, 0), rim(t1, 0), rim(t1, 2.4), rim(t0, 2.4)], [72, 100, 96], [0, side, 0])
        wall(solid, [rim(t0, 2.4), rim(t1, 2.4), rim(t1, up), rim(t0, up)], UPPER, [0, side, 0])
      }
      // the inside of the bulwark, seen over the deck on the far side
      const inner = (t: number, add: number): P3 => [x(t), side * halfBeam(t) * girth(1) * 0.94, sheer(t) + add]
      wall(solid, [inner(t0, up - 3), inner(t1, up - 3), inner(t1, up), inner(t0, up)], [146, 114, 78], [0, -side, 0])
      // the rail: a light edge on top of it
      solid.bar(rim(t0, up), rim(t1, up), 0.9, up > 0 ? GILT : 'rgb(196, 164, 116)', 0.004)
      // a carved and gilded moulding along the foot of the castles
      if (up > 0) solid.bar(rim(t0, 2.6), rim(t1, 2.6), 0.55, GILT, 0.006)
      // foam where the hull parts the water
      solid.bar([x(t0), side * halfBeam(t0) * 0.9, 0.2], [x(t1), side * halfBeam(t1) * 0.9, 0.2], 1.1, 'rgba(236, 246, 248, 0.5)', 0.01)
      // ports along the wale
      if (i % 4 === 2 && mid > 0.2 && mid < 0.8) {
        const port = (t: number, f: number): P3 => [x(t), side * (halfBeam(t) * girth(f) + 0.004), sheer(t) * f]
        wall(solid, [port(t0 + 0.008, 0.6), port(t0 + 0.024, 0.6), port(t0 + 0.024, 0.78), port(t0 + 0.008, 0.78)], [34, 28, 30], [0, side, 0], 0.01)
      }
    }
    // the deck, plank by plank across
    // (it follows the sheer of the hull, so no step shows between one plank and the next)
    const edge = (t: number, side: number): P3 => [x(t), side * halfBeam(t) * girth(1) * 0.94, sheer(t) + up - 3]
    wall(solid, [edge(t0, -1), edge(t1, -1), edge(t1, 1), edge(t0, 1)], DECK.map((c) => c * (0.95 + 0.08 * ((i * 5) % 3) / 2)) as Rgb, [0, 0, 1])
  }
  // where a deck steps up to the next: a wall across the ship with a door in it
  for (const [t, look] of [[0.15, 1], [0.33, 1], [0.8, -1]] as [number, number][]) {
    const low = sheer(t) + castle(t - look * 0.02) - 3
    const high = sheer(t) + castle(t + look * 0.02) - 3
    const b = halfBeam(t) * girth(1) * 0.94
    const [bottom, top] = [Math.min(low, high), Math.max(low, high) + 3]
    wall(solid, [[x(t), -b, bottom], [x(t), b, bottom], [x(t), b, top], [x(t), -b, top]], [136, 104, 72], [look, 0, 0])
    wall(solid, [[x(t) + look * 0.004, -0.04, bottom], [x(t) + look * 0.004, 0.04, bottom], [x(t) + look * 0.004, 0.04, bottom + 5.6], [x(t) + look * 0.004, -0.04, bottom + 5.6]], [54, 40, 34], [look, 0, 0], 0.01)
  }
  // the stern: flat, with a row of windows under the poop
  const levels = 8
  const high = sheer(0) + castle(0)
  for (let j = 0; j < levels; j++) {
    const [z0, z1] = [(high * j) / levels, (high * (j + 1)) / levels]
    const wide = (z: number): number => halfBeam(0) * (z < sheer(0) ? girth(z / sheer(0)) : girth(1))
    const windows = j === 5
    wall(solid, [[x(0), -wide(z0), z0], [x(0), wide(z0), z0], [x(0), wide(z1), z1], [x(0), -wide(z1), z1]], windows ? [96, 74, 52] : j % 2 ? [118, 88, 60] : [108, 80, 56], [-1, 0, 0])
    if (windows) for (const y of [-0.12, -0.04, 0.04, 0.12]) wall(solid, [[x(0) - 0.004, y - 0.028, z0 + 0.6], [x(0) - 0.004, y + 0.028, z0 + 0.6], [x(0) - 0.004, y + 0.028, z1 - 0.4], [x(0) - 0.004, y - 0.028, z1 - 0.4]], [226, 196, 120], [-1, 0, 0], 0.01)
  }
  // the carvings of the stern, gilded: a moulding over and under the windows, a crest above them, a lantern on the rail
  const [sx, wideAt] = [x(0) - 0.006, halfBeam(0) * girth(1)]
  for (const z of [(high * 5) / levels - 0.4, (high * 6) / levels + 0.4]) solid.bar([sx, -wideAt, z], [sx, wideAt, z], 0.7, GILT, 0.02)
  wall(solid, [[sx, 0, high - 6.4], [sx, 0.05, high - 4], [sx, 0, high - 1.6], [sx, -0.05, high - 4]], [226, 188, 96], [-1, 0, 0], 0.02)
  for (const y of [-0.14, 0.14]) wall(solid, [[sx, y, high - 5], [sx, y + 0.03, high - 3.8], [sx, y, high - 2.6], [sx, y - 0.03, high - 3.8]], [226, 188, 96], [-1, 0, 0], 0.02)
  solid.bar([x(0), 0, high], [x(0) - 0.03, 0, high + 5], 0.6, IRON, 0.01)
  solid.bar([x(0) - 0.03, 0, high + 4.4], [x(0) - 0.03, 0, high + 7], 2, 'rgb(250, 214, 120)', 0.012)
  solid.bar([x(0) - 0.02, 0, sheer(0) * 0.62], [x(0) - 0.05, 0, 0], 1.8, 'rgb(92, 70, 50)', -0.02)
  // an anchor hangs at either bow, a gilded figure rides on the stem
  for (const side of [-1, 1]) {
    const ay = side * (halfBeam(0.88) * girth(0.8) + 0.012)
    const ax = x(0.88)
    solid.bar([ax, ay, sheer(0.88) * 0.95], [ax, ay, sheer(0.88) * 0.42], 0.7, IRON, 0.02)
    solid.bar([ax - 0.05, ay, sheer(0.88) * 0.9], [ax + 0.05, ay, sheer(0.88) * 0.9], 0.6, 'rgb(104, 80, 56)', 0.02)
    for (const dir of [-1, 1]) solid.bar([ax, ay, sheer(0.88) * 0.42], [ax + dir * 0.055, ay, sheer(0.88) * 0.58], 0.8, IRON, 0.02)
  }
  solid.bar([HALF + 0.07, 0, sheer(1) + castle(1) + 1], [HALF + 0.17, 0, sheer(1) + castle(1) - 1.6], 1.5, GILT, 0.01)
  // on the main deck: the ship's boat, the capstan
  const boatAt = sheer(0.42) - 3
  for (let k = 0; k < 4; k++) {
    const [b0, b1] = [0.035 * Math.sin((k / 4) * Math.PI), 0.035 * Math.sin(((k + 1) / 4) * Math.PI)]
    const [x0, x1] = [-0.36 + k * 0.09, -0.36 + (k + 1) * 0.09]
    wall(solid, [[x0, 0.13 - b0, boatAt + 2.2], [x1, 0.13 - b1, boatAt + 2.2], [x1, 0.13 + b1, boatAt + 2.2], [x0, 0.13 + b0, boatAt + 2.2]], [150, 118, 82], [0, 0, 1], 0.02)
    wall(solid, [[x0, 0.13 + b0, boatAt], [x1, 0.13 + b1, boatAt], [x1, 0.13 + b1, boatAt + 2.2], [x0, 0.13 + b0, boatAt + 2.2]], [176, 144, 102], [0, 1, 0], 0.02)
    wall(solid, [[x0, 0.13 - b0, boatAt], [x1, 0.13 - b1, boatAt], [x1, 0.13 - b1, boatAt + 2.2], [x0, 0.13 - b0, boatAt + 2.2]], [176, 144, 102], [0, -1, 0], 0.02)
  }
  solid.bar([0.3, 0, sheer(0.62) - 3], [0.3, 0, sheer(0.62) + 0.4], 2.6, 'rgb(112, 86, 60)', 0.01)
  // hatch on the main deck
  const main = sheer(0.5) - 3
  wall(solid, [[-0.3, -0.09, main + 0.6], [-0.08, -0.09, main + 0.6], [-0.08, 0.09, main + 0.6], [-0.3, 0.09, main + 0.6]], [104, 80, 56], [0, 0, 1], 0.01)
}

interface Mast {
  x: number
  /** The deck it stands on, and its top. */
  foot: number
  top: number
}

/** A mast in pieces (so sails and ropes sort between them), with a top to stand in. */
function mast(solid: Solid, m: Mast, nest: number): void {
  const pieces = 7
  for (let k = 0; k < pieces; k++) {
    const [z0, z1] = [m.foot + ((m.top - m.foot) * k) / pieces, m.foot + ((m.top - m.foot) * (k + 1)) / pieces]
    const thick = 1.9 - 0.9 * (k / pieces)
    solid.bar([m.x, 0, z0], [m.x, 0, z1], thick, SPAR)
    solid.bar([m.x - 0.004, 0.004, z0], [m.x - 0.004, 0.004, z1], thick * 0.36, 'rgba(255, 232, 190, 0.3)', 0.002)
  }
  solid.bar([m.x, 0, nest], [m.x, 0, nest + 2.2], 4.4, 'rgb(96, 74, 54)', 0.004)
  solid.bar([m.x, 0, nest + 2.2], [m.x, 0, nest + 2.8], 5, 'rgb(150, 120, 84)', 0.005)
}

/** The yards are braced a little round, so one sees the sails from ahead and from astern alike. */
const BRACE = -0.34
const along: [number, number] = [Math.sin(BRACE), Math.cos(BRACE)]
const ahead: [number, number] = [Math.cos(BRACE), -Math.sin(BRACE)]

/** A square sail under a yard at (x, top), `wide` tiles to either side there and `foot` at its lower edge `low`; it bellies ahead. */
function squareSail(solid: Solid, x: number, top: number, low: number, wide: number, foot: number, cross: boolean): void {
  const across = 16
  const down = 12
  const at = (s: number, q: number): P3 => {
    const w = wide + (foot - wide) * q
    const belly = 0.2 * (1 - s * s) * Math.sin(Math.PI * Math.min(1, 0.15 + q * 0.9))
    return [x + along[0] * w * s + ahead[0] * (belly + 0.03), along[1] * w * s + ahead[1] * (belly + 0.03), top + (low - top) * q + 1.6 * s * s * q]
  }
  const red: Rgb = [164, 62, 50]
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < down; j++) {
      const [s0, s1, q0, q1] = [(i / across) * 2 - 1, ((i + 1) / across) * 2 - 1, j / down, (j + 1) / down]
      // the cross is painted on the cloth: an upright through the middle and a beam across it
      const upright = (i === across / 2 - 1 || i === across / 2) && j >= 2 && j < down - 2
      const beam = (j === down / 2 - 1 || j === down / 2) && i >= across / 4 && i < (across * 3) / 4
      // cloths sewn side by side: every other one a shade darker
      // and bands of doubled cloth run across it, where it is reefed
      const colour = cross && (upright || beam) ? red : (SAIL.map((c) => c * (Math.floor(i / 2) % 2 ? 0.965 : 1) * (j === 2 || j === down - 3 ? 0.93 : 1)) as Rgb)
      solid.face([at(s0, q0), at(s1, q0), at(s1, q1), at(s0, q1)], colour, true)
    }
  }
  // the yard it hangs from
  solid.bar([x + along[0] * wide * 1.08, along[1] * wide * 1.08, top + 0.6], [x - along[0] * wide * 1.08, -along[1] * wide * 1.08, top + 0.6], 1.3, SPAR, 0.006)
}

/** The lateen sail on the mizzen: a triangle under a long slanting yard that lies fore and aft. */
function lateen(solid: Solid, x: number, foot: number, top: number): void {
  const head: P3 = [x + 0.3, 0.03, top]
  const tack: P3 = [x - 0.52, 0.03, foot + 12]
  const clew: P3 = [x - 0.5, 0.1, foot + 5]
  const n = 6
  const at = (a: number, b: number): P3 => {
    // a along the yard (0 head, 1 tack), b from the yard to the clew
    const on: P3 = [head[0] + (tack[0] - head[0]) * a, head[1] + (tack[1] - head[1]) * a, head[2] + (tack[2] - head[2]) * a]
    const belly = 0.12 * Math.sin(Math.PI * a) * Math.sin(Math.PI * b * 0.9)
    return [on[0] + (clew[0] - on[0]) * b, on[1] + (clew[1] - on[1]) * b + belly, on[2] + (clew[2] - on[2]) * b]
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) solid.face([at(i / n, j / n), at((i + 1) / n, j / n), at((i + 1) / n, (j + 1) / n), at(i / n, (j + 1) / n)], SAIL.map((c) => c * (i % 2 ? 0.97 : 1)) as Rgb, true)
  solid.bar([head[0] + 0.1, 0.03, top + 4], [tack[0] - 0.06, 0.03, tack[2] - 2], 1.2, SPAR, 0.006)
}

/** A pennant that streams ahead from a mast top. */
function pennant(solid: Solid, x: number, z: number, colour: Rgb): void {
  solid.bar([x, 0, z], [x, 0, z + 7], 0.7, SPAR)
  for (let k = 0; k < 4; k++) {
    const wave = (i: number): number => Math.sin(i * 1.5) * 0.9
    const half = (i: number): number => 1.7 * (1 - i / 4.6)
    solid.face([[x + k * 0.07, 0.012 * k, z + 5.2 + wave(k) + half(k)], [x + (k + 1) * 0.07, 0.012 * (k + 1), z + 5.2 + wave(k + 1) + half(k + 1)], [x + (k + 1) * 0.07, 0.012 * (k + 1), z + 5.2 + wave(k + 1) - half(k + 1)], [x + k * 0.07, 0.012 * k, z + 5.2 + wave(k) - half(k)]], colour, true, 0, 0.95)
  }
}

let built: Solid | null = null

/** The ship as faces and bars, built once. */
function ship(): Solid {
  if (built) return built
  const solid = new Solid()
  hull(solid)
  const deckAt = (t: number): number => sheer(t) + castle(t) - 3
  const fore: Mast = { x: 0.64, foot: deckAt(0.76), top: 78 }
  const main: Mast = { x: 0.02, foot: deckAt(0.5), top: 94 }
  const mizzen: Mast = { x: -0.76, foot: deckAt(0.2), top: 66 }
  mast(solid, fore, 44)
  mast(solid, main, 54)
  mast(solid, mizzen, 50)
  // the stem: the timber the bow ends in, swept up before the forecastle
  solid.bar([HALF - 0.02, 0, 0], [HALF + 0.08, 0, sheer(1) + castle(1) + 2], 1.6, 'rgb(104, 80, 56)', 0.004)
  // the bowsprit, and the stays that hold the masts from ahead and astern
  const sprit: P3 = [1.74, 0, 30]
  solid.bar([1.1, 0, sheer(0.94) + 6], sprit, 1.5, SPAR)
  solid.bar([fore.x, 0, fore.top - 3], sprit, 0.4, ROPE)
  solid.bar([main.x, 0, main.top - 3], [fore.x, 0, 46], 0.4, ROPE)
  solid.bar([mizzen.x, 0, mizzen.top - 3], [main.x, 0, 56], 0.4, ROPE)
  solid.bar([mizzen.x, 0, mizzen.top - 6], [-HALF, 0, sheer(0) + castle(0)], 0.4, ROPE)
  // shrouds: from the tops down to the rail on either side
  for (const m of [fore, main, mizzen]) {
    const t = (m.x + HALF) / (2 * HALF)
    const head = m === mizzen ? 50 : m === main ? 54 : 44
    for (const side of [-1, 1]) {
      const foot = (back: number): P3 => [m.x - back, side * halfBeam(t) * 0.92, sheer(t) + castle(t)]
      for (const back of [0.06, 0.13, 0.2]) solid.bar([m.x, 0, head], foot(back), 0.35, ROPE)
      // ratlines: the rungs the crew climb to the top on
      const on = (back: number, share: number): P3 => [m.x - back * share, foot(back)[1] * share, head + (foot(back)[2] - head) * share]
      for (const share of [0.4, 0.55, 0.7, 0.85]) solid.bar(on(0.06, share), on(0.2, share), 0.25, ROPE)
    }
  }
  squareSail(solid, fore.x, 42, deckAt(0.76) + 9, 0.4, 0.44, false)
  squareSail(solid, fore.x, 70, 46, 0.26, 0.36, false)
  squareSail(solid, main.x, 52, deckAt(0.5) + 10, 0.48, 0.52, true)
  squareSail(solid, main.x, 86, 57, 0.3, 0.42, true)
  lateen(solid, mizzen.x, mizzen.foot, 60)
  pennant(solid, main.x, main.top - 1, [176, 56, 48])
  pennant(solid, fore.x, fore.top - 1, [176, 56, 48])
  pennant(solid, mizzen.x, mizzen.top - 1, [214, 180, 84])
  built = solid
  return solid
}

/** The eight headings a ship is drawn on: turns of 45 degrees on screen, 0 to the right, 2 down. */
export const HEADINGS = 8

/**
 * The way a ship points on the map (radians, 0 along u) for turn `sector` of eight on screen. The even ones lie
 * along the screen (right, down, left, up), the odd ones along the tiles, where ships moor and mostly sail. Pure.
 */
export function headingOf(sector: number): number {
  const turn = (sector * Math.PI) / 4
  // on screen a step along u goes right and down, one along v left and down
  const [sx, sy] = [Math.cos(turn), Math.sin(turn) * 0.5]
  return Math.atan2(sy - sx / 2, sy + sx / 2)
}

const pictures = new Map<number, HTMLCanvasElement | null>()

/** The headings whose pictures are kept right now. */
export function shipsKept(): number[] {
  return [...pictures.keys()]
}

/** Lets go of ship pictures: they are painted again when they are next asked for. */
export function forgetShips(sectors: number[]): void {
  for (const sector of sectors) pictures.delete(sector)
}

/** The picture of the ship for one of the eight headings, or null where there is no canvas. */
export function shipPicture(sector: number): HTMLCanvasElement | null {
  const key = ((sector % HEADINGS) + HEADINGS) % HEADINGS
  const hit = pictures.get(key)
  if (hit !== undefined) return hit
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SHIP_SIZE * RES
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(RES, RES)
    ship().paint(g, headingOf(key), SHIP_SIZE * SHIP_ORIGIN.x, SHIP_SIZE * SHIP_ORIGIN.y)
    // the grain of wood: fine streaks along the planks. They are painted on a sheet of their own, cut to where wood
    // shows (not sails, not ropes), and only then laid over the ship
    const sheet = document.createElement('canvas')
    const stencil = document.createElement('canvas')
    sheet.width = sheet.height = stencil.width = stencil.height = canvas.width
    const grain = sheet.getContext('2d')
    const cut = stencil.getContext('2d')
    if (grain && cut) {
      cut.scale(RES, RES)
      ship().paint(cut, headingOf(key), SHIP_SIZE * SHIP_ORIGIN.x, SHIP_SIZE * SHIP_ORIGIN.y, true)
      grain.scale(RES, RES)
      const lie = Math.atan2(Math.sin(headingOf(key)) + Math.cos(headingOf(key)), 2 * (Math.cos(headingOf(key)) - Math.sin(headingOf(key))))
      for (let i = 0; i < 5200; i++) {
        grain.fillStyle = hash2(i, 3, 811) < 0.6 ? 'rgba(28, 20, 18, 0.13)' : 'rgba(255, 240, 214, 0.11)'
        grain.beginPath()
        grain.ellipse(hash2(i, 1, 811) * SHIP_SIZE, hash2(i, 2, 811) * SHIP_SIZE, 1 + hash2(i, 4, 811) * 2.4, 0.2, lie, 0, Math.PI * 2)
        grain.fill()
      }
      grain.setTransform(1, 0, 0, 1, 0, 0)
      grain.globalCompositeOperation = 'destination-in'
      grain.drawImage(stencil, 0, 0)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(sheet, 0, 0)
    }
  }
  pictures.set(key, g ? canvas : null)
  return g ? canvas : null
}

let above: HTMLCanvasElement | null | undefined

/** The ship seen from straight above, its bow pointing up: the mark of a ship on the chart of the world. */
export function shipFromAbove(): HTMLCanvasElement | null {
  if (above !== undefined) return above
  if (typeof document === 'undefined') return null
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  above = g ? canvas : null
  if (!g) return null
  const long = 100
  const stern = 116
  // the hull is drawn a little broader than it is, or it would be a splinter at this size
  const outline = (shrink: number): void => {
    g.beginPath()
    for (let i = 0; i <= 40; i++) g.lineTo(size / 2 - halfBeam(i / 40) * 62 * shrink, stern - (i / 40) * long)
    for (let i = 40; i >= 0; i--) g.lineTo(size / 2 + halfBeam(i / 40) * 62 * shrink, stern - (i / 40) * long)
    g.closePath()
  }
  g.fillStyle = 'rgba(16, 36, 60, 0.3)'
  g.save()
  g.translate(3, 3)
  outline(1.04)
  g.fill()
  g.restore()
  g.fillStyle = 'rgb(92, 68, 48)'
  outline(1)
  g.fill()
  g.fillStyle = 'rgb(178, 150, 110)'
  outline(0.82)
  g.fill()
  // the castles fore and aft, a step darker than the main deck
  g.save()
  outline(0.82)
  g.clip()
  g.fillStyle = 'rgba(96, 70, 48, 0.5)'
  g.fillRect(0, stern - long * 0.33, size, long * 0.33)
  g.fillRect(0, stern - long, size, long * 0.2)
  g.restore()
  // three sails across the ship, bellied ahead, light on the left
  for (const [t, wide, deep] of [[0.76, 40, 13], [0.5, 50, 16], [0.2, 30, 10]] as [number, number, number][]) {
    const y = stern - t * long
    const cloth = g.createLinearGradient(size / 2 - wide / 2, 0, size / 2 + wide / 2, 0)
    cloth.addColorStop(0, 'rgb(250, 244, 226)')
    cloth.addColorStop(1, 'rgb(202, 194, 178)')
    g.fillStyle = cloth
    g.beginPath()
    g.moveTo(size / 2 - wide / 2, y + deep * 0.4)
    g.quadraticCurveTo(size / 2, y - deep, size / 2 + wide / 2, y + deep * 0.4)
    g.quadraticCurveTo(size / 2, y - deep * 0.1, size / 2 - wide / 2, y + deep * 0.4)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgb(104, 80, 56)'
    g.fillRect(size / 2 - wide / 2 - 1, y + deep * 0.4 - 1, wide + 2, 2)
    g.beginPath()
    g.arc(size / 2, y + deep * 0.4, 2.4, 0, Math.PI * 2)
    g.fill()
  }
  return canvas
}
