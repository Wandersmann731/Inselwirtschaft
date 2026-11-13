// The public buildings: chapel, church and cathedral of stone with their towers, the tavern, the bath house and the
// theatre. Only these may be larger than life: a church tower rises far over every house.
import type { Ctx, Scene } from './kit'
import { oriel, shed, shelter, sign } from './extras'
import { dormerOn, stack } from './look'
import { cone, cylinder } from './round'
import { gable, hip, type Join } from './roofs'
import type { Mat } from './materials'
import { body, windowPane, type Body, type Built, type Facade } from './parts'
import { barrel, block, bush, crate, patch, rack } from './props'
import { cart, graves, table } from './yardProps'

type Rect = [number, number, number, number]
const GLASS = { arch: true, frame: 'rgb(150, 144, 132)' }

/** A round window with tracery: the rose over a portal. */
function rose(scene: Scene, g: Ctx, cx: number, cy: number, r: number): void {
  g.fillStyle = 'rgba(16, 20, 44, 0.4)'
  g.beginPath()
  g.arc(cx, cy + 0.4, r + 0.9, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgb(196, 190, 176)'
  g.beginPath()
  g.arc(cx, cy, r + 0.5, 0, Math.PI * 2)
  g.fill()
  const glass = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  glass.addColorStop(0, 'rgb(74, 96, 128)')
  glass.addColorStop(0.5, 'rgb(40, 50, 78)')
  glass.addColorStop(1, 'rgb(24, 28, 46)')
  g.fillStyle = glass
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgb(196, 190, 176)'
  for (let k = 0; k < 4; k++) {
    g.save()
    g.translate(cx, cy)
    g.rotate((k * Math.PI) / 4)
    g.fillRect(-r, -0.2, 2 * r, 0.4)
    g.restore()
  }
  g.beginPath()
  g.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
  g.fill()
  scene.lit(g, cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4)
}

interface Hall {
  at: Rect
  long: 'u' | 'v'
  high: number
  rise: number
  windows: number
  wall: Mat
  roof: Mat
  /** A portal in the gable that faces the viewer: its width and height. */
  portal?: [number, number]
  /** A rose window over the portal. */
  rose?: number
  /** Windows in two rows: the upper one looks out over the roof of an aisle. */
  clerestory?: boolean
  over?: number
  join?: Join
}

/** A nave: a long hall with tall round-headed windows along its side and a portal in the gable that faces the viewer. */
function nave(scene: Scene, n: Hall): { b: Body; main: Built } {
  const rows = n.clerestory ? 2 : 1
  const storey = n.high / rows
  const side: Facade = { storeys: rows, storey, windows: n.windows, window: GLASS, pane: [5, storey * (rows === 2 ? 0.6 : 0.52)], base: ['stone', 3] }
  const front: Facade = {
    storeys: 1, storey: n.high, windows: 0, door: n.portal ? 0.5 : null, doorStyle: 'arch', doorSize: n.portal, doorColour: 'rgb(140, 100, 70)', base: ['stone', 3],
    extra: n.rose ? (g, w, h) => rose(scene, g, w / 2, h - (n.portal?.[1] ?? 0) - n.rose! - 5, n.rose!) : undefined,
  }
  const b: Body = { at: n.at, wall: n.wall, sw: n.long === 'v' ? front : side, se: n.long === 'v' ? side : front, roof: n.roof, rise: n.rise, shape: n.long, over: n.over ?? 0.05, attic: !n.rose, join: n.join, lean: 0 }
  return { b, main: body(scene, b) }
}

/** A tower with openings for the bells under a steep pointed roof. `door` is the wall its portal is in. */
function tower(scene: Scene, at: Rect, high: number, spire: number, wall: Mat, roof: Mat, portal: [number, number] | null, door: 'sw' | 'se' = 'sw', clock = false): void {
  const [u0, v0, u1, v1] = at
  const belfry = (withDoor: boolean, lit: boolean) => (g: Ctx, w: number, h: number): void => {
    // two openings for the bells near the top, a slit on every floor below, the portal at the foot
    for (const x of [w * 0.3, w * 0.7]) windowPane(scene, g, x - 2.6, 6, 5.2, 13, GLASS)
    for (let y = 50; y < h - 30; y += 34) windowPane(scene, g, w / 2 - 1.5, y, 3, 8, GLASS)
    // a ledge of stone under the bells and one above the portal: light on top, a shade under it
    for (const y of [23, h - 34]) {
      if (y < 20 || y > h - 12) continue
      g.fillStyle = 'rgba(255, 246, 226, 0.4)'
      g.fillRect(0, y, w, 0.9)
      g.fillStyle = 'rgba(16, 20, 44, 0.3)'
      g.fillRect(0, y + 0.9, w, 1.3)
    }
    if (clock && lit) {
      g.fillStyle = 'rgb(232, 226, 206)'
      g.beginPath()
      g.arc(w / 2, 33, 4, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgb(52, 44, 40)'
      g.fillRect(w / 2 - 0.25, 30, 0.5, 3.2)
      g.fillRect(w / 2 - 0.25, 32.8, 2.4, 0.5)
    }
    if (withDoor && portal) {
      g.fillStyle = 'rgb(52, 38, 30)'
      g.beginPath()
      g.moveTo(w / 2 - portal[0] / 2, h)
      g.lineTo(w / 2 - portal[0] / 2, h - portal[1] + portal[0] / 2)
      g.arc(w / 2, h - portal[1] + portal[0] / 2, portal[0] / 2, Math.PI, 0)
      g.lineTo(w / 2 + portal[0] / 2, h)
      g.closePath()
      g.fill()
      g.fillStyle = 'rgb(118, 84, 58)'
      g.fillRect(w / 2 - portal[0] / 2 + 0.8, h - portal[1] + portal[0] / 2, portal[0] - 1.6, portal[1] - portal[0] / 2)
      g.fillStyle = 'rgba(16, 20, 44, 0.45)'
      g.fillRect(w / 2 - 0.2, h - portal[1] + portal[0] / 2, 0.4, portal[1] - portal[0] / 2)
    }
  }
  scene.box(u0, v0, u1, v1, 0, high, { mat: wall, detail: belfry(door === 'sw', true) }, { mat: wall, detail: belfry(door === 'se', false) })
  hip(scene, u0, v0, u1, v1, high, spire, 0.04, roof)
  // the cross on its point
  const cu = (u0 + u1) / 2
  const cv = (v0 + v1) / 2
  scene.box(cu - 0.012, cv - 0.012, cu + 0.012, cv + 0.012, high + spire, high + spire + 8, 'timber', 'timber', null, false)
  scene.box(cu - 0.05, cv - 0.012, cu + 0.05, cv + 0.012, high + spire + 4.6, high + spire + 6, 'timber', 'timber', null, false)
}

/** Buttresses along the side of a nave that the viewer sees: each in two steps, with a sloping cap. */
function buttresses(scene: Scene, at: Rect, long: 'u' | 'v', count: number, high: number, wall: Mat): void {
  const [u0, v0, u1, v1] = at
  const cap = { mat: wall, tint: 'rgb(224, 220, 210)' }
  for (let k = 1; k < count; k++) {
    const t = k / count
    for (const [out, top] of [[0.17, high * 0.6], [0.1, high]] as [number, number][]) {
      if (long === 'v') {
        const v = v0 + (v1 - v0) * t
        scene.box(u1, v - 0.055, u1 + out, v + 0.055, 0, top, wall, wall, cap)
      } else {
        const u = u0 + (u1 - u0) * t
        scene.box(u - 0.055, v1, u + 0.055, v1 + out, 0, top, wall, wall, cap)
      }
    }
  }
}

function chapel(scene: Scene): void {
  const long = scene.h > scene.w ? 'v' : 'u'
  const T = (u: number, v: number): [number, number] => (long === 'v' ? [u, v] : [v, u])
  const R = (r: Rect): Rect => (long === 'v' ? r : [r[1], r[0], r[3], r[2]])
  const { main } = nave(scene, { at: R([0.4, 0.36, 1.6, 2.4]), long, high: 24, rise: 18, windows: 3, wall: 'stone', roof: 'slate', portal: [8, 15] })
  // a small turret for the bell on the ridge, near the door
  const [cu, cv] = T(1.0, 2.16)
  scene.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, main.ridge - 2, main.ridge + 9, { mat: 'stone', detail: (g, w) => windowPane(scene, g, w / 2 - 1.6, 2, 3.2, 5.4, GLASS) }, 'stone', null, false)
  hip(scene, cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, main.ridge + 9, 9, 0.03, 'slate')
  // a porch on posts before the door, and the graves of the parish beside the wall
  const porch = R([0.78, 2.42, 1.22, 2.74])
  shelter(scene, porch[0], porch[1], porch[2], porch[3], 13, 5, long, 'slate')
  graves(scene, ...T(1.72, 0.7), 5, scene.seed)
  bush(scene, ...T(0.2, 2.76), 3)
  bush(scene, ...T(1.82, 2.6), 2.6, 2)
}

function church(scene: Scene): void {
  const long = scene.h > scene.w ? 'v' : 'u'
  const T = (u: number, v: number): [number, number] => (long === 'v' ? [u, v] : [v, u])
  const R = (r: Rect): Rect => (long === 'v' ? r : [r[1], r[0], r[3], r[2]])
  // the chancel at the far end is lower than the nave; then the nave with its buttresses; the tower stands before it
  nave(scene, { at: R([1.2, 0.3, 2.8, 0.96]), long, high: 27, rise: 20, windows: 1, wall: 'ashlar', roof: 'slate', over: 0 })
  const at = R([0.9, 0.96, 3.1, 3.7])
  nave(scene, { at, long, high: 36, rise: 27, windows: 5, wall: 'ashlar', roof: 'slate', over: 0 })
  buttresses(scene, at, long, 5, 27, 'ashlar')
  tower(scene, R([1.52, 3.7, 2.48, 4.56]), 90, 68, 'ashlar', 'slate', [10, 19], long === 'v' ? 'sw' : 'se', true)
  // a round stair turret in the corner between tower and nave
  const [su, sv] = T(2.63, 3.85)
  cylinder(scene, su, sv, 0.13, 0, 58, { mat: 'ashlar', detail: (g, w, h) => {
    for (let y = 12; y < h - 10; y += 16) windowPane(scene, g, w * 0.36, y, 1.6, 4.4, GLASS)
  } })
  cone(scene, su, sv, 0.16, 58, 15, 'slate')
  graves(scene, ...T(3.3, 3.9), 6, scene.seed)
  bush(scene, ...T(0.4, 4.4), 4, 4)
  bush(scene, ...T(3.5, 4.7), 3.6, 3)
  block(scene, ...T(0.5, 3.0), 0.14, 0.24, 4, 'stone')
}

/**
 * The cathedral: a cross of three halls under one height of roof (choir, transept, nave), an aisle along the nave,
 * and a west front with the portal and a rose window between two towers. Each hall hides what lies behind it and
 * nothing else, so they are built from the back to the front.
 */
function cathedral(scene: Scene): void {
  const high = 50
  const rise = 28
  const hall = { long: 'v' as const, high, rise, wall: 'ashlar' as const, roof: 'slate' as const, over: 0 }
  nave(scene, { ...hall, at: [2.2, 0.8, 3.8, 2.0], windows: 2 })
  body(scene, {
    at: [1.1, 2.0, 4.9, 3.0], wall: 'ashlar', lean: 0,
    sw: { storeys: 1, storey: high, windows: 5, window: GLASS, pane: [5.4, 24], base: ['stone', 3] },
    se: { storeys: 1, storey: high, windows: 1, window: GLASS, pane: [8, 28], base: ['stone', 3] },
    roof: 'slate', rise, shape: 'u', over: 0, attic: true,
  })
  // the nave runs back into the roof of the transept; its front is the west front
  nave(scene, { ...hall, at: [2.2, 3.0, 3.8, 5.2], windows: 4, clerestory: true, portal: [13, 24], rose: 7, join: { ridge: 2.5, eave: 3.0 } })
  shed(scene, 'se', 3.06, 4.26, 3.8, 0.56, 24, { mat: 'ashlar' }, 'slate', { storeys: 1, storey: 24, windows: 3, window: GLASS, pane: [4.4, 11], base: ['stone', 3] })
  // a slender spire where the roofs cross
  cylinder(scene, 3.0, 2.5, 0.12, high + rise - 3, high + rise + 5, 'ashlar')
  cone(scene, 3.0, 2.5, 0.15, high + rise + 5, 44, 'slate')
  tower(scene, [1.3, 4.3, 2.2, 5.2], 104, 72, 'ashlar', 'slate', null)
  tower(scene, [3.8, 4.3, 4.7, 5.2], 104, 72, 'ashlar', 'slate', null)
  // wide steps before the portal
  block(scene, 3.0, 5.34, 1.5, 0.24, 2.4, 'ashlar')
  block(scene, 3.0, 5.52, 1.8, 0.16, 1.2, 'ashlar')
  bush(scene, 0.6, 5.3, 4, 4)
  bush(scene, 5.5, 5.4, 4, 4)
  bush(scene, 5.3, 1.2, 3.6, 3)
}

function tavern(scene: Scene): void {
  const wash = 'rgb(250, 236, 204)'
  const window = { shutters: 'rgb(110, 130, 96)', flowers: true }
  const front: Facade = { storeys: 2, windows: 5, door: 0.3, doorColour: 'rgb(150, 100, 70)', timber: true, base: ['stone', 3], window }
  const b: Body = { at: [0.4, 0.5, 2.56, 1.66], wall: 'plaster', tint: wash, sw: front, se: { ...front, windows: 2, door: null }, roof: 'tile', rise: 21, shape: 'u', over: 0.08, attic: true, jetty: 0.045 }
  const main = body(scene, b)
  const [u0, v0, u1, v1] = main.top
  for (const u of [u0 + 0.5, u0 + 1.1, u1 - 0.5]) dormerOn(scene, b, main, u, v1 - 0.16)
  stack(scene, main, u0 + 0.4, (v0 + v1) / 2, 7, 'brick', true)
  stack(scene, main, u1 - 0.4, (v0 + v1) / 2, 7)
  oriel(scene, { side: 'sw', at: 1.26, wall: b.at[3] + 0.045, z0: 20.6, z1: 33.4, mat: 'plaster', tint: wash, roof: 'tile', window })
  sign(scene, 'sw', 0.84, b.at[3], 12, 'rgb(190, 150, 60)')
  // the low wing with the kitchen
  const kitchen: Body = { at: [1.74, 1.76, 2.6, 2.56], wall: 'plaster', tint: wash, sw: { storeys: 1, windows: 2, timber: true, base: ['stone', 3] }, se: { storeys: 1, windows: 2, door: 0.5, timber: true, base: ['stone', 3] }, roof: 'tile', rise: 13, shape: 'v', over: 0.07 }
  stack(scene, body(scene, kitchen), 2.17, 2.0, 5)
  // tables in the yard, the brewer's cart, barrels
  table(scene, 0.56, 2.1)
  table(scene, 1.1, 2.4)
  table(scene, 0.6, 2.68)
  cart(scene, 2.76, 0.9, 'rgb(150, 110, 70)')
  for (const [u, v] of [[1.5, 1.9], [1.56, 2.1], [2.8, 2.2], [2.84, 2.44]]) barrel(scene, u, v)
  crate(scene, 2.8, 1.5, 0.2)
  bush(scene, 0.24, 1.9, 3.4, 3)
}

function bathhouse(scene: Scene): void {
  const hall: Facade = { storeys: 1, storey: 24, windows: 5, door: 0.5, doorStyle: 'arch', doorSize: [9, 16], window: GLASS, pane: [5, 11], base: ['stone', 3], quoins: true }
  const b: Body = { at: [0.5, 0.5, 3.5, 2.3], wall: 'ashlar', sw: hall, se: { ...hall, windows: 3, door: null }, roof: 'tile', rise: 12, shape: 'hip', over: 0.07 }
  const main = body(scene, b)
  // the dome over the hot room, green with age, and the chimney of the stove that heats the water
  cylinder(scene, 2.0, 1.4, 0.5, 30, 35, 'ashlar')
  cone(scene, 2.0, 1.4, 0.52, 35, 17, 'verdigris')
  stack(scene, main, 0.9, 0.9, 12, 'brick', true)
  // the pool before it, in a rim of stone, with a row of columns that carry a beam
  patch(scene, 0.8, 2.66, 3.2, 3.6, 'rgb(86, 150, 168)', 'rgb(188, 182, 168)')
  for (let k = 0; k < 6; k++) cylinder(scene, 0.8 + k * 0.48, 2.5, 0.055, 0, 16, 'marble')
  scene.box(0.7, 2.44, 3.3, 2.56, 16, 18.4, 'ashlar', 'ashlar', 'ashlar', false)
  // benches of stone, and bay trees in tubs
  block(scene, 3.56, 2.9, 0.12, 0.5, 2.4, 'ashlar')
  block(scene, 0.44, 3.0, 0.12, 0.5, 2.4, 'ashlar')
  for (const [u, v] of [[0.4, 3.6], [3.6, 3.66], [3.7, 2.46]]) {
    cylinder(scene, u, v, 0.07, 0, 3, { mat: 'tile' })
    bush(scene, u, v, 3, 3)
  }
}

function theater(scene: Scene): void {
  const side: Facade = { storeys: 2, storey: 20, windows: 6, window: GLASS, pane: [5, 10], base: ['stone', 3], quoins: true }
  const b: Body = { at: [0.7, 0.7, 4.3, 3.3], wall: 'ashlar', sw: { ...side, door: 0.5, doorStyle: 'arch', doorSize: [11, 18] }, se: { ...side, windows: 4 }, roof: 'slate', rise: 20, shape: 'hip', over: 0.07 }
  const main = body(scene, b)
  // the stage house rises out of the roof at the back: the scenery hangs in it
  scene.box(1.5, 1.0, 3.5, 2.0, main.eaves + 4, main.eaves + 30, 'ashlar', 'ashlar', null)
  hip(scene, 1.5, 1.0, 3.5, 2.0, main.eaves + 30, 9, 0.05, 'slate')
  // the portico: columns that carry a gable, and wide steps
  block(scene, 2.5, 3.84, 3.2, 0.9, 1.8, 'ashlar')
  for (let k = 0; k < 6; k++) cylinder(scene, 1.2 + k * 0.52, 4.0, 0.075, 1.8, 28, 'marble')
  scene.box(1.06, 3.36, 3.94, 4.14, 28, 31.4, 'marble', 'marble', 'marble', false)
  gable(scene, 1.06, 3.36, 3.94, 4.14, 31.4, 11, 'v', 0.03, 'slate', 'marble')
  // a figure of marble on a plinth to either side of the steps, banners
  for (const u of [0.9, 4.1]) {
    block(scene, u, 4.34, 0.2, 0.2, 4, 'ashlar')
    cylinder(scene, u, 4.34, 0.05, 4, 12, 'marble', null, 0.7)
    cylinder(scene, u, 4.34, 0.035, 12, 14.4, 'marble', 'marble')
  }
  rack(scene, 0.4, 4.7, 0.9, 4.7, 12, ['rgb(170, 60, 64)'])
  rack(scene, 4.1, 4.7, 4.6, 4.7, 12, ['rgb(60, 84, 156)'])
  bush(scene, 0.4, 3.8, 4, 4)
  bush(scene, 4.6, 3.9, 4, 4)
}

/** Builds a public building. Returns false if `id` is none. */
export function publicBuilding(scene: Scene, id: string): boolean {
  if (id === 'chapel') chapel(scene)
  else if (id === 'church') church(scene)
  else if (id === 'cathedral') cathedral(scene)
  else if (id === 'tavern') tavern(scene)
  else if (id === 'bathhouse') bathhouse(scene)
  else if (id === 'theater') theater(scene)
  else return false
  return true
}
