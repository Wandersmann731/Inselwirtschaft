// The wear of years, laid over walls and roofs so that no two faces look alike and nothing looks new: rain has run
// down the plaster and left streaks, damp has darkened it in blotches, moss and lichen sit on the roofs and at the
// foot of the walls. Two pictures that repeat without a seam do it all; every face shows another part of them.
import { hash2 } from '../../world/noise2d'
import type { Mat } from './materials'

type Ctx = CanvasRenderingContext2D

const SIZE = 256
/** Texels per world pixel: the pictures repeat every 128 world pixels, wider than any wall. */
const TEXELS = 2

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** Smooth noise from 0 to 1 that repeats over the picture; a noise cell is `cx` by `cy` texels. */
function noise(x: number, y: number, cx: number, cy: number, seed: number): number {
  const px = SIZE / cx
  const py = SIZE / cy
  const fx = x / cx
  const fy = y / cy
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = smooth(fx - x0)
  const ty = smooth(fy - y0)
  const at = (ix: number, iy: number): number => hash2(((ix % px) + px) % px, ((iy % py) + py) % py, seed)
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
}

/** How much darker dirt makes a place (1 is clean): slow blotches, finer ones, and streaks that run down. Pure. */
export function stainAt(x: number, y: number): number {
  const blotch = noise(x, y, 64, 64, 401)
  const patch = noise(x, y, 16, 16, 402)
  const run = Math.max(0, noise(x, y, 4, 64, 403) - 0.52) * Math.max(0, noise(x, y, 32, 128, 404) - 0.25)
  // never so dark that a wall looks burnt
  return Math.max(0.55, 1 - 0.24 * smooth((blotch - 0.35) / 0.5) - 0.14 * patch * patch - 1.1 * run)
}

/** How thick moss or lichen lies at a place (0 none, 1 covered), and whether it is lichen (pale) or moss. Pure. */
export function mossAt(x: number, y: number): { cover: number; lichen: number } {
  // small cushions that keep to the damp places: a few here, none there
  const lie = noise(x, y, 16, 16, 411) * 0.5 + noise(x, y, 4, 4, 412) * 0.5
  const damp = smooth((noise(x, y, 64, 64, 415) - 0.4) / 0.3)
  const cover = smooth((lie - 0.6) / 0.08) * damp * (0.5 + 0.5 * hash2(x, y, 413))
  return { cover, lichen: noise(x, y, 16, 16, 414) }
}

let stains: CanvasPattern | null | undefined
let moss: CanvasPattern | null | undefined

function make(texel: (x: number, y: number) => [number, number, number, number]): CanvasPattern | null {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const g = canvas.getContext('2d')
  if (!g) return null
  const image = g.createImageData(SIZE, SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) image.data.set(texel(x, y), (y * SIZE + x) * 4)
  }
  g.putImageData(image, 0, 0)
  const pattern = g.createPattern(canvas, 'repeat')
  pattern?.setTransform(new DOMMatrix().scale(1 / TEXELS))
  return pattern
}

function patterns(): { stains: CanvasPattern | null; moss: CanvasPattern | null } {
  if (stains === undefined) {
    // dirt is a little warm: it takes more of the blue than of the red
    stains = make((x, y) => {
      const s = stainAt(x, y)
      return [255 * s, 255 * (s * 0.99), 255 * (s * 0.95 + 0.02), 255]
    })
    moss = make((x, y) => {
      const m = mossAt(x, y)
      const k = m.lichen > 0.62 ? 1 : 0
      return [92 + 58 * k, 102 + 42 * k, 62 + 46 * k, 255 * m.cover]
    })
  }
  return { stains: stains ?? null, moss: moss ?? null }
}

/** How much a material shows its age: polished stone and cloth stay clean, a copper roof grows no moss. */
const AGE: Partial<Record<Mat, number>> = { marble: 0.45, cloth: 0.3, verdigris: 0.5, deck: 0.6, flags: 0.6, timber: 0.6 }

/**
 * Lays the wear over the face that is being painted: `w` by `h` world pixels from its top left. A wall gets stains
 * and, if it stands on the ground, green at its foot; a roof gets stains and moss that grows towards the eave.
 */
export function wear(g: Ctx, w: number, h: number, kind: 'wall' | 'roof', mat: Mat, seed: number, onGround: boolean): void {
  const age = AGE[mat] ?? 1
  const made = patterns()
  if (!made.stains || !made.moss || age <= 0) return
  const ox = Math.floor(hash2(seed, 1, 421) * 128)
  const oy = Math.floor(hash2(seed, 2, 422) * 128)
  g.save()
  g.translate(-ox, -oy)
  g.globalCompositeOperation = 'multiply'
  // on a roof the rain washes most of it away again
  g.globalAlpha = kind === 'roof' ? 0.6 * age : age
  g.fillStyle = made.stains
  g.fillRect(ox - 1, oy - 1, w + 2, h + 2)
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = made.moss
  if (kind === 'roof' && mat !== 'verdigris' && mat !== 'cloth') {
    g.globalAlpha = 0.3 * age
    g.fillRect(ox - 1, oy - 1, w + 2, h + 2)
    g.globalAlpha = 0.5 * age
    g.fillRect(ox - 1, oy + h * 0.58, w + 2, h * 0.42 + 2)
  } else if (kind === 'wall' && onGround && h > 8) {
    // rain splashes earth up the foot of a wall
    const splash = g.createLinearGradient(0, oy + h - 5, 0, oy + h)
    splash.addColorStop(0, 'rgba(96, 78, 56, 0)')
    splash.addColorStop(1, 'rgba(96, 78, 56, 0.34)')
    g.globalAlpha = age
    g.fillStyle = splash
    g.fillRect(ox - 1, oy + h - 5, w + 2, 5.2)
    g.fillStyle = made.moss
    g.globalAlpha = 0.5 * age
    g.fillRect(ox - 1, oy + h - 3.2, w + 2, 3.4)
    g.globalAlpha = 0.28 * age
    g.fillRect(ox - 1, oy + h - 6, w + 2, 2.8)
  }
  g.restore()
}
