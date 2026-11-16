// The construction kit all buildings are made with. A building is a scene of simple solids (boxes, roofs, round
// towers, cones, flat faces) that stand on a footprint of tiles. The scene draws them in the game's view, back to
// front, every face with its material, lit from the top left: the faces that look left are in the sun, those that
// look right in a cool shade, and under eaves and at the foot of a wall it gets darker. Nothing has an outline.
// From the same solids it works out the shadow the building throws on the ground, and where its windows glow.
import { hash2 } from '../../world/noise2d'
import { castShadow, SHADOW_DEPTH, type Solid } from './shadowCast'
import { wear } from './wear'
import { baseColour, material, type Mat } from './materials'

export type Ctx = CanvasRenderingContext2D
export type { P2, P3 } from './shadowCast'
import type { P2, P3 } from './shadowCast'

export const HW = 32
export const HH = 16
/** Length of a tile edge on screen in world pixels: walls are measured in these, so a door is as wide on every wall. */
export const EDGE = Math.hypot(HW, HH)
/** Picture pixels per world pixel (as the painted pictures had, see PICTURE_SCALE in sprites.ts). */
export const RES = 4

/** A place in the scene on screen: u runs down to the right, v down to the left (tiles), z up (world pixels). */
export const px = (u: number, v: number, z = 0): P2 => [(u - v) * HW, (u + v) * HH - z]

export const AU: P2 = [HW / EDGE, HH / EDGE]
export const AR: P2 = [HW / EDGE, -HH / EDGE]
export const AV: P2 = [-HW / EDGE, HH / EDGE]
export const DOWN: P2 = [0, 1]

/** How a face stands to the sun. */
export type Light = 'lit' | 'shade' | 'top' | 'back'
/** What a face is: a wall and a roof weather, each in its way. */
export type Kind = 'wall' | 'roof' | 'flat'
export interface Surface {
  mat: Mat
  /** Multiplied over the material: the colour of a painted wall, of one house among its neighbours. */
  tint?: string
  /** Paints windows, doors, beams on the face: x runs along it, y down, in world pixels. */
  detail?: (g: Ctx, w: number, h: number) => void
  /** 0 for something that is kept clean and new. */
  wear?: number
  /** A wall that does not stand on the ground (an upper storey): no damp and no shade at its foot. */
  raised?: boolean
  /** A wall with nothing over it (a ruin, a block of stone): no shadow of eaves on its upper edge. */
  open?: boolean
}
/** A face: its material alone, or a material with tint and details, or nothing (the face is not drawn). */
export type Face = Surface | Mat | null

export const surface = (face: Surface | Mat): Surface => (typeof face === 'string' ? { mat: face } : face)
const SHADE: Record<Light, string | null> = { lit: null, top: null, shade: 'rgb(112, 114, 158)', back: 'rgb(96, 98, 138)' }
export const DUSK = '16, 20, 44'

export function trace(g: Ctx, poly: P2[]): void {
  g.beginPath()
  for (const [i, [x, y]] of poly.entries()) {
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
}

interface Item extends Solid {
  /** Footprint in tiles and the height it stands on: for the order of drawing. */
  u0: number
  v0: number
  u1: number
  v1: number
  n: number
  draw: (g: Ctx) => void
}

/** True if `a` must be drawn before `b`: it lies behind it, or under it. */
export function behind(a: Pick<Item, 'u0' | 'v0' | 'u1' | 'v1' | 'z0' | 'n'>, b: Pick<Item, 'u0' | 'v0' | 'u1' | 'v1' | 'z0' | 'n'>): boolean {
  const e = 1e-6
  if (a.u1 <= b.u0 + e || a.v1 <= b.v0 + e) return true
  if (b.u1 <= a.u0 + e || b.v1 <= a.v0 + e) return false
  if (a.z0 !== b.z0) return a.z0 < b.z0
  return a.n < b.n
}

/** What a finished scene hands out. Sizes of `shadow` and `smoke` are in world pixels from the picture's top left. */
export interface Rendered {
  image: HTMLCanvasElement
  /** The picture beyond the footprint box, in picture pixels. */
  pads: { l: number; r: number; t: number; b: number }
  shadow: { canvas: HTMLCanvasElement; left: number; top: number } | null
  /** The lit windows alone, as large as the picture is drawn (at half its pixels). */
  glow: HTMLCanvasElement | null
  /** Where smoke rises, as a share of the picture. */
  smoke: [number, number] | null
  /** The hub of a windmill's sails as a share of the picture, and how long a sail is (world pixels): they are drawn over the picture, turning. */
  spin: { x: number; y: number; long: number } | null
}

export class Scene {
  private grounds: { pts: P3[]; draw: (g: Ctx) => void }[] = []
  private items: Item[] = []
  private glowCtx: Ctx | null = null
  private glowUsed = false
  private chimney: P3 | null = null
  private hub: { at: P3; long: number } | null = null
  private faces = 0

  /** Footprint in tiles. */
  readonly w: number
  readonly h: number
  /** Makes one building differ from the next of its kind. */
  readonly seed: number

  constructor(w: number, h: number, seed: number) {
    this.w = w
    this.h = h
    this.seed = seed
  }

  /** Something flat on the ground (a field, a floor): drawn first, and the shadows of everything else fall on it. */
  ground(pts: P3[], draw: (g: Ctx) => void): void {
    this.grounds.push({ pts, draw })
  }

  /** Any solid: `pts` are its corners, `draw` paints it. */
  item(pts: P3[], draw: (g: Ctx) => void, shadow = true): void {
    const us = pts.map((p) => p[0])
    const vs = pts.map((p) => p[1])
    this.items.push({ u0: Math.min(...us), v0: Math.min(...vs), u1: Math.max(...us), v1: Math.max(...vs), z0: Math.min(...pts.map((p) => p[2])), n: this.items.length, pts, draw, shadow })
  }

  /** Sails turn around this place: room is kept for them in the picture, but they are not painted into it. */
  spinAt(u: number, v: number, z: number, long: number): void {
    this.hub = { at: [u, v, z], long }
    this.item([[u - 0.3, v + 0.3, z - long], [u + 0.3, v - 0.3, z + long], [u, v, z]], () => {}, false)
  }

  /** Smoke rises from here. */
  smokeAt(u: number, v: number, z: number): void {
    this.chimney = [u, v, z]
  }

  /** Marks a rectangle of the face that is being painted as a window that glows in the evening. */
  lit(g: Ctx, x: number, y: number, w: number, h: number): void {
    if (!this.glowCtx) return
    const m = g.getTransform()
    this.glowCtx.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2)
    this.glowCtx.fillStyle = 'rgb(255, 214, 130)'
    this.glowCtx.fillRect(x, y, w, h)
    this.glowUsed = true
  }

  /**
   * Paints one flat face: clipped to `poly`, in its own coordinates from `o` along `ax` and `ay`. A wall and a roof
   * show their age (see wear.ts); a wall is darker under the eaves and at its foot.
   */
  face(g: Ctx, poly: P2[], o: P2, ax: P2, ay: P2, w: number, h: number, face: Surface | Mat, light: Light, kind: Kind = 'flat'): void {
    const s = surface(face)
    const wall = kind === 'wall'
    g.save()
    trace(g, poly)
    g.clip()
    g.transform(ax[0], ax[1], ay[0], ay[1], o[0], o[1])
    // the texture starts somewhere else on every building
    const ox = (this.seed * 7) % 32
    const oy = (this.seed * 13) % 32
    g.translate(-ox, -oy)
    g.fillStyle = material(s.mat)
    g.fillRect(ox - 1, oy - 1, w + 2, h + 2)
    g.translate(ox, oy)
    if (s.tint) {
      g.globalCompositeOperation = 'multiply'
      g.fillStyle = s.tint
      g.fillRect(-1, -1, w + 2, h + 2)
      g.globalCompositeOperation = 'source-over'
    }
    s.detail?.(g, w, h)
    if (kind !== 'flat' && s.wear !== 0) wear(g, w, h, kind, s.mat, this.seed * 17 + this.faces++, !s.raised)
    if (wall && h > 6) {
      // under the eaves (or the storey that juts out above) lies a band of shadow with a soft lower edge; where the
      // wall meets the ground it is darker too. A wall that is open to the sky (`open`) has no such band.
      const ao = g.createLinearGradient(0, 0, 0, h)
      const deep = s.open ? 0 : light === 'lit' ? 0.5 : 0.4
      ao.addColorStop(0, `rgba(${DUSK}, ${deep})`)
      ao.addColorStop(Math.min(0.2, 2.2 / h), `rgba(${DUSK}, ${deep * 0.8})`)
      ao.addColorStop(Math.min(0.3, 3.4 / h), `rgba(${DUSK}, ${deep * 0.3})`)
      ao.addColorStop(Math.min(0.45, 6.5 / h), `rgba(${DUSK}, 0)`)
      ao.addColorStop(Math.max(0.55, 1 - 5 / h), `rgba(${DUSK}, 0)`)
      ao.addColorStop(1, `rgba(${DUSK}, ${s.raised ? 0 : 0.3})`)
      g.fillStyle = ao
      g.fillRect(-1, -1, w + 2, h + 2)
    }
    if (kind === 'roof') {
      // a slope is lighter towards the ridge, where it sees more of the sky
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, 'rgba(255, 244, 222, 0.14)')
      sky.addColorStop(0.5, 'rgba(255, 244, 222, 0)')
      sky.addColorStop(1, `rgba(${DUSK}, 0.14)`)
      g.fillStyle = sky
      g.fillRect(-1, -1, w + 2, h + 2)
    }
    // a roof in the shade still sees the sky: it is not as dark as a wall
    const shade = kind === 'roof' && light === 'shade' ? 'rgb(128, 132, 174)' : SHADE[light]
    if (shade) {
      g.globalCompositeOperation = 'multiply'
      g.fillStyle = shade
      g.fillRect(-1, -1, w + 2, h + 2)
      g.globalCompositeOperation = 'source-over'
      if (wall && light === 'shade' && !s.raised && h > 8) {
        // the sunlit ground throws a little warm light back up a wall that stands in the shade
        const bounce = g.createLinearGradient(0, h, 0, h - Math.min(h, 16))
        bounce.addColorStop(0, 'rgba(255, 196, 132, 0.2)')
        bounce.addColorStop(1, 'rgba(255, 196, 132, 0)')
        g.fillStyle = bounce
        g.fillRect(-1, h - 16, w + 2, 17)
      }
    } else if (light === 'lit') {
      // the afternoon sun: warm, and it lifts the light tones more than the dark ones
      g.globalCompositeOperation = 'overlay'
      g.fillStyle = 'rgba(255, 222, 168, 0.34)'
      g.fillRect(-1, -1, w + 2, h + 2)
    }
    g.restore()
  }

  /** A box from (u0, v0) to (u1, v1) between the heights z0 and z1. `sw` is its left visible wall, `se` its right one. */
  box(u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, sw: Face, se: Face, top: Face = null, shadow = true): void {
    this.leaning(u0, v0, u1, v1, z0, z1, sw, se, top, shadow, [0, 0], [0, 0])
  }

  /**
   * A box that does not stand quite true, as old houses do not: its foot is moved by `foot` and its top by `head`
   * (tiles along u and v). Its walls lean with it, and so does everything painted on them.
   */
  leaning(u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, sw: Face, se: Face, top: Face, shadow: boolean, foot: P2, head: P2): void {
    const pts: P3[] = []
    for (const [z, [du, dv]] of [[z0, foot], [z1, head]] as [number, P2][]) pts.push([u0 + du, v0 + dv, z], [u1 + du, v0 + dv, z], [u1 + du, v1 + dv, z], [u0 + du, v1 + dv, z])
    const low = (u: number, v: number): P2 => px(u + foot[0], v + foot[1], z0)
    const high = (u: number, v: number): P2 => px(u + head[0], v + head[1], z1)
    const any = sw ?? se ?? top
    const n = this.items.length
    // a wall with a lit top over it is open to the sky: nothing throws a shadow on its upper edge
    const walled = (face: Surface | Mat): Surface => (top ? { ...surface(face), open: true } : surface(face))
    this.item(pts, (g) => {
      const h = z1 - z0
      if (any) {
        g.fillStyle = baseColour(surface(any).mat, 0.7)
        trace(g, [high(u0, v1), high(u0, v0), high(u1, v0), low(u1, v0), low(u1, v1), low(u0, v1)])
        g.fill()
      }
      const down = (from: P2, to: P2): P2 => [(to[0] - from[0]) / h, (to[1] - from[1]) / h]
      if (sw) this.face(g, [high(u0, v1), high(u1, v1), low(u1, v1), low(u0, v1)], high(u0, v1), AU, down(high(u0, v1), low(u0, v1)), (u1 - u0) * EDGE, h, walled(sw), 'lit', 'wall')
      if (se) this.face(g, [high(u1, v1), high(u1, v0), low(u1, v0), low(u1, v1)], high(u1, v1), AR, down(high(u1, v1), low(u1, v1)), (v1 - v0) * EDGE, h, walled(se), 'shade', 'wall')
      // the corner between the two walls is worn: here and there it catches the sun
      if (sw && se && h > 8) {
        const [cx, cy] = high(u1, v1)
        const [bx, by] = low(u1, v1)
        for (let y = 0; y < h - 1; y += 1.4) {
          const luck = hash2(Math.round(y * 5), this.seed, 431 + n)
          if (luck < 0.45) continue
          g.fillStyle = `rgba(255, 240, 212, ${(0.5 * (luck - 0.45)).toFixed(3)})`
          g.fillRect(cx + ((bx - cx) * y) / h - 0.55, cy + ((by - cy) * y) / h, 0.6, 1.4)
        }
      }
      if (top) this.face(g, [high(u0, v0), high(u1, v0), high(u1, v1), high(u0, v1)], high(u0, v0), AU, AV, (u1 - u0) * EDGE, (v1 - v0) * EDGE, top, 'top')
    }, shadow)
  }

  /** A flat face between four corners (given around it, starting top left): a lean-to roof, an awning, a ramp. */
  quad(p: [P3, P3, P3, P3], face: Surface | Mat, light: Light): void {
    const [a, b, , d] = p.map((q) => px(q[0], q[1], q[2]))
    const w = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const h = Math.hypot(d[0] - a[0], d[1] - a[1]) || 1
    this.item(p, (g) => this.face(g, p.map((q) => px(q[0], q[1], q[2])), a, [(b[0] - a[0]) / w, (b[1] - a[1]) / w], [(d[0] - a[0]) / h, (d[1] - a[1]) / h], w, h, face, light))
  }

  /** Draws the scene. */
  render(): Rendered | null {
    const all = [...this.grounds.flatMap((ground) => ground.pts), ...this.items.flatMap((item) => item.pts)].map((p) => px(p[0], p[1], p[2]))
    const xs = all.map((p) => p[0])
    const ys = all.map((p) => p[1])
    const padL = Math.max(0, Math.ceil(-this.h * HW - Math.min(...xs)) + 1)
    const padR = Math.max(0, Math.ceil(Math.max(...xs) - this.w * HW) + 1)
    const rise = Math.max(0, Math.ceil(-Math.min(...ys)) + 1)
    const padB = Math.max(0, Math.ceil(Math.max(...ys) - (this.w + this.h) * HH) + 1)
    const width = (this.w + this.h) * HW + padL + padR
    const height = rise + (this.w + this.h) * HH + padB
    const ox = padL + this.h * HW
    const image = document.createElement('canvas')
    image.width = width * RES
    image.height = height * RES
    const glow = document.createElement('canvas')
    glow.width = (width * RES) / 2
    glow.height = (height * RES) / 2
    const g = image.getContext('2d')
    this.glowCtx = glow.getContext('2d')
    if (!g) return null
    g.setTransform(RES, 0, 0, RES, ox * RES, rise * RES)
    for (const ground of this.grounds) {
      g.save()
      ground.draw(g)
      g.restore()
    }
    const shadow = castShadow(this.items)
    if (shadow && this.grounds.length > 0) {
      g.globalCompositeOperation = 'source-atop'
      g.globalAlpha = SHADOW_DEPTH
      g.drawImage(shadow.canvas, shadow.left, shadow.top)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    }
    // the dark line where the walls stand on the ground belongs to the picture: it lies under everything that is drawn now
    if (shadow) g.drawImage(shadow.seam, shadow.left, shadow.top)
    // back to front: always one that nothing else still has to be drawn before
    const left = [...this.items]
    while (left.length > 0) {
      let pick = left.findIndex((item) => !left.some((other) => other !== item && behind(other, item) && !behind(item, other)))
      if (pick < 0) pick = 0
      const [item] = left.splice(pick, 1)
      g.save()
      item.draw(g)
      g.restore()
    }
    const smoke = this.chimney ? px(this.chimney[0], this.chimney[1], this.chimney[2]) : null
    const hub = this.hub ? px(this.hub.at[0], this.hub.at[1], this.hub.at[2]) : null
    return {
      image,
      pads: { l: padL * RES, r: padR * RES, t: 0, b: padB * RES },
      shadow: shadow && { canvas: shadow.canvas, left: shadow.left + ox, top: shadow.top + rise },
      glow: this.glowUsed ? glow : null,
      smoke: smoke && [(smoke[0] + ox) / width, (smoke[1] + rise) / height],
      spin: hub && this.hub ? { x: (hub[0] + ox) / width, y: (hub[1] + rise) / height, long: this.hub.long } : null,
    }
  }

}
