// Plants are not painted as shapes: they are heaped up in space and then lit. A crown is a few dozen masses of
// leaves around its boughs; every mass is a round of single leaves, each with its own tilt, that thins out towards
// its rim, with the dark inside of the crown behind it. What the viewer sees of all that is found per picture pixel
// (the nearest thing wins), and each pixel gets its light from where it lies: how far under the leaves towards the
// sun, how far under the leaves towards the open sky, and how it is turned. So the top left of a tree glows, its
// depths go dark and blue, and one looks between the leaves into it - none of which is drawn anywhere.
import { hash2 } from '../../world/noise2d'
import type { Ctx, Rgb } from './paint'

/** A place in the picture's space: x to the right, y down, d towards the viewer, all in world pixels. */
export type V3 = [number, number, number]

/** Picture pixels per world pixel. */
const FINE = 4
/** Size of the sheet of leaves that repeats, in picture pixels. */
const SHEET = 240
/** Texels of a shade map per world pixel. */
const MAP = 2

const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** Towards the sun: the top left, and a little towards the viewer. */
export const SUN: V3 = unit([-0.58, -0.62, 0.52])
/** Towards the middle of the open sky. */
const SKY: V3 = unit([-0.08, -0.88, 0.46])

/** How much light is left `under` world pixels below the outermost leaves: all of it at the top, less and less deeper in. Pure. */
export function lightUnder(under: number, reach: number): number {
  return Math.exp(-Math.max(0, under - 0.8) / reach)
}

/** A sheet of single leaves (or needles) that repeats: for every texel which leaf lies there, if any. */
export interface Sheet {
  /** 0 in the middle of a leaf, towards 254 at its edge; 255 where there is no leaf. */
  edge: Uint8Array
  /** Two numbers that belong to the leaf: one for its colour, one for whether it is there at all. */
  luck: Uint8Array
  drop: Uint8Array
  /** How the leaf is tilted. */
  tx: Int8Array
  ty: Int8Array
  /** How far it stands out. */
  lift: Uint8Array
}

/** Makes a sheet: one leaf per cell of `cw` by `ch`, half as long as `long` and half as wide as `wide`, turned any way up to `spin`. */
function sheet(cw: number, ch: number, wide: number, long: number, spin: number, seed: number): Sheet {
  const [nx, ny] = [SHEET / cw, SHEET / ch]
  const F = 10
  const cells = new Float32Array(nx * ny * F)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const r = (k: number): number => hash2(i + k * 131, j, seed)
      const turn = (r(1) - 0.5) * spin
      cells.set([r(2), r(3), wide * (0.8 + 0.4 * r(4)), long * (0.75 + 0.5 * r(5)), Math.cos(turn), Math.sin(turn), r(6), r(7), r(8), r(9)], (j * nx + i) * F)
    }
  }
  const size = SHEET * SHEET
  const made: Sheet = { edge: new Uint8Array(size).fill(255), luck: new Uint8Array(size), drop: new Uint8Array(size), tx: new Int8Array(size), ty: new Int8Array(size), lift: new Uint8Array(size) }
  for (let y = 0; y < SHEET; y++) {
    for (let x = 0; x < SHEET; x++) {
      const [ci, cj] = [Math.floor(x / cw), Math.floor(y / ch)]
      let best = -1
      const o = y * SHEET + x
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const c = (((cj + dj + ny) % ny) * nx + ((ci + di + nx) % nx)) * F
          const dx = x + 0.5 - (ci + di + cells[c]) * cw
          const dy = y + 0.5 - (cj + dj + cells[c + 1]) * ch
          const u = (dx * cells[c + 4] + dy * cells[c + 5]) / cells[c + 2]
          const v = (dy * cells[c + 4] - dx * cells[c + 5]) / cells[c + 3]
          const q = u * u + v * v
          // leaves lie over one another: the one that stands out furthest shows
          if (q >= 1 || cells[c + 6] <= best) continue
          best = cells[c + 6]
          made.edge[o] = Math.sqrt(q) * 254
          made.lift[o] = best * 255
          made.luck[o] = cells[c + 7] * 255
          made.drop[o] = cells[c + 8] * 255
          // every leaf is tilted its own way, and bent a little over its middle
          made.tx[o] = Math.max(-127, Math.min(127, ((cells[c + 9] - 0.5) * 0.9 + (0.4 * dx) / cells[c + 3]) * 70))
          made.ty[o] = Math.max(-127, Math.min(127, ((cells[c + 7] * 7.3) % 1 - 0.5) * 0.9 * 70 + ((0.4 * dy) / cells[c + 3]) * 70))
        }
      }
    }
  }
  return made
}

let leafSheet: Sheet | undefined
let needleSheet: Sheet | undefined
/** Broad leaves, about a world pixel and a half long, turned every way. */
export const leaves = (): Sheet => (leafSheet ??= sheet(5, 5, 2.1, 3.5, Math.PI * 2, 501))
/** Sprays of needles that hang down. */
export const needles = (): Sheet => (needleSheet ??= sheet(2, 6, 0.95, 3.6, 0.6, 502))

/** A plant that is being put together in a picture `w` by `h` world pixels, and then lit and painted. */
export class Volume {
  private readonly w: number
  private readonly h: number
  private readonly W: number
  private readonly H: number
  private readonly z: Float32Array
  private readonly n: Int8Array
  private readonly rgb: Uint8Array
  /** 0 nothing, 1 leaf, 2 the dark inside of a crown, 3 wood and other solid things. */
  private readonly kind: Uint8Array
  /** Round things that keep the light off what lies behind them: x, y, d, radius. */
  private readonly shades: number[] = []
  private count = 0

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.W = w * FINE
    this.H = h * FINE
    const size = this.W * this.H
    this.z = new Float32Array(size).fill(-1e9)
    this.n = new Int8Array(size * 3)
    this.rgb = new Uint8Array(size * 3)
    this.kind = new Uint8Array(size)
  }

  /** Something round at this place keeps the light off what lies behind it. */
  shade(x: number, y: number, d: number, r: number): void {
    this.shades.push(x, y, d, r)
  }

  private put(o: number, depth: number, nx: number, ny: number, nz: number, kind: number, r: number, g: number, b: number): void {
    const l = 127 / (Math.hypot(nx, ny, nz) || 1)
    this.z[o] = depth
    this.n[o * 3] = nx * l
    this.n[o * 3 + 1] = ny * l
    this.n[o * 3 + 2] = nz * l
    this.kind[o] = kind
    this.rgb[o * 3] = r > 255 ? 255 : r
    this.rgb[o * 3 + 1] = g > 255 ? 255 : g
    this.rgb[o * 3 + 2] = b > 255 ? 255 : b
  }

  /**
   * A mass of leaves around (x, y, d), `rx`, `ry`, `rd` in size. `slant` leans the leaves of the sheet sideways (the
   * sprays of a fir hang outward); `inside` is how much of it is filled with the dark of the crown (0 none). `out`
   * is the way out of the whole crown at this place: a mass on the sunny side of a tree is lit as a whole.
   */
  mass(x: number, y: number, d: number, rx: number, ry: number, rd: number, tone: Rgb, look: Sheet = leaves(), slant = 0, inside = 0.5, out: V3 = [0, 0, 0]): void {
    const id = this.count++
    const [ox, oy] = [Math.floor(hash2(id, 1, 53) * SHEET), Math.floor(hash2(id, 2, 53) * SHEET)]
    const [X, Y, RX, RY] = [x * FINE, y * FINE, rx * FINE * 1.14, ry * FINE * 1.14]
    this.shade(x, y, d, Math.cbrt(rx * ry * rd) * 0.92)
    for (let py = Math.max(0, Math.floor(Y - RY)); py <= Math.min(this.H - 1, Math.ceil(Y + RY)); py++) {
      const v = (py + 0.5 - Y) / RY
      const row = ((py + oy) % SHEET) * SHEET
      const lean = ox + SHEET * 8 + Math.round(slant * (py - Y))
      for (let px = Math.max(0, Math.floor(X - RX)); px <= Math.min(this.W - 1, Math.ceil(X + RX)); px++) {
        const u = (px + 0.5 - X) / RX
        const q = u * u + v * v
        if (q >= 1) continue
        const o = py * this.W + px
        if (q < inside) {
          const deep = d + Math.sqrt(1 - q / inside) * rd * 0.6
          if (deep > this.z[o]) this.put(o, deep, u, v, 0.6, 2, tone[0] * 0.5, tone[1] * 0.56, tone[2] * 0.6)
        }
        const t = row + ((px + lean) % SHEET)
        const edge = look.edge[t]
        if (edge === 255) continue
        // leaves thin out towards the rim of the mass, and a few are missing everywhere
        if (look.drop[t] > (q < 0.5 ? 0.9 : 0.9 - (q - 0.5) * 1.5) * 255) continue
        const round = Math.sqrt(1 - q)
        const depth = d + round * rd * 1.14 + look.lift[t] * (1.5 / 255)
        if (depth <= this.z[o]) continue
        // each leaf a green of its own; a few are turning yellow; towards its edge a leaf is a little darker
        const luck = look.luck[t] / 255
        const lightness = (0.84 + 0.3 * luck) * (1 - 0.25 * (edge / 254) ** 2)
        const sere = look.drop[t] < 3 ? 0.4 : 0
        const hue = (look.lift[t] / 255 - 0.5) * 12
        this.put(o, depth, u + look.tx[t] / 70 + out[0], v + look.ty[t] / 70 + out[1], round + 0.35 + out[2], 1, (tone[0] + hue + sere * 110) * lightness, (tone[1] + sere * 60) * lightness, (tone[2] - hue * 0.5) * lightness)
      }
    }
  }

  /** A limb from `a` to `b`, `ra` and `rb` thick at its ends: bark with furrows along it, or with rings every `rings` world pixels. */
  limb(a: V3, b: V3, ra: number, rb: number, bark: Rgb, rings = 0): void {
    const id = this.count++
    const [ax, ay, dx, dy] = [a[0] * FINE, a[1] * FINE, (b[0] - a[0]) * FINE, (b[1] - a[1]) * FINE]
    const len2 = dx * dx + dy * dy
    const len = Math.sqrt(len2)
    const R = Math.max(ra, rb) * FINE
    const steps = Math.max(1, Math.ceil(len / (R * 1.2)))
    for (let k = 0; k <= steps; k++) this.shade(a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps, a[2] + ((b[2] - a[2]) * k) / steps, (ra + ((rb - ra) * k) / steps) * 0.9)
    for (let py = Math.max(0, Math.floor(Math.min(ay, ay + dy) - R)); py <= Math.min(this.H - 1, Math.ceil(Math.max(ay, ay + dy) + R)); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(ax, ax + dx) - R)); px <= Math.min(this.W - 1, Math.ceil(Math.max(ax, ax + dx) + R)); px++) {
        const t = len2 < 0.01 ? 0 : Math.max(0, Math.min(1, ((px + 0.5 - ax) * dx + (py + 0.5 - ay) * dy) / len2))
        const [ex, ey] = [px + 0.5 - ax - dx * t, py + 0.5 - ay - dy * t]
        const r = (ra + (rb - ra) * t) * FINE
        const q = (ex * ex + ey * ey) / (r * r)
        if (q >= 1) continue
        const round = Math.sqrt(1 - q)
        const depth = a[2] + (b[2] - a[2]) * t + (round * r) / FINE
        const o = py * this.W + px
        if (depth <= this.z[o]) continue
        let tone = 1
        if (len2 >= 0.01) {
          const along = (t * len) / FINE
          const across = (ey * dx - ex * dy) / (len * r)
          // furrows that run along the limb and break off; or the rings a palm keeps from every leaf it has shed
          tone = rings > 0 ? (Math.floor(along / rings) % 2 ? 0.84 : 1.04) * ((along / rings) % 1 < 0.16 ? 0.7 : 1) : 0.72 + 0.4 * hash2(Math.floor(across * 4.5 + id * 9), Math.floor(along * 0.45 + hash2(Math.floor(across * 4.5), id, 62) * 5), 61) + 0.14 * hash2(px, py, 63)
        }
        this.put(o, depth, ex / r, ey / r, round, 3, bark[0] * tone, bark[1] * tone, bark[2] * tone)
      }
    }
  }

  /** A flat leaf between three points that faces `normal` (either side shows). */
  blade(p: V3, q: V3, r: V3, tone: Rgb, normal: V3): void {
    const [x0, y0, x1, y1, x2, y2] = [p[0] * FINE, p[1] * FINE, q[0] * FINE, q[1] * FINE, r[0] * FINE, r[1] * FINE]
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    if (Math.abs(area) < 0.01) return
    const face = normal[2] < 0 ? -1 : 1
    for (let py = Math.max(0, Math.floor(Math.min(y0, y1, y2))); py <= Math.min(this.H - 1, Math.ceil(Math.max(y0, y1, y2))); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(x0, x1, x2))); px <= Math.min(this.W - 1, Math.ceil(Math.max(x0, x1, x2))); px++) {
        const w1 = ((px + 0.5 - x0) * (y2 - y0) - (x2 - x0) * (py + 0.5 - y0)) / area
        const w2 = ((x1 - x0) * (py + 0.5 - y0) - (px + 0.5 - x0) * (y1 - y0)) / area
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue
        const depth = p[2] + (q[2] - p[2]) * w1 + (r[2] - p[2]) * w2
        const o = py * this.W + px
        if (depth <= this.z[o]) continue
        this.put(o, depth, normal[0] * face, normal[1] * face, normal[2] * face, 1, tone[0], tone[1], tone[2])
      }
    }
  }

  /** How deep everything lies under the outermost of the plant, seen from where `dir` points to. */
  private under(dir: V3): (x: number, y: number, d: number) => number {
    const a = unit(cross(dir, [0, 0, 1]))
    const b = cross(dir, a)
    const size = Math.ceil((this.w + this.h) * 1.3 * MAP)
    const far = new Float32Array(size * size).fill(-1e9)
    const [mx, my] = [this.w / 2, this.h / 2]
    for (let i = 0; i < this.shades.length; i += 4) {
      const [x, y, d, r] = [this.shades[i] - mx, this.shades[i + 1] - my, this.shades[i + 2], this.shades[i + 3]]
      const [ca, cb, along] = [(a[0] * x + a[1] * y + a[2] * d) * MAP + size / 2, (b[0] * x + b[1] * y + b[2] * d) * MAP + size / 2, dir[0] * x + dir[1] * y + dir[2] * d]
      const R = r * MAP
      for (let j = Math.max(0, Math.floor(cb - R)); j <= Math.min(size - 1, Math.ceil(cb + R)); j++) {
        for (let k = Math.max(0, Math.floor(ca - R)); k <= Math.min(size - 1, Math.ceil(ca + R)); k++) {
          const q = ((k + 0.5 - ca) ** 2 + (j + 0.5 - cb) ** 2) / (R * R)
          if (q >= 1) continue
          const top = along + Math.sqrt(1 - q) * r
          if (top > far[j * size + k]) far[j * size + k] = top
        }
      }
    }
    return (x, y, d) => {
      const [px, py] = [x - mx, y - my]
      const k = Math.floor((a[0] * px + a[1] * py + a[2] * d) * MAP + size / 2)
      const j = Math.floor((b[0] * px + b[1] * py + b[2] * d) * MAP + size / 2)
      if (k < 0 || j < 0 || k >= size || j >= size) return 0
      return far[j * size + k] - (dir[0] * px + dir[1] * py + dir[2] * d)
    }
  }

  /** Lights everything that was put together and paints it into `g` (which is in world pixels). */
  paint(g: Ctx): void {
    const canvas = document.createElement('canvas')
    canvas.width = this.W
    canvas.height = this.H
    const paint = canvas.getContext('2d')
    if (!paint) return
    const underSun = this.under(SUN)
    const underSky = this.under(SKY)
    const image = paint.createImageData(this.W, this.H)
    const data = image.data
    for (let o = 0; o < this.W * this.H; o++) {
      const kind = this.kind[o]
      if (kind === 0) continue
      const [x, y, d] = [((o % this.W) + 0.5) / FINE, (Math.floor(o / this.W) + 0.5) / FINE, this.z[o]]
      const [nx, ny, nz] = [this.n[o * 3] / 127, this.n[o * 3 + 1] / 127, this.n[o * 3 + 2] / 127]
      const facing = nx * SUN[0] + ny * SUN[1] + nz * SUN[2]
      // the sun gets a little way in between the leaves, the light of the sky further
      const sun = lightUnder(underSun(x, y, d), kind === 3 ? 2.2 : 2.2) * (kind === 2 ? 0.5 : 1)
      const sky = (kind === 3 ? 0.42 : 0.22) + 0.78 * lightUnder(underSky(x, y, d), 4.5)
      // a leaf is lit a little from behind too, and glows where the sun shines through it
      const lit = kind === 1 ? Math.max(0, (facing + 0.3) / 1.3) : Math.max(0, facing)
      const through = kind === 1 ? Math.max(0, -facing) * 0.22 * sun : 0
      const open = 0.78 + 0.22 * Math.max(0, -ny)
      const gleam = kind === 1 && facing > 0.82 && sun > 0.8 ? (facing - 0.82) * 1.6 : 0
      const r = this.rgb[o * 3] * (0.34 * sky * open + 1.6 * sun * lit + through * 1.2) + gleam * 180
      const gg = this.rgb[o * 3 + 1] * (0.45 * sky * open + 1.44 * sun * lit + through * 1.3) + gleam * 170
      const b = this.rgb[o * 3 + 2] * (0.64 * sky * open + 0.9 * sun * lit + through * 0.4) + gleam * 110
      data[o * 4] = r < 200 ? r : 200 + (r - 200) * 0.5
      data[o * 4 + 1] = gg < 200 ? gg : 200 + (gg - 200) * 0.5
      data[o * 4 + 2] = b < 200 ? b : 200 + (b - 200) * 0.5
      data[o * 4 + 3] = 255
    }
    // soften the outline: an empty pixel between leaves takes half of their colour
    for (let py = 1; py < this.H - 1; py++) {
      for (let px = 1; px < this.W - 1; px++) {
        const o = (py * this.W + px) * 4
        if (data[o + 3] !== 0) continue
        let [count, r, gg, b] = [0, 0, 0, 0]
        for (const n of [o - 4, o + 4, o - this.W * 4, o + this.W * 4]) {
          if (data[n + 3] !== 255) continue
          count++
          r += data[n]
          gg += data[n + 1]
          b += data[n + 2]
        }
        if (count < 2) continue
        data[o] = r / count
        data[o + 1] = gg / count
        data[o + 2] = b / count
        data[o + 3] = 50 * count
      }
    }
    paint.putImageData(image, 0, 0)
    g.drawImage(canvas, 0, 0, this.w, this.h)
  }
}
