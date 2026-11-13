// Small figures for the life on the map: people, oxen and carts. All drawn with canvas shapes, a few pixels each,
// in a side view that faces left or right. (x, y) is always the point on the ground under the figure.
// They are built like the things they show, not like signs: a person is seven heads tall, bodies have a lit and a
// shaded side (the light comes from the top left, as on the buildings), nothing has an outline, and every figure
// throws a shadow to the right.

/**
 * World pixels per unit of the figures' drawing grid. A person is 12.5 units tall and a house door 13 world pixels
 * high (see scripts/assets/picture-scale.json), so people fit through the doors.
 */
export const FIGURE_SCALE = 0.95

const SKIN = '#d3ab86'
const TROUSERS = '#4b4136'
const SHOE = '#2e2620'
/** Laid over the half of a body that faces away from the light. */
const SHADE = 'rgba(24, 18, 14, 0.3)'
const WOOD = '#8a6844'
const WOOD_DARK = '#5a432c'

/** Enlarges what is drawn next around the ground point; the caller ends it with ctx.restore(). Returns the point to draw at. */
function enlarge(ctx: CanvasRenderingContext2D, x: number, y: number): [number, number] {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(FIGURE_SCALE, FIGURE_SCALE)
  return [0, 0]
}

/** The shadow on the ground: it falls to the right, away from the light, and is longer than the figure is wide. */
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(14, 22, 18, 0.26)'
  ctx.beginPath()
  ctx.ellipse(x + rx * 0.55, y + 0.4, rx * 1.25, ry, -0.12, 0, Math.PI * 2)
  ctx.fill()
}

export interface PersonLook {
  shirt: string
  /** Hat or hair. */
  top: string
  /** Reaches forward with the arms, as when pushing a cart. */
  pushing?: boolean
  /** Carries a sack on the back. */
  sack?: boolean
}

/** A walking person, 12.5 units tall. `facing` is 1 for right and -1 for left, `stride` drives the legs. */
export function drawPerson(ctx: CanvasRenderingContext2D, px: number, py: number, facing: number, stride: number, look: PersonLook): void {
  const [x, y] = enlarge(ctx, px, py)
  shadow(ctx, x, y, 2.6, 1)
  const swing = Math.sin(stride) * 1.5
  const top = y - Math.abs(Math.cos(stride)) * 0.5
  ctx.lineCap = 'round'
  // legs: the far one first and darker
  for (const [reach, colour] of [[-swing, SHOE], [swing, TROUSERS]] as const) {
    ctx.strokeStyle = colour
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, top - 5.4)
    ctx.lineTo(x + reach, y - 0.6)
    ctx.stroke()
    ctx.fillStyle = SHOE
    ctx.fillRect(x + reach - 0.6 + 0.4 * facing, y - 1, 1.4, 1)
  }
  if (look.sack) {
    ctx.fillStyle = '#a58a5e'
    ctx.beginPath()
    ctx.ellipse(x - 1.9 * facing, top - 8.4, 1.7, 2.1, 0.3 * facing, 0, Math.PI * 2)
    ctx.fill()
  }
  // the body: shoulders a little wider than the hips
  ctx.fillStyle = look.shirt
  ctx.beginPath()
  ctx.moveTo(x - 1.5, top - 10.2)
  ctx.quadraticCurveTo(x, top - 10.9, x + 1.5, top - 10.2)
  ctx.lineTo(x + 1.25, top - 5)
  ctx.lineTo(x - 1.25, top - 5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = SHADE
  ctx.fillRect(x + 0.2, top - 10.4, 1.3, 5.4)
  // the arm on the near side
  ctx.strokeStyle = look.shirt
  ctx.lineWidth = 1.1
  ctx.beginPath()
  if (look.pushing) {
    ctx.moveTo(x + 0.6 * facing, top - 9.4)
    ctx.lineTo(x + 3.9 * facing, top - 7.4)
  } else {
    ctx.moveTo(x - 0.2 * facing, top - 9.6)
    ctx.lineTo(x - 0.2 * facing - swing * 0.7, top - 6)
  }
  ctx.stroke()
  // head and hair or hat
  ctx.fillStyle = SKIN
  ctx.beginPath()
  ctx.arc(x + 0.25 * facing, top - 11.4, 1.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = look.top
  ctx.beginPath()
  ctx.arc(x + 0.1 * facing, top - 11.7, 1.25, Math.PI * 0.95, Math.PI * 2.05)
  ctx.fill()
  ctx.fillRect(x - 1.7, top - 11.9, 3.4, 0.55)
  ctx.restore()
}

/** An ox in front of a cart, about fifteen units long. */
export function drawOx(ctx: CanvasRenderingContext2D, px: number, py: number, facing: number, stride: number, coat: string): void {
  const [x, y] = enlarge(ctx, px, py)
  shadow(ctx, x, y, 6.6, 1.8)
  ctx.lineCap = 'round'
  // legs in the colour of the coat, the far pair darker
  for (const [leg, turn, far] of [[-3.6, Math.PI, true], [3.4, 0, true], [-4.4, 0, false], [2.6, Math.PI, false]] as const) {
    ctx.strokeStyle = coat
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + leg, y - 3.8)
    ctx.lineTo(x + leg + Math.sin(stride + turn) * 1.2, y - 0.3)
    ctx.stroke()
    if (far) {
      ctx.strokeStyle = SHADE
      ctx.stroke()
    }
  }
  // tail
  ctx.strokeStyle = coat
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(x - 6 * facing, y - 7)
  ctx.quadraticCurveTo(x - 7.4 * facing, y - 6.4, x - 7 * facing, y - 3.4)
  ctx.stroke()
  // body with a deep chest, neck and head
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.ellipse(x, y - 5.7, 6.2, 2.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + 4 * facing, y - 8)
  ctx.lineTo(x + 8.6 * facing, y - 7.6)
  ctx.lineTo(x + 9.2 * facing, y - 5.4)
  ctx.lineTo(x + 7.6 * facing, y - 4.6)
  ctx.lineTo(x + 4.4 * facing, y - 4.2)
  ctx.closePath()
  ctx.fill()
  // the belly lies in the shade
  ctx.fillStyle = SHADE
  ctx.beginPath()
  ctx.ellipse(x, y - 4.5, 5.6, 1.6, 0, 0, Math.PI)
  ctx.fill()
  // horns
  ctx.strokeStyle = '#d8ccae'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(x + 7.2 * facing, y - 7.8)
  ctx.quadraticCurveTo(x + 7.8 * facing, y - 9.4, x + 9 * facing, y - 9.4)
  ctx.stroke()
  ctx.restore()
}

/** A cart with one wheel in view and its load drawn on top. `big`: the wider cart an ox pulls. */
export function drawCartBody(ctx: CanvasRenderingContext2D, px: number, py: number, load: CanvasImageSource | undefined, big: boolean): void {
  const [x, y] = enlarge(ctx, px, py)
  const half = big ? 6.6 : 5.2
  shadow(ctx, x, y, half + 1.4, 2)
  if (load) ctx.drawImage(load, x - 5, y - 15.6, 10, 10)
  // the box: boards with a lit upper edge and a shaded underside
  ctx.fillStyle = WOOD
  ctx.fillRect(x - half, y - 7.2, half * 2, 4.4)
  ctx.fillStyle = 'rgba(255, 236, 200, 0.25)'
  ctx.fillRect(x - half, y - 7.2, half * 2, 0.8)
  ctx.fillStyle = SHADE
  ctx.fillRect(x - half, y - 4.2, half * 2, 1.4)
  ctx.fillStyle = WOOD_DARK
  for (const post of [-half, half - 0.9]) ctx.fillRect(x + post, y - 7.8, 0.9, 5)
  // the wheel: a rim with spokes, not a disc
  ctx.strokeStyle = WOOD_DARK
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.arc(x, y - 2.3, 2.3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let spoke = 0; spoke < 4; spoke++) {
    const angle = (spoke * Math.PI) / 4
    ctx.moveTo(x - Math.cos(angle) * 2.2, y - 2.3 - Math.sin(angle) * 2.2)
    ctx.lineTo(x + Math.cos(angle) * 2.2, y - 2.3 + Math.sin(angle) * 2.2)
  }
  ctx.stroke()
  ctx.restore()
}
