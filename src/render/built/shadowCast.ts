// The shadow a building throws: every solid it is made of is seen from the sun, and where its corners land on the
// ground is its shadow. All of them together, blurred, with a darker seam where a solid stands on the ground.
import { LIGHT } from './light'

export type P2 = [number, number]
export type P3 = [number, number, number]

const HW = 32
const HH = 16

/** What a solid must tell for its shadow. */
export interface Solid {
  /** Its corners: for the size of the picture and for its shadow. */
  pts: P3[]
  /** The height it stands on. */
  z0: number
  shadow: boolean
}

/** How dark a shadow is where it is deepest, and the seam at the foot of a wall. */
const DEPTH = 0.42
const CONTACT = 0.4

/** Convex hull of points (monotone chain). */
export function hull(points: P2[]): P2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const cross = (o: P2, a: P2, b: P2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: P2[]): P2[] => {
    const out: P2[] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half(sorted.reverse())]
}

/** The shadow of all solids on the ground, one pixel per world pixel: where their corners land, seen from the sun. */
export function castShadow(items: Solid[]): { canvas: HTMLCanvasElement; left: number; top: number } | null {
  const land = (p: P3): P2 => [(p[0] - p[1]) * HW + LIGHT.x * p[2], (p[0] + p[1]) * HH + LIGHT.y * p[2]]
  const solids = items.filter((item) => item.shadow)
  const casts = solids.map((item) => hull(item.pts.map(land)))
  // where a solid stands on the ground: its foot, for the dark seam around it
  const feet = solids.filter((item) => item.z0 < 0.5).map((item) => hull(item.pts.filter((p) => p[2] < item.z0 + 0.01).map(land)))
  const points = casts.flat()
  if (points.length === 0) return null
  const pad = 7
  const left = Math.floor(Math.min(...points.map((p) => p[0]))) - pad
  const top = Math.floor(Math.min(...points.map((p) => p[1]))) - pad
  const w = Math.ceil(Math.max(...points.map((p) => p[0]))) - left + pad
  const h = Math.ceil(Math.max(...points.map((p) => p[1]))) - top + pad
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  const mask = (polys: P2[][], grow: number): Float32Array => {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, w, h)
    g.translate(-left, -top)
    g.fillStyle = g.strokeStyle = '#fff'
    g.lineJoin = 'round'
    g.lineWidth = grow
    for (const poly of polys) {
      if (poly.length < 3) continue
      g.beginPath()
      poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.closePath()
      g.fill()
      if (grow > 0) g.stroke()
    }
    const data = g.getImageData(0, 0, w, h).data
    const out = new Float32Array(w * h)
    for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] / 255
    return out
  }
  const cast = soften(soften(mask(casts, 0), w, h, 2), w, h, 2)
  const contact = soften(mask(feet, 3), w, h, 2)
  const pixels = g.createImageData(w, h)
  for (let i = 0; i < cast.length; i++) {
    pixels.data[i * 4] = 20
    pixels.data[i * 4 + 1] = 28
    pixels.data[i * 4 + 2] = 58
    pixels.data[i * 4 + 3] = 255 * (1 - (1 - cast[i] * DEPTH) * (1 - contact[i] * CONTACT))
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.putImageData(pixels, 0, 0)
  return { canvas, left, top }
}

/** Blurs a map: every cell becomes the mean of the cells up to `radius` away. */
function soften(map: Float32Array, width: number, height: number, radius: number): Float32Array {
  const line = new Float32Array(Math.max(width, height))
  const pass = (count: number, length: number, at: (index: number, k: number) => number): void => {
    for (let index = 0; index < count; index++) {
      for (let k = 0; k < length; k++) line[k] = map[at(index, k)]
      for (let k = 0; k < length; k++) {
        let sum = 0
        let n = 0
        for (let d = -radius; d <= radius; d++) {
          if (k + d < 0 || k + d >= length) continue
          sum += line[k + d]
          n++
        }
        map[at(index, k)] = sum / n
      }
    }
  }
  pass(height, width, (y, x) => y * width + x)
  pass(width, height, (x, y) => y * width + x)
  return map
}
