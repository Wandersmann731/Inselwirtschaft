// The life on the map: people, oxen and carts, in a side view that faces left or right. (x, y) is always the point
// on the ground under the figure. They are built like the things they show, not like signs: a person is seven heads
// tall and walks with knees and elbows, an ox has withers, a dewlap and hocks, a cart has boards, stakes and wheels
// with spokes that turn. Bodies have a lit and a shaded side (the light comes from the top left, as on the
// buildings), nothing has an outline, and every figure throws a soft shadow to the right.
// Every pose is painted once, four picture pixels to the unit, and kept; a frame only lays the pictures down.

import { BOOT, HAIR, lay, LIGHT, limb, oval, round, SHADE, shadow, shape, SKIN, sprite, TROUSERS, WOOD_DARK, type Ctx } from './figureKit'

export { FIGURE_SCALE } from './figureKit'
export { cartShape, drawCartBody } from './cartFigures'

/** Poses of a step. */
export const WALK_FRAMES = 8
const THIGH = 2.9
const SHIN = 2.8

/** Which pose of a step shows at `stride` (in radians, a full turn is two steps). Pure. */
export function walkFrame(stride: number): number {
  const turn = stride / (Math.PI * 2)
  return Math.floor((turn - Math.floor(turn)) * WALK_FRAMES) % WALK_FRAMES
}

/**
 * Knee and foot of a walking leg below its hip, x forward and y down, at `phase` of the step. The leg swings from
 * the hip; while it comes forward the knee bends and the foot leaves the ground. Pure.
 */
export function legAt(phase: number): { knee: [number, number]; foot: [number, number] } {
  const swing = Math.sin(phase) * 0.46
  const bend = Math.max(0, Math.cos(phase)) * 0.8
  const knee: [number, number] = [Math.sin(swing) * THIGH, Math.cos(swing) * THIGH]
  return { knee, foot: [knee[0] + Math.sin(swing - bend) * SHIN, knee[1] + Math.cos(swing - bend) * SHIN] }
}

export interface PersonLook {
  shirt: string
  /** Hat or kerchief. */
  top: string
  /** Reaches forward with the arms, as when pushing a cart. */
  pushing?: boolean
  /** Carries a sack on the back. */
  sack?: boolean
  /** Wears a long skirt with an apron, and a kerchief instead of a hat. */
  skirt?: boolean
}

function paintPerson(g: Ctx, f: number, phase: number, look: PersonLook): void {
  const near = legAt(phase)
  const far = legAt(phase + Math.PI)
  // the body rides on the leg that stands: the lower foot is on the ground
  const hip = -Math.max(near.foot[1], far.foot[1])
  shadow(g, 1.7, 3.6, 1.05)
  for (const [leg, back] of [[far, true], [near, false]] as const) {
    limb(g, 0, hip, leg.knee[0] * f, hip + leg.knee[1], 1.5, back ? '#3d352c' : TROUSERS)
    limb(g, leg.knee[0] * f, hip + leg.knee[1], leg.foot[0] * f, hip + leg.foot[1] - 0.5, 1.25, back ? '#3d352c' : TROUSERS)
    oval(g, (leg.foot[0] + 0.45) * f, hip + leg.foot[1] - 0.45, 1.05, 0.5, BOOT)
  }
  if (look.skirt) {
    // a long skirt that sways with the step, an apron over its front
    const sway = Math.sin(phase) * 0.5 * f
    shape(g, [-1.3, hip - 0.8, 1.3, hip - 0.8, 2.3 + sway, -1.3, -2.3 + sway, -1.3], look.shirt)
    shape(g, [0.1 * f, hip - 0.8, 1.25 * f, hip - 0.8, 2.1 * f + sway, -1.5, 0.3 * f + sway, -1.5], 'rgba(238, 230, 208, 0.92)')
    round(g, -3, hip - 0.8, 6, 5.4)
  }
  g.save()
  g.translate(0, hip)
  g.rotate((look.pushing ? 0.2 : 0.04) * f)
  // an arm swings against the leg of its side, and bends at the elbow
  const arm = (swing: number, colour: string): void => {
    const elbow: [number, number] = look.pushing ? [1.5 * f, -3.1] : [Math.sin(swing) * 2.2 * f, -4.5 + Math.cos(swing) * 2.2]
    const hand: [number, number] = look.pushing ? [3.7 * f, -2.5] : [elbow[0] + Math.sin(swing + 0.5) * 2.1 * f, elbow[1] + Math.cos(swing + 0.5) * 2.1]
    limb(g, 0.1 * f, -4.5, elbow[0], elbow[1], 1.15, colour)
    limb(g, elbow[0], elbow[1], hand[0], hand[1], 1, colour)
    oval(g, hand[0], hand[1], 0.48, 0.48, SKIN)
  }
  arm(Math.sin(phase) * 0.55, look.shirt)
  g.fillStyle = SHADE
  g.globalCompositeOperation = 'source-atop'
  g.fillRect(-5, -6, 10, 6.4)
  g.globalCompositeOperation = 'source-over'
  if (look.sack) {
    oval(g, -1.9 * f, -3.3, 1.8, 2.3, '#a58a5e', 0.25 * f)
    oval(g, -1.5 * f, -2.9, 1.2, 1.7, 'rgba(30, 22, 20, 0.3)', 0.25 * f)
    limb(g, -1.7 * f, -5.4, -1.2 * f, -5.9, 0.6, '#7d6644')
  }
  // the body: shoulders wider than the waist, the tunic falling over the hips; the neck
  g.fillStyle = SKIN
  g.fillRect(-0.45, -5.5, 0.9, 1.1)
  g.fillStyle = look.shirt
  g.beginPath()
  g.moveTo(-1.55, -4.5)
  g.quadraticCurveTo(0, -5.3, 1.55, -4.5)
  g.lineTo(1.2, -1.3)
  g.lineTo(1.5, 0.6)
  g.lineTo(-1.5, 0.6)
  g.lineTo(-1.2, -1.3)
  g.closePath()
  g.fill()
  g.fillStyle = SHADE
  g.fillRect(0.25, -5, 1.4, 5.6)
  g.fillStyle = LIGHT
  g.fillRect(-1.6, -4.8, 0.7, 5.2)
  limb(g, -1.15, -1.25, 1.15, -1.25, 0.45, 'rgba(40, 28, 20, 0.85)')
  shape(g, [0.1 * f, -4.95, 0.9 * f, -4.7, 0.45 * f, -3.9], 'rgba(240, 232, 212, 0.9)')
  if (look.sack) limb(g, -0.9 * f, -4.7, 0.8 * f, -2.4, 0.4, '#7d6644')
  // the head: a face that looks where the figure walks, hair at the back, a hat or a kerchief
  oval(g, 0.3 * f, -6.5, 1.12, 1.25, SKIN)
  oval(g, 0.75, -6.2, 0.75, 1, 'rgba(60, 30, 30, 0.2)')
  oval(g, 1.38 * f, -6.25, 0.24, 0.28, SKIN)
  oval(g, 0.86 * f, -6.62, 0.17, 0.2, 'rgba(40, 28, 22, 0.85)')
  if (look.skirt) {
    // a kerchief over the hair, knotted at the neck; the face and a strand of hair look out of it
    oval(g, -0.3 * f, -6.7, 1.28, 1.34, look.top)
    oval(g, -0.9 * f, -5.5, 0.75, 0.55, look.top, 0.6 * f)
    oval(g, -0.1, -6.3, 0.9, 1, 'rgba(40, 30, 50, 0.16)')
    oval(g, 0.5 * f, -6.4, 0.96, 1.1, SKIN)
    oval(g, 0.5 * f, -7.2, 0.8, 0.36, HAIR, 0.25 * f)
    oval(g, 1.42 * f, -6.2, 0.24, 0.28, SKIN)
    oval(g, 0.95 * f, -6.55, 0.17, 0.2, 'rgba(40, 28, 22, 0.85)')
  } else {
    oval(g, -0.55 * f, -6.3, 0.72, 1.05, HAIR)
    g.fillStyle = look.top
    g.beginPath()
    g.ellipse(0.15 * f, -7.2, 1.2, 0.95, 0, Math.PI, Math.PI * 2)
    g.fill()
    oval(g, 0.3 * f, -7.2, 1.95, 0.4, look.top, 0.08 * f)
    oval(g, 0.5 * f, -7.12, 1.5, 0.22, 'rgba(20, 14, 20, 0.3)', 0.08 * f)
    oval(g, -0.3, -7.75, 0.5, 0.26, LIGHT)
  }
  arm(-Math.sin(phase) * 0.55, look.shirt)
  g.restore()
}

/** A walking person, 12.5 units tall. `facing` is 1 for right and -1 for left, `stride` drives the step. */
export function drawPerson(ctx: Ctx, px: number, py: number, facing: number, stride: number, look: PersonLook): void {
  const frame = walkFrame(stride)
  const f = facing >= 0 ? 1 : -1
  const key = `p|${look.shirt}|${look.top}|${look.pushing ? 1 : 0}${look.sack ? 1 : 0}${look.skirt ? 1 : 0}|${f}|${frame}`
  lay(ctx, sprite(key, 16, 16, 7, 14.5, (g) => paintPerson(g, f, (frame / WALK_FRAMES) * Math.PI * 2, look)), px, py, 16, 16, 7, 14.5)
}

function paintOx(g: Ctx, f: number, phase: number, coat: string): void {
  shadow(g, 3, 9, 2.2)
  // a leg: from the body to the knee or hock, from there to the hoof; it bends while it comes forward
  const leg = (x: number, at: number, front: boolean, back: boolean): void => {
    const swing = Math.sin(at) * 0.3
    const bend = Math.max(0, Math.cos(at)) * 0.6 * (front ? 1 : -0.7)
    const top = -5
    const knee: [number, number] = [x + Math.sin(swing) * 2.4 * f, top + Math.cos(swing) * 2.4]
    const hoof: [number, number] = [knee[0] + Math.sin(swing - bend) * 2.4 * f, Math.min(-0.35, knee[1] + Math.cos(swing - bend) * 2.4)]
    limb(g, x, top, knee[0], knee[1], 1.7, coat)
    limb(g, knee[0], knee[1], hoof[0], hoof[1], 1.2, coat)
    if (back) {
      limb(g, x, top, knee[0], knee[1], 1.7, SHADE)
      limb(g, knee[0], knee[1], hoof[0], hoof[1], 1.2, SHADE)
    }
    oval(g, hoof[0] + 0.15 * f, hoof[1] - 0.05, 0.75, 0.42, '#2a2420')
  }
  leg(-3.5 * f, phase + Math.PI, false, true)
  leg(4.3 * f, phase, true, true)
  // the tail, with its tuft
  g.strokeStyle = coat
  g.lineWidth = 0.7
  g.beginPath()
  g.moveTo(-6.6 * f, -8.4)
  g.quadraticCurveTo(-8 * f, -7.4, -7.5 * f + Math.sin(phase) * 0.4, -3.8)
  g.stroke()
  oval(g, -7.5 * f + Math.sin(phase) * 0.4, -3.3, 0.5, 0.9, '#2c221c')
  // the body: heavy hindquarters, a long barrel, high withers and a deep chest; neck, dewlap, a head carried low
  oval(g, -3.9 * f, -6.6, 3, 3, coat)
  oval(g, 0, -6.2, 5.4, 2.8, coat)
  oval(g, 3.7 * f, -6.8, 2.9, 3.3, coat)
  shape(g, [3.6 * f, -9.9, 8.4 * f, -8.9, 9 * f, -5.9, 6.4 * f, -3.9, 4 * f, -4], coat)
  oval(g, 9.5 * f, -7.2, 1.95, 1.5, coat, 0.5 * f)
  round(g, -8, -10.4, 20, 7.4)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  // a paler belly and flank, a darker line along the back
  oval(g, -0.5 * f, -4.2, 5, 1.2, 'rgba(240, 228, 206, 0.2)')
  oval(g, -1 * f, -6.6, 2.6, 1.5, 'rgba(240, 228, 206, 0.13)', 0.2)
  limb(g, -5.6 * f, -9.3, 3.4 * f, -9.7, 0.7, 'rgba(30, 20, 18, 0.22)')
  g.restore()
  oval(g, 10.8 * f, -6.1, 0.95, 0.8, '#cdb49a')
  oval(g, 11.3 * f, -6.1, 0.2, 0.26, 'rgba(40, 26, 24, 0.8)')
  oval(g, 9.9 * f, -7.7, 0.26, 0.26, '#1e1814')
  oval(g, 9.82 * f, -7.78, 0.09, 0.09, 'rgba(255, 255, 255, 0.8)')
  oval(g, 8.1 * f, -8.6, 0.9, 0.42, coat, -0.5 * f)
  oval(g, 8.1 * f, -8.55, 0.5, 0.2, 'rgba(30, 20, 20, 0.35)', -0.5 * f)
  // horns that curve forward and up
  for (const [dx, colour] of [[-0.5, '#b9ad90'], [0.2, '#e4d9bd']] as const) {
    g.strokeStyle = colour
    g.lineWidth = 0.6
    g.beginPath()
    g.moveTo((8.6 + dx) * f, -8.7)
    g.quadraticCurveTo((9 + dx) * f, -10.5, (10.5 + dx) * f, -10.5)
    g.stroke()
  }
  // the yoke across the neck
  limb(g, 5.2 * f, -10.2, 5.9 * f, -5.6, 0.9, WOOD_DARK)
  limb(g, 5 * f, -10.1, 5.5 * f, -7.2, 0.3, 'rgba(255, 226, 180, 0.4)')
  leg(-4.5 * f, phase, false, false)
  leg(3.3 * f, phase + Math.PI, true, false)
}

/** An ox in front of a cart, about eighteen units long. */
export function drawOx(ctx: Ctx, px: number, py: number, facing: number, stride: number, coat: string): void {
  const frame = walkFrame(stride)
  const f = facing >= 0 ? 1 : -1
  lay(ctx, sprite(`o|${coat}|${f}|${frame}`, 32, 16, 15, 12.5, (g) => paintOx(g, f, (frame / WALK_FRAMES) * Math.PI * 2, coat)), px, py, 32, 16, 15, 12.5)
}
