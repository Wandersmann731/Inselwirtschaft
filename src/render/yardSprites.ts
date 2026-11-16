// What stands about between the houses of a village and a town: a handcart with its load, crates and barrels in a
// stack, firewood beside a chopping block, a well, a table with benches, hay. Each is a small scene put together
// from the props of the building kit (built/props.ts, built/yardProps.ts), lit and shaded like the buildings, made
// once and kept. They stand on free tiles beside houses (see frontDecor.ts).
import { RES, Scene } from './built/kit'
import { barrel, crate, haystack, heap, sack, woodpile } from './built/props'
import { SHADOW_DEPTH } from './built/shadowCast'
import { cart, table, well } from './built/yardProps'

/** How many different things there are. */
export const YARD_VARIANTS = 7
/** Size of a picture in world pixels, and how far above its bottom edge the middle of the tile lies. */
const SIZE = { w: 88, h: 68 }
export const YARD_DROP = 22

/** Puts the props of one variant on a plot of one tile (places from 0 to 1 along both sides). */
export function furnish(scene: Scene, variant: number): void {
  if (variant === 1) {
    // a handcart with sacks on it, one more on the ground
    cart(scene, 0.48, 0.46, 'rgb(196, 172, 126)')
    sack(scene, 0.22, 0.7)
    barrel(scene, 0.76, 0.72, 0.9)
  } else if (variant === 2) {
    // goods waiting to be carried in: crates on crates, barrels beside them
    crate(scene, 0.4, 0.4, 0.2, 6.4)
    crate(scene, 0.62, 0.42, 0.17, 5.4)
    crate(scene, 0.42, 0.62, 0.16, 5)
    barrel(scene, 0.68, 0.66)
    barrel(scene, 0.8, 0.5, 0.9)
    sack(scene, 0.26, 0.78)
  } else if (variant === 3) {
    // firewood for the winter, and the block it is split on
    woodpile(scene, 0.34, 0.5, 0.5, false, 6.5)
    scene.box(0.62, 0.56, 0.74, 0.68, 0, 3.4, { mat: 'boards', tint: 'rgb(226, 200, 160)' }, { mat: 'boards', tint: 'rgb(226, 200, 160)' }, { mat: 'planks', tint: 'rgb(236, 214, 176)' })
    heap(scene, 0.72, 0.8, 0.1, 2.2, 'rgb(206, 176, 124)')
  } else if (variant === 4) {
    well(scene, 0.5, 0.5)
    barrel(scene, 0.76, 0.7, 0.85)
  } else if (variant === 5) {
    table(scene, 0.5, 0.5)
    barrel(scene, 0.2, 0.36)
  } else if (variant === 6) {
    haystack(scene, 0.42, 0.44, 0.17)
    haystack(scene, 0.68, 0.66, 0.12)
    sack(scene, 0.26, 0.74)
  } else {
    // an empty cart and a stack of barrels
    cart(scene, 0.44, 0.58)
    barrel(scene, 0.7, 0.3)
    barrel(scene, 0.82, 0.38)
    barrel(scene, 0.76, 0.34, 0.9)
    crate(scene, 0.24, 0.3, 0.16, 5)
  }
}

const cache = new Map<number, HTMLCanvasElement | null>()

/** The picture of a yard prop (variant 1 to YARD_VARIANTS), with its own shadow under it, or null without a canvas. */
export function yardSprite(variant: number): HTMLCanvasElement | null {
  const hit = cache.get(variant)
  if (hit !== undefined) return hit
  let canvas: HTMLCanvasElement | null = null
  const scene = new Scene(1, 1, variant * 43 + 5)
  furnish(scene, variant)
  const made = scene.render()
  const sheet = document.createElement('canvas')
  sheet.width = SIZE.w * RES
  sheet.height = SIZE.h * RES
  const g = sheet.getContext('2d')
  if (made && g) {
    // where the middle of the tile lies in the picture of the scene, in world pixels
    const cx = made.pads.l / RES + 32
    const cy = made.image.height / RES - made.pads.b / RES - 16
    g.scale(RES, RES)
    g.translate(SIZE.w / 2 - cx, SIZE.h - YARD_DROP - cy)
    if (made.shadow) {
      g.globalAlpha = SHADOW_DEPTH
      g.drawImage(made.shadow.canvas, made.shadow.left, made.shadow.top)
      g.globalAlpha = 1
    }
    g.drawImage(made.image, 0, 0, made.image.width / RES, made.image.height / RES)
    canvas = sheet
  }
  cache.set(variant, canvas)
  return canvas
}
