// The sea is made here, not painted. Its small waves are a height: trains of waves that run almost the same way and
// stand high for a short stretch wherever their crests meet. Every picture point is then lit like a piece of that
// surface: a crest that faces the sky and the sun is light, the flank that faces the viewer shows the dark of the
// deep. Two such pictures are worked out once; they repeat over the whole sea and run through each other, so the
// waves never stand still. What would give the repeat away is not in them: the white caps of breaking crests and the
// sparks of the sun are scattered over the sea one by one (glitter.ts).

/** Pixels of one picture, and how many world pixels it covers. */
const RES = 640
const SPAN = 320
/** The water on a flank that faces the viewer, on a flat stretch and on a lit crest. */
const DARK = [20, 44, 64]
const MID = [37, 68, 86]
const LIGHT = [96, 134, 146]
/** World pixels per second the two pictures run (the second one across the first) and how strongly the second shows. */
const RUN = { body: [2.6, 1.5], over: [-4.2, 1.1] }
const OVER_ALPHA = 0.42
/** The second picture is smaller than the first, so the two never line up and the pattern does not seem to repeat. */
const OVER_SCALE = 0.74
/** Slow patches of lighter and darker water over everything: size of one picture (world pixels) and strength. */
const PATCH_SIZE = 1700
const PATCH_ALPHA = 0.3
const PATCH_RES = 192

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** The cell values of every noise, by its seed: a table is much quicker than working each value out again. */
const TABLES: ({ px: number; py: number; values: Float64Array } | undefined)[] = []

/** Smooth noise from 0 to 1 that repeats after `px` cells across and `py` cells down. Every seed has its own cells. */
export function tiling(x: number, y: number, px: number, py: number, seed: number): number {
  let table = TABLES[seed]
  if (!table || table.px !== px || table.py !== py) {
    table = { px, py, values: new Float64Array(px * py) }
    for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) table.values[j * px + i] = hash(i, j, seed)
    TABLES[seed] = table
  }
  const { values } = table
  const fx0 = Math.floor(x)
  const fy0 = Math.floor(y)
  const fx = x - fx0
  const fy = y - fy0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const x0 = ((fx0 % px) + px) % px
  const x1 = x0 + 1 === px ? 0 : x0 + 1
  const row0 = (((fy0 % py) + py) % py) * px
  const row1 = row0 + px === px * py ? 0 : row0 + px
  const top = values[row0 + x0] + (values[row0 + x1] - values[row0 + x0]) * sx
  const bottom = values[row1 + x0] + (values[row1 + x1] - values[row1 + x0]) * sx
  return top + (bottom - top) * sy
}

/**
 * The long swells at one point of the repeating picture (u, v from 0 to 1), from 0 in a trough to 1 on a back.
 * They lie across the screen: wide and short. Pure.
 */
export function swellAt(u: number, v: number): number {
  return 0.55 * tiling(u * 5, v * 12, 5, 12, 1) + 0.3 * tiling(u * 10, v * 26, 10, 26, 2) + 0.15 * tiling(u * 22, v * 54, 22, 54, 3)
}

/**
 * The trains of waves the small waves are made of, as [crests across the picture, crests down it, height, start]:
 * whole numbers, so every train joins itself at the edges. They run almost the same way; where their crests meet
 * the water stands high for a short stretch, and that is a wave.
 */
const TRAINS: [number, number, number, number][] = [
  [5, 46, 1, 0.11], [-8, 54, 0.9, 0.53], [11, 60, 0.7, 0.87], [-13, 41, 0.75, 0.29], [2, 69, 0.5, 0.71], [-4, 81, 0.4, 0.07],
  [15, 75, 0.36, 0.43], [-17, 66, 0.36, 0.61], [8, 31, 0.7, 0.95], [-3, 25, 0.6, 0.37], [19, 95, 0.2, 0.19], [-21, 107, 0.2, 0.79],
  [3, 15, 0.5, 0.33], [-5, 19, 0.45, 0.67],
]
/** The height all trains reach together on average: a wave of this height is an ordinary one. */
const ORDINARY = Math.sqrt(TRAINS.reduce((sum, train) => sum + (train[2] * train[2]) / 2, 0))
/** One turn of a sine in steps, read between the steps: a table is much quicker than the sine itself. */
const STEPS = 2048
const SINE = Float32Array.from({ length: STEPS + 1 }, (_, k) => Math.sin((k / STEPS) * Math.PI * 2))

function sine(turns: number): number {
  const at = (turns - Math.floor(turns)) * STEPS
  const k = at | 0
  return SINE[k] + (SINE[k + 1] - SINE[k]) * (at - k)
}

/**
 * The small wind waves at one point of the repeating picture, -1 in a trough to 1 on a crest: short crests that
 * lie across the screen, none of them long and no two alike, because they are where several trains of waves meet.
 * Pure.
 */
export function rippleAt(u: number, v: number): number {
  // the trains do not run dead straight: two slow noises bend them, each train by its own share of both
  const bend = tiling(u * 4, v * 7, 4, 7, 21) - 0.5
  const sway = tiling(u * 9, v * 15, 9, 15, 23) - 0.5
  let height = 0
  for (let k = 0; k < TRAINS.length; k++) {
    const [across, down, high, start] = TRAINS[k]
    height += high * sine(across * u + down * v + start + bend * (1.3 + 0.6 * (k % 3)) + sway * (1.1 - 0.7 * (k % 4)))
  }
  // the wind does not blow evenly: the waves stand higher in one place than in the next
  const gust = 0.6 + 0.8 * tiling(u * 3, v * 5, 3, 5, 25)
  return Math.max(-1, Math.min(1, (height * gust) / (ORDINARY * 2.8)))
}

function picture(paint: (x: number, y: number, out: Uint8ClampedArray, o: number) => void): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = RES
  canvas.height = RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const image = g.createImageData(RES, RES)
  for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) paint(x, y, image.data, (y * RES + x) * 4)
  g.putImageData(image, 0, 0)
  return canvas
}

const clamp = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

/**
 * How light a point of the small waves is, from -1 (a flank that faces the viewer: the dark of the deep) to 1 (a
 * crest in the sun). `height` is the wave there, `fall` how much it falls towards the top left of the screen, where
 * the light comes from: a crest is a light line that fades down its back and ends sharply on its front. Pure.
 */
export function waveLight(height: number, fall: number): number {
  const crest = clamp((height - 0.22) / 0.5)
  return Math.max(-1, Math.min(1, crest * crest * 0.9 + fall * 1.7 - 0.06 - 0.3 * clamp(-height * 2)))
}

/** The swells for every picture point: they are wide, so every fourth point is worked out and the rest lies between. */
function swellField(): Float32Array {
  const STEP = 4
  const n = RES / STEP
  const coarse = new Float32Array(n * n)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) coarse[j * n + i] = swellAt((i * STEP + 0.5) / RES, (j * STEP + 0.5) / RES)
  const field = new Float32Array(RES * RES)
  for (let y = 0; y < RES; y++) {
    const j0 = Math.floor(y / STEP)
    const j1 = (j0 + 1) % n
    const ty = y / STEP - j0
    for (let x = 0; x < RES; x++) {
      const i0 = Math.floor(x / STEP)
      const i1 = (i0 + 1) % n
      const tx = x / STEP - i0
      const top = coarse[j0 * n + i0] + (coarse[j0 * n + i1] - coarse[j0 * n + i0]) * tx
      const bottom = coarse[j1 * n + i0] + (coarse[j1 * n + i1] - coarse[j1 * n + i0]) * tx
      field[y * RES + x] = top + (bottom - top) * ty
    }
  }
  return field
}

let pictures: { body: HTMLCanvasElement; over: HTMLCanvasElement } | null | undefined

/** The two pictures of the waves, worked out once for the whole game: the start scene and the map share them. */
function seaPictures(): { body: HTMLCanvasElement; over: HTMLCanvasElement } | null {
  if (pictures !== undefined) return pictures
  const field = new Float32Array(RES * RES)
  for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) field[y * RES + x] = rippleAt((x + 0.5) / RES, (y + 0.5) / RES)
  const swells = swellField()
  const at = (x: number, y: number): number => field[((y + RES) % RES) * RES + ((x + RES) % RES)]
  const light = (x: number, y: number): number => waveLight(at(x, y), (at(x, y + 2) - at(x, y - 2)) * 0.7 + (at(x + 2, y) - at(x - 2, y)) * 0.45)
  // the body: every point lit by its height and slope, a little lighter on the back of a swell
  const body = picture((x, y, out, o) => {
    const lit = light(x, y)
    const lift = 0.84 + 0.32 * swells[y * RES + x]
    const to = lit > 0 ? LIGHT : DARK
    const share = Math.abs(lit)
    for (let c = 0; c < 3; c++) out[o + c] = (MID[c] + (to[c] - MID[c]) * share) * lift
    out[o + 3] = 255
  })
  // the second picture: the same waves seen the other way round, as light and shade only
  const over = picture((x, y, out, o) => {
    const lit = light(RES - 1 - x, (y + (RES >> 1)) % RES)
    const to = lit > 0 ? LIGHT : DARK
    for (let c = 0; c < 3; c++) out[o + c] = to[c]
    out[o + 3] = 255 * Math.abs(lit) * OVER_ALPHA
  })
  pictures = body && over ? { body, over } : null
  return pictures
}

/** The sea as repeating fills for one canvas. */
export class WaterPattern {
  private body: CanvasPattern | null = null
  private over: CanvasPattern | null = null
  private patches: CanvasPattern | null = null

  constructor(ctx: CanvasRenderingContext2D) {
    const made = seaPictures()
    this.body = made && ctx.createPattern(made.body, 'repeat')
    this.over = made && ctx.createPattern(made.over, 'repeat')
    this.patches = makePatches(ctx)
  }

  /**
   * Fills the area with the open sea: the waves, and the slow patches of lighter and darker water over them. When
   * animated both run steadily; otherwise the sea looks the same but stands still. Returns false without a canvas.
   */
  fill(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number, animated: boolean): boolean {
    if (!this.body) return false
    const t = (animated ? now : 0) / 1000
    this.body.setTransform(new DOMMatrix().translate(run(t, RUN.body[0], SPAN), run(t, RUN.body[1], SPAN)).scale(SPAN / RES))
    ctx.fillStyle = this.body
    ctx.fillRect(area.x, area.y, area.w, area.h)
    if (this.patches) {
      // large soft patches drift very slowly: lighter and darker water, so no two places look alike
      this.patches.setTransform(new DOMMatrix().translate(run(t, 6, PATCH_SIZE), run(t, 3, PATCH_SIZE)).scale(PATCH_SIZE / PATCH_RES))
      ctx.save()
      ctx.globalAlpha = PATCH_ALPHA
      ctx.fillStyle = this.patches
      ctx.fillRect(area.x, area.y, area.w, area.h)
      ctx.restore()
    }
    return true
  }

  /**
   * The second picture of the waves, light and shade only, running across the first: crests form where the two
   * meet and pass. It is laid over the shallows too (they are drawn between `fill` and this), so the waves do not
   * end where the water turns green.
   */
  ripple(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, now: number): void {
    if (!this.over) return
    const span = SPAN * OVER_SCALE
    this.over.setTransform(new DOMMatrix().translate(run(now / 1000, RUN.over[0], span), run(now / 1000, RUN.over[1], span)).scale((SPAN / RES) * OVER_SCALE))
    ctx.fillStyle = this.over
    ctx.fillRect(area.x, area.y, area.w, area.h)
  }
}

/** How far a picture has run after `t` seconds: taken within its span, so the numbers stay small however long the game runs. */
const run = (t: number, speed: number, span: number): number => (t * speed) % span

let patchPicture: HTMLCanvasElement | null = null

/** Seamless cloud picture: waves of whole-number frequencies add up, so the picture joins itself on all sides. Worked out once. */
function makePatches(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (patchPicture) return ctx.createPattern(patchPicture, 'repeat')
  const canvas = document.createElement('canvas')
  canvas.width = PATCH_RES
  canvas.height = PATCH_RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const waves: [number, number, number, number][] = [
    [1, 0, 1, 0.3], [0, 1, 1, 1.7], [1, 1, 0.8, 2.9], [2, -1, 0.7, 4.1], [1, 2, 0.6, 0.9],
    [3, 1, 0.45, 5.3], [-2, 3, 0.4, 2.2], [4, -2, 0.3, 3.6], [2, 4, 0.25, 1.1],
  ]
  const total = waves.reduce((sum, wave) => sum + wave[2], 0)
  const image = g.createImageData(PATCH_RES, PATCH_RES)
  for (let y = 0; y < PATCH_RES; y++) {
    for (let x = 0; x < PATCH_RES; x++) {
      let value = 0
      for (const [fx, fy, amplitude, phase] of waves) value += amplitude * Math.sin(2 * Math.PI * ((fx * x + fy * y) / PATCH_RES) + phase)
      value /= total
      const o = (y * PATCH_RES + x) * 4
      const light = value > 0
      image.data[o] = light ? 150 : 6
      image.data[o + 1] = light ? 196 : 24
      image.data[o + 2] = light ? 210 : 52
      image.data[o + 3] = Math.min(255, Math.abs(value) * 255 * 0.7)
    }
  }
  g.putImageData(image, 0, 0)
  patchPicture = canvas
  return ctx.createPattern(canvas, 'repeat')
}

/** How dark the open sea gets at the edge of the map, 0 to 1. */
const DEPTH = 0.42

/**
 * Deep water: the sea turns darker from the island towards the open sea, so it reads as depth and the repeating
 * ripples fade into the distance. One gradient over the visible area; `bounds` is the box of the map in world pixels.
 */
export function fillDepth(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const reach = (bounds.maxX - bounds.minX) / 2
  ctx.save()
  // the map is a diamond twice as wide as high: squash the circle to match
  ctx.translate(cx, cy)
  ctx.scale(1, 0.5)
  const gradient = ctx.createRadialGradient(0, 0, reach * 0.42, 0, 0, reach * 1.05)
  gradient.addColorStop(0, 'rgba(6, 28, 66, 0)')
  gradient.addColorStop(1, `rgba(6, 28, 66, ${DEPTH})`)
  ctx.fillStyle = gradient
  ctx.fillRect(area.x - cx, (area.y - cy) * 2, area.w, area.h * 2)
  ctx.restore()
}
