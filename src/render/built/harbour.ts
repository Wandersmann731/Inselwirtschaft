// The buildings of the harbour: the trading post on its platform of planks, the fishery with its smokehouse, its
// racks of drying fish and its nets, and the whaler's station with the try-works where the blubber is boiled.
import { px, type P3, type Scene, type Surface } from './kit'
import { shed } from './extras'
import { stack } from './look'
import { body, chimney, type Body } from './parts'
import { bar, barrel, crate, dab, flag, rack } from './props'
import { cylinder } from './round'
import { deck } from './shipyard'
import { shop } from './workshops'

/** A small boat that lies on the height `z`, its bow towards larger u; `oars` lie across its thwarts. */
function boat(scene: Scene, u: number, v: number, z = 0, oars = false): void {
  const pts: P3[] = [[u - 0.3, v - 0.12, z], [u + 0.3, v + 0.12, z], [u, v, z + 4]]
  scene.item(pts, (g) => {
    const [x, y] = px(u, v, z)
    g.translate(x, y)
    g.transform(0.894, 0.447, 0, 1, 0, 0)
    g.fillStyle = 'rgb(112, 86, 60)'
    g.beginPath()
    g.moveTo(-12, -3)
    g.quadraticCurveTo(0, -5.4, 12, -3)
    g.quadraticCurveTo(9, 2.4, 0, 2.6)
    g.quadraticCurveTo(-9, 2.4, -12, -3)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgb(60, 46, 36)'
    g.beginPath()
    g.moveTo(-9.6, -2.6)
    g.quadraticCurveTo(0, -4.2, 9.6, -2.6)
    g.quadraticCurveTo(0, -0.4, -9.6, -2.6)
    g.closePath()
    g.fill()
    // thwarts, and the light on the gunwale
    g.fillStyle = 'rgb(150, 120, 84)'
    for (const tx of [-4.6, 0, 4.6]) g.fillRect(tx - 0.5, -3.6, 1, 2.4)
    g.fillStyle = 'rgba(255, 236, 200, 0.34)'
    g.fillRect(-10, -3.7, 20, 0.5)
    if (oars) {
      g.fillStyle = 'rgb(176, 146, 104)'
      g.fillRect(-8, -3, 15, 0.5)
      g.fillRect(-7, -2.2, 15, 0.5)
    }
  })
}

/** Fish hung up to dry: rows of them on lines between two posts, silver in the sun. */
function fishRack(scene: Scene, u0: number, u1: number, v: number, high: number): void {
  scene.item([[u0, v, 0], [u1, v, high]], (g) => {
    bar(g, px(u0, v, 0), px(u0, v, high), 0.9, 'rgb(112, 88, 62)')
    bar(g, px(u1, v, 0), px(u1, v, high), 0.9, 'rgb(112, 88, 62)')
    for (const z of [high - 0.6, high - 4.2]) {
      bar(g, px(u0, v, z), px(u1, v, z), 0.4, 'rgb(96, 78, 58)')
      for (let k = 1; k < 9; k++) {
        const [x, y] = px(u0 + ((u1 - u0) * k) / 9, v, z)
        g.fillStyle = k % 3 === 0 ? 'rgb(170, 176, 180)' : 'rgb(204, 208, 206)'
        g.beginPath()
        g.ellipse(x, y + 1.5, 0.55, 1.4, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
  }, false)
}

/** The trading post: a hall of warm wood under a pyramid roof of teal shingles, on its platform, with its flag. */
export function kontor(scene: Scene): void {
  deck(scene)
  const wood = 'rgb(236, 176, 124)'
  body(scene, {
    at: [0.34, 0.34, 1.4, 1.4], z: 2.4, wall: 'planks', tint: wood,
    sw: { storeys: 1, storey: 18, windows: 2, door: 0.5, doorStyle: 'barn', pane: [4.4, 6] },
    se: { storeys: 1, storey: 18, windows: 2, pane: [4.4, 6] },
    roof: 'verdigris', rise: 13, shape: 'hip', over: 0.1,
  })
  flag(scene, 0.87, 0.87, 33, 12, 'rgb(232, 196, 70)')
  for (const [u, v] of [[1.62, 0.5], [1.66, 0.76], [0.5, 1.64]]) crate(scene, u, v, 0.17, 5.4)
  scene.box(1.54, 0.42, 1.7, 0.58, 7.8, 12, 'planks', 'planks', 'planks', false)
  for (const [u, v] of [[1.6, 1.1], [1.74, 1.22], [0.84, 1.68], [1.02, 1.7]]) barrel(scene, u, v)
}

/** The fishery: a thatched hut with a store for the nets, a smokehouse, fish on the racks, a landing with a boat at it. */
export function fishery(scene: Scene): void {
  const { b } = shop(scene, { wall: 'planks', roof: 'thatch', at: [0.26, 0.28, 1.04, 1.06], rise: 14, shape: 'v' })
  shed(scene, 'se', 0.44, 0.96, b.at[2], 0.18, 7.6, { mat: 'boards' }, 'thatch')
  // the smokehouse: narrow and tall, black with soot under its eaves
  const smoke: Body = { at: [1.44, 0.24, 1.8, 0.58], wall: 'boards', tint: 'rgb(196, 176, 160)', sw: { storeys: 1, storey: 15, door: 0.5, doorSize: [4.6, 9] }, se: { storeys: 1, storey: 15 }, roof: 'shingle', rise: 7, shape: 'v', over: 0.06 }
  stack(scene, body(scene, smoke), 1.62, 0.36, 3, 'stone')
  fishRack(scene, 1.3, 1.86, 0.92, 9)
  rack(scene, 1.9, 1.06, 1.9, 1.6, 9, ['rgba(150, 150, 140, 0.8)', 'rgba(170, 168, 150, 0.8)', 'rgba(140, 142, 136, 0.8)'])
  // the landing: a few planks on posts, the boat beside it, the other one pulled up and turned over
  scene.box(1.06, 1.42, 1.74, 1.66, 0, 1.8, { mat: 'boards', tint: 'rgb(170, 150, 130)' }, { mat: 'boards', tint: 'rgb(170, 150, 130)' }, 'deck', false)
  boat(scene, 1.3, 1.84, 0, true)
  boat(scene, 0.56, 1.5)
  // baskets of the catch, barrels of salt fish
  for (const [u, v] of [[1.2, 1.5], [1.36, 1.56]]) cylinder(scene, u, v, 0.05, 1.8, 4.2, { mat: 'thatch', tint: 'rgb(214, 190, 150)' }, { mat: 'cloth', tint: 'rgb(170, 178, 184)' }, 1.15)
  barrel(scene, 0.3, 1.2)
  barrel(scene, 0.4, 1.86, 0.9)
  crate(scene, 0.9, 1.3, 0.16, 4)
}

/** The whaler's station: a hut, the try-works of brick with its iron pots, a whaleboat, the jaw of a whale set up as a gate. */
export function whaler(scene: Scene): void {
  const z = 2.4
  deck(scene, z)
  const b: Body = { at: [0.28, 0.28, 1.04, 0.98], z, wall: 'boards', sw: { storeys: 1, storey: 17, windows: 1, door: 0.6, doorStyle: 'barn' }, se: { storeys: 1, storey: 17, windows: 1 }, roof: 'shingle', rise: 13, over: 0.08, paved: true }
  body(scene, b)
  // the try-works: a hearth of brick with two pots let into it, a fire under them, a chimney behind
  const hearth: Surface = {
    mat: 'brick',
    detail: (g, w, h) => {
      for (const x of [w * 0.28, w * 0.72]) {
        g.fillStyle = 'rgb(28, 22, 24)'
        g.fillRect(x - 2.2, h - 3.6, 4.4, 3.6)
        dab(g, x, h - 1.3, 1.3, 236, 140, 60)
      }
    },
  }
  scene.box(1.26, 0.4, 1.84, 0.74, z, z + 6, hearth, 'brick', { mat: 'brick', tint: 'rgb(214, 204, 196)' })
  for (const u of [1.41, 1.69]) cylinder(scene, u, 0.57, 0.11, z + 6, z + 8, { mat: 'cloth', tint: 'rgb(64, 60, 66)' }, { mat: 'cloth', tint: 'rgb(96, 78, 50)' })
  chimney(scene, 1.76, 0.34, z, 20, 'brick', true)
  // the jaw bones of a whale, set up as an arch
  scene.item([[0.34, 1.76, z], [0.86, 1.76, z + 17]], (g) => {
    const [x, y] = px(0.6, 1.76, z)
    for (const dir of [-1, 1]) {
      g.fillStyle = dir < 0 ? 'rgb(240, 234, 218)' : 'rgb(206, 200, 190)'
      g.beginPath()
      g.moveTo(x + dir * 9, y + dir * 4.5)
      g.quadraticCurveTo(x + dir * 9.4, y - 12 + dir * 4, x + dir * 0.4, y - 16)
      g.quadraticCurveTo(x + dir * 7, y - 10 + dir * 3.4, x + dir * 7, y + dir * 3.5)
      g.closePath()
      g.fill()
    }
  }, false)
  boat(scene, 1.3, 1.64, z, true)
  // harpoons and lances in a rack, casks of oil in rows
  scene.item([[1.2, 1.1, z], [1.5, 1.1, z + 13]], (g) => {
    bar(g, px(1.2, 1.1, z + 6), px(1.5, 1.1, z + 6), 0.6, 'rgb(112, 88, 62)')
    for (let k = 0; k < 4; k++) {
      const u = 1.23 + k * 0.08
      bar(g, px(u, 1.14, z), px(u, 1.08, z + 12), 0.4, 'rgb(150, 120, 84)')
      bar(g, px(u, 1.08, z + 12), px(u, 1.07, z + 14), 0.5, 'rgb(96, 100, 116)')
    }
  }, false)
  for (const [u, v] of [[1.62, 1.04], [1.76, 1.12], [1.62, 1.22], [1.76, 1.3], [0.3, 1.3], [0.42, 1.42]]) barrel(scene, u, v)
  crate(scene, 1.84, 1.7, 0.16, 4)
}
