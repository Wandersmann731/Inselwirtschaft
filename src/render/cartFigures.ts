// Carts: boards, stakes and wheels with spokes that turn. Painted once per pose and kept, like the people and the
// oxen (figures.ts).
import { FIGURE_SCALE, IRON, lay, limb, oval, SHADE, shadow, shape, sprite, WOOD, WOOD_DARK, type Ctx } from './figureKit'

/** A wheel around (x, y): an iron tyre on a wooden rim, eight spokes turned by `turn`, a hub. */
function wheel(g: Ctx, x: number, y: number, r: number, turn: number, far: boolean): void {
  g.strokeStyle = IRON
  g.lineWidth = 0.5
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.stroke()
  g.strokeStyle = far ? WOOD_DARK : WOOD
  g.lineWidth = 0.7
  g.beginPath()
  g.arc(x, y, r - 0.55, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 0.42
  g.beginPath()
  for (let spoke = 0; spoke < 4; spoke++) {
    const angle = turn + (spoke * Math.PI) / 4
    g.moveTo(x - Math.cos(angle) * (r - 0.6), y - Math.sin(angle) * (r - 0.6))
    g.lineTo(x + Math.cos(angle) * (r - 0.6), y + Math.sin(angle) * (r - 0.6))
  }
  g.stroke()
  oval(g, x, y, 0.75, 0.75, far ? '#3a2c1e' : WOOD_DARK)
  if (far) return
  oval(g, x - 0.2, y - 0.2, 0.3, 0.3, 'rgba(255, 226, 180, 0.5)')
  // the light lies on the upper left of the rim
  g.strokeStyle = 'rgba(255, 236, 200, 0.4)'
  g.lineWidth = 0.3
  g.beginPath()
  g.arc(x, y, r - 0.5, Math.PI * 0.95, Math.PI * 1.6)
  g.stroke()
}

/** How the box of a cart is cut: half its length, the radius of its wheels, where its floor and its upper edge lie. Pure. */
export function cartShape(big: boolean): { half: number; wheel: number; floor: number; top: number } {
  const wheelRadius = big ? 3.4 : 2.8
  const floor = -(wheelRadius + 0.7)
  return { half: big ? 6.8 : 5, wheel: wheelRadius, floor, top: floor - 3.7 }
}

/** What of a cart lies behind its load (the far wheel, the far boards, the handles) or before it (the near boards, the near wheel). */
function paintCart(g: Ctx, f: number, big: boolean, turn: number, front: boolean): void {
  const { half, wheel: r, floor, top } = cartShape(big)
  if (!front) {
    shadow(g, 2.4, half + 3, 2.3)
    wheel(g, 1.3, -r - 0.7, r, turn, true)
    // the inside of the far boards, dark
    shape(g, [-half + 1, top + 0.3, half + 1, top + 0.3, half + 1, floor, -half + 1, floor], '#4a3824')
    if (!big) {
      // the handles a person pushes it by, and the leg it stands on
      limb(g, -half * f, floor - 0.5, -(half + 3.8) * f, floor - 2.3, 0.7, WOOD_DARK)
      limb(g, -(half - 1) * f, floor, -(half - 0.6) * f, -0.4, 0.6, WOOD_DARK)
    }
    return
  }
  // the near side: three boards, each a little different, the joints between them dark
  const boards = ['#96724a', '#8a6844', '#9c784e']
  const high = (floor - top) / 3
  for (let k = 0; k < 3; k++) {
    g.fillStyle = boards[k]
    g.fillRect(-half, top + k * high, half * 2, high - 0.18)
    g.fillStyle = 'rgba(255, 236, 200, 0.22)'
    g.fillRect(-half, top + k * high, half * 2, 0.26)
    // the grain of the wood
    g.fillStyle = 'rgba(60, 40, 24, 0.3)'
    for (let n = 0; n < 4; n++) g.fillRect(-half + 0.6 + ((n * 37 + k * 23) % (half * 20 - 30)) / 10, top + k * high + 0.4 + ((n * 13 + k * 7) % 5) / 10, 1.6 + (n % 2), 0.14)
  }
  g.fillStyle = SHADE
  g.fillRect(-half, floor - 1, half * 2, 1)
  // the floor beam, the stakes that hold the boards, and iron at the corners
  g.fillStyle = WOOD_DARK
  g.fillRect(-half - 0.4, floor - 0.1, half * 2 + 0.8, 0.8)
  for (const post of [-half, -0.45, half - 0.9]) {
    g.fillStyle = WOOD_DARK
    g.fillRect(post, top - 0.9, 0.9, floor - top + 0.9)
    g.fillStyle = 'rgba(255, 226, 180, 0.3)'
    g.fillRect(post, top - 0.9, 0.3, floor - top + 0.9)
  }
  g.fillStyle = IRON
  for (const post of [-half, half - 0.9]) g.fillRect(post, top + 0.5, 0.9, 0.35)
  if (big) limb(g, half * f, floor + 0.2, (half + 1.6) * f, floor - 0.6, 0.8, WOOD_DARK)
  wheel(g, 0, -r, r, turn, false)
}

/**
 * A cart with its load drawn in it. `big`: the wider cart an ox pulls, otherwise a hand cart with handles towards
 * whoever pushes it. `facing` is the way it rolls (1 right, -1 left) and `roll` turns its wheels.
 */
export function drawCartBody(ctx: Ctx, px: number, py: number, load: CanvasImageSource | undefined, big: boolean, facing = 1, roll = 0): void {
  const f = facing >= 0 ? 1 : -1
  // a wheel of eight spokes looks the same after an eighth of a turn
  const step = Math.floor((((roll * f) % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4) / (Math.PI / 16)) % 4
  const part = (front: boolean): void => lay(ctx, sprite(`c|${big ? 1 : 0}|${f}|${step}|${front ? 1 : 0}`, 32, 16, 15, 13, (g) => paintCart(g, f, big, (step * Math.PI) / 16, front)), px, py, 32, 16, 15, 13)
  part(false)
  if (load) {
    const { top } = cartShape(big)
    const size = 9.6 * FIGURE_SCALE
    // the load stands on the floor of the cart: its lower part is hidden behind the near boards
    ctx.drawImage(load, px - size / 2, py + (top - 5.8) * FIGURE_SCALE, size, size)
  }
  part(true)
}
