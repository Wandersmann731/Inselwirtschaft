// The small things that stand around a building and tell what is done there: barrels, crates, sacks, piles of wood
// and stone, fences, racks with cloth or hides, vats, animals, bushes. All made from the solids of the kit or
// painted in small dabs of colour, lit from the top left, without outlines.
import { hash2 } from '../../world/noise2d'
import { HH, HW, px, trace, type Ctx, type P2, type P3, type Scene } from './kit'
import { cone, cylinder } from './round'
import type { Mat } from './materials'

const DUSK = '16, 20, 44'

/** A soft round spot of colour. */
export function dab(g: Ctx, x: number, y: number, radius: number, r: number, green: number, b: number, alpha = 1): void {
  g.fillStyle = `rgba(${Math.round(r)}, ${Math.round(green)}, ${Math.round(b)}, ${alpha})`
  g.beginPath()
  g.arc(x, y, radius, 0, Math.PI * 2)
  g.fill()
}

/** Fills a shape between places on screen with one colour. */
export function fill(g: Ctx, poly: P2[], colour: string): void {
  g.fillStyle = colour
  trace(g, poly)
  g.fill()
}

/** A bar between two places on screen, `thick` world pixels wide: a pole, a beam, a rope. */
export function bar(g: Ctx, a: P2, b: P2, thick: number, colour: string): void {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const nx = (-(b[1] - a[1]) / d) * (thick / 2)
  const ny = ((b[0] - a[0]) / d) * (thick / 2)
  fill(g, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], colour)
}

export function barrel(scene: Scene, u: number, v: number, size = 1): void {
  const hoops = (g: Ctx, w: number, h: number): void => {
    g.fillStyle = 'rgba(52, 46, 44, 0.75)'
    for (const share of [0.16, 0.5, 0.84]) g.fillRect(0, h * share - 0.35, w, 0.7)
  }
  cylinder(scene, u, v, 0.062 * size, 0, 6.6 * size, { mat: 'boards', tint: 'rgb(232, 196, 150)', detail: hoops }, { mat: 'planks', tint: 'rgb(214, 186, 150)' }, 0.9)
}

export function crate(scene: Scene, u: number, v: number, size = 0.15, high = 5.4): void {
  const slats = (g: Ctx, w: number, h: number): void => {
    g.fillStyle = `rgba(${DUSK}, 0.22)`
    g.fillRect(0, 0, w, 0.5)
    g.fillRect(0, h - 0.5, w, 0.5)
    g.fillRect(0, 0, 0.5, h)
    g.fillRect(w - 0.5, 0, 0.5, h)
  }
  const side = { mat: 'planks' as Mat, tint: 'rgb(236, 208, 164)', detail: slats }
  scene.box(u - size / 2, v - size / 2, u + size / 2, v + size / 2, 0, high, side, side, { mat: 'planks', tint: 'rgb(246, 222, 180)' })
}

/** A block of stone or anything else that is square. */
export function block(scene: Scene, u: number, v: number, w: number, d: number, high: number, mat: Mat, tint?: string, z = 0): void {
  scene.box(u - w / 2, v - d / 2, u + w / 2, v + d / 2, z, z + high, { mat, tint }, { mat, tint }, { mat, tint })
}

/** A heap of something loose: ore, coal, salt, sand. */
export function heap(scene: Scene, u: number, v: number, r: number, high: number, tint: string): void {
  cone(scene, u, v, r, 0, high, { mat: 'rock', tint })
}

/** A stack of split logs along u (or along v), with the cut ends showing. */
export function woodpile(scene: Scene, u: number, v: number, long: number, alongU = true, high = 6): void {
  const ends = (g: Ctx, w: number, h: number): void => {
    for (let y = 1.1; y < h; y += 2.1) {
      for (let x = 1.1 + (Math.floor(y) % 2); x < w; x += 2.2) {
        const tone = 0.8 + 0.4 * hash2(Math.floor(x * 3), Math.floor(y * 3), scene.seed)
        dab(g, x, y, 0.95, 206 * tone, 170 * tone, 118 * tone)
        dab(g, x, y, 0.35, 150 * tone, 112 * tone, 74 * tone)
      }
    }
  }
  const deep = 0.1
  const [w, d] = alongU ? [long, deep] : [deep, long]
  const side = { mat: 'logs' as Mat }
  const end = { mat: 'timber' as Mat, detail: ends }
  scene.box(u - w / 2, v - d / 2, u + w / 2, v + d / 2, 0, high, alongU ? side : end, alongU ? end : side, 'logs')
}

/** A stack of hay or straw: round, with a pointed top. */
export function haystack(scene: Scene, u: number, v: number, r = 0.15): void {
  cylinder(scene, u, v, r, 0, r * 22, 'thatch', null, 0.94)
  cone(scene, u, v, r * 0.97, r * 22, r * 46, 'thatch')
}

/** Paints something soft and round that stands on the ground: a sack, a sheep, a bush, a boulder. */
function blob(scene: Scene, u: number, v: number, rx: number, high: number, colour: [number, number, number], draw?: (g: Ctx, x: number, y: number) => void): void {
  const r = rx / (HW * Math.SQRT2)
  const pts: P3[] = [[u - r, v - r, 0], [u + r, v - r, 0], [u + r, v + r, 0], [u - r, v + r, 0], [u, v, high]]
  scene.item(pts, (g) => {
    const [x, y] = px(u, v)
    const [r0, g0, b0] = colour
    g.save()
    g.beginPath()
    g.ellipse(x, y - high / 2, rx, high / 2 + rx * 0.25, 0, 0, Math.PI * 2)
    g.clip()
    g.fillStyle = `rgb(${r0}, ${g0}, ${b0})`
    g.fillRect(x - rx, y - high - rx, 2 * rx, high + 2 * rx)
    const shade = g.createLinearGradient(x - rx, y - high, x + rx, y)
    shade.addColorStop(0, 'rgba(255, 240, 210, 0.3)')
    shade.addColorStop(0.45, 'rgba(255, 240, 210, 0)')
    shade.addColorStop(1, `rgba(${DUSK}, 0.5)`)
    g.fillStyle = shade
    g.fillRect(x - rx, y - high - rx, 2 * rx, high + 2 * rx)
    g.restore()
    draw?.(g, x, y)
  })
}

export function sack(scene: Scene, u: number, v: number, tint: [number, number, number] = [196, 172, 126]): void {
  blob(scene, u, v, 2.6, 4.6, tint, (g, x, y) => dab(g, x, y - 4.9, 0.8, tint[0] * 0.8, tint[1] * 0.8, tint[2] * 0.8))
}

export function boulder(scene: Scene, u: number, v: number, size = 1, tint: [number, number, number] = [142, 136, 126]): void {
  blob(scene, u, v, 3.4 * size, 3.6 * size, tint)
}

/** A sheep, or with other colours a cow, a pig: a body, a head, legs lost in the grass. */
export function animal(scene: Scene, u: number, v: number, kind: 'sheep' | 'cow', faceLeft: boolean): void {
  const body: [number, number, number] = kind === 'sheep' ? [236, 232, 220] : hash2(Math.round(u * 50), Math.round(v * 50), scene.seed) < 0.5 ? [146, 96, 62] : [226, 218, 204]
  const size = kind === 'sheep' ? 1 : 1.5
  blob(scene, u, v, 3 * size, 3.6 * size, body, (g, x, y) => {
    const hx = x + (faceLeft ? -3.1 : 3.1) * size
    if (kind === 'sheep') dab(g, hx, y - 3.1 * size, 1.15 * size, 60, 52, 48)
    else {
      dab(g, hx, y - 3.2 * size, 1.3 * size, body[0] * 0.92, body[1] * 0.92, body[2] * 0.92)
      dab(g, x - 0.6 * size, y - 3.4 * size, 1.5 * size, 112, 74, 50, 0.85)
    }
    g.fillStyle = 'rgba(52, 44, 40, 0.9)'
    for (const dx of [-1.6, 1.3]) g.fillRect(x + dx * size, y - 0.6, 0.6 * size, 1.5 * size)
  })
}

/** Leaves in a heap: a bush, the crown of a small tree (on a trunk if `trunk` is given). */
export function bush(scene: Scene, u: number, v: number, radius = 4, trunk = 0, colour: [number, number, number] = [74, 114, 54]): void {
  const r = radius / (HW * Math.SQRT2)
  const pts: P3[] = [[u - r, v - r, 0], [u + r, v - r, 0], [u + r, v + r, 0], [u - r, v + r, 0], [u, v, trunk + radius * 1.7]]
  scene.item(pts, (g) => {
    const [x, y] = px(u, v)
    if (trunk > 0) {
      g.fillStyle = 'rgb(92, 68, 48)'
      g.fillRect(x - 0.7, y - trunk - 1, 1.4, trunk + 1)
      g.fillStyle = 'rgba(255, 232, 196, 0.25)'
      g.fillRect(x - 0.7, y - trunk - 1, 0.5, trunk + 1)
    }
    const seed = scene.seed + Math.round(u * 97 + v * 61)
    const leaves: [number, number, number][] = []
    for (let i = 0; i < radius * 46; i++) {
      // a place on a ball, more of them on its upper half
      const turn = hash2(i, 1, seed) * Math.PI * 2
      const up = -0.3 + 1.3 * hash2(i, 2, seed)
      const flat = Math.sqrt(Math.max(0, 1 - Math.min(1, up) ** 2)) * (0.8 + 0.25 * hash2(i, 3, seed))
      // a bush is no ball: it is three or four lumps of leaves grown into each other, each of its own size
      const lump = i % 4
      const size = 0.5 + 0.28 * hash2(lump, 7, seed)
      const lx = Math.cos(turn) * flat * size + (hash2(lump, 5, seed) - 0.5) * 0.9
      const ld = Math.sin(turn) * flat * size + (hash2(lump, 6, seed) - 0.5) * 0.5
      leaves.push([x + lx * radius, y - trunk - radius * 0.8 * (1 + up) + ld * radius * 0.4, 0.5 + 0.3 * Math.max(0, up) - 0.22 * lx + (hash2(i, 4, seed) - 0.5) * 0.24])
    }
    leaves.sort((a, b) => a[1] - b[1])
    for (const [lx, ly, light] of leaves.reverse()) dab(g, lx, ly, 0.55 + 0.04 * radius, colour[0] * light * 1.5, colour[1] * light * 1.5, colour[2] * light * 1.4, 0.95)
  })
}

/** A wooden fence from one place to another: posts with two rails. Throws no shadow of its own worth drawing. */
export function fence(scene: Scene, u0: number, v0: number, u1: number, v1: number, high = 5): void {
  const pts: P3[] = [[u0, v0, 0], [u1, v1, 0], [u0, v0, high], [u1, v1, high]]
  const posts = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.16))
  scene.item(pts, (g) => {
    const at = (k: number): [number, number] => px(u0 + ((u1 - u0) * k) / posts, v0 + ((v1 - v0) * k) / posts)
    const lit = px(u1, v1)[0] < px(u0, v0)[0] === px(u1, v1)[1] > px(u0, v0)[1]
    for (let k = 0; k < posts; k++) {
      const [ax, ay] = at(k)
      const [bx, by] = at(k + 1)
      for (const share of [0.4, 0.8]) {
        g.fillStyle = lit ? 'rgb(170, 140, 102)' : 'rgb(128, 104, 78)'
        g.beginPath()
        g.moveTo(ax, ay - high * share - 0.4)
        g.lineTo(bx, by - high * share - 0.4)
        g.lineTo(bx, by - high * share + 0.4)
        g.lineTo(ax, ay - high * share + 0.4)
        g.closePath()
        g.fill()
      }
    }
    for (let k = 0; k <= posts; k++) {
      const [x, y] = at(k)
      const tone = 0.9 + 0.2 * hash2(k, 3, scene.seed)
      g.fillStyle = `rgb(${Math.round(150 * tone)}, ${Math.round(122 * tone)}, ${Math.round(88 * tone)})`
      g.fillRect(x - 0.55, y - high, 1.1, high)
      g.fillStyle = 'rgba(255, 236, 200, 0.3)'
      g.fillRect(x - 0.55, y - high, 0.4, high)
    }
  }, false)
}

/** Two posts with a line between them and things hanging from it: washing, dyed cloth, hides, nets. */
export function rack(scene: Scene, u0: number, v0: number, u1: number, v1: number, high: number, colours: string[]): void {
  const pts: P3[] = [[u0, v0, 0], [u1, v1, 0], [u0, v0, high], [u1, v1, high]]
  scene.item(pts, (g) => {
    const [ax, ay] = px(u0, v0)
    const [bx, by] = px(u1, v1)
    g.fillStyle = 'rgb(112, 86, 60)'
    g.fillRect(ax - 0.5, ay - high, 1, high)
    g.fillRect(bx - 0.5, by - high, 1, high)
    g.beginPath()
    g.moveTo(ax, ay - high)
    g.lineTo(bx, by - high)
    g.lineTo(bx, by - high + 0.5)
    g.lineTo(ax, ay - high + 0.5)
    g.closePath()
    g.fill()
    const n = colours.length
    for (const [i, colour] of colours.entries()) {
      const t0 = (i + 0.12) / n
      const t1 = (i + 0.88) / n
      const drop = high * (0.5 + 0.3 * hash2(i, 7, scene.seed))
      const x0 = ax + (bx - ax) * t0
      const y0 = ay + (by - ay) * t0 - high + 0.5
      const x1 = ax + (bx - ax) * t1
      const y1 = ay + (by - ay) * t1 - high + 0.5
      g.fillStyle = colour
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.lineTo(x1, y1 + drop)
      g.lineTo(x0, y0 + drop * 0.94)
      g.closePath()
      g.fill()
      // folds: the cloth is lighter on its left
      const fold = g.createLinearGradient(x0, 0, x1, 0)
      fold.addColorStop(0, 'rgba(255, 244, 220, 0.28)')
      fold.addColorStop(0.5, 'rgba(255, 244, 220, 0)')
      fold.addColorStop(1, `rgba(${DUSK}, 0.3)`)
      g.fillStyle = fold
      g.fill()
    }
  }, false)
}

/** A pole with a pennant: the mark of a trading post, a market, a ship's office. */
export function flag(scene: Scene, u: number, v: number, z: number, high: number, colour: string): void {
  scene.item([[u, v, z], [u, v, z + high], [u + 0.12, v, z + high]], (g) => {
    const [x, y] = px(u, v, z)
    g.fillStyle = 'rgb(96, 76, 56)'
    g.fillRect(x - 0.4, y - high, 0.8, high)
    g.fillStyle = colour
    g.beginPath()
    g.moveTo(x + 0.4, y - high)
    g.quadraticCurveTo(x + 4, y - high + 1.6, x + 8, y - high + 1)
    g.lineTo(x + 6.6, y - high + 2.4)
    g.quadraticCurveTo(x + 4, y - high + 4.6, x + 0.4, y - high + 3.6)
    g.closePath()
    g.fill()
    g.fillStyle = `rgba(${DUSK}, 0.2)`
    g.fillRect(x + 3, y - high + 1.4, 2.4, 2.4)
  }, false)
}

/** A round vat or tub with something in it: dye, brine, mash, water. */
export function vat(scene: Scene, u: number, v: number, r: number, high: number, liquid: string, side: Mat = 'boards'): void {
  cylinder(scene, u, v, r, 0, high, { mat: side, tint: 'rgb(226, 196, 156)' }, { mat: 'cloth', tint: liquid })
}

/** Something flat painted on the ground of a tile area: a patch of earth, a pan, a pool. */
/**
 * A pan in which brine dries in the sun: a low frame of boards on the ground, grey water in it that mirrors the sky,
 * and the salt that has already come out of it as a white crust along its rim and in floes.
 */
export function pan(scene: Scene, u0: number, v0: number, u1: number, v1: number): void {
  const seed = scene.seed + Math.round(u0 * 31 + v0 * 17)
  scene.ground([[u0, v0, 0], [u1, v0, 0], [u1, v1, 0], [u0, v1, 0]], (g) => {
    const quad = (m: number): void => {
      g.beginPath()
      for (const [u, v] of [[u0 + m, v0 + m], [u1 - m, v0 + m], [u1 - m, v1 - m], [u0 + m, v1 - m]]) g.lineTo(...px(u, v))
      g.closePath()
    }
    g.fillStyle = 'rgb(112, 92, 70)'
    quad(-0.02)
    g.fill()
    g.fillStyle = 'rgba(255, 232, 196, 0.22)'
    quad(-0.02)
    g.fill()
    const [a, b] = [px(u0, v0), px(u1, v1)]
    const brine = g.createLinearGradient(a[0], a[1], b[0], b[1])
    brine.addColorStop(0, 'rgb(176, 190, 198)')
    brine.addColorStop(0.5, 'rgb(142, 160, 172)')
    brine.addColorStop(1, 'rgb(192, 202, 206)')
    g.fillStyle = brine
    quad(0.025)
    g.fill()
    g.save()
    quad(0.025)
    g.clip()
    // the crust: thick along the rim, in floes on the water
    for (let i = 0; i < 260; i++) {
      const rim = hash2(i, 1, seed) < 0.6
      const t = hash2(i, 2, seed)
      const edge = Math.floor(hash2(i, 3, seed) * 4)
      const far = rim ? 0.03 + 0.05 * hash2(i, 4, seed) ** 2 : 0.08 + 0.3 * hash2(i, 4, seed)
      const u = edge === 0 ? u0 + far : edge === 1 ? u1 - far : u0 + (u1 - u0) * t
      const v = edge === 2 ? v0 + far : edge === 3 ? v1 - far : v0 + (v1 - v0) * t
      const [x, y] = px(u, v)
      g.fillStyle = `rgba(246, 248, 248, ${rim ? 0.8 : 0.34})`
      g.beginPath()
      g.ellipse(x, y, 0.8 + 1.5 * hash2(i, 5, seed), 0.4 + 0.7 * hash2(i, 6, seed), 0, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  })
}

export function patch(scene: Scene, u0: number, v0: number, u1: number, v1: number, colour: string, rim?: string): void {
  scene.ground([[u0, v0, 0], [u1, v0, 0], [u1, v1, 0], [u0, v1, 0]], (g) => {
    const corners = [px(u0, v0), px(u1, v0), px(u1, v1), px(u0, v1)]
    const shape = (): void => {
      g.beginPath()
      corners.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.closePath()
    }
    if (rim) {
      g.fillStyle = rim
      shape()
      g.fill()
      g.save()
      g.translate((corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2)
      g.scale(0.86, 0.86)
      g.translate(-(corners[0][0] + corners[2][0]) / 2, -(corners[0][1] + corners[2][1]) / 2)
    }
    g.fillStyle = colour
    shape()
    g.fill()
    if (rim) g.restore()
  })
}

/** World pixels from a tile distance, for callers that paint on the ground themselves. */
export const tileToScreen = (du: number, dv: number): [number, number] => [(du - dv) * HW, (du + dv) * HH]
