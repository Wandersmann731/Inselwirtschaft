// What stands in a farmyard, a churchyard or before an inn: a well, a cart, a scarecrow, crosses on graves, a table
// with benches. Small things, but they tell who lives and works there.
import { hash2 } from '../../world/noise2d'
import { AU, DOWN, DUSK, px, type Scene } from './kit'
import { bar } from './props'
import { cylinder } from './round'
import { gable } from './roofs'

/** A well: a ring of stone with dark water in it, under a small roof on two posts. */
export function well(scene: Scene, u: number, v: number): void {
  cylinder(scene, u, v, 0.09, 0, 4.2, 'stone', { mat: 'cloth', tint: 'rgb(40, 58, 74)' })
  for (const du of [-0.1, 0.1]) scene.box(u + du - 0.012, v - 0.012, u + du + 0.012, v + 0.012, 0, 11, 'timber', 'timber', null, false)
  gable(scene, u - 0.12, v - 0.08, u + 0.12, v + 0.08, 11, 3.6, 'u', 0.02, 'shingle', null)
}

/** A cart with two wheels that stands along u, its shafts on the ground. */
export function cart(scene: Scene, u: number, v: number, load?: string): void {
  scene.box(u - 0.16, v - 0.08, u + 0.16, v + 0.08, 2.6, 5.2, 'boards', 'boards', load ? { mat: 'cloth', tint: load } : 'planks')
  // the wheel on the side one sees, and the shafts
  scene.item([[u - 0.2, v + 0.08, 0], [u + 0.34, v + 0.1, 5]], (g) => {
    const [x, y] = px(u, v + 0.09, 0)
    g.save()
    g.transform(AU[0], AU[1], DOWN[0], DOWN[1], x, y)
    g.fillStyle = 'rgb(84, 64, 46)'
    g.beginPath()
    g.arc(0, -2.5, 2.5, 0, Math.PI * 2)
    g.arc(0, -2.5, 1.7, 0, Math.PI * 2, true)
    g.fill()
    g.fillRect(-0.3, -4.6, 0.6, 4.2)
    g.fillRect(-2.1, -2.8, 4.2, 0.6)
    g.fillStyle = 'rgb(126, 98, 70)'
    g.beginPath()
    g.moveTo(5.6, -3.4)
    g.lineTo(12.4, -0.6)
    g.lineTo(12.4, 0)
    g.lineTo(5.6, -2.6)
    g.closePath()
    g.fill()
    g.restore()
  }, false)
}

/** A scarecrow: a coat and a hat on a cross of poles. */
export function scarecrow(scene: Scene, u: number, v: number): void {
  scene.item([[u - 0.08, v, 0], [u + 0.08, v, 11]], (g) => {
    const [x, y] = px(u, v)
    g.fillStyle = 'rgb(104, 82, 58)'
    g.fillRect(x - 0.3, y - 10, 0.6, 10)
    g.fillRect(x - 3.2, y - 7.6, 6.4, 0.6)
    g.fillStyle = 'rgb(126, 92, 70)'
    g.beginPath()
    g.moveTo(x - 3, y - 7.8)
    g.lineTo(x + 3, y - 7.8)
    g.lineTo(x + 1.5, y - 3.4)
    g.lineTo(x - 1.5, y - 3.4)
    g.closePath()
    g.fill()
    g.fillStyle = `rgba(${DUSK}, 0.25)`
    g.fillRect(x, y - 7.8, 3, 4.4)
    g.fillStyle = 'rgb(214, 186, 120)'
    g.beginPath()
    g.ellipse(x, y - 8.9, 1.1, 1.1, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgb(150, 120, 70)'
    g.beginPath()
    g.ellipse(x, y - 9.7, 2.1, 0.6, 0, 0, Math.PI * 2)
    g.fill()
  })
}

/** Graves: a few crosses and stones of different height around a place, each on its small mound. */
export function graves(scene: Scene, u: number, v: number, count: number, seed: number): void {
  for (let i = 0; i < count; i++) {
    const gu = u + (i % 3) * 0.2 + (hash2(i, 1, seed) - 0.5) * 0.06
    const gv = v + Math.floor(i / 3) * 0.24 + (hash2(i, 2, seed) - 0.5) * 0.06
    const stone = hash2(i, 3, seed) < 0.45
    scene.item([[gu - 0.04, gv - 0.02, 0], [gu + 0.04, gv + 0.02, 6]], (g) => {
      const [x, y] = px(gu, gv)
      g.fillStyle = 'rgba(96, 110, 64, 0.8)'
      g.beginPath()
      g.ellipse(x + 1.6, y + 1, 2.6, 1.1, 0.46, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = stone ? 'rgb(176, 172, 162)' : 'rgb(112, 90, 66)'
      if (stone) {
        g.beginPath()
        g.moveTo(x - 1.1, y)
        g.lineTo(x - 1.1, y - 3)
        g.arc(x, y - 3, 1.1, Math.PI, 0)
        g.lineTo(x + 1.1, y)
        g.closePath()
        g.fill()
      } else {
        g.fillRect(x - 0.3, y - 5, 0.6, 5)
        g.fillRect(x - 1.4, y - 3.8, 2.8, 0.6)
      }
      g.fillStyle = `rgba(${DUSK}, 0.22)`
      g.fillRect(x, y - (stone ? 4 : 5), stone ? 1.1 : 0.3, stone ? 4 : 5)
    })
  }
}

/** A table with a bench on either side, along u. */
export function table(scene: Scene, u: number, v: number): void {
  scene.box(u - 0.2, v - 0.16, u + 0.2, v - 0.11, 0, 2, 'boards', 'boards', 'planks', false)
  scene.box(u - 0.17, v - 0.08, u + 0.17, v + 0.08, 2.9, 3.8, 'planks', 'planks', 'planks')
  scene.box(u - 0.2, v + 0.11, u + 0.2, v + 0.16, 0, 2, 'boards', 'boards', 'planks', false)
}

/** A crane: a post with a jib that reaches towards smaller u, a rope and a load hanging from it. */
export function crane(scene: Scene, u: number, v: number, z: number, high: number, load = 'rgb(170, 136, 94)'): void {
  scene.item([[u, v, z], [u, v, z + high], [u - 0.6, v, z + high]], (g) => {
    const foot = px(u, v, z)
    const top = px(u, v, z + high)
    const tip = px(u - 0.6, v, z + high + 3)
    bar(g, foot, top, 1.5, 'rgb(118, 92, 64)')
    bar(g, [top[0], top[1] + 4], tip, 1.2, 'rgb(134, 106, 74)')
    bar(g, [foot[0], foot[1] - high * 0.45], [top[0] - 6, top[1] + 1.4], 0.8, 'rgb(104, 82, 58)')
    bar(g, tip, [tip[0], tip[1] + 11], 0.35, 'rgb(84, 72, 56)')
    bar(g, [tip[0] - 4, tip[1] + 12.4], [tip[0] + 4, tip[1] + 9.6], 1.3, load)
  }, false)
}

/** A ladder that leans against something `high` world pixels up, its foot at (u, v), its head further back along v. */
export function ladder(scene: Scene, u: number, v: number, high: number): void {
  scene.item([[u - 0.04, v - 0.2, 0], [u + 0.04, v, high]], (g) => {
    const rail = (du: number): [number, number][] => [px(u + du, v, 0), px(u + du, v - 0.2, high)]
    const [a0, a1] = rail(-0.035)
    const [b0, b1] = rail(0.035)
    for (let k = 1; k < 8; k++) {
      const t = k / 8
      bar(g, [a0[0] + (a1[0] - a0[0]) * t, a0[1] + (a1[1] - a0[1]) * t], [b0[0] + (b1[0] - b0[0]) * t, b0[1] + (b1[1] - b0[1]) * t], 0.4, 'rgb(150, 120, 84)')
    }
    bar(g, a0, a1, 0.5, 'rgb(128, 100, 70)')
    bar(g, b0, b1, 0.5, 'rgb(128, 100, 70)')
  }, false)
}
