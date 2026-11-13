import type { DecorItem } from '../world/decor'
import { gardenSprite } from './gardenSprites'
import { grown, grownScale } from './grown'
import { PICTURE_SCALE, type SpriteImage } from './sprites'

/** The picture of an object, made by code: what grows wild (see grown/) and what is planted beside houses. */
export function decorSprite(item: Pick<DecorItem, 'kind' | 'variant'>): SpriteImage | null {
  if (item.kind === 'hedge' || item.kind === 'bed' || item.kind === 'garden') return gardenSprite(item.kind, item.variant)
  return grown(item.kind, item.variant)
}

/** World pixels per picture pixel of the picture of an object. */
export function decorScale(item: Pick<DecorItem, 'kind'>): number {
  return item.kind === 'hedge' || item.kind === 'bed' || item.kind === 'garden' ? PICTURE_SCALE : grownScale(item.kind)
}

/**
 * How far the top of a plant leans in the wind at a time, in world pixels per world pixel of its height: gusts come
 * and go, every plant in its own beat, and only what has leaves or needles moves. Pure.
 */
export function swayOf(kind: string, now: number, phase: number): number {
  if (kind !== 'tree' && kind !== 'pine' && kind !== 'palm' && kind !== 'bush') return 0
  const gust = 0.6 + 0.4 * Math.sin(now / 5300 + phase * 0.01)
  return Math.sin(now / 1300 + phase * 0.37) * 0.014 * gust * (kind === 'palm' ? 1.5 : kind === 'pine' ? 0.7 : 1)
}

/** Whether this browser can darken or lighten a picture while drawing it. */
let canFilter: boolean | null = null

/**
 * Draws one object (tree, peak ...) standing with its base at (baseX, baseY). Returns false if the picture is missing.
 * With `shaded` the object is drawn as light or dark as its `shade` says: only for pictures that are made once and
 * kept (the terrain), because it costs time. With `now` (milliseconds) trees and bushes move in the wind: their
 * tops lean a little to and fro while their feet stand still.
 */
export function drawDecor(ctx: CanvasRenderingContext2D, item: DecorItem, baseX: number, baseY: number, shaded = false, now?: number): boolean {
  const sprite = decorSprite(item)
  if (!sprite) return false
  const width = sprite.width * decorScale(item) * item.scale
  const height = sprite.height * decorScale(item) * item.scale
  const left = baseX - width / 2
  const top = baseY - height
  canFilter ??= 'filter' in ctx
  const shade = shaded && canFilter && item.shade !== undefined && Math.abs(item.shade - 1) > 0.02 ? item.shade : 1
  // a darker tree is also a little duller, a lighter one a little warmer
  if (shade !== 1) ctx.filter = shade < 1 ? `brightness(${shade.toFixed(2)}) saturate(${(0.7 + 0.3 * shade).toFixed(2)})` : `brightness(${shade.toFixed(2)}) sepia(${((shade - 1) * 0.8).toFixed(2)})`
  const lean = now === undefined ? 0 : swayOf(item.kind, now, baseX + baseY)
  if (lean !== 0) {
    // a shear around the foot: every row of the picture is moved by as much as it stands above the ground
    ctx.save()
    ctx.transform(1, 0, -lean, 1, lean * baseY, 0)
  }
  if (item.flip) {
    ctx.save()
    ctx.translate(left + width, top)
    ctx.scale(-1, 1)
    ctx.drawImage(sprite, 0, 0, width, height)
    ctx.restore()
  } else {
    ctx.drawImage(sprite, left, top, width, height)
  }
  if (lean !== 0) ctx.restore()
  if (shade !== 1) ctx.filter = 'none'
  return true
}

interface Silhouette {
  canvas: HTMLCanvasElement
  /** Empty rows below the object in its picture, in world pixels: its foot stands that much above the picture's edge. */
  foot: number
}

const silhouettes = new Map<string, Silhouette | null>()

/** The outline of an object filled with one colour, one picture pixel per world pixel: what its shadow is made of. */
function silhouette(item: Pick<DecorItem, 'kind' | 'variant'>, colour: string): Silhouette | null {
  const id = `${item.kind}_${item.variant}`
  const hit = silhouettes.get(id)
  if (hit !== undefined) return hit
  const sprite = decorSprite(item)
  if (!sprite) return null // not kept: the picture may still arrive
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sprite.width * decorScale(item)))
  canvas.height = Math.max(1, Math.round(sprite.height * decorScale(item)))
  const g = canvas.getContext('2d', { willReadFrequently: true })
  let made: Silhouette | null = null
  if (g) {
    g.drawImage(sprite, 0, 0, canvas.width, canvas.height)
    // where the object stands: the lowest row with something in it
    const { data } = g.getImageData(0, 0, canvas.width, canvas.height)
    let foot = 0
    rows: for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 96) {
          foot = canvas.height - 1 - y
          break rows
        }
      }
    }
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = colour
    g.fillRect(0, 0, canvas.width, canvas.height)
    made = { canvas, foot }
  }
  silhouettes.set(id, made)
  return made
}

/** Colour of the shadows of trees, bushes and rocks (cool, like the shadows of buildings). */
const SHADOW = 'rgb(20, 28, 58)'
/** A tree's shadow is this much shorter than the tree is high would make it: the crown is not a wall. */
const SHORTER = 0.8

/**
 * Draws the shadow an object throws on the ground: its own outline laid down away from the sun. `light` says where
 * the shadow of a point lands per world pixel of its height. Opaque: the caller decides how dark shadows are.
 */
export function drawDecorShadow(ctx: CanvasRenderingContext2D, item: DecorItem, baseX: number, baseY: number, light: { x: number; y: number }): void {
  const shape = silhouette(item, SHADOW)
  if (!shape) return
  const width = shape.canvas.width * item.scale
  const height = shape.canvas.height * item.scale
  const foot = shape.foot * item.scale
  ctx.save()
  ctx.translate(baseX, baseY - foot)
  // a point `up` above the foot lands `up * light` away from it
  ctx.transform(item.flip ? -1 : 1, 0, -light.x * SHORTER, -light.y * SHORTER, 0, 0)
  ctx.drawImage(shape.canvas, -width / 2, -height + foot, width, height)
  ctx.restore()
}
