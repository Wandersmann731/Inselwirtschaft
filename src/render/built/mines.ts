// Mines and quarries. A mine is a crag of rock with a timbered mouth, rails that run out of the dark with a truck
// on them, and what the miners need before it; each of the four mines has its own work at the surface. A quarry is
// the hill cut away in ledges, with the blocks that wait to be carried off, a crane and a ladder.
import { hash2 } from '../../world/noise2d'
import { px, type Ctx, type Scene, type Surface } from './kit'
import { shelter } from './extras'
import { cone, cylinder } from './round'
import { bar, barrel, block, boulder, crate, fill, heap, patch, sack } from './props'
import { shop } from './workshops'
import { cart, crane, ladder } from './yardProps'

/** What a mine brings up, as the colour of the heap before it. */
export const ORES: Record<string, string> = {
  ore_mine: 'rgb(190, 130, 104)', salt_mine: 'rgb(236, 236, 232)', gold_mine: 'rgb(226, 190, 96)', gem_mine: 'rgb(150, 190, 206)',
}

/** Rails of wood on sleepers from one place to another, on the ground. */
function rails(scene: Scene, u0: number, v0: number, u1: number, v1: number): void {
  scene.ground([[u0 - 0.1, v0, 0], [u1 + 0.1, v1, 0]], (g) => {
    const n = Math.round(Math.hypot(u1 - u0, v1 - v0) * 9)
    for (let k = 0; k <= n; k++) {
      const [u, v] = [u0 + ((u1 - u0) * k) / n, v0 + ((v1 - v0) * k) / n]
      bar(g, px(u - 0.09, v), px(u + 0.09, v), 0.8, 'rgb(104, 84, 62)')
    }
    for (const d of [-0.06, 0.06]) bar(g, px(u0 + d, v0), px(u1 + d, v1), 0.5, 'rgb(84, 76, 74)')
  })
}

/** A truck on the rails, heaped with what is dug. */
function truck(scene: Scene, u: number, v: number, load: string): void {
  scene.box(u - 0.085, v - 0.11, u + 0.085, v + 0.11, 1.2, 4.6, { mat: 'planks', tint: 'rgb(214, 186, 150)' }, { mat: 'planks', tint: 'rgb(214, 186, 150)' }, { mat: 'rock', tint: load, wear: 0 })
  cone(scene, u, v, 0.08, 4.6, 2.2, { mat: 'rock', tint: load })
}

/** A winch over a shaft: two legs, a drum with a crank between them, a rope down into the dark. */
function winch(scene: Scene, u: number, v: number): void {
  cylinder(scene, u, v, 0.13, 0, 2.6, 'stone', { mat: 'cloth', tint: 'rgb(28, 24, 28)' })
  scene.item([[u - 0.18, v, 0], [u + 0.18, v, 15]], (g) => {
    const top = px(u, v, 14)
    for (const d of [-0.17, 0.17]) {
      bar(g, px(u + d, v + 0.05, 0), [top[0] + (d < 0 ? -3.4 : 3.4), top[1] + (d < 0 ? -1.7 : 1.7)], 1, 'rgb(118, 92, 64)')
      bar(g, px(u + d, v - 0.05, 0), [top[0] + (d < 0 ? -3.4 : 3.4), top[1] + (d < 0 ? -1.7 : 1.7)], 0.8, 'rgb(96, 76, 54)')
    }
    bar(g, [top[0] - 4.4, top[1] - 2.2], [top[0] + 4.4, top[1] + 2.2], 2.2, 'rgb(150, 118, 82)')
    bar(g, top, [top[0], top[1] + 12], 0.35, 'rgb(84, 72, 56)')
    bar(g, [top[0] + 4.4, top[1] + 2.2], [top[0] + 6, top[1] + 5], 0.5, 'rgb(70, 62, 58)')
  }, false)
}

/** A mine. */
export function mine(scene: Scene, id: string): void {
  const ore = ORES[id] ?? 'rgb(150, 150, 150)'
  const pick = (n: number): number => hash2(n, 3, scene.seed)
  patch(scene, 0.1, 0.1, 1.9, 1.9, 'rgb(150, 140, 126)')
  // the crag: a high back, shoulders to either side, and a face of rock the mouth is driven into
  // (no two crags are alike: where its peaks stand and how high follows from the mine)
  cone(scene, 0.44 + 0.12 * pick(31), 0.36, 0.42, 0, 26 + 8 * pick(32), 'rock')
  cone(scene, 1.1, 0.3, 0.4, 0, 24 + 10 * pick(33), 'rock')
  cone(scene, 0.8, 0.62, 0.7, 0, 34 + 8 * pick(34), 'rock')
  cone(scene, 1.5, 0.46, 0.44, 0, 20 + 8 * pick(35), 'rock')
  cone(scene, 0.3, 0.86, 0.3, 0, 13 + 6 * pick(36), 'rock')
  const face: Surface = {
    mat: 'rock',
    detail: (g: Ctx, w: number, h: number): void => {
      // the mouth: the dark between two posts and a lintel of oak
      g.fillStyle = 'rgb(18, 16, 20)'
      g.fillRect(w / 2 - 4.4, h - 12, 8.8, 12)
      g.fillStyle = 'rgb(134, 104, 72)'
      g.fillRect(w / 2 - 5.6, h - 13, 1.4, 13)
      g.fillRect(w / 2 + 4.2, h - 13, 1.4, 13)
      g.fillRect(w / 2 - 6.4, h - 14.4, 12.8, 1.6)
      // a lamp hangs in it
      g.fillStyle = 'rgb(250, 206, 120)'
      g.fillRect(w / 2 + 1.6, h - 10.6, 1.1, 1.4)
      scene.lit(g, w / 2 + 1.2, h - 11, 1.9, 2.2)
    },
  }
  scene.box(0.46, 0.84, 1.18, 1.08, 0, 19, face, 'rock', 'rock')
  scene.box(0.34, 0.9, 0.5, 1.12, 0, 11, 'rock', 'rock', 'rock')
  rails(scene, 0.82, 1.08, 0.82, 1.94)
  truck(scene, 0.82, 1.5, ore)
  if (id === 'gem_mine') {
    // the stones lie deep: a shaft with a winch beside the adit, and a table where they are sorted
    winch(scene, 1.5, 1.26)
    scene.box(1.3, 1.66, 1.74, 1.82, 2.6, 3.6, 'planks', 'planks', { mat: 'planks', tint: 'rgb(236, 220, 196)' })
    heap(scene, 1.52, 1.74, 0.06, 2, ore)
    crate(scene, 0.34, 1.6, 0.18, 4.6)
    crate(scene, 0.4, 1.36, 0.14, 4)
  } else if (id === 'gold_mine') {
    // the gravel is washed in a long trough: water runs down it and leaves the gold
    scene.box(1.1, 1.26, 1.9, 1.38, 3.4, 5, 'planks', 'planks', { mat: 'cloth', tint: 'rgb(96, 150, 176)', wear: 0 })
    for (const u of [1.18, 1.5, 1.82]) scene.box(u - 0.02, 1.28, u + 0.02, 1.36, 0, 3.4, 'timber', 'timber', null, false)
    shop(scene, { wall: 'boards', roof: 'shingle', at: [1.3, 0.76, 1.86, 1.1], rise: 8 })
    heap(scene, 1.5, 1.66, 0.2, 6, 'rgb(150, 140, 124)')
    heap(scene, 1.8, 1.7, 0.08, 2.6, ore)
    barrel(scene, 0.36, 1.56)
  } else if (id === 'salt_mine') {
    // rock salt is broken small and packed under a roof, out of the rain
    shelter(scene, 1.24, 0.9, 1.84, 1.44, 9, 5, 'v', 'shingle')
    heap(scene, 1.54, 1.14, 0.18, 6, ore)
    sack(scene, 1.4, 1.66, [236, 232, 220])
    sack(scene, 1.54, 1.76, [236, 232, 220])
    sack(scene, 1.7, 1.66, [226, 222, 208])
    barrel(scene, 0.34, 1.5)
    barrel(scene, 0.42, 1.68, 0.9)
  } else {
    // ore: a hut for the tools, a heap of the red stone and one of the dead rock, a cart to take it to the smelter
    shop(scene, { wall: 'boards', roof: 'shingle', at: [1.24, 0.8, 1.86, 1.16], rise: 9 })
    heap(scene, 1.5, 1.5, 0.24, 8, ore)
    heap(scene, 0.34, 1.6, 0.17, 5, 'rgb(128, 122, 116)')
    cart(scene, 1.5, 1.84, ore)
  }
  for (let i = 0; i < 5; i++) boulder(scene, 0.16 + pick(i) * 0.5, 1.16 + pick(i + 10) * 0.2, 0.5 + 0.5 * pick(i + 20))
}

/** A quarry. */
export function quarry(scene: Scene, marble: boolean): void {
  const mat = marble ? 'marble' : 'rock'
  const tint = marble ? 'rgb(236, 234, 228)' : undefined
  const cut = marble ? 'marble' : 'ashlar'
  const pick = (n: number): number => hash2(n, 5, scene.seed)
  patch(scene, 0.06, 0.06, 1.94, 1.94, marble ? 'rgb(206, 202, 194)' : 'rgb(150, 142, 130)')
  // a face shows where the blocks were split off: rows of holes the wedges were driven into
  const face: Surface = {
    mat,
    tint,
    detail: (g, w, h) => {
      g.fillStyle = marble ? 'rgba(120, 120, 130, 0.3)' : 'rgba(30, 28, 34, 0.3)'
      for (let y = 4; y < h - 2; y += 6.5) for (let x = 2; x < w - 1; x += 2.6) g.fillRect(x, y, 0.6, 1.5)
    },
  }
  const top: Surface = { mat, tint: marble ? 'rgb(250, 248, 244)' : 'rgb(236, 230, 220)' }
  // a ledge from one place to another, broken into parts of unequal height
  const ledge = (u0: number, v0: number, u1: number, v1: number, high: number, parts: number, salt: number): void => {
    const alongU = u1 - u0 > v1 - v0
    for (let i = 0; i < parts; i++) {
      const [a, b] = [i / parts, (i + 1) / parts]
      const z = high * (0.78 + 0.4 * pick(salt + i))
      if (alongU) scene.box(u0 + (u1 - u0) * a, v0, u0 + (u1 - u0) * b, v1, 0, z, face, face, top)
      else scene.box(u0, v0 + (v1 - v0) * a, u1, v0 + (v1 - v0) * b, 0, z, face, face, top)
    }
  }
  ledge(0.08, 0.08, 1.92, 0.5, 27, 5, 1)
  ledge(0.08, 0.5, 1.2, 0.8, 17, 3, 10)
  ledge(0.08, 0.8, 0.46, 1.5, 11, 3, 20)
  ledge(0.46, 0.8, 0.86, 1.04, 6, 2, 30)
  ladder(scene, 1.5, 0.74, 24)
  // blocks that are cut and wait, one of them on the cart
  block(scene, 1.1, 1.3, 0.3, 0.22, 5, cut)
  block(scene, 1.1, 1.3, 0.2, 0.16, 3.4, cut, undefined, 5)
  block(scene, 0.8, 1.6, 0.3, 0.18, 3.6, cut)
  cart(scene, 1.3, 1.78)
  block(scene, 1.3, 1.78, 0.2, 0.12, 2.6, cut, undefined, 5.2)
  crane(scene, 1.72, 1.2, 0, 22, marble ? 'rgb(236, 234, 228)' : 'rgb(176, 170, 158)')
  if (marble) {
    // a frame with a long saw: marble is sawn, not split
    scene.item([[1.4, 0.98, 0], [1.9, 1.02, 9]], (g) => {
      bar(g, px(1.42, 1.0, 0), px(1.42, 1.0, 9), 0.8, 'rgb(118, 92, 64)')
      bar(g, px(1.88, 1.0, 0), px(1.88, 1.0, 9), 0.8, 'rgb(118, 92, 64)')
      bar(g, px(1.42, 1.0, 9), px(1.88, 1.0, 9), 0.9, 'rgb(134, 106, 74)')
      bar(g, px(1.46, 1.0, 5.4), px(1.84, 1.0, 5.4), 0.4, 'rgb(96, 100, 116)')
      fill(g, [px(1.52, 1.04, 0), px(1.8, 1.04, 0), px(1.8, 1.04, 5), px(1.52, 1.04, 5)], 'rgb(232, 230, 224)')
    }, false)
  } else shelter(scene, 1.42, 0.84, 1.86, 1.08, 8, 4, 'u', 'shingle')
  for (let i = 0; i < 6; i++) boulder(scene, 0.54 + pick(40 + i) * 1.3, 1.16 + pick(50 + i) * 0.7, 0.4 + 0.5 * pick(60 + i), marble ? [226, 224, 216] : [142, 136, 126])
}
