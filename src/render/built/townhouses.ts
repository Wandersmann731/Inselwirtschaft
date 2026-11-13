// The tall houses of a town. A merchant's house has three storeys, each a little further over the street than the
// one below, and no two of the six are built to the same plan: one shows its long side to the street, one its
// gable with a hoist under the ridge, one has a wing, one is of plastered stone under a hipped roof, one is two
// narrow houses wall to wall, one has a turret on its corner. An aristocrat's house is wide, of two high storeys.
import type { Scene, Surface } from './kit'
import { hoist, oriel, shed, sign, turret, wing } from './extras'
import { dormerOn, stack, WASHES, type Look } from './look'
import { body, type Body, type Facade } from './parts'
import { barrel, block, bush, crate, sack } from './props'
import { cylinder } from './round'
import { gable, hip } from './roofs'

export function merchants(scene: Scene, look: Look): void {
  const { variant, wash, shutters, doorColour, frame } = look
  const window = { shutters: variant % 2 === 1 ? shutters : undefined, flowers: variant % 3 === 0, leaded: variant === 5 }
  const ground = variant === 1 ? ('brick' as const) : ('stone' as const)
  const timber = { timber: true, frame, ground, window }

  if (variant === 0) {
    // the long side to the street: shop windows below, a bay over the door, two dormers
    const b: Body = { at: [0.3, 0.42, 1.62, 1.5], wall: 'plaster', tint: wash, sw: { ...timber, storeys: 3, windows: 3, door: 0.5, doorStyle: 'arch', doorColour, shop: true }, se: { ...timber, storeys: 3, windows: 2 }, roof: 'slate', rise: 23, shape: 'u', over: 0.08, attic: true, jetty: 0.045 }
    const main = body(scene, b)
    const [u0, v0, u1, v1] = main.top
    for (const u of [u0 + 0.36, u1 - 0.4]) stack(scene, main, u, (v0 + v1) / 2, 6)
    for (const u of [u0 + 0.42, u1 - 0.46]) dormerOn(scene, b, main, u, v1 - 0.14)
    oriel(scene, { side: 'sw', at: 0.96, wall: b.at[3] + 0.045, z0: 20.6, z1: 33.4, mat: 'plaster', tint: wash, roof: 'slate', window })
    sign(scene, 'se', 1.2, b.at[2], 12, 'rgb(150, 70, 60)')
    barrel(scene, 0.24, 1.72)
    barrel(scene, 0.4, 1.8, 0.9)
    crate(scene, 1.86, 1.44, 0.17, 6)
    return
  }

  if (variant === 1) {
    // the gable to the street: a steep roof, a loft door under the ridge and a beam to hoist the bales up to it
    const b: Body = { at: [0.44, 0.34, 1.48, 1.5], wall: 'plaster', tint: wash, sw: { ...timber, storeys: 3, windows: 2, door: 0.5, doorStyle: 'arch', doorColour }, se: { ...timber, storeys: 3, windows: 3 }, roof: 'tile', rise: 27, shape: 'v', over: 0.07, jetty: 0.045, loft: true }
    const main = body(scene, b)
    const [u0, v0, u1, v1] = main.top
    hoist(scene, 'sw', (u0 + u1) / 2, v1, main.eaves + 12.5, 15)
    stack(scene, main, (u0 + u1) / 2 + 0.22, v0 + 0.42, 6)
    shed(scene, 'se', 0.62, 1.2, b.at[2], 0.2, 10, { mat: 'stone' }, 'tile', { storeys: 1, storey: 10, door: 0.5, doorStyle: 'barn', doorSize: [7.4, 8.4] })
    sack(scene, 0.3, 1.66)
    sack(scene, 0.4, 1.76, [176, 150, 112])
    crate(scene, 0.22, 1.5, 0.16, 5.6)
    barrel(scene, 1.82, 1.46)
    return
  }

  if (variant === 2) {
    // a house with a wing: the wing turns its own gable to the street
    const b: Body = { at: [0.3, 0.34, 1.64, 1.3], wall: 'plaster', tint: wash, sw: { ...timber, storeys: 3, windows: 3, door: 0.2, doorStyle: 'arch', doorColour }, se: { ...timber, storeys: 3, windows: 2 }, roof: 'slate', rise: 22, shape: 'u', over: 0.08, attic: true, jetty: 0.04 }
    const main = body(scene, b)
    const [u0, v0, , v1] = main.top
    wing(scene, b, main, { side: 'sw', from: 1.0, to: 1.66, out: 0.24, front: { ...timber, storeys: 3, windows: 2 }, rise: 18 })
    stack(scene, main, u0 + 0.3, (v0 + v1) / 2, 6)
    dormerOn(scene, b, main, u0 + 0.36, v1 - 0.12)
    barrel(scene, 0.3, 1.52)
    crate(scene, 0.5, 1.6, 0.16, 5.6)
    bush(scene, 0.8, 1.7, 2.8)
    return
  }

  if (variant === 3) {
    // a house of plastered stone, washed yellow, under a hipped roof with a small lantern on its ridge
    const ochre = 'rgb(242, 214, 146)'
    const stone = { storey: 18, base: ['ashlar', 4] as [Body['wall'], number], quoins: true, window: { shutters, flowers: true } }
    const b: Body = { at: [0.34, 0.42, 1.64, 1.58], wall: 'plaster', tint: ochre, sw: { ...stone, storeys: 3, windows: 3, door: 0.5, doorStyle: 'arch', doorColour }, se: { ...stone, storeys: 3, windows: 3, ivy: 0.72 }, roof: 'tile', roofTint: 'rgb(214, 196, 178)', rise: 19, shape: 'hip', over: 0.08 }
    const main = body(scene, b)
    const [u0, v0, u1, v1] = main.top
    const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2]
    const lantern: Surface = { mat: 'plaster', tint: ochre, wear: 0 }
    scene.box(cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, main.ridge - 2, main.ridge + 6, lantern, lantern, null, false)
    hip(scene, cu - 0.08, cv - 0.08, cu + 0.08, cv + 0.08, main.ridge + 6, 7, 0.03, 'slate')
    stack(scene, main, u0 + 0.26, cv - 0.2, 8)
    stack(scene, main, u1 - 0.3, cv - 0.2, 8)
    block(scene, 0.99, b.at[3] + 0.06, 0.34, 0.1, 1.5, 'ashlar')
    crate(scene, 0.4, 1.8, 0.17, 6)
    barrel(scene, 0.22, 1.72)
    return
  }

  if (variant === 4) {
    // two narrow houses wall to wall, each with its gable to the street, of unequal height
    const left: Body = { at: [0.3, 0.42, 0.96, 1.52], wall: 'plaster', tint: wash, sw: { ...timber, storeys: 3, windows: 2, door: 0.32, doorColour }, se: { ...timber, storeys: 3, windows: 2 }, roof: 'tile', rise: 21, shape: 'v', over: 0.05, jetty: 0.03, attic: true }
    const other = WASHES[(variant + 2) % WASHES.length]
    const right: Body = { at: [1.04, 0.5, 1.68, 1.58], wall: 'plaster', tint: other, sw: { storeys: 2, windows: 2, door: 0.68, doorStyle: 'arch', doorColour: 'rgb(110, 134, 120)', timber: true, frame: 'cross', base: ['stone', 3], window: { shutters } }, se: { storeys: 2, windows: 3, timber: true, frame: 'cross', base: ['stone', 3], window: { shutters } }, roof: 'slate', rise: 25, shape: 'v', over: 0.05, jetty: 0.035, loft: true }
    const a = body(scene, left)
    const c = body(scene, right)
    stack(scene, a, (a.top[0] + a.top[2]) / 2 - 0.14, a.top[1] + 0.4, 6)
    stack(scene, c, (c.top[0] + c.top[2]) / 2 + 0.16, c.top[1] + 0.36, 6)
    hoist(scene, 'sw', (c.top[0] + c.top[2]) / 2, c.top[3], c.eaves + 11.5, 12)
    barrel(scene, 0.22, 1.66)
    crate(scene, 1.86, 1.5, 0.16, 5.6)
    return
  }

  // a corner house: a round turret hangs on the corner between its two walls
  const b: Body = { at: [0.3, 0.4, 1.58, 1.48], wall: 'plaster', tint: wash, sw: { ...timber, storeys: 3, windows: 3, door: 0.34, doorStyle: 'arch', doorColour }, se: { ...timber, storeys: 3, windows: 2 }, roof: 'tile', roofTint: 'rgb(222, 200, 176)', rise: 22, shape: 'u', over: 0.08, attic: true, jetty: 0.04 }
  const main = body(scene, b)
  const [u0, v0, , v1] = main.top
  turret(scene, b, main, 19, 0.15, { mat: 'plaster', tint: wash }, 'slate', window)
  stack(scene, main, u0 + 0.34, (v0 + v1) / 2, 6)
  dormerOn(scene, b, main, u0 + 0.4, v1 - 0.14)
  sign(scene, 'sw', 0.4, b.at[3], 12, 'rgb(74, 96, 124)')
  barrel(scene, 0.26, 1.7)
  sack(scene, 0.44, 1.78)
}

/** A wide house of two high storeys under a hipped roof of slate: plastered or of brick, with a pavilion, a portico or a wing. */
export function aristocrats(scene: Scene, look: Look): void {
  const { variant, wash, shutters, doorColour } = look
  const brick = variant === 1 || variant === 3
  const tint = brick ? undefined : variant === 5 ? 'rgb(244, 224, 172)' : wash
  const window = { shutters: brick ? 'rgb(226, 222, 208)' : shutters }
  const fine = { storey: 22, base: ['ashlar', 4] as [Body['wall'], number], window, pane: [4.6, 9.4] as [number, number], quoins: variant === 1 || variant === 5 }
  const centre = variant === 2
  const long: Facade = { ...fine, storeys: 2, windows: 5, door: centre ? null : 0.5, doorStyle: 'arch', doorColour }
  const short: Facade = { ...fine, storeys: 2, windows: 3, ivy: variant === 3 ? 0.3 : undefined }
  const b: Body = { at: variant === 5 ? [0.2, 0.36, 1.66, 1.62] : [0.2, 0.36, 1.8, 1.64], wall: brick ? 'brick' : 'plaster', tint, sw: long, se: short, roof: 'slate', rise: 19, shape: 'hip', over: 0.07, paved: false }
  const main = body(scene, b)
  const [u0, v0, u1, v1] = main.top
  const stone = brick ? 'brick' : 'ashlar'
  for (const u of [u0 + 0.5, u1 - 0.5]) stack(scene, main, u, v0 + 0.5, 6, stone)
  for (const u of centre ? [u0 + 0.3, u1 - 0.3] : [u0 + 0.42, (u0 + u1) / 2, u1 - 0.42]) dormerOn(scene, b, main, u, v1 - 0.18)
  if (centre) {
    // the middle of the front stands forward under a gable of its own
    wing(scene, b, main, { side: 'sw', from: 0.7, to: 1.3, out: 0.14, front: { ...fine, storeys: 2, windows: 1, door: 0.5, doorStyle: 'arch', doorColour, quoins: true }, rise: 13 })
    block(scene, 1.0, v1 + 0.2, 0.3, 0.1, 1.6, 'ashlar')
  } else if (variant === 4) {
    // a porch on four columns before the door
    const front = v1 + 0.2
    for (const u of [0.76, 0.92, 1.08, 1.24]) cylinder(scene, u, front, 0.02, 1.6, 20, { mat: 'marble' })
    block(scene, 1.0, v1 + 0.12, 0.6, 0.24, 1.6, 'ashlar')
    scene.box(0.72, v1 + 0.02, 1.28, front + 0.04, 20, 22.4, { mat: 'ashlar' }, { mat: 'ashlar' }, { mat: 'ashlar' }, false)
    gable(scene, 0.72, v1, 1.28, front + 0.04, 22.4, 6, 'v', 0.02, 'slate', { mat: 'ashlar' }, { ridge: v1, eave: v1 })
  } else {
    // steps up to the door
    block(scene, 1.0, v1 + 0.06, 0.3, 0.1, 1.6, 'ashlar')
  }
  if (variant === 5) wing(scene, b, main, { side: 'se', from: 0.56, to: 1.16, out: 0.12, front: { ...fine, storeys: 2, windows: 2 }, rise: 14 })
  bush(scene, 0.34, 1.82, 3.2)
  bush(scene, variant === 5 ? 1.5 : 1.66, 1.82, 3.2)
}
