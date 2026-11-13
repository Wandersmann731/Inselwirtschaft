// Stone: boulders, pebbles on the beach, and the peaks of the mountains. A boulder is a handful of flat faces, each
// as light as it is turned to the sun. A peak is built the same way, only of hundreds of faces: rings of rock from
// its foot to its summit, shoulders beside the main peak, scree at its foot, snow where it is high and not too steep.
import { fbm } from '../../world/noise2d'
import { sprig } from './herbs'
import { contact, css, dab, mix, numbers, shape, type Ctx, type Rgb } from './paint'
import { faceLight, relief, rockColour } from './relief'

export { faceLight } from './relief'

/** One boulder around (x, y), `rx` by `ry`: a top that faces the sky and faces that fall away from it all round. */
export function boulder(g: Ctx, x: number, y: number, rx: number, ry: number, next: () => number, base: Rgb = [148, 146, 138]): void {
  const n = 11
  const rim: [number, number][] = []
  const top: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const turn = (i / n) * Math.PI * 2 + next() * 0.3
    const far = 0.84 + 0.3 * next()
    rim.push([x + Math.cos(turn) * rx * far, y + Math.sin(turn) * ry * far * (Math.sin(turn) < 0 ? 1.1 : 0.82)])
    top.push([x - rx * 0.1 + Math.cos(turn) * rx * 0.52 * far, y - ry * 0.5 + Math.sin(turn) * ry * 0.4 * far])
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const turn = ((i + 0.5) / n) * Math.PI * 2
    // a face that looks left is in the sun, one that looks right or down at the viewer is not
    const light = faceLight(Math.cos(turn), Math.max(0, Math.sin(turn)) * 0.9, 0.45 - 0.25 * Math.sin(turn)) * (0.94 + 0.12 * next())
    shape(g, [rim[i], rim[j], top[j], top[i]], css(rockColour(base, light)))
  }
  shape(g, top, css(rockColour(base, 1.06)))
  // the grain of the stone, and where the faces meet a softer light
  g.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < rx * ry * 0.9; i++) dab(g, x + (next() - 0.5) * rx * 2.6, y + (next() - 0.6) * ry * 2.4, 0.3 + next() * 0.6, 0.25 + next() * 0.4, next() < 0.55 ? 'rgba(30, 30, 44, 0.16)' : 'rgba(255, 250, 236, 0.18)', next() * 3)
  const glow = g.createRadialGradient(x - rx * 0.4, y - ry * 0.8, 0, x - rx * 0.4, y - ry * 0.8, rx * 1.2)
  glow.addColorStop(0, 'rgba(255, 244, 220, 0.22)')
  glow.addColorStop(1, 'rgba(255, 244, 220, 0)')
  g.fillStyle = glow
  g.fillRect(x - rx * 1.4, y - ry * 1.6, rx * 2.8, ry * 3)
  g.globalCompositeOperation = 'source-over'
  // lichen, and a crack or two
  for (let i = 0; i < 5; i++) dab(g, x - rx * 0.1 + (next() - 0.5) * rx * 0.8, y - ry * 0.5 + (next() - 0.5) * ry * 0.5, 0.9 + next(), 0.6 + next() * 0.5, 'rgba(132, 140, 96, 0.35)', next() * 3)
  shape(g, [[x + rx * 0.1, y - ry * 0.7], [x + rx * 0.16, y - ry * 0.7], [x + rx * 0.3, y + ry * 0.1], [x + rx * 0.26, y + ry * 0.1]], 'rgba(30, 30, 40, 0.3)')
}

/** One lump of a boulder: where it lies, how wide, deep and high it is, and the flat faces that are broken off it. */
export interface Lump {
  x: number
  y: number
  rx: number
  ry: number
  high: number
  /** Planes that cut the round of the lump: each a height at its middle (share of `high`) and how it tilts. */
  cuts: [number, number, number][]
}

/** How high a boulder made of lumps is over a place on the ground: round, but with flat faces broken off it. Pure. */
export function boulderHeight(lumps: Lump[], x: number, y: number, seed: number): number {
  let high = 0
  for (const lump of lumps) {
    const [u, v] = [(x - lump.x) / lump.rx, (y - lump.y) / lump.ry]
    const far = u * u + v * v
    if (far >= 1) continue
    let top = (1 - far) ** 0.4 * (0.92 + 0.16 * fbm(x * 0.3 + 5, y * 0.3 + 5, seed, 2))
    for (const [middle, tiltX, tiltY] of lump.cuts) top = Math.min(top, middle + tiltX * u + tiltY * v)
    high = Math.max(high, Math.max(0, top) * lump.high)
  }
  return high
}

/** A rock in a picture `w` by `h` world pixels: one large boulder (or two that lean together) with small stones at its foot. Three shapes. */
export function rock(g: Ctx, w: number, h: number, variant: number): void {
  const seed = variant * 61 + 15
  const next = numbers(seed)
  const base: Rgb = variant === 2 ? [158, 152, 140] : variant === 3 ? [132, 134, 136] : [146, 144, 136]
  const lump = (x: number, y: number, rx: number, high: number): Lump => ({
    x, y, rx, ry: rx * 0.84, high,
    cuts: Array.from({ length: 5 }, () => [0.62 + 0.4 * next(), (next() - 0.5) * 1.1, (next() - 0.5) * 1.1] as [number, number, number]),
  })
  const lumps = variant === 3 ? [lump(-5, -1, 11, 17), lump(9, 1, 8.4, 12)] : variant === 2 ? [lump(0, 0, 16, 14), lump(-9, 2, 7, 9)] : [lump(0, 0, 13.4, 19)]
  const baseY = h - 11
  contact(g, w / 2 + 2, baseY + 5, w * 0.46, 6, 0.36)
  relief(g, w, h, w / 2, baseY, { reach: 24, heightOf: (x, y) => boulderHeight(lumps, x, y, seed), seed, base, snow: null, green: 0, bands: 0.3 })
  // lichen on its top, small stones and grass at its foot
  g.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 9; i++) dab(g, w / 2 + (next() - 0.6) * 16, baseY - 9 - next() * 9, 0.8 + next() * 1.2, 0.5 + next() * 0.7, 'rgba(132, 142, 92, 0.3)', next() * 3)
  g.globalCompositeOperation = 'source-over'
  for (let i = 0; i < 3; i++) boulder(g, w * (0.2 + 0.3 * i + 0.1 * next()), h - 5 + next() * 2, 2.6 + next() * 2.4, 2 + next() * 1.6, next, base)
  for (let i = 0; i < 3; i++) sprig(g, w * (0.16 + 0.7 * next()), h - 3.4, next)
}

/** Pebbles on the sand: a few smooth stones of different colours, one kind with a shell among them. */
export function pebbles(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 67 + 17)
  const tones: Rgb[] = [[168, 164, 154], [142, 132, 120], [186, 170, 146], [124, 128, 132], [196, 190, 178]]
  const count = variant === 1 ? 5 : 7
  for (let i = 0; i < count; i++) {
    const x = w * (0.18 + (0.64 * i) / (count - 1)) + (next() - 0.5) * 3
    const y = h - 4.4 - next() * h * 0.36
    const r = 1.6 + next() * 2.2
    const tone = tones[Math.floor(next() * tones.length)]
    dab(g, x + 0.7, y + 0.8, r * 1.05, r * 0.62, 'rgba(24, 30, 48, 0.3)')
    const body = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.2, x, y, r)
    body.addColorStop(0, css(mix(tone, [255, 250, 236], 0.4)))
    body.addColorStop(0.6, css(tone))
    body.addColorStop(1, css(mix(tone, [50, 54, 76], 0.45)))
    dab(g, x, y, r, r * 0.66, body, (next() - 0.5) * 0.6)
  }
  if (variant !== 1) return
  // a scallop shell: a fan of ribs, pale and pink
  const [sx, sy] = [w * 0.34, h - 8]
  for (let k = 0; k < 7; k++) {
    const turn = Math.PI * (1.08 + (0.84 * k) / 6)
    shape(g, [[sx, sy + 2.4], [sx + Math.cos(turn - 0.09) * 4.6, sy + 2.4 + Math.sin(turn - 0.09) * 4.4], [sx + Math.cos(turn + 0.09) * 4.6, sy + 2.4 + Math.sin(turn + 0.09) * 4.4]], k % 2 ? 'rgb(240, 222, 206)' : 'rgb(226, 196, 180)')
  }
}

export interface Summit {
  /** Where it stands on the ground (x right, y towards the viewer) and how wide and high it is. */
  x: number
  y: number
  r: number
  high: number
}

/** How high the mountain made of `summits` is over a place on the ground: ridges and gullies cut into its cones. Pure. */
export function massifHeight(summits: Summit[], x: number, y: number, seed: number): number {
  let high = 0
  for (const s of summits) {
    const [dx, dy] = [x - s.x, (y - s.y) * 1.15]
    if (Math.abs(dx) > s.r * 1.3 || Math.abs(dy) > s.r * 1.3) continue
    // no summit stands on a round foot: it reaches further out here and less far there
    const turn = Math.atan2(dy, dx)
    const reach = s.r * (0.94 + 0.18 * Math.sin(3 * turn + s.x) + 0.1 * Math.sin(5 * turn + s.y + seed))
    const far = Math.hypot(dx, dy) / reach
    if (far < 1) high = Math.max(high, s.high * (1 - far) ** 1.05)
  }
  if (high <= 0) return 0
  // ridged noise: sharp crests with gullies between them, coarse and fine
  const ridge = (scale: number, salt: number): number => 1 - Math.abs(2 * fbm(x * scale + 50, y * scale + 50, seed + salt, 2) - 1)
  const rough = high * (0.42 + 0.62 * ridge(0.033, 1) + 0.2 * ridge(0.1, 2)) + Math.min(high, 5) * (ridge(0.3, 3) - 0.5)
  // rock breaks off in ledges: part of the height comes in steps, each with a wall below it
  const tread = 8 + 6 * fbm(x * 0.05 + 9, y * 0.05 + 9, seed + 4, 2)
  return rough * 0.5 + (Math.floor(rough / tread) + smoothStep((rough / tread) % 1)) * tread * 0.5
}

/** 0 to 1 with a steep middle: most of a step of rock is flat, the rest is its wall. */
const smoothStep = (t: number): number => (t < 0.6 ? 0 : ((t - 0.6) / 0.4) ** 0.7)

/** A peak in a picture `w` by `h` world pixels. `size` 0 is a crag, 1 a hill of rock, 2 a mountain; `snowy` caps it. */
/**
 * Picture pixels per world pixel of a peak. Less than the four of a tree: a mountain is large and far, its picture
 * weighs megabytes, and at three it is still as sharp as a phone shows it.
 */
export const PEAK_RES = 3

export function peak(g: Ctx, w: number, h: number, size: 0 | 1 | 2, snowy: boolean, variant: number): void {
  const seed = variant * 71 + size * 13 + (snowy ? 5 : 0)
  const next = numbers(seed)
  const r = w * 0.4
  const baseY = h - 4 - r * 0.5
  const high = h - r * 0.5 - 12
  const base: Rgb = snowy ? [122, 124, 132] : variant === 2 ? [128, 120, 110] : variant === 3 ? [116, 118, 122] : [124, 122, 116]
  // the summits stand along a ridge that runs across the picture: the highest a little off its middle
  const main: Summit = { x: (next() - 0.5) * r * 0.5, y: -r * 0.16, r: r * 0.66, high }
  const summits: Summit[] = [main]
  const shoulders = size === 0 ? 2 : size === 1 ? 4 : 6
  const slant = (next() - 0.5) * 0.5
  for (let i = 0; i < shoulders; i++) {
    const along = ((i + 0.5) / shoulders) * 2 - 1
    const off = (next() - 0.5) * 0.5
    summits.push({ x: along * r * 0.62, y: (along * slant + off) * r * 0.6, r: r * (0.36 + 0.16 * next()), high: high * (0.42 + 0.44 * next()) * (1 - 0.3 * Math.abs(along)) })
  }
  contact(g, w / 2 + r * 0.1, baseY + r * 0.3, r * 1.1, r * 0.36, 0.3)
  const reach = Math.max(...summits.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y)) + s.r * 1.2))
  relief(g, w, h, w / 2, baseY, { reach, heightOf: (x, y) => massifHeight(summits, x, y, seed), seed, base, snow: snowy ? high * 0.46 : null, green: 24, bands: 1, fine: PEAK_RES })
  // scree at its foot, where it meets the grass
  for (let i = 0; i < 6 + size * 5; i++) {
    const turn = Math.PI * (0.06 + 0.88 * next())
    boulder(g, w / 2 + Math.cos(turn) * r * (0.78 + 0.16 * next()), baseY + Math.sin(turn) * r * 0.5 * (0.7 + 0.12 * next()), 2.4 + next() * (2 + size * 1.6), 1.8 + next() * (1.4 + size), next, base)
  }
  for (let i = 0; i < 4 + size * 3; i++) sprig(g, w / 2 + (next() - 0.5) * r * 1.5, baseY + r * 0.36 + next() * 2, next)
}
