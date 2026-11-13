// The workshops: every trade has a house that is built for it, and its goods and tools standing in the yard, so one
// sees at a glance what is made there: the baker's oven with its tall chimney, the open forge of the smith, the kiln
// of the brewery, the lodge the stonemason works under. The house stands at the back of its plot, the yard lies in
// front and to the right. A workshop is smaller than any dwelling house.
import { type Ctx, type Scene } from './kit'
import { hoist, leanTo, oriel, shed, shelter, sign, wing } from './extras'
import { stack } from './look'
import { cone, cylinder } from './round'
import type { Mat } from './materials'
import { body, chimney, type Body, type Built, type Facade, type Frame } from './parts'
import { barrel, block, boulder, bush, crate, heap, pan, rack, sack, vat, woodpile } from './props'

interface Shop {
  wall: Mat
  tint?: string
  roof: Mat
  storeys?: number
  timber?: boolean
  frame?: Frame
  shape?: 'u' | 'v' | 'hip'
  at?: [number, number, number, number]
  rise?: number
  /** A wide double door instead of a house door. */
  barn?: boolean
  base?: Mat
  /** A chimney this high above the ridge; smoke rises from it while the workshop runs. */
  stack?: number
  /** A wide window to sell from, flowers on the sills. */
  counter?: boolean
  /** A loft door in the gable. */
  loft?: boolean
}

/** The house of a workshop, and what it tells those who build on to it. */
function shop(scene: Scene, s: Shop): { b: Body; main: Built } {
  // smaller than any dwelling house: a workshop is a room and a store
  const at = s.at ?? [0.3, 0.34, 1.24, 1.14]
  const storeys = s.storeys ?? 1
  const base: Facade['base'] = s.base ? [s.base, 3] : undefined
  const window = { flowers: s.counter }
  const long: Facade = { storeys, storey: 17, windows: s.barn ? 1 : 2, door: s.barn ? 0.62 : 0.3, doorStyle: s.barn ? 'barn' : 'house', timber: s.timber, frame: s.frame, base, pane: [4.4, 6.4], shop: s.counter, window }
  const short: Facade = { storeys, storey: 17, windows: 1, timber: s.timber, frame: s.frame, base, pane: [4.4, 6.4], window }
  const b: Body = { at, wall: s.wall, tint: s.tint, sw: long, se: short, roof: s.roof, rise: s.rise ?? 14, shape: s.shape ?? 'u', over: 0.08, attic: storeys > 1, loft: s.loft }
  const main = body(scene, b)
  if (s.stack) {
    const [u0, v0, u1, v1] = main.top
    stack(scene, main, u0 + (u1 - u0) * (b.shape === 'v' ? 0.5 : 0.72), v0 + (v1 - v0) * (b.shape === 'v' ? 0.3 : 0.5), s.stack, s.wall === 'stone' || s.wall === 'logs' ? 'stone' : 'brick', true)
  }
  return { b, main }
}

const HIDES = ['rgb(150, 110, 74)', 'rgb(176, 138, 96)', 'rgb(128, 92, 62)']
const WHITE: [number, number, number] = [232, 226, 210]
const IRON = 'rgb(96, 100, 116)'

/** A dark opening with fire in it, on the wall of an oven or a furnace. */
const fireMouth = (g: Ctx, w: number, h: number): void => {
  g.fillStyle = 'rgb(28, 22, 24)'
  g.beginPath()
  g.ellipse(w * 0.32, h - 3.4, 2.6, 3.4, 0, Math.PI, 0)
  g.lineTo(w * 0.32 + 2.6, h)
  g.lineTo(w * 0.32 - 2.6, h)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgb(236, 140, 60)'
  g.beginPath()
  g.ellipse(w * 0.32, h - 1.2, 1.8, 1.3, 0, 0, Math.PI * 2)
  g.fill()
}

/** A stump to chop or hammer on. */
const stump = (scene: Scene, u: number, v: number, high = 3): void => cylinder(scene, u, v, 0.055, 0, high, 'timber', { mat: 'boards', tint: 'rgb(226, 200, 160)' })

/** What every workshop is: its house and what stands in its yard. */
const YARDS: Record<string, (scene: Scene) => void> = {
  // a log cabin with its gable to the yard, and an open shed where the split wood dries
  forester: (scene) => {
    shop(scene, { wall: 'logs', roof: 'shingle', rise: 15, shape: 'v', at: [0.3, 0.3, 1.08, 1.14], stack: 5 })
    shelter(scene, 1.3, 0.34, 1.82, 1.04, 10, 6, 'v', 'shingle')
    woodpile(scene, 1.56, 0.56, 0.4, false, 6)
    woodpile(scene, 1.56, 0.86, 0.4, false, 5)
    woodpile(scene, 0.7, 1.6, 0.7, true, 6)
    stump(scene, 1.3, 1.5)
    boulder(scene, 1.6, 1.62, 0.8, [128, 100, 70])
    bush(scene, 1.84, 1.8, 3.4, 3)
    bush(scene, 0.2, 1.82, 2.6, 2)
  },
  // a timber house with a wing for the looms, cloth on the lines
  weaver: (scene) => {
    const { b, main } = shop(scene, { wall: 'plaster', tint: 'rgb(250, 240, 220)', roof: 'tile', timber: true, frame: 'cross', base: 'stone', at: [0.3, 0.34, 1.3, 1.04] })
    wing(scene, b, main, { side: 'sw', from: 0.74, to: 1.26, out: 0.2, front: { storeys: 1, storey: 17, windows: 1, timber: true, frame: 'cross', base: ['stone', 3], pane: [6, 7.4], window: { leaded: true } }, rise: 11 })
    rack(scene, 1.66, 0.4, 1.66, 1.3, 8, ['rgb(236, 230, 214)', 'rgb(120, 146, 176)', 'rgb(206, 172, 96)', 'rgb(236, 230, 214)'])
    rack(scene, 0.3, 1.66, 1.1, 1.66, 8, ['rgb(196, 110, 86)', 'rgb(236, 230, 214)', 'rgb(132, 156, 110)'])
    barrel(scene, 1.5, 1.64)
    sack(scene, 1.4, 1.36, WHITE)
  },
  // a tower mill of stone on a wider foot, its cap of shingles turned into the wind, and the miller's store
  mill: (scene) => {
    cylinder(scene, 0.95, 0.9, 0.47, 0, 5, 'stone', 'flags')
    cylinder(scene, 0.95, 0.9, 0.42, 5, 36, { mat: 'stone', tint: 'rgb(240, 234, 222)', detail: (g, w, h) => {
      g.fillStyle = 'rgba(16, 20, 44, 0.6)'
      g.fillRect(w * 0.3, h - 13, 6, 13)
      g.fillRect(w * 0.34, h * 0.3, 3.6, 5)
      g.fillRect(w * 0.6, h * 0.5, 3, 4.6)
    } }, null, 0.74)
    cylinder(scene, 0.95, 0.9, 0.34, 36, 38.4, 'boards')
    cone(scene, 0.95, 0.9, 0.35, 38.4, 15, 'shingle')
    scene.spinAt(1.2, 1.15, 33, 25)
    shop(scene, { wall: 'boards', roof: 'shingle', at: [1.4, 0.2, 1.86, 0.62], rise: 8 })
    sack(scene, 1.5, 1.2, WHITE)
    sack(scene, 1.62, 1.34, WHITE)
    sack(scene, 1.46, 1.42)
    crate(scene, 1.76, 0.96)
    barrel(scene, 0.3, 1.5)
  },
  // a shop with a wide window, and beside it the oven: a dome of brick with a chimney as high as the house
  bakery: (scene) => {
    shop(scene, { wall: 'plaster', tint: 'rgb(252, 238, 210)', roof: 'tile', timber: true, base: 'brick', counter: true, at: [0.3, 0.34, 1.16, 1.14] })
    cylinder(scene, 1.5, 0.72, 0.22, 0, 7, { mat: 'brick', detail: fireMouth })
    cone(scene, 1.5, 0.72, 0.23, 7, 6, { mat: 'brick', tint: 'rgb(226, 214, 204)' })
    chimney(scene, 1.5, 0.52, 0, 27, 'brick', true)
    woodpile(scene, 1.72, 1.1, 0.36, false, 5)
    crate(scene, 1.3, 1.24, 0.2, 4.4)
    sack(scene, 0.6, 1.5, WHITE)
    sack(scene, 0.74, 1.62, WHITE)
    barrel(scene, 1.3, 1.62)
    sign(scene, 'sw', 1.0, 1.14, 11, 'rgb(196, 150, 84)')
  },
  // a small hut of rubble, and the lodge he works under: a roof on posts over the blocks
  stonemason: (scene) => {
    shop(scene, { wall: 'stone', roof: 'tile', at: [0.26, 0.28, 0.96, 0.84], rise: 11 })
    shelter(scene, 1.12, 0.4, 1.84, 1.06, 11, 6, 'u', 'tile')
    block(scene, 1.42, 0.7, 0.3, 0.22, 4.4, 'ashlar')
    block(scene, 1.42, 0.7, 0.2, 0.16, 3, 'ashlar', undefined, 4.4)
    block(scene, 1.7, 0.84, 0.16, 0.2, 3.4, 'ashlar')
    block(scene, 0.6, 1.5, 0.3, 0.2, 3.8, 'brick')
    block(scene, 0.98, 1.56, 0.3, 0.2, 5, 'brick')
    boulder(scene, 1.4, 1.5, 1.1)
    boulder(scene, 1.64, 1.4, 0.8)
    boulder(scene, 0.3, 1.2, 0.7)
  },
  // a hall of stone and before it the furnace: a round shaft with fire at its foot and a stack that smokes
  smelter: (scene) => {
    shop(scene, { wall: 'stone', roof: 'slate', barn: true, at: [0.28, 0.34, 1.14, 1.1] })
    cylinder(scene, 1.52, 0.66, 0.24, 0, 17, { mat: 'stone', detail: fireMouth }, null, 0.72)
    cylinder(scene, 1.52, 0.66, 0.1, 17, 33, 'brick', { mat: 'brick', tint: 'rgb(60, 50, 50)' }, 0.9)
    scene.smokeAt(1.52, 0.66, 35)
    heap(scene, 1.72, 1.2, 0.18, 6, 'rgb(190, 130, 104)')
    heap(scene, 1.3, 1.34, 0.17, 5.4, 'rgb(74, 70, 76)')
    block(scene, 0.7, 1.56, 0.3, 0.12, 2, 'stone', 'rgb(120, 130, 150)')
    block(scene, 1.04, 1.6, 0.3, 0.12, 2, 'stone', 'rgb(120, 130, 150)')
    barrel(scene, 0.34, 1.5)
  },
  // a smithy of brick; the forge and the anvil stand under a roof before it
  toolmaker: (scene) => {
    shop(scene, { wall: 'brick', roof: 'tile', stack: 10, at: [0.28, 0.32, 1.1, 1.06] })
    shelter(scene, 1.24, 0.44, 1.82, 1.0, 10, 5, 'v', 'tile')
    scene.box(1.36, 0.52, 1.6, 0.72, 0, 4.4, 'brick', 'brick', { mat: 'brick', tint: 'rgb(255, 170, 110)', wear: 0 })
    stump(scene, 1.62, 0.88, 2.6)
    block(scene, 1.62, 0.88, 0.14, 0.08, 1.6, 'stone', IRON, 2.6)
    crate(scene, 1.5, 1.3)
    barrel(scene, 1.72, 1.4)
    rack(scene, 0.4, 1.6, 1.0, 1.6, 6, ['rgb(120, 124, 136)', 'rgb(142, 112, 80)', 'rgb(104, 108, 122)'])
  },
  // pans in which the brine dries in the sun, and a hut where the last of it is boiled
  saltworks: (scene) => {
    shop(scene, { wall: 'boards', roof: 'shingle', at: [0.24, 0.26, 1.0, 0.92], rise: 12, shape: 'v', stack: 6 })
    for (const [u, v] of [[1.2, 0.3], [1.2, 0.86], [0.3, 1.24], [0.94, 1.24]]) pan(scene, u, v, u + 0.56, v + 0.46)
    heap(scene, 1.68, 1.6, 0.16, 6, 'rgb(244, 246, 248)')
    sack(scene, 1.36, 1.62, WHITE)
    sack(scene, 1.46, 1.74, WHITE)
    barrel(scene, 1.06, 0.6)
  },
  // a house of brick with its gable to the yard, the copper still outside, a lean-to full of barrels
  distillery: (scene) => {
    const { b } = shop(scene, { wall: 'brick', roof: 'slate', stack: 10, shape: 'v', rise: 16, at: [0.3, 0.3, 1.12, 1.14] })
    shed(scene, 'se', 0.46, 1.0, b.at[2], 0.2, 8, { mat: 'boards' }, 'slate')
    cylinder(scene, 1.66, 0.7, 0.13, 0, 9, { mat: 'cloth', tint: 'rgb(196, 122, 76)' }, null, 0.8)
    cone(scene, 1.66, 0.7, 0.105, 9, 6, { mat: 'cloth', tint: 'rgb(206, 132, 84)' })
    barrel(scene, 1.6, 1.16)
    barrel(scene, 1.74, 1.28)
    barrel(scene, 0.6, 1.58)
    sack(scene, 0.9, 1.6)
  },
  // two storeys of timber with a hoist for the sacks, and the kiln where the malt is dried: round, under a pointed roof
  brewery: (scene) => {
    const { main } = shop(scene, { wall: 'plaster', tint: 'rgb(248, 234, 200)', roof: 'tile', timber: true, storeys: 2, base: 'stone', shape: 'v', rise: 16, loft: true, at: [0.3, 0.3, 1.1, 1.12] })
    hoist(scene, 'sw', (main.top[0] + main.top[2]) / 2, main.top[3], main.eaves + 9.6, 12)
    cylinder(scene, 1.56, 0.62, 0.2, 0, 17, { mat: 'plaster', tint: 'rgb(248, 234, 200)' })
    cone(scene, 1.56, 0.62, 0.23, 17, 15, 'tile')
    cylinder(scene, 1.56, 0.62, 0.035, 31, 34, { mat: 'boards', tint: 'rgb(236, 230, 220)' })
    vat(scene, 1.66, 1.16, 0.14, 6, 'rgb(170, 130, 70)')
    for (const [u, v] of [[1.36, 1.3], [0.5, 1.58], [0.68, 1.66], [0.9, 1.6]]) barrel(scene, u, v)
  },
  // a shop with a counter, and a shed at its side where the meat hangs
  butcher: (scene) => {
    const { b } = shop(scene, { wall: 'plaster', tint: 'rgb(246, 232, 216)', roof: 'tile', timber: true, frame: 'studs', base: 'stone', counter: true })
    shed(scene, 'se', 0.5, 1.02, b.at[2], 0.2, 8.4, { mat: 'boards' }, 'tile', { storeys: 1, storey: 8.4, door: 0.5, doorSize: [5, 7] })
    rack(scene, 1.72, 0.4, 1.72, 1.16, 8, ['rgb(170, 84, 70)', 'rgb(190, 110, 92)', 'rgb(160, 74, 62)', 'rgb(186, 104, 88)'])
    sign(scene, 'sw', 1.1, b.at[3], 11, 'rgb(150, 70, 60)')
    crate(scene, 0.6, 1.58, 0.22, 4)
    barrel(scene, 1.0, 1.62)
  },
  // a log house with a porch on posts, hides stretched to dry
  hunting_lodge: (scene) => {
    const { b } = shop(scene, { wall: 'logs', roof: 'shingle', rise: 15, stack: 5, at: [0.3, 0.34, 1.24, 1.08] })
    leanTo(scene, 'sw', 0.36, 0.96, b.at[3], 0.26, 15, 11, 'shingle')
    for (const u of [0.4, 0.92]) scene.box(u - 0.014, b.at[3] + 0.2, u + 0.014, b.at[3] + 0.228, 0, 11.4, 'timber', 'timber', null, false)
    rack(scene, 1.66, 0.44, 1.66, 1.2, 8, HIDES)
    woodpile(scene, 0.7, 1.66, 0.6, true, 6)
    stump(scene, 1.3, 1.5)
    bush(scene, 1.8, 1.74, 3.2, 3)
    boulder(scene, 1.5, 1.72, 0.7)
  },
  // a hall of boards, an open loft where the hides dry out of the sun, and the pits they soak in
  tannery: (scene) => {
    shop(scene, { wall: 'boards', roof: 'shingle', barn: true, at: [0.28, 0.32, 1.12, 1.04] })
    shelter(scene, 1.3, 0.3, 1.82, 0.96, 11, 5, 'v', 'shingle')
    rack(scene, 1.56, 0.4, 1.56, 0.86, 8, HIDES)
    rack(scene, 0.36, 1.7, 1.0, 1.7, 8, [...HIDES].reverse())
    vat(scene, 1.36, 1.32, 0.14, 1.8, 'rgb(112, 84, 56)')
    vat(scene, 1.68, 1.36, 0.14, 1.8, 'rgb(150, 126, 84)')
    vat(scene, 1.52, 1.64, 0.13, 1.8, 'rgb(96, 72, 50)')
  },
  // a tall barn where the leaves hang to dry, air between its boards, a lean-to at its side
  tobacco_factory: (scene) => {
    const { b } = shop(scene, { wall: 'boards', tint: 'rgb(226, 190, 150)', roof: 'shingle', barn: true, rise: 19, shape: 'v', loft: true, at: [0.3, 0.3, 1.14, 1.16] })
    shed(scene, 'se', 0.44, 1.04, b.at[2], 0.22, 8.4, { mat: 'boards', tint: 'rgb(226, 190, 150)' }, 'shingle')
    rack(scene, 1.72, 0.4, 1.72, 1.2, 8, ['rgb(146, 112, 60)', 'rgb(128, 100, 52)', 'rgb(156, 124, 66)', 'rgb(136, 104, 56)'])
    crate(scene, 0.6, 1.6)
    crate(scene, 0.84, 1.66, 0.17, 6)
    barrel(scene, 1.3, 1.62)
  },
  // a timber house; the vats of dye stand under a roof beside it, the cloth hangs in every colour
  dyer: (scene) => {
    shop(scene, { wall: 'plaster', tint: 'rgb(240, 236, 226)', roof: 'tile', timber: true, frame: 'cross', at: [0.28, 0.32, 1.12, 1.06] })
    shelter(scene, 1.28, 0.34, 1.84, 1.2, 10, 5, 'v', 'tile')
    vat(scene, 1.56, 0.52, 0.12, 3.6, 'rgb(170, 60, 64)')
    vat(scene, 1.56, 0.8, 0.12, 3.6, 'rgb(60, 84, 156)')
    vat(scene, 1.56, 1.06, 0.12, 3.6, 'rgb(214, 170, 60)')
    rack(scene, 0.3, 1.66, 1.2, 1.66, 8.5, ['rgb(176, 66, 70)', 'rgb(70, 96, 166)', 'rgb(220, 178, 70)', 'rgb(110, 70, 140)'])
    barrel(scene, 1.5, 1.6)
  },
  // a house of stone; the blubber is boiled in iron pots under a roof of its own, away from the house
  oil_boiler: (scene) => {
    shop(scene, { wall: 'stone', roof: 'slate', stack: 11, barn: true, at: [0.28, 0.32, 1.12, 1.06] })
    shelter(scene, 1.3, 0.4, 1.84, 1.1, 9, 5, 'v', 'slate')
    vat(scene, 1.56, 0.6, 0.14, 4.6, 'rgb(60, 52, 44)', 'stone')
    vat(scene, 1.58, 0.92, 0.12, 4.2, 'rgb(84, 70, 50)', 'stone')
    for (const [u, v] of [[0.5, 1.58], [0.7, 1.66], [0.94, 1.6], [1.5, 1.5]]) barrel(scene, u, v)
  },
  // a small house of dressed stone and a lodge: columns and slabs of marble wait under it and before it
  marble_mason: (scene) => {
    shop(scene, { wall: 'ashlar', roof: 'tile', at: [0.26, 0.28, 0.96, 0.86], rise: 9, shape: 'hip' })
    shelter(scene, 1.12, 0.4, 1.84, 1.06, 11, 6, 'u', 'tile')
    block(scene, 1.44, 0.7, 0.3, 0.22, 5, 'marble')
    cylinder(scene, 1.72, 0.84, 0.06, 0, 8, 'marble', 'marble')
    block(scene, 1.6, 1.3, 0.24, 0.24, 3.6, 'marble')
    cylinder(scene, 0.7, 1.56, 0.07, 0, 9, 'marble', 'marble')
    cylinder(scene, 1.0, 1.6, 0.07, 0, 5, 'marble', 'marble')
    block(scene, 1.3, 1.62, 0.34, 0.16, 2.4, 'marble')
  },
  // a fine small house of dressed stone, two storeys under a hipped roof, a bay over the door and a sign
  goldsmith: (scene) => {
    const { b } = shop(scene, { wall: 'ashlar', roof: 'slate', storeys: 2, at: [0.34, 0.38, 1.2, 1.14], rise: 13, shape: 'hip', stack: 5 })
    oriel(scene, { side: 'sw', at: 0.94, wall: b.at[3], half: 0.12, z0: 18.4, z1: 30, mat: 'ashlar', roof: 'slate' })
    sign(scene, 'se', 0.8, b.at[2], 11, 'rgb(196, 160, 70)')
    crate(scene, 1.62, 0.8, 0.14, 4.4)
    block(scene, 1.6, 1.2, 0.16, 0.12, 3.4, 'stone', IRON)
    bush(scene, 0.3, 1.7, 2.8)
    bush(scene, 1.7, 1.72, 2.8)
  },
}

/** Builds a workshop. Returns false for a building that is none. */
export function workshop(scene: Scene, id: string): boolean {
  const yard = YARDS[id]
  if (!yard) return false
  yard(scene)
  return true
}

/** A workshop for a trade that has no yard of its own here. */
export function plainWorkshop(scene: Scene): void {
  const { w, h } = scene
  shop(scene, { wall: 'plaster', roof: 'tile', timber: true, at: [w * 0.14, h * 0.16, w * 0.7, h * 0.66] })
  barrel(scene, w * 0.82, h * 0.5)
  crate(scene, w * 0.4, h * 0.82)
}

export { shop }
