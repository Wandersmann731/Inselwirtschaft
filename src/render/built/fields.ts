// Fields, plantations and pastures, made by code. A field fills its tiles to the edge and ends there in an uneven
// line, as a field does: nothing is cut off, nothing stands beyond the plot. In one corner at the back stands the
// farmhouse; the crop grows in rows around it, every plant painted in a few dabs of colour.
import { hash2 } from '../../world/noise2d'
import { px, type Ctx, type P2, type P3, type Scene } from './kit'
import { shed } from './extras'
import { stack } from './look'
import { body, type Body } from './parts'
import { cart, scarecrow, well } from './yardProps'
import { animal, barrel, bush, dab, fence, haystack, rack, sack, vat } from './props'
import type { Mat } from './materials'

/** The yard of the farmhouse, in tiles from the back corner: no crop grows there. */
const YARD = 0.96
type Rgb = [number, number, number]

/** The outline of the plot: the tile edges, pushed in a little here and there. */
function plotOutline(scene: Scene, inset = 0): P2[] {
  const { w, h, seed } = scene
  const points: P2[] = []
  const side = (u0: number, v0: number, u1: number, v1: number, n: number): void => {
    const steps = Math.round(Math.hypot(u1 - u0, v1 - v0) * 9)
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      // into the plot: towards its middle
      const u = u0 + (u1 - u0) * t
      const v = v0 + (v1 - v0) * t
      const push = inset + 0.012 + 0.045 * hash2(k, n, seed + 41)
      points.push(px(u + (w / 2 - u) * push * (2 / w) * (u0 === u1 ? 1 : 0.15), v + (h / 2 - v) * push * (2 / h) * (v0 === v1 ? 1 : 0.15)))
    }
  }
  side(0, 0, w, 0, 1)
  side(w, 0, w, h, 2)
  side(w, h, 0, h, 3)
  side(0, h, 0, 0, 4)
  return points
}

function tracePoly(g: Ctx, points: P2[]): void {
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
}

/**
 * A field has no ruled edge: the grass of the meadow grows into it and the crop thins out towards it. Laid over
 * everything that was painted on the ground of the plot, this eats its rim away in tufts - deep here, hardly there -
 * so the ground of the island shows through.
 */
function fray(scene: Scene): void {
  const { w, h, seed } = scene
  scene.ground([[0, 0, 0], [w, h, 0]], (g) => {
    g.globalCompositeOperation = 'destination-out'
    const side = (u0: number, v0: number, u1: number, v1: number, n: number): void => {
      const steps = Math.round(Math.hypot(u1 - u0, v1 - v0) * 46)
      for (let k = 0; k <= steps; k++) {
        const t = k / steps
        // how far the meadow reaches in here: slow waves along the side, and every tuft its own
        const deep = 0.03 + 0.075 * hash2(Math.floor(k / 7), n, seed + 61) + 0.04 * hash2(k, n, seed + 62)
        for (let step = 0; step < 3; step++) {
          const far = (deep * step) / 2.4
          const [x, y] = px(u0 + (u1 - u0) * t + (w / 2 - (u0 + (u1 - u0) * t)) * far * (u0 === u1 ? 2 / w : 0), v0 + (v1 - v0) * t + (h / 2 - (v0 + (v1 - v0) * t)) * far * (v0 === v1 ? 2 / h : 0))
          dab(g, x, y, 1.1 + 1.5 * hash2(k, n + step * 9, seed + 63), 0, 0, 0, step === 0 ? 1 : step === 1 ? 0.7 : 0.38)
        }
      }
    }
    side(0, 0, w, 0, 1)
    side(w, 0, w, h, 2)
    side(w, h, 0, h, 3)
    side(0, h, 0, 0, 4)
  })
}

/** Patches in a field, large and soft: where it stood wet the crop is another colour than on the dry rise. */
function patches(g: Ctx, scene: Scene, tones: string[]): void {
  const { w, h, seed } = scene
  for (let i = 0; i < w * h * 9; i++) {
    const [x, y] = px(hash2(i, 31, seed) * w, hash2(i, 32, seed) * h)
    g.fillStyle = tones[Math.floor(hash2(i, 33, seed) * tones.length)]
    g.beginPath()
    g.ellipse(x, y, 7 + 9 * hash2(i, 34, seed), 3 + 4 * hash2(i, 35, seed), 0, 0, Math.PI * 2)
    g.fill()
  }
}

/** The ground of a plot: earth or grass in many tones, darker in furrows that run along u or v. */
function soil(scene: Scene, colour: Rgb, furrows: number, alongU: boolean, furrow = 0.82): void {
  const { w, h, seed } = scene
  scene.ground([[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]], (g) => {
    tracePoly(g, plotOutline(scene))
    g.clip()
    g.fillStyle = `rgb(${colour.join(', ')})`
    g.fillRect(-h * 32, 0, (w + h) * 32, (w + h) * 16)
    // furrows: dark lines between the rows
    if (furrows > 0) {
      const count = Math.round((alongU ? h : w) * furrows)
      g.fillStyle = `rgba(${colour.map((c) => Math.round(c * furrow * 0.72)).join(', ')}, 0.8)`
      for (let k = 0; k <= count; k++) {
        const t = (k / count) * (alongU ? h : w)
        const [a, b] = alongU ? [px(0, t), px(w, t)] : [px(t, 0), px(t, h)]
        g.beginPath()
        g.moveTo(a[0], a[1] - 0.7)
        g.lineTo(b[0], b[1] - 0.7)
        g.lineTo(b[0], b[1] + 0.7)
        g.lineTo(a[0], a[1] + 0.7)
        g.closePath()
        g.fill()
      }
    }
    patches(g, scene, ['rgba(40, 30, 20, 0.1)', 'rgba(255, 236, 190, 0.08)', 'rgba(96, 110, 60, 0.1)'])
    // clods, stones, patches: no two hand's breadths of earth are the same
    for (let i = 0; i < w * h * 900; i++) {
      const u = hash2(i, 1, seed) * w
      const v = hash2(i, 2, seed) * h
      const [x, y] = px(u, v)
      const tone = 0.82 + 0.36 * hash2(i, 3, seed)
      dab(g, x, y, 0.5 + 0.9 * hash2(i, 4, seed), colour[0] * tone, colour[1] * tone, colour[2] * tone, 0.5)
    }
  })
}

/** What the farmhouse of one farm is like. */
interface Stead {
  wall: Mat
  roof: Mat
  tint?: string
  /** A barn with a wide door instead of a house. */
  barn?: boolean
  /** A shed leans on its right wall. */
  shed?: boolean
  /** A chimney on the roof. */
  hearth?: boolean
  /** A loft door in the gable: hay or leaves are kept under the roof. */
  loft?: boolean
}

/** The farmhouse in the back corner: every other farm of a kind turns its gable the other way. */
function farmhouse(scene: Scene, s: Stead): void {
  const turned = scene.seed % 2 === 1
  const timber = s.wall === 'plaster'
  const long = { storeys: 1, storey: 16, windows: s.barn ? 0 : 2, door: s.barn ? 0.5 : 0.32, doorStyle: s.barn ? ('barn' as const) : ('house' as const), timber, pane: [3.6, 5] as [number, number] }
  const short = { storeys: 1, storey: 16, windows: s.barn ? 0 : 1, timber, pane: [3.6, 5] as [number, number] }
  const b: Body = { at: turned ? [0.22, 0.2, 0.8, 0.82] : [0.2, 0.24, 0.84, 0.78], wall: s.wall, tint: s.tint, sw: long, se: short, roof: s.roof, rise: s.barn ? 13 : 11, shape: turned ? 'v' : 'u', over: 0.07, loft: s.loft }
  const main = body(scene, b)
  if (s.hearth) stack(scene, main, main.top[0] + 0.2, (main.top[1] + main.top[3]) / 2, 4, s.wall === 'plaster' ? 'brick' : 'stone')
  if (s.shed) shed(scene, 'se', b.at[1] + 0.1, b.at[3] - 0.08, b.at[2], 0.13, 7.4, { mat: s.wall === 'stone' ? 'stone' : 'boards', tint: s.wall === 'stone' ? undefined : s.tint }, s.roof)
}

interface Crop {
  soil: Rgb
  /** Rows per tile, and plants per tile along a row. */
  rows: number
  spacing: number
  alongU: boolean
  /** Height of a plant in world pixels: for its shadow and for what hides what. */
  high: number
  /** Paints one plant standing at (x, y). `pick` gives numbers from 0 to 1 that belong to this plant. */
  plant: (g: Ctx, x: number, y: number, pick: (n: number) => number) => void
}

/** Rows of plants on the plot, outside the yard. Every stretch of a row is one thing, so a house hides the rows behind it. */
function rows(scene: Scene, crop: Crop): void {
  const { w, h, seed } = scene
  const across = crop.alongU ? h : w
  const along = crop.alongU ? w : h
  const count = Math.round(across * crop.rows)
  for (let r = 0; r < count; r++) {
    const offset = ((r + 0.5) / count) * across
    // a row that would run through the yard starts behind it
    const from = offset < YARD ? YARD + 0.04 : 0.06
    const n = Math.max(0, Math.round((along - 0.06 - from) * crop.spacing))
    if (n === 0) continue
    const place = (i: number): [number, number] => {
      const t = from + ((i + 0.5) / n) * (along - 0.06 - from)
      return crop.alongU ? [t, offset] : [offset, t]
    }
    const [ua, va] = place(0)
    const [ub, vb] = place(n - 1)
    const pts: P3[] = [[ua, va, 0], [ub, vb, 0], [ua, va, crop.high], [ub, vb, crop.high]]
    scene.item(pts, (g) => {
      // from the back of the row to its front
      for (let i = 0; i < n; i++) {
        const [u, v] = place(i)
        const id = r * 97 + i
        if (hash2(id, 9, seed) < 0.06) continue // a gap: one did not come up
        const [x, y] = px(u + (hash2(id, 7, seed) - 0.5) * 0.03, v + (hash2(id, 8, seed) - 0.5) * 0.03)
        dab(g, x + 1.1, y + 0.4, 1.4, 20, 26, 44, 0.24)
        crop.plant(g, x, y, (k) => hash2(id, 20 + k, seed))
      }
    }, crop.high > 7)
  }
}

/** A small heap of leaves: `n` dabs of a green, lighter towards the top left. */
function leaves(g: Ctx, x: number, y: number, pick: (n: number) => number, n: number, spread: number, high: number, colour: Rgb): void {
  for (let k = 0; k < n; k++) {
    const dx = (pick(k * 2) - 0.5) * 2 * spread
    const up = pick(k * 2 + 1) * high
    const light = 0.68 + 0.3 * (up / Math.max(1, high)) + (dx < 0 ? 0.1 : -0.08)
    dab(g, x + dx, y - up, 0.55 + spread * 0.22, colour[0] * light, colour[1] * light, colour[2] * light, 0.95)
  }
}

const CROPS: Record<string, Crop> = {
  potato_farm: { soil: [118, 88, 60], rows: 5, spacing: 7, alongU: true, high: 3, plant: (g, x, y, pick) => leaves(g, x, y, pick, 7, 1.7, 2.4, [72, 122, 58]) },
  cotton_plantation: {
    soil: [150, 118, 82], rows: 4, spacing: 5.5, alongU: false, high: 5,
    plant: (g, x, y, pick) => {
      leaves(g, x, y, pick, 8, 1.9, 3.6, [70, 108, 56])
      for (let k = 0; k < 4; k++) dab(g, x + (pick(30 + k) - 0.5) * 3.6, y - 1.4 - pick(40 + k) * 3, 0.75, 244, 242, 234)
    },
  },
  tobacco_plantation: { soil: [104, 80, 56], rows: 4, spacing: 5, alongU: true, high: 5, plant: (g, x, y, pick) => leaves(g, x, y, pick, 6, 2.3, 3.4, [60, 104, 52]) },
  indigo_farm: { soil: [86, 74, 66], rows: 5, spacing: 7, alongU: false, high: 3, plant: (g, x, y, pick) => leaves(g, x, y, pick, 7, 1.6, 2.6, [58, 96, 112]) },
  sugar_plantation: {
    soil: [128, 100, 66], rows: 4.5, spacing: 7, alongU: true, high: 10,
    plant: (g, x, y, pick) => {
      // cane: a bundle of thin stalks with leaves that hang over at the top
      for (let k = 0; k < 4; k++) {
        const dx = (pick(k) - 0.5) * 2.4
        const high = 7 + pick(k + 5) * 3.5
        g.fillStyle = k % 2 ? 'rgb(150, 164, 84)' : 'rgb(120, 142, 70)'
        g.fillRect(x + dx - 0.3, y - high, 0.6, high)
        dab(g, x + dx + (pick(k + 9) - 0.5) * 2, y - high, 0.9, 96, 150, 66, 0.95)
        dab(g, x + dx - 1, y - high + 0.8, 0.7, 122, 170, 78, 0.95)
      }
    },
  },
  hops_farm: {
    soil: [112, 92, 64], rows: 3, spacing: 4, alongU: true, high: 15,
    plant: (g, x, y, pick) => {
      // a pole with the vine wound around it
      g.fillStyle = 'rgb(128, 102, 72)'
      g.fillRect(x - 0.35, y - 15, 0.7, 15)
      for (let k = 0; k < 16; k++) {
        const up = 1 + (k / 16) * 13
        const side = Math.sin(k * 1.9) * 1.3
        const light = 0.74 + 0.3 * (up / 14) + (side < 0 ? 0.08 : -0.08) + (pick(k) - 0.5) * 0.16
        dab(g, x + side, y - up, 0.95, 78 * light, 128 * light, 56 * light, 0.95)
      }
    },
  },
  vineyard: {
    soil: [138, 112, 78], rows: 3.2, spacing: 6, alongU: false, high: 7,
    plant: (g, x, y, pick) => {
      g.fillStyle = 'rgb(118, 92, 64)'
      g.fillRect(x - 0.3, y - 6.4, 0.6, 6.4)
      leaves(g, x, y - 2.4, pick, 9, 2.6, 4, [84, 128, 54])
      for (let k = 0; k < 2; k++) dab(g, x + (pick(50 + k) - 0.5) * 3, y - 2.2 - pick(60 + k) * 1.6, 0.7, 92, 56, 110)
    },
  },
  spice_plantation: {
    soil: [156, 124, 84], rows: 3.4, spacing: 4.6, alongU: true, high: 6,
    plant: (g, x, y, pick) => {
      const kind = pick(70)
      leaves(g, x, y, pick, 8, 2, 4.4, kind < 0.5 ? [64, 116, 60] : [88, 122, 50])
      const [r, green, b] = kind < 0.33 ? [196, 60, 44] : kind < 0.66 ? [224, 176, 56] : [150, 86, 44]
      for (let k = 0; k < 3; k++) dab(g, x + (pick(30 + k) - 0.5) * 3.4, y - 1 - pick(40 + k) * 3.6, 0.6, r, green, b)
    },
  },
  silk_plantation: { soil: [124, 116, 76], rows: 2.6, spacing: 3.2, alongU: false, high: 8, plant: (g, x, y, pick) => leaves(g, x, y - 1.5, pick, 16, 3.2, 5.4, [70, 118, 60]) },
}

/** A field of grain: it stands as high as a knee, so its front edges show the stalks, and paths part it into plots. */
function grain(scene: Scene): void {
  const { w, h, seed } = scene
  const high = 3.2
  scene.ground([[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0], [0, 0, high]], (g) => {
    const outline = plotOutline(scene, 0.01)
    // the stalks at the front, in the shade of the ears
    tracePoly(g, outline)
    g.fillStyle = 'rgb(150, 116, 52)'
    g.fill()
    g.translate(0, -high)
    tracePoly(g, outline)
    g.clip()
    g.fillStyle = 'rgb(202, 166, 84)'
    g.fillRect(-h * 32, 0, (w + h) * 32, (w + h) * 16 + high)
    // ears: thousands of short strokes, combed by the wind in waves
    for (let i = 0; i < w * h * 2600; i++) {
      const u = hash2(i, 1, seed) * w
      const v = hash2(i, 2, seed) * h
      const [x, y] = px(u, v)
      const wave = 0.5 + 0.5 * Math.sin(u * 5.3 + v * 3.1 + hash2(i, 5, seed))
      const tone = 0.8 + 0.26 * hash2(i, 3, seed) + 0.12 * wave
      dab(g, x, y, 0.45 + 0.5 * hash2(i, 4, seed), 210 * tone, 174 * tone, 90 * tone, 0.7)
    }
    // not all of it ripens at once: greener where it stood wet, pale where the ground is poor
    patches(g, scene, ['rgba(150, 156, 70, 0.16)', 'rgba(236, 212, 140, 0.14)', 'rgba(120, 92, 40, 0.1)'])
    // the paths between the plots: trodden straw, a little lower
    g.fillStyle = 'rgba(126, 96, 46, 0.6)'
    for (const [a, b] of [[px(w * 0.52, 0), px(w * 0.52, h)], [px(0, h * 0.55), px(w, h * 0.55)]]) {
      g.beginPath()
      g.moveTo(a[0], a[1] - 1.1)
      g.lineTo(b[0], b[1] - 1.1)
      g.lineTo(b[0], b[1] + 1.1)
      g.lineTo(a[0], a[1] + 1.1)
      g.closePath()
      g.fill()
    }
  })
  farmhouse(scene, { wall: 'plaster', roof: 'tile', tint: 'rgb(250, 240, 220)', hearth: true, shed: seed % 2 === 0 })
  haystack(scene, 1.4, 0.44, 0.13)
  haystack(scene, 0.44, 1.5, 0.12)
  if (seed % 2 === 0) haystack(scene, 1.64, 1.56, 0.11)
  else cart(scene, 1.5, 1.44, 'rgb(214, 180, 96)')
  well(scene, 1.1, 0.9)
  scarecrow(scene, seed % 2 === 0 ? 1.1 : 0.7, 1.56)
  sack(scene, 1.0, 0.5)
}

/** A meadow with a fence around it, a barn and animals. */
function pasture(scene: Scene, kind: 'sheep' | 'cow'): void {
  const { w, h, seed } = scene
  // a pasture is the meadow of the island itself with a fence around it: no ground of its own is laid, only what
  // the animals make of it - grass cropped short and richer in patches, bare earth where they stand and drink
  scene.ground([[0, 0, 0], [w, h, 0]], (g) => {
    tracePoly(g, plotOutline(scene))
    g.clip()
    patches(g, scene, ['rgba(92, 128, 60, 0.26)', 'rgba(120, 144, 74, 0.2)', 'rgba(84, 112, 58, 0.2)'])
    for (let i = 0; i < w * h * 420; i++) {
      const [x, y] = px(hash2(i, 11, seed) * w, hash2(i, 12, seed) * h)
      const tone = 0.8 + 0.4 * hash2(i, 13, seed)
      dab(g, x, y, 0.5 + 0.5 * hash2(i, 14, seed), 100 * tone, 134 * tone, 64 * tone, 0.4)
    }
    for (const [u, v, r] of [[1.14, 0.5, 0.2], [0.9, 1.0, 0.16], [0.4 + hash2(1, 15, seed), 1.5, 0.14]]) {
      for (let i = 0; i < 60; i++) {
        const turn = hash2(i, 16, seed + u * 9) * Math.PI * 2
        const far = Math.sqrt(hash2(i, 17, seed + u * 9)) * r
        const [x, y] = px(u + Math.cos(turn) * far, v + Math.sin(turn) * far)
        dab(g, x, y, 0.9 + hash2(i, 18, seed), 150, 122, 84, 0.3)
      }
    }
  })
  farmhouse(scene, { wall: 'boards', roof: kind === 'sheep' ? 'shingle' : 'thatch', tint: kind === 'sheep' ? 'rgb(214, 120, 96)' : 'rgb(226, 200, 160)', barn: true, loft: true, shed: kind === 'cow' })
  if (kind === 'cow') haystack(scene, 1.5, 0.4, 0.12)
  else rack(scene, 1.3, 0.3, 1.7, 0.3, 6, ['rgb(236, 232, 220)', 'rgb(226, 220, 204)'])
  const m = 0.06
  fence(scene, m, m, w - m, m)
  fence(scene, m, m, m, h - m)
  fence(scene, w - m, m, w - m, h - m)
  fence(scene, m, h - m, w - m, h - m)
  for (let i = 0; i < (kind === 'sheep' ? 6 : 4); i++) {
    // somewhere on the meadow, not in the yard
    let u = 0.2 + hash2(i, 21, seed) * (w - 0.4)
    const v = 0.2 + hash2(i, 22, seed) * (h - 0.4)
    if (u < YARD + 0.1 && v < YARD + 0.1) u += YARD
    animal(scene, Math.min(w - 0.2, u), v, kind, hash2(i, 23, seed) < 0.5)
  }
  vat(scene, 1.14, 0.42, 0.09, 2.6, 'rgb(120, 160, 190)')
}

/** Builds the field or pasture of a farm. Returns false for a building that is no farm. */
export function farm(scene: Scene, id: string): boolean {
  if (id === 'grain_farm') grain(scene)
  else if (id === 'sheep_farm') pasture(scene, 'sheep')
  else if (id === 'cattle_farm') pasture(scene, 'cow')
  else {
    const crop = CROPS[id]
    if (!crop) return false
    // the farmer turns every other field of a kind the other way
    const turned = scene.seed % 2 === 1
    const laid: Crop = { ...crop, alongU: turned ? !crop.alongU : crop.alongU }
    soil(scene, crop.soil, crop.rows, laid.alongU)
    rows(scene, laid)
    const style: Record<string, Stead> = {
      potato_farm: { wall: 'boards', roof: 'thatch', tint: 'rgb(232, 210, 170)', shed: true },
      cotton_plantation: { wall: 'plaster', roof: 'tile', tint: 'rgb(240, 236, 222)', hearth: true },
      tobacco_plantation: { wall: 'boards', roof: 'shingle', tint: 'rgb(222, 190, 150)', barn: true, loft: true },
      indigo_farm: { wall: 'plaster', roof: 'slate', tint: 'rgb(226, 230, 240)', shed: true },
      sugar_plantation: { wall: 'planks', roof: 'thatch', loft: true },
      hops_farm: { wall: 'plaster', roof: 'tile', tint: 'rgb(246, 232, 200)', hearth: true, shed: true },
      vineyard: { wall: 'stone', roof: 'tile', shed: true, hearth: true },
      spice_plantation: { wall: 'plaster', roof: 'thatch', tint: 'rgb(250, 236, 206)' },
      silk_plantation: { wall: 'plaster', roof: 'slate', tint: 'rgb(244, 238, 226)', hearth: true },
    }
    farmhouse(scene, style[id])
    // something stands in every field: a scarecrow among low plants, a cart where the crop is carried off
    if (crop.high < 6) scarecrow(scene, turned ? 0.56 : 1.52, turned ? 1.5 : 0.62)
    else if (id !== 'hops_farm') cart(scene, 0.52, 0.93, id === 'sugar_plantation' ? 'rgb(150, 164, 84)' : undefined)
    // what the farm has to show at its door
    if (id === 'vineyard') barrel(scene, 1.0, 0.5)
    if (id === 'vineyard' || id === 'hops_farm') barrel(scene, 0.98, 0.68, 0.9)
    if (id === 'cotton_plantation' || id === 'potato_farm' || id === 'spice_plantation') sack(scene, 0.98, 0.56)
    if (id === 'spice_plantation') sack(scene, 0.96, 0.74, [176, 96, 60])
    if (id === 'silk_plantation') rack(scene, 0.98, 0.3, 0.98, 0.8, 6.5, ['rgb(244, 240, 228)', 'rgb(238, 232, 214)', 'rgb(246, 244, 236)'])
    if (id === 'tobacco_plantation') rack(scene, 0.98, 0.3, 0.98, 0.8, 6.5, ['rgb(146, 112, 60)', 'rgb(128, 100, 52)', 'rgb(156, 124, 66)'])
    if (id === 'indigo_farm') vat(scene, 1.0, 0.56, 0.1, 3.4, 'rgb(64, 84, 150)')
    if (id === 'sugar_plantation') bush(scene, 0.12, 0.9, 3)
  }
  fray(scene)
  return true
}
