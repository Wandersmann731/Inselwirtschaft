// What buildings are made of, worked out by code: every material is a small picture that repeats without a seam,
// with the structure of the real thing (courses of brick, rows of tiles that overlap, logs, grain) and the wear of
// years (stains, patches, single stones or tiles of another tone). Four texels are one world pixel.
import { hash2 } from '../../world/noise2d'

export type Mat =
  | 'plaster' | 'stone' | 'ashlar' | 'brick' | 'boards' | 'planks' | 'logs' | 'timber'
  | 'tile' | 'slate' | 'verdigris' | 'thatch' | 'shingle' | 'cloth' | 'flags' | 'deck' | 'marble' | 'rock'

const SIZE = 128
/** Texels per world pixel. */
export const TEXELS = 4

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** Smooth noise from 0 to 1 that repeats over the texture; `cell` is the size of one noise cell in texels. */
function noise(x: number, y: number, cell: number, seed: number): number {
  const period = SIZE / cell
  const fx = x / cell
  const fy = y / cell
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = smooth(fx - x0)
  const ty = smooth(fy - y0)
  const at = (ix: number, iy: number): number => hash2(((ix % period) + period) % period, ((iy % period) + period) % period, seed)
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
}

/** Stains and patches common to everything that stands outside: slow blotches, finer ones, and a grain. */
function weather(x: number, y: number, seed: number): number {
  // slow blotches, finer ones, pores of two or three texels, and the grain of every single texel
  return 0.86 + 0.14 * noise(x, y, 32, seed) + 0.1 * (noise(x, y, 8, seed + 1) - 0.5) + 0.09 * (noise(x, y, 2, seed + 3) - 0.5) + 0.12 * (hash2(x, y, seed + 2) - 0.5)
}

/** Courses of blocks: `row` texels high, blocks `length` texels long, every other course moved by half. Gives the block's id and how near a joint the texel is (0 in the joint, 1 on the block). */
function courses(x: number, y: number, row: number, length: number, joint: number): { id: number; body: number; inRow: number; inBlock: number } {
  const r = Math.floor(y / row)
  const sx = (x + (r % 2) * (length / 2)) % SIZE
  const b = Math.floor(sx / length)
  const inRow = (y % row) / row
  const inBlock = (sx % length) / length
  const edge = Math.min(inRow * row, (1 - inRow) * row, inBlock * length, (1 - inBlock) * length)
  return { id: r * 64 + b, body: smooth(edge / joint), inRow, inBlock }
}

type Texel = (x: number, y: number) => [number, number, number]

const RECIPES: Record<Mat, { base: [number, number, number]; at: Texel }> = {
  // lime plaster: uneven, with darker damp patches and fine cracks
  plaster: {
    base: [222, 210, 186],
    at: (x, y) => {
      const w = weather(x, y, 11)
      const crack = noise(x, y, 16, 14)
      const hair = Math.abs(crack - 0.5) < 0.012 ? 0.86 : 1
      return [222 * w * hair, 210 * w * hair, 186 * w * hair * (0.96 + 0.04 * noise(x, y, 64, 15))]
    },
  },
  // rubble wall: stones of every size and tone in lime mortar
  stone: {
    base: [164, 158, 144],
    at: (x, y) => {
      const c = courses(x + 6 * (noise(x, y, 32, 21) - 0.5), y, 16, 24, 2.4)
      const tone = 0.78 + 0.34 * hash2(c.id, 1, 22)
      const warm = hash2(c.id, 2, 23)
      const lit = 1 + 0.12 * (0.5 - c.inRow)
      const w = weather(x, y, 24) * tone * lit * (0.62 + 0.38 * c.body)
      return [(160 + 16 * warm) * w, (154 + 8 * warm) * w, (142 - 6 * warm) * w]
    },
  },
  // dressed stone in even courses: churches and fine houses
  ashlar: {
    base: [178, 172, 158],
    at: (x, y) => {
      const c = courses(x, y, 16, 32, 1.6)
      const tone = 0.9 + 0.16 * hash2(c.id, 1, 31)
      const w = weather(x, y, 32) * tone * (0.74 + 0.26 * c.body) * (1 + 0.06 * (0.5 - c.inRow))
      return [182 * w, 176 * w, 162 * w]
    },
  },
  marble: {
    base: [226, 224, 218],
    at: (x, y) => {
      const c = courses(x, y, 32, 64, 1.4)
      const vein = Math.abs(noise(x + 20 * noise(x, y, 32, 41), y, 16, 42) - 0.5) < 0.03 ? 0.88 : 1
      const w = (0.93 + 0.07 * noise(x, y, 32, 43)) * vein * (0.84 + 0.16 * c.body)
      return [230 * w, 228 * w, 224 * w]
    },
  },
  brick: {
    base: [158, 88, 64],
    at: (x, y) => {
      const c = courses(x, y, 8, 16, 1.3)
      const tone = 0.8 + 0.36 * hash2(c.id, 1, 51)
      const burnt = hash2(c.id, 2, 52) < 0.12 ? 0.7 : 1
      const w = weather(x, y, 53)
      const b = c.body
      return [(168 * tone * burnt * b + 196 * (1 - b)) * w, (90 * tone * burnt * b + 184 * (1 - b)) * w, (64 * tone * burnt * b + 164 * (1 - b)) * w]
    },
  },
  // upright boards, weathered grey-brown, with dark gaps
  boards: {
    base: [118, 95, 71],
    at: (x, y) => {
      const board = Math.floor(x / 16)
      const gap = smooth(Math.min(x % 16, 16 - (x % 16)) / 1.5)
      const tone = 0.84 + 0.3 * hash2(board, 1, 61)
      const grain = 0.92 + 0.16 * noise(x * 4, y, 16, 62 + board)
      const w = weather(x, y, 63) * tone * grain * (0.55 + 0.45 * gap)
      return [124 * w, 99 * w, 74 * w]
    },
  },
  // boards that lie: the wall of a shed, the hull of a hut
  planks: {
    base: [132, 107, 79],
    at: (x, y) => {
      const board = Math.floor(y / 16)
      const gap = smooth(Math.min(y % 16, 16 - (y % 16)) / 1.5)
      const tone = 0.84 + 0.3 * hash2(board, 1, 71)
      const grain = 0.92 + 0.16 * noise(x, y * 4, 16, 72 + board)
      const lit = 1 + 0.1 * (0.5 - (y % 16) / 16)
      const w = weather(x, y, 73) * tone * grain * lit * (0.55 + 0.45 * gap)
      return [138 * w, 111 * w, 82 * w]
    },
  },
  // round logs laid on each other: light on their upper side, dark between them
  logs: {
    base: [104, 79, 56],
    at: (x, y) => {
      const log = Math.floor(y / 16)
      const round = Math.sin(((y % 16) / 16) * Math.PI)
      const tone = 0.86 + 0.26 * hash2(log, 1, 81)
      const grain = 0.9 + 0.2 * noise(x, y * 6, 16, 82 + log)
      const lit = 0.5 + 0.62 * round * (1.12 - 0.3 * ((y % 16) / 16))
      const w = weather(x, y, 83) * tone * grain * lit
      return [120 * w, 91 * w, 64 * w]
    },
  },
  // dark oak of a timber frame
  timber: {
    base: [78, 56, 38],
    at: (x, y) => {
      const grain = 0.86 + 0.28 * noise(x * 6, y, 16, 91)
      const w = weather(x, y, 92) * grain
      return [84 * w, 60 * w, 40 * w]
    },
  },
  // clay roof tiles in rows that overlap: each row throws a shade on the one below, each tile has its own tone
  tile: {
    base: [158, 92, 66],
    at: (x, y) => {
      const c = courses(x, y, 8, 8, 0.9)
      const tone = 0.8 + 0.36 * hash2(c.id, 1, 101)
      const moss = hash2(c.id, 2, 102) < 0.02 ? 0.5 : 0
      const lap = 0.58 + 0.5 * smooth((1 - c.inRow) / 0.75)
      const curve = 0.9 + 0.14 * Math.sin(c.inBlock * Math.PI)
      const w = weather(x, y, 103) * tone * lap * curve
      return [(166 - 50 * moss) * w, (96 + 20 * moss) * w, (68 - 6 * moss) * w]
    },
  },
  slate: {
    base: [96, 104, 122],
    at: (x, y) => {
      const c = courses(x, y, 8, 16, 0.8)
      const tone = 0.82 + 0.32 * hash2(c.id, 1, 111)
      const lap = 0.64 + 0.42 * smooth((1 - c.inRow) / 0.7)
      const w = weather(x, y, 112) * tone * lap
      return [100 * w, 108 * w, 126 * w]
    },
  },
  // shingles painted or weathered to a blue green: the roof of the trading post, a copper dome
  verdigris: {
    base: [78, 140, 136],
    at: (x, y) => {
      const c = courses(x, y, 8, 16, 0.8)
      const tone = 0.82 + 0.32 * hash2(c.id, 1, 115)
      const lap = 0.64 + 0.42 * smooth((1 - c.inRow) / 0.7)
      const w = weather(x, y, 116) * tone * lap
      return [80 * w, 146 * w, 142 * w]
    },
  },
  // straw: long strands that run down the roof, laid in thick layers
  thatch: {
    base: [172, 148, 96],
    at: (x, y) => {
      const strand = 0.8 + 0.4 * noise(x * 8, y, 32, 121)
      const layer = (y % 32) / 32
      const lap = 0.86 + 0.18 * smooth((1 - layer) / 0.8)
      const w = weather(x, y, 122) * strand * lap
      return [182 * w, 156 * w, 100 * w]
    },
  },
  shingle: {
    base: [124, 102, 78],
    at: (x, y) => {
      const c = courses(x, y, 8, 8, 0.9)
      const tone = 0.76 + 0.44 * hash2(c.id, 1, 131)
      const lap = 0.6 + 0.46 * smooth((1 - c.inRow) / 0.7)
      const grain = 0.92 + 0.16 * noise(x * 6, y, 16, 132)
      const w = weather(x, y, 133) * tone * lap * grain
      return [130 * w, 106 * w, 80 * w]
    },
  },
  // woven cloth: an awning, a sail, washing on a line
  cloth: {
    base: [232, 226, 210],
    at: (x, y) => {
      const weave = 0.95 + 0.05 * (((x >> 1) + (y >> 1)) % 2)
      const fold = 0.9 + 0.12 * noise(x, y * 3, 32, 141)
      const w = weave * fold * (0.94 + 0.08 * noise(x, y, 16, 142))
      return [236 * w, 230 * w, 214 * w]
    },
  },
  // flagstones: the floor of a market hall, a church yard
  flags: {
    base: [164, 158, 146],
    at: (x, y) => {
      const c = courses(x, y, 32, 32, 2)
      const tone = 0.86 + 0.24 * hash2(c.id, 1, 151)
      const w = weather(x, y, 152) * tone * (0.66 + 0.34 * c.body)
      return [168 * w, 162 * w, 150 * w]
    },
  },
  // the planks of a pier or platform, bleached by salt and sun
  deck: {
    base: [158, 136, 108],
    at: (x, y) => {
      const board = Math.floor(y / 16)
      const gap = smooth(Math.min(y % 16, 16 - (y % 16)) / 1.3)
      const tone = 0.84 + 0.3 * hash2(board, 1, 161)
      const grain = 0.92 + 0.16 * noise(x, y * 4, 16, 162 + board)
      const w = weather(x, y, 163) * tone * grain * (0.5 + 0.5 * gap)
      return [166 * w, 142 * w, 112 * w]
    },
  },
  // living rock: the face of a quarry, the mound over a mine
  rock: {
    base: [128, 122, 114],
    at: (x, y) => {
      const strata = 0.8 + 0.3 * noise(x + 30 * noise(x, y, 64, 171), y * 3, 32, 172)
      const crack = Math.abs(noise(x, y, 16, 173) - 0.5) < 0.03 ? 0.7 : 1
      const w = weather(x, y, 174) * strata * crack
      return [134 * w, 128 * w, 118 * w]
    },
  },
}

const patterns = new Map<Mat, CanvasPattern | null>()

/** The colour a material has on average: what is filled under a face before its texture, so no gap shows at an edge. */
export function baseColour(mat: Mat, shade = 0.8): string {
  const [r, g, b] = RECIPES[mat].base
  return `rgb(${Math.round(r * shade)}, ${Math.round(g * shade)}, ${Math.round(b * shade)})`
}

/** One texel of a material, RGB. Pure: for tests. */
export function texelOf(mat: Mat, x: number, y: number): [number, number, number] {
  return RECIPES[mat].at(((x % SIZE) + SIZE) % SIZE, ((y % SIZE) + SIZE) % SIZE)
}

/** A material as a repeating fill, in world pixels (a texture covers 32 of them). Made once. */
export function material(mat: Mat): CanvasPattern | string {
  let pattern = patterns.get(mat)
  if (pattern === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const g = canvas.getContext('2d')
    pattern = null
    if (g) {
      const image = g.createImageData(SIZE, SIZE)
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const [r, green, b] = RECIPES[mat].at(x, y)
          const o = (y * SIZE + x) * 4
          image.data[o] = r
          image.data[o + 1] = green
          image.data[o + 2] = b
          image.data[o + 3] = 255
        }
      }
      g.putImageData(image, 0, 0)
      pattern = g.createPattern(canvas, 'repeat')
      pattern?.setTransform(new DOMMatrix().scale(1 / TEXELS))
    }
    patterns.set(mat, pattern)
  }
  return pattern ?? baseColour(mat, 1)
}
