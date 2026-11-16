// The houses of the five tiers. Every tier has six houses, and they are six different buildings, not one in six
// colours: the gable looks to the street or along it, a wing stands out, a shed leans on, the roof is of straw or of
// tiles. Here: the log cabins of the pioneers, the small timber houses of the settlers, the two-storey houses of the
// citizens, and the ruin. The tall houses of merchants and aristocrats are in townhouses.ts.
import { hash2 } from '../../world/noise2d'
import type { Scene, Surface } from './kit'
import { oriel, shed, tufts, wing } from './extras'
import { material } from './materials'
import { dormerOn, lookOf, stack, type Look } from './look'
import { body, type Body, type Built, type Facade } from './parts'
import { barrel, block, boulder, bush, crate, fence, sack, woodpile } from './props'
import { aristocrats, merchants } from './townhouses'
import { border, enclose, path, type Gates } from './courts'
import { plotOf, type Plot } from './plots'

export { HOUSE_VARIANTS } from './look'

/**
 * How much steeper the roofs of a tier are than its plans say: the narrow houses of a town stand tall under steep
 * roofs, a cottage under its straw a little less so, and a villa keeps the low hipped roof of its kind.
 */
export const ROOF_PITCH: Record<string, number> = { pioneers: 1.2, settlers: 1.25, citizens: 1.34, merchants: 1.34, aristocrats: 1.12 }

export function house(scene: Scene, tier: string, variant: number): void {
  const look = lookOf(variant)
  const plot = plotOf(tier, variant)
  scene.pitch = ROOF_PITCH[tier] ?? 1
  if (tier === 'ruin') ruin(scene, variant)
  else if (tier === 'pioneers') pioneers(scene, look)
  else if (tier === 'settlers') settlers(scene, look)
  else {
    // a house of the town: what it stands on follows from its plan, and a garden is closed towards the street
    const gates = tier === 'citizens' ? citizens(scene, look, plot) : tier === 'merchants' ? merchants(scene, look, plot) : aristocrats(scene, look, plot)
    if (plot.enclosure) enclose(scene, plot.enclosure, gates, tier === 'aristocrats')
  }
  // a cottage keeps a piece of fence at the back of its plot, here on one side and there on the other: against the
  // neighbour's goats, and never before its door
  if (tier === 'pioneers' || tier === 'settlers') {
    if (variant % 3 !== 2) fence(scene, 0.06, 0.9 + 0.1 * (variant % 2), 0.06, 1.92, 4.4)
    if (variant % 3 !== 0) fence(scene, 0.8 + 0.12 * (variant % 2), 0.06, 1.92, 0.06, 4.4)
  }
}

/** A log cabin of one room under straw or shingles; some have a shed for the wood or a porch. */
function pioneers(scene: Scene, look: Look): void {
  const { variant, doorColour, pick } = look
  const turned = variant % 2 === 1
  const boards = variant === 4
  const at: Body['at'] = variant === 5 ? [0.5, 0.46, 1.5, 1.4] : turned ? [0.5, 0.42, 1.5, 1.52] : [0.4, 0.52, 1.6, 1.48]
  const pane: [number, number] = [4, 5.4]
  const long: Facade = { storeys: 1, storey: 16, windows: 2, door: turned ? null : 0.3, doorColour, pane }
  const short: Facade = { storeys: 1, storey: 16, windows: 1, door: turned ? 0.5 : null, doorColour, pane }
  const b: Body = { at, wall: boards ? 'boards' : 'logs', sw: turned ? short : long, se: turned ? long : short, roof: variant < 2 || variant === 5 ? 'thatch' : 'shingle', rise: variant === 5 ? 17 : 14, shape: turned ? 'v' : 'u', over: 0.1 }
  const main = body(scene, b)
  stack(scene, main, turned ? 1.0 : 1.3, turned ? 0.82 : 1.0, 5, 'stone')
  if (variant === 2) shed(scene, 'se', 0.66, 1.3, at[2], 0.2, 8, { mat: 'boards' }, 'shingle')
  else if (variant === 3) shed(scene, 'sw', 0.62, 1.1, at[3], 0.2, 8, { mat: 'logs' }, 'shingle')
  else woodpile(scene, 1.74, 1.02, 0.5, false)
  if (variant === 4) {
    // a porch on two posts over the door
    shed(scene, 'sw', 0.52, 1.0, at[3], 0.02, 13.5, { mat: 'timber' }, 'shingle')
    for (const u of [0.54, 0.98]) scene.box(u - 0.014, at[3] + 0.2, u + 0.014, at[3] + 0.228, 0, 12.6, 'timber', 'timber', null, false)
  }
  barrel(scene, 0.34, 1.6)
  if (pick(1) < 0.6) boulder(scene, 0.52, 1.78, 0.7, [124, 98, 70])
  if (pick(2) < 0.5) sack(scene, 1.7, 1.62)
}

/** A small timber-framed house of one storey with a loft; the roof of tiles or straw, the gable to either side. */
function settlers(scene: Scene, look: Look): void {
  const { variant, wash, doorColour, frame, pick } = look
  const turned = variant % 2 === 1
  const thatch = variant === 2 || variant === 5
  const at: Body['at'] = variant === 4 ? [0.34, 0.4, 1.66, 1.36] : turned ? [0.44, 0.36, 1.56, 1.6] : [0.36, 0.46, 1.64, 1.54]
  const base: [Body['wall'], number] = ['stone', 2.6]
  const window = { flowers: variant % 3 === 0 }
  const long: Facade = { storeys: 1, windows: 3, door: turned ? null : variant === 4 ? 0.22 : 0.5, doorColour, timber: true, frame, base, window }
  const short: Facade = { storeys: 1, windows: 2, door: turned ? 0.5 : null, doorColour, timber: true, frame, base, window }
  const b: Body = { at, wall: 'plaster', tint: wash, sw: turned ? short : long, se: turned ? long : short, roof: thatch ? 'thatch' : 'tile', rise: thatch ? 21 : 19, shape: turned ? 'v' : 'u', over: thatch ? 0.11 : 0.08, attic: true }
  const main = body(scene, b)
  stack(scene, main, turned ? 1.0 : 0.7, turned ? 0.74 : 1.0, 5, thatch ? 'stone' : 'brick')
  if (variant === 4) wing(scene, b, main, { side: 'sw', from: 0.86, to: 1.5, out: 0.2, front: { storeys: 1, windows: 1, timber: true, frame, base, window }, rise: 15 })
  if (variant === 3) shed(scene, 'se', 0.6, 1.2, at[2], 0.2, 9, { mat: 'boards' }, 'shingle', { storeys: 1, storey: 9, door: 0.5, doorStyle: 'barn', doorSize: [7, 7.6] })
  if (variant === 1) dormerOnRight(scene, b, main)
  barrel(scene, 1.78, 1.36)
  crate(scene, 0.3, 1.62)
  if (pick(2) < 0.5) sack(scene, 0.46, 1.76)
  if (thatch) woodpile(scene, 0.2, 1.1, 0.4, false)
}

/** For a roof whose ridge runs along v: nothing looks left from its slopes, so it gets a second chimney instead. */
function dormerOnRight(scene: Scene, _b: Body, main: Built): void {
  stack(scene, main, (main.top[0] + main.top[2]) / 2, main.top[3] - 0.3, 5)
}

/** A town house of two storeys, timber on a stone foot, the upper storey a hand's breadth over the street. */
function citizens(scene: Scene, look: Look, plot: Plot): Gates {
  const { variant, wash, shutters, doorColour, frame } = look
  const turned = variant === 1 || variant === 4
  const slate = variant === 2
  const at: Body['at'] = variant === 3 ? [0.32, 0.36, 1.66, 1.36] : turned ? [0.42, 0.34, 1.58, 1.58] : [0.34, 0.44, 1.62, 1.54]
  const window = { shutters: variant % 2 === 0 ? shutters : undefined, flowers: variant % 3 === 1 }
  const base: [Body['wall'], number] = ['stone', 3]
  const ground = variant === 4 ? ('stone' as const) : undefined
  const long: Facade = { storeys: 2, windows: 3, door: turned ? null : variant === 3 ? 0.2 : 0.5, doorColour, timber: true, frame, base, ground, window }
  const short: Facade = { storeys: 2, windows: 2, door: turned ? 0.5 : null, doorColour, timber: true, frame, base, ground, window }
  const b: Body = { at, wall: 'plaster', tint: wash, sw: turned ? short : long, se: turned ? long : short, roof: slate ? 'slate' : 'tile', rise: turned ? 24 : 21, shape: turned ? 'v' : 'u', over: 0.08, attic: true, jetty: variant === 5 ? 0 : 0.045, loft: variant === 1, paved: plot.ground === 'flags', garden: plot.ground === 'garden' }
  const main = body(scene, b)
  const [u0, v0, u1, v1] = main.top
  if (turned) {
    stack(scene, main, (u0 + u1) / 2 + 0.2, v0 + 0.4, 5)
  } else {
    stack(scene, main, u1 - 0.3, (v0 + v1) / 2, 6)
    if (variant !== 3) dormerOn(scene, b, main, u0 + 0.46, v1 - 0.14)
  }
  if (variant === 2) oriel(scene, { side: 'sw', at: 1.3, wall: v1, z0: 20.5, z1: 33, mat: 'plaster', tint: wash, roof: 'slate', window })
  if (variant === 3) wing(scene, b, main, { side: 'sw', from: 0.9, to: 1.56, out: 0.2, front: { storeys: 2, windows: 1, timber: true, frame, base, window }, rise: 17 })
  if (variant === 5) shed(scene, 'se', 0.66, 1.3, at[2], 0.2, 10, { mat: 'boards' }, 'tile', { storeys: 1, storey: 10, door: 0.5, doorStyle: 'barn', doorSize: [7.4, 8.4] })
  if (variant === 0) bush(scene, 0.3, 1.74, 3)
  // in a garden the barrel and the crate stand inside the hedge
  const inside = plot.enclosure ? 0.1 : 0
  barrel(scene, 1.8 - inside, 1.5)
  crate(scene, 1.84 - inside, 1.26)
  const door = at[0] + (at[2] - at[0]) * (typeof b.sw.door === 'number' ? b.sw.door : 0.5)
  if (plot.ground === 'garden') {
    border(scene, at[0] + 0.06, at[2] - 0.06, at[3], door)
    path(scene, door, at[3])
  }
  return { sw: door }
}

/** What is left when a house has been given up: walls broken down in steps, a window that looks at nothing, charred beams, rubble, and green that takes it all back. */
function ruin(scene: Scene, variant: number): void {
  const pick = (n: number): number => hash2(variant, n, 23)
  // stone that the fire and the rain have left pale, with patches of the old plaster still on it
  const wall = (window: boolean): Surface => ({
    mat: 'stone',
    tint: 'rgb(226, 216, 202)',
    detail: (g, w, h) => {
      // the plaster still holds on the lower part of the wall and has come off above, in a ragged line
      g.fillStyle = material('plaster')
      g.beginPath()
      g.moveTo(0, h)
      for (let x = 0; x <= w + 4; x += 4.5) g.lineTo(x, h * (0.42 + 0.3 * hash2(Math.round(x * 3), 1, variant + 31)))
      g.lineTo(w, h)
      g.closePath()
      g.globalAlpha = 0.8
      g.fill()
      g.globalAlpha = 1
      // soot above where the fire came out
      const soot = g.createLinearGradient(0, 0, 0, h)
      soot.addColorStop(0, 'rgba(40, 34, 34, 0.34)')
      soot.addColorStop(0.6, 'rgba(40, 34, 34, 0)')
      g.fillStyle = soot
      g.fillRect(0, 0, w, h)
      if (window && w > 9 && h > 13) {
        g.fillStyle = 'rgb(34, 30, 34)'
        g.fillRect(w / 2 - 2.4, h - 13, 4.8, 7)
        g.fillStyle = 'rgba(255, 244, 220, 0.4)'
        g.fillRect(w / 2 - 3, h - 6, 6, 0.7)
      }
    },
  })
  const top: Surface = { mat: 'stone', tint: 'rgb(206, 198, 186)' }
  // a wall from one place to another, broken down in steps of different height
  const broken = (u0: number, v0: number, u1: number, v1: number, heights: number[], salt: number): void => {
    const n = heights.length
    for (let i = 0; i < n; i++) {
      const [a, b] = [i / n, (i + 1) / n]
      const high = heights[i] * (0.8 + 0.4 * pick(salt + i))
      if (high < 1) continue
      scene.box(u0 + (u1 - u0) * a, v0 + (v1 - v0) * a, u0 + (u1 - u0) * b + (u1 > u0 ? 0 : 0.1), v0 + (v1 - v0) * b + (v1 > v0 ? 0 : 0.1), 0, high, wall(i === 1), wall(false), top)
    }
  }
  const tall = variant % 2 === 0
  broken(0.4, 0.46, 1.6, 0.46, tall ? [22, 26, 15, 9, 13] : [12, 17, 21, 24, 11], 1)
  broken(0.4, 0.56, 0.4, 1.5, [14, 8, 4, 6], 10)
  broken(1.5, 0.56, 1.5, 1.2, variant % 3 === 0 ? [18, 11, 5] : [9, 14, 7], 20)
  broken(0.5, 1.42, 1.1, 1.42, [5, 3, 0, 4], 30)
  // beams that came down with the roof, black from the fire
  const charred: Surface = { mat: 'timber', tint: 'rgb(120, 108, 104)', wear: 0 }
  scene.box(0.66, 0.9, 1.42, 0.97, 0, 1.6, charred, charred, charred)
  scene.box(0.74, 1.06, 1.3, 1.12, 0, 1.4, charred, charred, charred, false)
  if (variant >= 3) block(scene, 1.14, 1.22, 0.5, 0.07, 1.4, 'timber', 'rgb(120, 108, 104)')
  // rubble where the walls fell, and what grows over it
  for (let i = 0; i < 9; i++) boulder(scene, 0.56 + hash2(i, 1, variant + 5) * 0.5, 1.16 + hash2(i, 2, variant + 5) * 0.2, 0.4 + 0.5 * hash2(i, 3, variant + 5), [160, 150, 136])
  for (let i = 0; i < 6; i++) boulder(scene, 0.46 + hash2(i, 4, variant + 5) * 1.3, 0.7 + hash2(i, 5, variant + 5) * 1.1, 0.4 + 0.5 * hash2(i, 6, variant + 5))
  bush(scene, 1.3, 1.42, 3, 0, [84, 110, 60])
  bush(scene, 0.6, 0.76, 2.4, 0, [96, 116, 64])
  if (variant % 2 === 1) bush(scene, 1.74, 0.9, 3.2, 2, [78, 106, 58])
  tufts(scene, 'sw', 0.4, 1.6, 0.56, variant + 40)
  tufts(scene, 'sw', 0.5, 1.5, 1.2, variant + 41)
  tufts(scene, 'se', 0.6, 1.5, 0.5, variant + 42)
}
