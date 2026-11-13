// What people plant beside their houses, painted by code: fenced gardens the size of a tile, clipped hedges and
// small beds of vegetables or flowers. Each picture is made once, of many small dabs of colour lit from the top left,
// without any outline, at the same four picture pixels per world pixel as the building pictures.
import { hash2 } from '../world/noise2d'
import { PICTURE_SCALE } from './sprites'

export type GardenKind = 'hedge' | 'bed' | 'garden'

/** Picture pixels per world pixel. */
const PX = 1 / PICTURE_SCALE
/** Size of a picture in world pixels, and how far above its bottom edge the middle of the plant lies on the ground. */
const SIZE: Record<GardenKind, { w: number; h: number }> = { hedge: { w: 48, h: 40 }, bed: { w: 48, h: 40 }, garden: { w: 76, h: 58 } }
export const GARDEN_DROP: Record<GardenKind, number> = { hedge: 13, bed: 13, garden: 20 }
/** A hedge: its length in tiles, the size of the clumps it grows in (tiles across, world pixels high). */
const HEDGE = { length: 0.8, clump: 0.085, height: 4.4 }
/** A bed in tiles. */
const BED = { length: 0.56, width: 0.3 }
/** A garden reaches this far from the middle of its tile; its fence has posts this high (world pixels). */
const GARDEN = { half: 0.43, post: 5.6, posts: 6 }

const cache = new Map<string, HTMLCanvasElement | null>()

/**
 * The picture of a hedge, a bed or a garden. Hedges and beds: variants 1 and 2 run along the tile axis that goes
 * down to the right, 3 and 4 along the one that goes down to the left. Gardens: 1 and 2 are fenced vegetable plots
 * (rows one way or the other), 3 a fenced flower garden, 4 a lawn with flowers inside a hedge.
 */
export function gardenSprite(kind: GardenKind, variant: number): HTMLCanvasElement | null {
  const id = `${kind}_${variant}`
  const hit = cache.get(id)
  if (hit !== undefined) return hit
  const canvas = document.createElement('canvas')
  canvas.width = SIZE[kind].w * PX
  canvas.height = SIZE[kind].h * PX
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(PX, PX)
    g.translate(SIZE[kind].w / 2, SIZE[kind].h - GARDEN_DROP[kind])
    const half = HEDGE.length / 2
    if (kind === 'hedge') {
      hedgeShade(g, variant <= 2 ? [-half, 0, half, 0] : [0, -half, 0, half], variant * 37)
      paintLeaves(g, hedgeRun(variant <= 2 ? [-half, 0, half, 0] : [0, -half, 0, half], variant * 37))
    } else if (kind === 'bed') paintBed(g, variant <= 2, variant % 2 === 0, variant * 53)
    else paintGarden(g, variant, variant * 71)
  }
  cache.set(id, g ? canvas : null)
  return g ? canvas : null
}

/** A dab of colour: a soft round spot. */
function dab(g: CanvasRenderingContext2D, x: number, y: number, radius: number, r: number, green: number, b: number, alpha = 1): void {
  g.fillStyle = `rgba(${Math.round(r)}, ${Math.round(green)}, ${Math.round(b)}, ${alpha})`
  g.beginPath()
  g.arc(x, y, radius, 0, Math.PI * 2)
  g.fill()
}

/** Where a place on the ground lies on screen (world pixels from the middle): u runs down to the right, v down to the left, in tiles. */
const screen = (u: number, v: number): [number, number] => [(u - v) * 32, (u + v) * 16]

interface Leaf {
  x: number
  y: number
  depth: number
  light: number
  radius: number
  tint: number
}

/**
 * The leaves of a hedge that runs from (u0, v0) to (u1, v1) in tiles. A hedge is no box: it grows in clumps of
 * uneven size and height that run into each other, with twigs that stand out, and each leaf is as light as the side
 * of its clump that it sits on faces the sun.
 */
function hedgeRun([u0, v0, u1, v1]: number[], seed: number): Leaf[] {
  const leaves: Leaf[] = []
  const length = Math.hypot(u1 - u0, v1 - v0)
  const clumps = Math.max(2, Math.round(length / (HEDGE.clump * 0.95)))
  for (let c = 0; c < clumps; c++) {
    const t = clumps === 1 ? 0.5 : c / (clumps - 1)
    const r = (n: number): number => hash2(c * 17 + n, 5, seed)
    // each clump a little off the line, bigger or smaller, higher or lower
    const cu = u0 + (u1 - u0) * t + (r(1) - 0.5) * 0.035
    const cv = v0 + (v1 - v0) * t + (r(2) - 0.5) * 0.035
    const wide = HEDGE.clump * (0.8 + 0.5 * r(3))
    const high = HEDGE.height * (0.78 + 0.5 * r(4))
    for (let i = 0; i < 130; i++) {
      const h = (n: number): number => hash2(c * 131 + i, n, seed + 3)
      // a direction on the upper part of a ball
      const turn = h(1) * Math.PI * 2
      const nz = -0.25 + 1.25 * h(2)
      const flat = Math.sqrt(Math.max(0, 1 - Math.min(1, nz) ** 2))
      const nu = Math.cos(turn) * flat
      const nv = Math.sin(turn) * flat
      // one leaf in twelve is a twig that stands out
      const out = h(3) < 0.08 ? 1.25 : 0.86 + 0.18 * h(4)
      const [gx, gy] = screen(cu + nu * wide * out, cv + nv * wide * out)
      const up = Math.max(0, high * (1 + nz * out))
      // the sun stands in the top left: a side that faces left on screen is lit, and so is everything that faces up
      const facing = -(nu - nv) / Math.SQRT2
      const light = 0.5 + 0.3 * Math.max(0, nz) + 0.2 * facing + 0.12 * (up / (HEDGE.height * 2.2)) + (h(5) - 0.5) * 0.2
      leaves.push({ x: gx, y: gy - up, depth: gy + up * 0.25 + (nu + nv) * 0.5, light, radius: 0.5 + 0.45 * h(6), tint: h(7) })
    }
  }
  return leaves
}

/** Paints leaves from the back to the front. */
function paintLeaves(g: CanvasRenderingContext2D, leaves: Leaf[]): void {
  leaves.sort((a, b) => a.depth - b.depth)
  for (const leaf of leaves) {
    const warm = Math.max(0, leaf.light - 0.82)
    // most leaves are deep green, some are young and yellow, some lie in a dark gap
    const [r, green, b] = leaf.tint < 0.1 ? [104, 132, 52] : leaf.tint > 0.9 ? [44, 70, 38] : [72, 112, 52]
    dab(g, leaf.x, leaf.y, leaf.radius, r * leaf.light + 80 * warm, green * leaf.light + 46 * warm, b * leaf.light, 0.95)
  }
}

/** The shade a hedge throws on the ground, to its right. */
function hedgeShade(g: CanvasRenderingContext2D, [u0, v0, u1, v1]: number[], seed: number): void {
  for (let i = 0; i < 70; i++) {
    const t = hash2(i, 1, seed)
    const [x, y] = screen(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t)
    dab(g, x + 3.2 + hash2(i, 2, seed) * 1.5, y + 1.4, 2.4, 20, 28, 52, 0.07)
  }
}

/** Dug earth between (u, v) limits: darker and rougher than the ground around it, without a ruled edge. */
function paintSoil(g: CanvasRenderingContext2D, halfU: number, halfV: number, seed: number, count: number, colour: number[]): void {
  for (let i = 0; i < count; i++) {
    const u = (hash2(i, 1, seed) - 0.5) * 2 * halfU
    const v = (hash2(i, 2, seed) - 0.5) * 2 * halfV
    const [x, y] = screen(u, v)
    const tone = 0.82 + 0.36 * hash2(i, 3, seed)
    const edge = Math.max(Math.abs(u) / halfU, Math.abs(v) / halfV)
    dab(g, x, y, 0.7 + 0.5 * hash2(i, 4, seed), colour[0] * tone, colour[1] * tone, colour[2] * tone, edge > 0.88 ? 0.45 : 0.9)
  }
}

interface Plant {
  u: number
  v: number
  /** A number of its own, for everything that differs from plant to plant. */
  n: number
  size: number
  flower: boolean
}

/** Paints plants from the back to the front: each a small heap of leaves with its shade, some with flowers. */
function paintPlants(g: CanvasRenderingContext2D, plants: Plant[], seed: number): void {
  const placed = plants.map((plant) => ({ plant, at: screen(plant.u, plant.v) })).sort((a, b) => a.at[1] - b.at[1])
  for (const { plant, at } of placed) {
    const [x, y] = at
    const { n, size } = plant
    dab(g, x + 1, y + 0.5, 1.3 * size, 30, 30, 40, 0.28)
    for (let k = 0; k < 9; k++) {
      const dx = (hash2(n * 9 + k, 1, seed + 8) - 0.5) * 2.4 * size
      const up = hash2(n * 9 + k, 2, seed + 9) * 2.6 * size
      const light = 0.62 + 0.14 * up + (dx < 0 ? 0.08 : -0.06)
      dab(g, x + dx, y - up, 0.5 + 0.35 * size, 78 * light, 124 * light, 54 * light, 0.95)
    }
    if (!plant.flower) continue
    const hue = hash2(n, 3, seed + 11)
    const [r, green, b] = hue < 0.35 ? [226, 208, 84] : hue < 0.65 ? [212, 96, 82] : hue < 0.85 ? [236, 232, 220] : [150, 122, 196]
    for (let k = 0; k < 3; k++) dab(g, x + (hash2(n * 3 + k, 4, seed + 12) - 0.5) * 2 * size, y - 1.6 * size - hash2(n * 3 + k, 5, seed + 13) * 1.4, 0.42, r, green, b)
  }
}

/** Plants in rows: `rows` rows of `perRow`, along u (or along v), inside the given half sizes. One in eight did not come up. */
function rowsOf(rows: number, perRow: number, halfU: number, halfV: number, alongU: boolean, flowers: number, seed: number): Plant[] {
  const plants: Plant[] = []
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < perRow; i++) {
      const n = row * perRow + i
      if (hash2(n, 6, seed) < 0.12) continue
      const across = ((row + 0.5) / rows - 0.5) * 2 * 0.84
      const along = ((i + 0.5) / perRow - 0.5) * 2 * 0.9 + (hash2(n, 7, seed) - 0.5) * 0.05
      plants.push({ u: (alongU ? along : across) * halfU, v: (alongU ? across : along) * halfV, n, size: 0.8 + 0.5 * hash2(n, 8, seed), flower: hash2(n, 9, seed) < flowers })
    }
  }
  return plants
}

function paintBed(g: CanvasRenderingContext2D, alongU: boolean, flowers: boolean, seed: number): void {
  const halfU = (alongU ? BED.length : BED.width) / 2
  const halfV = (alongU ? BED.width : BED.length) / 2
  paintSoil(g, halfU, halfV, seed, 700, [104, 78, 52])
  paintPlants(g, rowsOf(3, 7, halfU, halfV, alongU, flowers ? 0.75 : 0, seed), seed)
}

/** A bar of wood from one screen point to another, `thick` world pixels thick: a filled shape, no line. */
function bar(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, thick: number, colour: string): void {
  g.fillStyle = colour
  g.beginPath()
  g.moveTo(x0, y0 - thick / 2)
  g.lineTo(x1, y1 - thick / 2)
  g.lineTo(x1, y1 + thick / 2)
  g.lineTo(x0, y0 + thick / 2)
  g.closePath()
  g.fill()
}

/** One side of a wooden fence from (u0, v0) to (u1, v1): posts with two rails, weathered, lit from the left. */
function paintFence(g: CanvasRenderingContext2D, u0: number, v0: number, u1: number, v1: number, seed: number): void {
  const posts: [number, number, number][] = []
  for (let i = 0; i <= GARDEN.posts; i++) {
    const t = i / GARDEN.posts
    const [x, y] = screen(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t)
    // no fence stands straight for long
    posts.push([x + (hash2(i, 1, seed) - 0.5) * 0.5, y, GARDEN.post * (0.9 + 0.2 * hash2(i, 2, seed))])
  }
  // a rail that runs down to the right faces the sun less than one that runs down to the left
  const lit = posts[posts.length - 1][0] < posts[0][0]
  const rail = lit ? 'rgb(168, 138, 100)' : 'rgb(132, 106, 76)'
  for (let i = 0; i < GARDEN.posts; i++) {
    const [ax, ay] = posts[i]
    const [bx, by] = posts[i + 1]
    // the shade of the fence on the ground
    bar(g, ax + 1.6, ay + 0.6, bx + 1.6, by + 0.6, 1.1, 'rgba(20, 28, 52, 0.16)')
    for (const share of [0.38, 0.78]) bar(g, ax, ay - GARDEN.post * share, bx, by - GARDEN.post * share, 0.75, rail)
  }
  for (const [i, [x, y, high]] of posts.entries()) {
    const tone = 0.9 + 0.2 * hash2(i, 3, seed)
    g.fillStyle = `rgb(${Math.round(150 * tone)}, ${Math.round(122 * tone)}, ${Math.round(88 * tone)})`
    g.fillRect(x - 0.55, y - high, 1.1, high)
    g.fillStyle = `rgb(${Math.round(186 * tone)}, ${Math.round(158 * tone)}, ${Math.round(118 * tone)})`
    g.fillRect(x - 0.55, y - high, 0.4, high)
  }
}

function paintGarden(g: CanvasRenderingContext2D, variant: number, seed: number): void {
  const half = GARDEN.half
  const hedged = variant === 4
  const inner = half - (hedged ? 0.1 : 0.05)
  // the ground of the garden: dug earth for vegetables, grass for flowers and lawn
  if (variant <= 2) paintSoil(g, inner, inner, seed, 2600, [106, 80, 54])
  else paintSoil(g, inner, inner, seed, 2600, [98, 128, 62])
  // the two sides at the back first, then what grows, then the two sides in front
  const sides: number[][] = [[-half, -half, half, -half], [-half, -half, -half, half], [half, -half, half, half], [-half, half, half, half]]
  const enclose = (from: number, to: number): void => {
    for (let i = from; i < to; i++) {
      if (hedged) {
        hedgeShade(g, sides[i], seed + i)
        paintLeaves(g, hedgeRun(sides[i], seed + i * 7))
      } else paintFence(g, sides[i][0], sides[i][1], sides[i][2], sides[i][3], seed + i * 7)
    }
  }
  enclose(0, 2)
  if (variant <= 2) {
    // vegetables in rows, with a trodden path between two halves of the plot
    const plants = rowsOf(6, 9, inner * 0.94, inner * 0.94, variant === 1, 0.1, seed).filter((plant) => Math.abs(variant === 1 ? plant.v : plant.u) > inner * 0.12)
    paintPlants(g, plants, seed)
  } else if (variant === 3) {
    paintPlants(g, rowsOf(5, 7, inner * 0.92, inner * 0.92, true, 0.85, seed), seed)
  } else {
    // a lawn with a border of flowers along the hedge and a small round bed in the middle
    const plants: Plant[] = []
    for (let i = 0; i < 26; i++) {
      const side = i % 4
      const t = (hash2(i, 1, seed) - 0.5) * 2 * inner * 0.8
      const edge = inner * 0.78
      plants.push({ u: side === 0 ? -edge : side === 1 ? edge : t, v: side === 2 ? -edge : side === 3 ? edge : t, n: i, size: 0.8 + 0.4 * hash2(i, 2, seed), flower: true })
    }
    for (let i = 0; i < 7; i++) {
      const turn = (i / 7) * Math.PI * 2
      plants.push({ u: Math.cos(turn) * 0.07, v: Math.sin(turn) * 0.07, n: 40 + i, size: 1, flower: true })
    }
    paintPlants(g, plants, seed)
  }
  enclose(2, 4)
}
