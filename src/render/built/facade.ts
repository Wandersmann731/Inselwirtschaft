// What stands on the wall of a house: windows, doors, timber framing, corner stones, ivy. Everything is measured by
// the door: a house door is DOOR world pixels high, a storey a door and a half, and nothing that people walk through
// or look out of is drawn to another scale.
import { hash2 } from '../../world/noise2d'
import { DUSK, type Ctx, type Scene, type Surface } from './kit'
import { material, type Mat } from './materials'

/** Height of a house door in world pixels: the measure of everything (a person on the map is a little shorter). */
export const DOOR = 13
/** Height of one storey. */
export const STOREY = 19

export interface WindowStyle {
  /** Colour of the frame and the bars. */
  frame?: string
  /** Colour of the shutters, if the window has any. */
  shutters?: string
  /** A round head: churches, fine houses. */
  arch?: boolean
  /** Small leaded panes: more bars. */
  leaded?: boolean
  /** A box of flowers on the sill of some windows. */
  flowers?: boolean
}

const BLOOMS = ['rgb(206, 78, 70)', 'rgb(232, 196, 204)', 'rgb(238, 226, 196)', 'rgb(214, 150, 62)']

/** A window on the face that is being painted: a dark opening with glass that mirrors the sky, bars, a sill. */
export function windowPane(scene: Scene, g: Ctx, x: number, y: number, w: number, h: number, style: WindowStyle = {}): void {
  const frame = style.frame ?? 'rgb(206, 196, 174)'
  const shape = (inset: number): void => {
    g.beginPath()
    if (style.arch) {
      const r = w / 2 - inset
      g.moveTo(x + inset, y + h - inset)
      g.lineTo(x + inset, y + w / 2)
      g.arc(x + w / 2, y + w / 2, r, Math.PI, 0)
      g.lineTo(x + w - inset, y + h - inset)
    } else g.rect(x + inset, y + inset, w - 2 * inset, h - 2 * inset)
    g.closePath()
  }
  // rain has run off the sill for years: a faint streak under it
  const run = g.createLinearGradient(0, y + h, 0, y + h + 6)
  run.addColorStop(0, `rgba(58, 50, 44, 0.2)`)
  run.addColorStop(1, `rgba(58, 50, 44, 0)`)
  g.fillStyle = run
  g.fillRect(x - 0.2, y + h, w + 0.4, 6)
  // the wall is thick: the opening lies in its own shade
  g.fillStyle = `rgba(${DUSK}, 0.4)`
  g.fillRect(x - 0.5, y - 0.6, w + 1, h + 1.4)
  g.fillStyle = frame
  shape(0)
  g.fill()
  const glass = g.createLinearGradient(x, y, x + w, y + h)
  glass.addColorStop(0, 'rgb(62, 86, 106)')
  glass.addColorStop(0.45, 'rgb(30, 44, 60)')
  glass.addColorStop(1, 'rgb(18, 26, 38)')
  g.fillStyle = glass
  shape(0.4)
  g.fill()
  // behind some windows a curtain hangs or a wall shows: the glass is warm there, not dark
  const room = hash2(Math.round(x * 5), Math.round(y * 5), scene.seed + 67)
  if (room < 0.5) {
    g.fillStyle = room < 0.22 ? 'rgba(226, 204, 150, 0.5)' : 'rgba(176, 150, 112, 0.42)'
    shape(0.4)
    g.fill()
  }
  // the sky in the glass: a pale streak across the upper left pane
  g.save()
  shape(0.4)
  g.clip()
  g.fillStyle = 'rgba(196, 218, 232, 0.3)'
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w * 0.62, y)
  g.lineTo(x, y + h * 0.5)
  g.closePath()
  g.fill()
  g.restore()
  g.fillStyle = frame
  g.fillRect(x + w / 2 - 0.15, y + 0.4, 0.3, h - 0.8)
  if (h > 5) g.fillRect(x + 0.4, y + h * 0.45, w - 0.8, 0.3)
  if (style.leaded) {
    for (const share of [0.25, 0.75]) g.fillRect(x + w * share - 0.1, y + 0.4, 0.2, h - 0.8)
    for (const share of [0.22, 0.7]) g.fillRect(x + 0.4, y + h * share, w - 0.8, 0.2)
  }
  // the sill catches the light
  g.fillStyle = 'rgba(255, 244, 220, 0.55)'
  g.fillRect(x - 0.6, y + h, w + 1.2, 0.7)
  scene.lit(g, x + 0.55, y + 0.55, w - 1.1, h - 1.1)
  if (style.shutters) {
    for (const sx of [x - w * 0.5 - 0.3, x + w + 0.3]) {
      g.fillStyle = style.shutters
      g.fillRect(sx, y, w * 0.5, h)
      g.fillStyle = `rgba(${DUSK}, 0.22)`
      for (let k = 1; k < 5; k++) g.fillRect(sx, y + (h * k) / 5, w * 0.5, 0.3)
    }
  }
  const pick = hash2(Math.round(x * 3), Math.round(y * 3), scene.seed + 61)
  if (style.flowers && pick < 0.45) {
    g.fillStyle = 'rgb(104, 80, 58)'
    g.fillRect(x - 0.4, y + h + 0.5, w + 0.8, 1.1)
    for (let k = 0; k < 7; k++) {
      const fx = x - 0.2 + ((w + 0.4) * (k + 0.5)) / 7
      g.fillStyle = k % 2 === 0 ? 'rgb(86, 122, 62)' : BLOOMS[Math.floor(pick * 40 + k / 2) % BLOOMS.length]
      g.beginPath()
      g.ellipse(fx, y + h + 0.3 - 0.5 * hash2(k, 5, scene.seed), 0.55, 0.5, 0, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/** A door at the foot of the face: boards in a dark opening, a lintel, a stone step. `barn` is a wide double door. */
export function doorway(g: Ctx, x: number, bottom: number, w: number, h: number, colour = 'rgb(122, 86, 56)', arch = false): void {
  g.fillStyle = `rgba(${DUSK}, 0.5)`
  g.fillRect(x - 0.6, bottom - h - 0.7, w + 1.2, h + 0.7)
  g.save()
  g.beginPath()
  if (arch) {
    g.moveTo(x, bottom)
    g.lineTo(x, bottom - h + w / 2)
    g.arc(x + w / 2, bottom - h + w / 2, w / 2, Math.PI, 0)
    g.lineTo(x + w, bottom)
  } else g.rect(x, bottom - h, w, h)
  g.closePath()
  g.clip()
  g.fillStyle = material('boards')
  g.fillRect(x, bottom - h, w, h)
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = colour
  g.fillRect(x, bottom - h, w, h)
  g.globalCompositeOperation = 'source-over'
  // the door stands a little back: its top lies in shade
  const shade = g.createLinearGradient(0, bottom - h, 0, bottom)
  shade.addColorStop(0, `rgba(${DUSK}, 0.5)`)
  shade.addColorStop(0.3, `rgba(${DUSK}, 0.1)`)
  shade.addColorStop(1, `rgba(${DUSK}, 0)`)
  g.fillStyle = shade
  g.fillRect(x, bottom - h, w, h)
  if (w > 9) {
    g.fillStyle = `rgba(${DUSK}, 0.5)`
    g.fillRect(x + w / 2 - 0.2, bottom - h, 0.4, h)
  }
  g.restore()
  g.fillStyle = 'rgba(226, 200, 120, 0.9)'
  g.fillRect(x + (w > 9 ? w / 2 - 1.2 : w - 1.6), bottom - h * 0.48, 0.7, 0.7)
  g.fillStyle = 'rgba(196, 190, 176, 0.95)'
  g.fillRect(x - 0.8, bottom - 0.9, w + 1.6, 0.9)
}

/** How the panels of a timber frame are filled: braces in the corners, crosses under the windows, or close studs. */
export type Frame = 'brace' | 'cross' | 'studs'

/** What stands on a wall. */
export interface Facade {
  storeys: number
  /** Height of a storey (default STOREY). */
  storey?: number
  /** Windows per storey. */
  windows?: number
  /** Where the door stands along the wall (0 to 1), or no door. */
  door?: number | null
  /** 'barn' is a wide double door, 'arch' a round-headed one. */
  doorStyle?: 'house' | 'barn' | 'arch'
  doorColour?: string
  /** Width and height of the door, for a portal that is larger than a house door (churches, halls). */
  doorSize?: [number, number]
  /** A frame of oak beams with plaster between them. */
  timber?: boolean
  frame?: Frame
  /** The foot of the wall is of this material, this high. */
  base?: [Mat, number]
  /** The whole ground floor is of this material (a stone storey under timber ones). */
  ground?: Mat
  /** The ground floor has wide shop windows. */
  shop?: boolean
  /** The ground floor is open: this many arches, and behind them the dark of a hall with goods in it. */
  arcade?: number
  window?: WindowStyle
  /** Width and height of the windows. */
  pane?: [number, number]
  /** Blocks of dressed stone at both ends of the wall. */
  quoins?: boolean
  /** Ivy climbs the wall here (0 to 1 along it). */
  ivy?: number
  /** Something of its own on the whole wall, painted last: a rose window, a clock. */
  extra?: (g: Ctx, w: number, h: number) => void
}

/**
 * The details of one wall of a house, as a painter for a face. With `level` the face is that one storey alone (a
 * house whose storeys jut out is built storey by storey), else the whole wall.
 */
export function facade(scene: Scene, f: Facade, salt: number, level?: number): NonNullable<Surface['detail']> {
  const storey = f.storey ?? STOREY
  const [pw, ph] = f.pane ?? [5.2, 7.8]
  return (g, w, h) => {
    const levels = level === undefined ? Array.from({ length: f.storeys }, (_, i) => i) : [level]
    const bottomOf = (l: number): number => (level === undefined ? h - l * storey : h)
    if (levels.includes(0)) {
      if (f.ground) {
        g.fillStyle = material(f.ground)
        g.fillRect(0, h - storey, w, storey)
      }
      if (f.base) {
        g.fillStyle = material(f.base[0])
        g.fillRect(0, h - f.base[1], w, f.base[1])
      }
    }
    const count = f.windows ?? 0
    const doorH = f.doorSize?.[1] ?? (f.doorStyle === 'barn' ? DOOR * 1.05 : DOOR)
    const doorW = f.doorSize?.[0] ?? (f.doorStyle === 'barn' ? 12 : f.doorStyle === 'arch' ? 7.5 : 6.2)
    const doorX = f.door === null || f.door === undefined ? null : Math.max(2.5, Math.min(w - doorW - 2.5, w * f.door - doorW / 2))
    if (f.timber) {
      for (const l of levels) {
        const bottom = bottomOf(l)
        if (l >= (f.ground ? 1 : 0) && bottom > 1) timberLevel(g, w, bottom, Math.max(0, bottom - storey), storey, l, count, scene.seed + salt, f.frame ?? 'brace')
      }
    }
    if (f.quoins) {
      g.fillStyle = material('ashlar')
      for (let y = h, k = 0; y > 0; y -= 2.5, k++) {
        const long = k % 2 === 0 ? 3.4 : 2.2
        g.fillRect(0, y - 2.3, long, 2.3)
        g.fillRect(w - long, y - 2.3, long, 2.3)
      }
    }
    if (f.ivy !== undefined && level === undefined) ivy(g, w, h, w * f.ivy, scene.seed + salt)
    for (const l of levels) {
      const bottom = bottomOf(l)
      if (bottom - storey < -0.5) break
      if (l === 0 && f.arcade) {
        arcade(g, w, bottom, storey, f.arcade, scene.seed + salt)
        continue
      }
      const shop = f.shop === true && l === 0
      const [ww, wh] = shop ? [pw * 1.9, ph * 0.9] : [pw, ph]
      const y = bottom - storey * 0.5 - wh * 0.56
      for (let i = 0; i < count; i++) {
        const x = (w * (i + 0.5)) / count - ww / 2
        // no window where the door is
        if (doorX !== null && l === 0 && x + ww > doorX - 1.5 && x < doorX + doorW + 1.5) continue
        if (shop) {
          // a wide opening under an oak lintel, its shutter let down as a counter
          g.fillStyle = material('timber')
          g.fillRect(x - 0.8, y - 1.5, ww + 1.6, 1.5)
          windowPane(scene, g, x, y, ww, wh, { ...f.window, shutters: undefined, flowers: false, leaded: true })
          g.fillStyle = 'rgb(128, 100, 74)'
          g.fillRect(x - 0.6, y + wh + 0.5, ww + 1.2, 1.2)
        } else windowPane(scene, g, x, y, ww, wh, f.window)
      }
    }
    if (doorX !== null && levels.includes(0) && !f.arcade) doorway(g, doorX, h, doorW, doorH, f.doorColour, f.doorStyle === 'arch')
    if (level === undefined) f.extra?.(g, w, h)
  }
}

/** Round arches on piers along the foot of a wall: one looks into a dim hall where sacks and crates stand. */
function arcade(g: Ctx, w: number, bottom: number, storey: number, count: number, seed: number): void {
  const bay = w / count
  const wide = bay * 0.68
  const high = storey * 0.84
  const arch = (x: number, grow: number): void => {
    const r = wide / 2 + grow
    g.beginPath()
    g.moveTo(x - r, bottom)
    g.lineTo(x - r, bottom - high + wide / 2)
    g.arc(x, bottom - high + wide / 2, r, Math.PI, 0)
    g.lineTo(x + r, bottom)
    g.closePath()
  }
  for (let i = 0; i < count; i++) {
    const x = bay * (i + 0.5)
    // the stones of the arch, lighter than the wall
    g.fillStyle = 'rgba(244, 236, 216, 0.5)'
    arch(x, 1)
    g.fill()
    const dim = g.createLinearGradient(0, bottom - high, 0, bottom)
    dim.addColorStop(0, 'rgb(22, 20, 26)')
    dim.addColorStop(1, 'rgb(74, 60, 50)')
    g.fillStyle = dim
    arch(x, 0)
    g.fill()
    // what is stored and sold inside
    g.save()
    arch(x, 0)
    g.clip()
    for (let k = 0; k < 3; k++) {
      const luck = hash2(i * 7 + k, 3, seed)
      g.fillStyle = luck < 0.4 ? 'rgb(150, 122, 84)' : luck < 0.7 ? 'rgb(120, 92, 62)' : 'rgb(170, 150, 118)'
      g.fillRect(x - wide / 2 + (wide * (k + 0.1)) / 3, bottom - 2.4 - 3 * hash2(i * 7 + k, 4, seed), wide * 0.27, 6)
    }
    g.fillStyle = `rgba(${DUSK}, 0.4)`
    g.fillRect(x - wide / 2, bottom - high, wide * 0.4, high)
    g.restore()
  }
}

/** Oak beams on plaster for one storey: a sill, a plate, posts between the windows, and what fills the panels. */
function timberLevel(g: Ctx, w: number, bottom: number, top: number, storey: number, level: number, windows: number, seed: number, frame: Frame): void {
  const beam = 2
  // every beam as a shape: all are laid on in three passes, so no beam's shade falls on another beam
  const shapes: [number, number][][] = []
  const bar = (x: number, y: number, bw: number, bh: number): void => void shapes.push([[x, y], [x + bw, y], [x + bw, y + bh], [x, y + bh]])
  const slant = (x0: number, y0: number, x1: number, y1: number, thick = 1.7): void => void shapes.push([[x0, y0], [x0 + thick, y0], [x1 + thick, y1], [x1, y1]])
  const posts = Math.max(2, windows + 1)
  const rail = bottom - storey * 0.3
  bar(0, bottom - beam, w, beam)
  bar(0, top, w, beam * 0.9)
  for (let i = 0; i <= posts; i++) bar(Math.min(w - beam, (w * i) / posts - (i === 0 ? 0 : beam / 2)), top, beam, bottom - top)
  // a rail under the windows
  bar(0, rail, w, beam * 0.75)
  const bay = w / posts
  for (let i = 0; i < posts; i++) {
    const x0 = bay * i
    if (frame === 'cross') {
      // a cross in the panel under every window
      slant(x0 + beam, bottom - beam, x0 + bay - beam - 1.3, rail + 1, 1.3)
      slant(x0 + bay - beam - 1.3, bottom - beam, x0 + beam, rail + 1, 1.3)
      continue
    }
    if (frame === 'studs') {
      for (const share of [0.3, 0.7]) bar(x0 + bay * share - 0.6, top, 1.2, bottom - top)
      continue
    }
    // braces: in the outer bays, leaning to the corner; which other bays have one differs from house to house
    const outer = i === 0 || i === posts - 1
    if (!outer && hash2(i, level, seed) < 0.6) continue
    const leanRight = i === 0 ? true : i === posts - 1 ? false : hash2(i, level, seed + 1) < 0.5
    if (leanRight) slant(x0 + beam, bottom - beam, x0 + bay * 0.62 - 1.7, rail)
    else slant(x0 + bay - beam - 1.7, bottom - beam, x0 + bay * 0.38, rail)
  }
  const lay = (dx: number, dy: number): void => {
    g.beginPath()
    for (const shape of shapes) {
      shape.forEach(([x, y], k) => (k ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)))
      g.closePath()
    }
    g.fill()
  }
  // the beams stand a finger's breadth before the plaster: their shade lies on it, to the right and below
  g.fillStyle = `rgba(${DUSK}, 0.3)`
  lay(0.45, 0.5)
  g.fillStyle = material('timber')
  lay(0, 0)
  // and their upper edges catch the light
  g.save()
  g.beginPath()
  for (const shape of shapes) {
    shape.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
  }
  g.clip()
  g.fillStyle = 'rgba(255, 226, 180, 0.2)'
  lay(0, -beam + 0.3)
  g.restore()
}

/** Ivy that has climbed a wall from its foot at `x0`: dark leaves below, lighter ones on top, thinning out upwards. */
function ivy(g: Ctx, w: number, h: number, x0: number, seed: number): void {
  const reach = h * (0.55 + 0.35 * hash2(seed, 1, 451))
  const greens = ['rgb(48, 74, 42)', 'rgb(66, 98, 50)', 'rgb(88, 122, 58)', 'rgb(118, 146, 74)']
  for (let i = 0; i < 300; i++) {
    const t = hash2(i, 1, seed) ** 1.5
    const spread = 2.5 + 10 * t * (1.2 - t)
    const x = x0 + (hash2(i, 2, seed) - 0.5) * 2 * spread + Math.sin(t * 5 + seed) * 2.4
    if (x < 0.5 || x > w - 0.5) continue
    g.fillStyle = greens[Math.min(3, Math.floor((i / 300) * 4))]
    g.beginPath()
    g.ellipse(x, h - t * reach - 0.4, 0.6 + 0.7 * hash2(i, 3, seed), 0.5 + 0.5 * hash2(i, 4, seed), 0, 0, Math.PI * 2)
    g.fill()
  }
}
