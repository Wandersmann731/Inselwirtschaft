// Small figures for the life on the map: people, oxen and carts. All drawn with canvas shapes, a few pixels each,
// in a side view that faces left or right. (x, y) is always the point on the ground under the figure.

/** The figures are drawn on a fine grid and enlarged a little, so they can be seen on a phone. */
export const FIGURE_SCALE = 1.35

const DARK = '#3b2717'
const SKIN = '#e8c29a'

/** Enlarges what is drawn next around the ground point; the caller ends it with ctx.restore(). Returns the point to draw at. */
function enlarge(ctx: CanvasRenderingContext2D, x: number, y: number): [number, number] {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(FIGURE_SCALE, FIGURE_SCALE)
  return [0, 0]
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y + 0.5, rx, ry, 0, 0, Math.PI * 2)
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

/** A walking person, about ten pixels tall. `facing` is 1 for right and -1 for left, `stride` drives the legs. */
export function drawPerson(ctx: CanvasRenderingContext2D, px: number, py: number, facing: number, stride: number, look: PersonLook): void {
  const [x, y] = enlarge(ctx, px, py)
  shadow(ctx, x, y, 3.2, 1.3)
  const swing = Math.sin(stride) * 1.7
  const top = y - Math.abs(Math.cos(stride)) * 0.6
  ctx.lineCap = 'round'
  ctx.strokeStyle = DARK
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(x, top - 4)
  ctx.lineTo(x + swing, y)
  ctx.moveTo(x, top - 4)
  ctx.lineTo(x - swing, y)
  ctx.stroke()
  if (look.sack) {
    ctx.fillStyle = '#c9a66b'
    ctx.beginPath()
    ctx.arc(x - 2.4 * facing, top - 6.4, 2.1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = look.shirt
  ctx.fillRect(x - 1.7, top - 8.4, 3.4, 4.8)
  ctx.strokeStyle = look.shirt
  ctx.lineWidth = 1.2
  ctx.beginPath()
  if (look.pushing) {
    ctx.moveTo(x + 0.8 * facing, top - 7.2)
    ctx.lineTo(x + 4.6 * facing, top - 5.4)
  } else {
    ctx.moveTo(x, top - 7.4)
    ctx.lineTo(x - swing * 0.8, top - 4.4)
  }
  ctx.stroke()
  ctx.fillStyle = SKIN
  ctx.beginPath()
  ctx.arc(x + 0.3 * facing, top - 10, 1.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = look.top
  ctx.fillRect(x - 2.3, top - 12.1, 4.6, 1.5)
  ctx.restore()
}

/** An ox in front of a cart, about fifteen pixels long. */
export function drawOx(ctx: CanvasRenderingContext2D, px: number, py: number, facing: number, stride: number, coat: string): void {
  const [x, y] = enlarge(ctx, px, py)
  shadow(ctx, x, y, 7.5, 2.2)
  ctx.lineCap = 'round'
  ctx.strokeStyle = DARK
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (const [leg, turn] of [[-4.2, 0], [-2.6, Math.PI], [2.6, Math.PI], [4.2, 0]]) {
    ctx.moveTo(x + leg, y - 3.6)
    ctx.lineTo(x + leg + Math.sin(stride + turn) * 1.3, y)
  }
  // tail
  ctx.moveTo(x - 6.4 * facing, y - 6.8)
  ctx.lineTo(x - 7.8 * facing, y - 3.6)
  ctx.stroke()
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.ellipse(x, y - 5.6, 6.6, 3.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + 7.4 * facing, y - 6.6, 2.5, 2.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // horns
  ctx.strokeStyle = '#f1e6c8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 7 * facing, y - 8.4)
  ctx.lineTo(x + 8.6 * facing, y - 10.2)
  ctx.stroke()
  ctx.restore()
}

/** A cart with one wheel in view and its load drawn on top. `big`: the wider cart an ox pulls. */
export function drawCartBody(ctx: CanvasRenderingContext2D, px: number, py: number, load: CanvasImageSource | undefined, big: boolean): void {
  const [x, y] = enlarge(ctx, px, py)
  const half = big ? 7 : 5.5
  shadow(ctx, x, y, half + 2, 2.6)
  ctx.fillStyle = '#9a6b3c'
  ctx.strokeStyle = DARK
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(x - half, y - 7.5, half * 2, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = DARK
  ctx.beginPath()
  ctx.arc(x, y - 1.6, 2.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c9a66b'
  ctx.beginPath()
  ctx.arc(x, y - 1.6, 1, 0, Math.PI * 2)
  ctx.fill()
  if (load) ctx.drawImage(load, x - 6, y - 18.5, 12, 12)
  ctx.restore()
}
