// What the houses of all tiers share: the colours a house can have, what one house has of its own, and how a
// chimney or a dormer is set on a roof.
import { hash2 } from '../../world/noise2d'
import type { Scene } from './kit'
import { chimney, dormer, roofAt, roofShade, SHADE_REACH, type Body, type Built, type Frame } from './parts'

/** Colours a plastered wall is washed in, and the colours of shutters and doors. */
export const WASHES = ['rgb(255, 250, 240)', 'rgb(248, 232, 196)', 'rgb(244, 222, 204)', 'rgb(232, 236, 222)', 'rgb(250, 240, 214)']
export const SHUTTERS = ['rgb(88, 118, 96)', 'rgb(104, 124, 150)', 'rgb(146, 86, 68)', 'rgb(98, 104, 82)']
export const DOORS = ['rgb(150, 110, 80)', 'rgb(110, 134, 120)', 'rgb(160, 96, 78)', 'rgb(128, 118, 150)']
export const FRAMES: Frame[] = ['brace', 'cross', 'studs']

export const HOUSE_VARIANTS = 6

/** What one house of a tier has of its own. */
export interface Look {
  variant: number
  wash: string
  shutters: string
  doorColour: string
  frame: Frame
  /** A number from 0 to 1 that belongs to this house and to `n`. */
  pick: (n: number) => number
}

export function lookOf(variant: number): Look {
  return {
    variant,
    wash: WASHES[(variant * 2 + 1) % WASHES.length],
    shutters: SHUTTERS[(variant + 1) % SHUTTERS.length],
    doorColour: DOORS[variant % DOORS.length],
    frame: FRAMES[variant % FRAMES.length],
    pick: (n) => hash2(variant, n, 17),
  }
}

/** A chimney on the roof of a body, over the place (u, v). */
export function stack(scene: Scene, main: Built, u: number, v: number, high: number, mat: Parameters<typeof chimney>[5] = 'brick', smokes = false): void {
  const z = roofAt(main, u, v)
  const tall = Math.max(high, main.ridge - z + 3.5)
  const [du, dv] = [SHADE_REACH[0] * tall, SHADE_REACH[1] * tall]
  roofShade(scene, main, [[u + 0.055, v - 0.055], [u + 0.055 + du, v - 0.055 + dv], [u + 0.055 + du, v + 0.055 + dv], [u + 0.055, v + 0.055]])
  chimney(scene, u, v, z - 2.5, tall + 2.5, mat, smokes)
}

/** A dormer on the slope of a roof that looks left, its window over the place (u, v). */
export function dormerOn(scene: Scene, b: Body, main: Built, u: number, v: number): void {
  // it stands highest over the roof at its front: there its shadow is longest
  roofShade(scene, main, [[u + 0.085, v - 0.16], [u + 0.085 + SHADE_REACH[0] * 9, v + SHADE_REACH[1] * 9], [u + 0.085, v]])
  dormer(scene, u, v, roofAt(main, u, v), b.wall, b.roof, b.tint, b.sw.window)
}
