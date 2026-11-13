// The market: six stalls that are six different stalls (a table under an awning, a tent, a handcart, a booth with
// shelves, a small kiosk), and the market house with its open hall of arches. A stall is much lower than any house:
// the edge of its awning hangs at AWNING world pixels, little more than half a door.
import { px, type Ctx, type P3, type Scene, type Surface } from './kit'
import { leanTo } from './extras'
import { dormerOn } from './look'
import { body, type Body } from './parts'
import { barrel, crate, dab, flag, rack, sack, vat } from './props'
import { cylinder } from './round'
import { gable, hip } from './roofs'
import { cart } from './yardProps'

/** Height of the front edge of an awning: one stoops to step under it. */
export const AWNING = 8.2
type Rgb = [number, number, number]

/** Cloth in two colours, in stripes that run down the awning. */
const striped = (stripe: string): Surface => ({
  mat: 'cloth',
  detail: (g: Ctx, w: number, h: number): void => {
    g.fillStyle = stripe
    for (let x = 0; x < w; x += 5) g.fillRect(x, 0, 2.5, h)
  },
})

const post = (scene: Scene, u: number, v: number, high: number): void => scene.box(u - 0.015, v - 0.015, u + 0.015, v + 0.015, 0, high, 'timber', 'timber', null, false)

/** Goods in a row on something `z` high: each a heap of its colour with a light on it. */
function wares(scene: Scene, u0: number, u1: number, v: number, z: number, goods: Rgb[]): void {
  goods.forEach((colour, i) => {
    const u = u0 + ((u1 - u0) * (i + 0.5)) / goods.length
    scene.item([[u, v, z], [u, v, z + 2]], (g) => {
      const [x, y] = px(u, v, z)
      dab(g, x, y - 0.8, 1.5, colour[0], colour[1], colour[2])
      dab(g, x - 0.5, y - 1.3, 0.7, Math.min(255, colour[0] + 40), Math.min(255, colour[1] + 40), Math.min(255, colour[2] + 36), 0.8)
    }, false)
  })
}

/** An awning that falls from the back to the front edge, on four posts. */
function awning(scene: Scene, stripe: string, u0 = 0.2, u1 = 0.82): void {
  for (const [u, v, z] of [[u0 + 0.04, 0.3, 11], [u1 - 0.04, 0.3, 11], [u0 + 0.04, 0.7, AWNING + 0.2], [u1 - 0.04, 0.7, AWNING + 0.2]] as P3[]) post(scene, u, v, z)
  scene.quad([[u0, 0.26, 11.4], [u1, 0.26, 11.4], [u1, 0.76, AWNING], [u0, 0.76, AWNING]], striped(stripe), 'lit')
}

const table = (scene: Scene, u0 = 0.28, u1 = 0.74): void => scene.box(u0, 0.34, u1, 0.62, 0, 4, 'planks', 'planks', 'planks')

/** A basket with something in it. */
const basket = (scene: Scene, u: number, v: number, colour: string): void => cylinder(scene, u, v, 0.05, 0, 2.6, { mat: 'thatch', tint: 'rgb(214, 190, 150)' }, { mat: 'cloth', tint: colour }, 1.15)

const STALLS: Record<string, (scene: Scene) => void> = {
  // bread, salt and smoked meat on a table, baskets before it
  food_salt_stand: (scene) => {
    table(scene)
    wares(scene, 0.3, 0.72, 0.48, 4, [[196, 150, 84], [236, 236, 230], [176, 96, 60]])
    awning(scene, 'rgba(170, 70, 60, 0.85)')
    basket(scene, 0.3, 0.86, 'rgb(196, 150, 84)')
    basket(scene, 0.46, 0.9, 'rgb(170, 60, 50)')
    sack(scene, 0.86, 0.6, [232, 226, 210])
  },
  // bolts of cloth on the table, lengths of it hanging on a line behind
  cloth_stand: (scene) => {
    rack(scene, 0.28, 0.3, 0.74, 0.3, 9, ['rgb(120, 146, 176)', 'rgb(206, 172, 96)', 'rgb(196, 110, 86)'])
    table(scene)
    for (const [i, tint] of ['rgb(120, 146, 176)', 'rgb(236, 230, 214)', 'rgb(196, 110, 86)'].entries()) scene.box(0.32 + i * 0.13, 0.4, 0.42 + i * 0.13, 0.56, 4, 5.4, { mat: 'cloth', tint }, { mat: 'cloth', tint }, { mat: 'cloth', tint }, false)
    awning(scene, 'rgba(70, 104, 150, 0.85)')
    crate(scene, 0.86, 0.84, 0.13, 4)
  },
  // a tent of striped cloth over a counter, the barrels stacked beside it
  drink_stand: (scene) => {
    scene.box(0.26, 0.44, 0.72, 0.58, 0, 4.4, 'boards', 'boards', 'planks')
    wares(scene, 0.3, 0.68, 0.51, 4.4, [[150, 110, 70], [206, 190, 150], [150, 110, 70]])
    for (const [u, v] of [[0.22, 0.28], [0.76, 0.28], [0.22, 0.72], [0.76, 0.72]]) post(scene, u, v, AWNING)
    gable(scene, 0.2, 0.26, 0.78, 0.74, AWNING, 3.6, 'u', 0.03, striped('rgba(96, 130, 80, 0.85)'), null)
    barrel(scene, 0.88, 0.5)
    barrel(scene, 0.88, 0.68)
    barrel(scene, 0.44, 0.9, 0.85)
  },
  // a handcart of sacks and bundles under a small awning on two poles
  tobacco_spice_stand: (scene) => {
    for (const u of [0.26, 0.74]) post(scene, u, 0.3, 11)
    scene.quad([[0.2, 0.28, 11.2], [0.8, 0.28, 11.2], [0.8, 0.62, AWNING + 0.6], [0.2, 0.62, AWNING + 0.6]], striped('rgba(190, 130, 60, 0.85)'), 'lit')
    cart(scene, 0.48, 0.5, 'rgb(146, 112, 60)')
    wares(scene, 0.36, 0.6, 0.5, 5.2, [[196, 60, 44], [224, 176, 56]])
    sack(scene, 0.28, 0.82, [176, 96, 60])
    sack(scene, 0.44, 0.9)
    basket(scene, 0.64, 0.88, 'rgb(224, 176, 56)')
  },
  // a booth with a back of boards: jars and lamps on its shelf, a tub of oil before it
  lamp_oil_stand: (scene) => {
    scene.box(0.24, 0.26, 0.78, 0.32, 0, 10.6, {
      mat: 'boards',
      detail: (g, w, h) => {
        g.fillStyle = 'rgb(150, 118, 82)'
        g.fillRect(0, h - 7.6, w, 0.7)
        for (let k = 0; k < 6; k++) dab(g, 2 + k * 3, h - 8.6, 0.9, k % 2 ? 226 : 150, k % 2 ? 200 : 120, k % 2 ? 120 : 70)
      },
    }, 'boards', null, false)
    table(scene)
    wares(scene, 0.3, 0.72, 0.48, 4, [[226, 200, 120], [84, 70, 50], [226, 200, 120]])
    awning(scene, 'rgba(120, 100, 150, 0.85)')
    vat(scene, 0.86, 0.84, 0.07, 3, 'rgb(84, 70, 50)')
  },
  // a small kiosk that can be locked, under a pointed roof of rich cloth: what it sells is small and dear
  jewelry_stand: (scene) => {
    const front: Surface = {
      mat: 'boards',
      tint: 'rgb(226, 200, 170)',
      detail: (g, w, h) => {
        g.fillStyle = 'rgb(34, 28, 32)'
        g.fillRect(2, h - 7, w - 4, 3.4)
        g.fillStyle = 'rgb(170, 136, 96)'
        g.fillRect(1, h - 3.8, w - 2, 0.9)
        for (let k = 0; k < 4; k++) dab(g, 4 + k * ((w - 8) / 3), h - 4.4, 0.6, k % 2 ? 150 : 226, 190, k % 2 ? 206 : 96)
      },
    }
    scene.box(0.28, 0.3, 0.72, 0.62, 0, AWNING - 0.4, front, { mat: 'boards', tint: 'rgb(226, 200, 170)' })
    hip(scene, 0.28, 0.3, 0.72, 0.62, AWNING - 0.4, 4.6, 0.07, striped('rgba(140, 60, 90, 0.85)'))
    crate(scene, 0.84, 0.74, 0.14, 3.6)
    flag(scene, 0.5, 0.46, AWNING + 4, 4, 'rgb(226, 190, 96)')
  },
}

/** Builds a market stall. Returns false if `id` is none. */
export function stall(scene: Scene, id: string): boolean {
  const make = STALLS[id]
  if (!make) return false
  make(scene)
  return true
}

/**
 * The market house: an open hall on arches of stone where the goods are weighed and sold, a storey of timber over it
 * that reaches out over the street, a hipped roof with a turret for the market bell, and a stall under an awning
 * before its sunlit wall.
 */
export function marketHouse(scene: Scene): void {
  const wash = 'rgb(250, 240, 216)'
  const hall = { storeys: 2, storey: 20, timber: true, frame: 'cross' as const, ground: 'ashlar' as const, arcade: 3, window: { leaded: true, flowers: true }, pane: [5.4, 8.4] as [number, number] }
  const b: Body = { at: [0.3, 0.3, 1.62, 1.52], wall: 'plaster', tint: wash, sw: { ...hall, windows: 4 }, se: { ...hall, windows: 3 }, roof: 'tile', rise: 18, shape: 'hip', over: 0.09, jetty: 0.06, lean: 0.4 }
  const main = body(scene, b)
  const [u0, v0, u1, v1] = main.top
  const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2]
  for (const u of [u0 + 0.36, u1 - 0.36]) dormerOn(scene, b, main, u, v1 - 0.16)
  // the turret with the bell: open on all sides, the bell dark in it
  const open: Surface = {
    mat: 'boards',
    wear: 0,
    detail: (g, w, h) => {
      g.fillStyle = 'rgb(30, 26, 30)'
      g.fillRect(1.4, 1.6, w - 2.8, h - 3)
      dab(g, w / 2, h / 2 + 0.4, 1.4, 196, 160, 84)
    },
  }
  scene.box(cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, main.ridge - 2, main.ridge + 7, open, open, null, false)
  hip(scene, cu - 0.1, cv - 0.1, cu + 0.1, cv + 0.1, main.ridge + 7, 8, 0.03, 'slate')
  flag(scene, cu, cv, main.ridge + 15, 9, 'rgb(70, 110, 170)')
  // a stall under an awning before the hall, and what has been brought to market
  for (const u of [0.42, 0.98]) post(scene, u, b.at[3] + 0.3, AWNING)
  leanTo(scene, 'sw', 0.36, 1.04, b.at[3], 0.34, 14, AWNING, striped('rgba(170, 70, 60, 0.85)'))
  scene.box(0.46, b.at[3] + 0.1, 0.94, b.at[3] + 0.24, 0, 3.8, 'planks', 'planks', 'planks')
  wares(scene, 0.5, 0.9, b.at[3] + 0.17, 3.8, [[196, 150, 84], [170, 60, 50], [120, 146, 80]])
  sack(scene, 1.84, 1.2)
  sack(scene, 1.86, 1.4, [176, 96, 60])
  crate(scene, 1.3, 1.84, 0.18)
  barrel(scene, 1.5, 1.88)
  barrel(scene, 1.84, 0.9)
  vat(scene, 1.14, 1.88, 0.07, 2.4, 'rgb(170, 60, 64)')
}
