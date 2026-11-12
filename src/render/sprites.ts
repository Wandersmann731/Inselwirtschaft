// Loads all game sprites (WebP files in public/sprites) once and hands them out by key, e.g. "buildings/chapel".

import { buildings } from '../data'
import { cleanPlotPixels, measurePlot } from './plotCleanup'
import { isCutOff } from './cutCheck'
import { growPlot, planFit } from './plotFit'
import { clearPaintedWater } from './waterPlot'
import { naturalLook } from './naturalLook'

const BASE = `${import.meta.env.BASE_URL}sprites/`

/** A loaded picture: the file itself, or for buildings a cleaned copy (see plotCleanup.ts). */
export type SpriteImage = HTMLImageElement | HTMLCanvasElement

export function spriteUrl(key: string): string {
  return `${BASE}${key}.webp`
}

/** Extra border of a building picture beyond its footprint box, in picture pixels (see scripts/assets). */
export interface Pads {
  l: number
  r: number
  t: number
  b: number
}

/** The pictures of the map that get the natural look (see naturalLook.ts). Icons, the logo and smoke stay as they are. */
const LOOK = /^(decor|ground|quarters|roads|ships|terrain)\//

class SpriteStore {
  private padData: Record<string, Pads> = {}
  private images = new Map<string, SpriteImage>()
  /** House pictures with cropped walls: loaded, but not chosen while a whole picture of the same house exists. */
  private flawed = new Set<string>()
  /** True once loading finished (also if some sprites are missing: drawing then falls back to colour shapes). */
  ready = false
  /** Counts the pictures that arrived. Caches built from missing pictures are made again when it changes. */
  version = 0

  /** Loads every sprite listed in sprites/index.json. Gives up waiting after timeoutMs. */
  async load(timeoutMs = 20000, onProgress?: (done: number, total: number) => void): Promise<void> {
    let keys: string[] = []
    try {
      const list = (await (await fetch(`${BASE}index.json`)).json()) as string[]
      keys = list.map((file) => file.replace(/\.webp$/, ''))
    } catch {
      this.ready = true
      return
    }
    try {
      this.padData = (await (await fetch(`${BASE}pads.json`)).json()) as Record<string, Pads>
    } catch {
      this.padData = {}
    }
    let done = 0
    const settled = (): void => onProgress?.(++done, keys.length)
    const loading = keys.map(
      (key) =>
        new Promise<void>((finish) => {
          const resolve = (): void => {
            settled()
            finish()
          }
          const image = new Image()
          image.onload = () => {
            this.images.set(key, key.startsWith('buildings/') ? this.cleaned(key, image) : LOOK.test(key) ? this.natural(key, image) : image)
            this.version++
            resolve()
          }
          image.onerror = () => resolve()
          image.src = spriteUrl(key)
        }),
    )
    await Promise.race([Promise.all(loading), new Promise((resolve) => setTimeout(resolve, timeoutMs))])
    this.ready = true
  }

  /** Border of a picture beyond the footprint box. Pictures without an entry have none. */
  pads(key: string): Pads {
    return this.padData[key.replace(/^buildings\//, '')] ?? { l: 0, r: 0, t: 0, b: 0 }
  }

  /** A building picture with a clean ground diamond: no loose earth over the edges, no missing corners. */
  private cleaned(key: string, image: HTMLImageElement): SpriteImage {
    const name = key.replace(/^buildings\//, '')
    const base = name.replace(/(_q)?(_\d+)?$/, '')
    const tier = base.startsWith('house_') ? base.slice('house_'.length) : null
    const def = tier ? buildings.find((entry) => entry.houseTier === tier) ?? buildings.find((entry) => entry.houseTier) : buildings.find((entry) => entry.id === base)
    if (!def) return image
    const padded = this.padData[name] !== undefined
    let canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    let ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return image
    ctx.drawImage(image, 0, 0)
    // a house whose walls were cropped when the picture was made is left out of the choice (see cutCheck.ts)
    if (tier && isCutOff(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)) this.flawed.add(key)
    // A painted plot is often smaller than the footprint and floats above the bottom of the picture: then the ground
    // of the island shows around it. The picture is fitted so that its plot covers the footprint.
    const square = def.size[0] === def.size[1]
    if (square && !padded && !/_q(_\d+)?$/.test(name)) {
      const measured = measurePlot(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
      if (measured) {
        // enlarged only a little (see plotFit.ts); a plot that stays too small gets ground added around it
        const plan = planFit(measured, canvas.width, def.pictureScale)
        const fitted = document.createElement('canvas')
        fitted.width = canvas.width
        fitted.height = plan.height
        const fittedCtx = fitted.getContext('2d', { willReadFrequently: true })
        if (fittedCtx) {
          fittedCtx.imageSmoothingQuality = 'high'
          fittedCtx.drawImage(image, plan.dx, 0, image.naturalWidth * plan.scale, image.naturalHeight * plan.scale)
          if (plan.plot) {
            const grown = fittedCtx.getImageData(0, 0, fitted.width, fitted.height)
            if (growPlot(grown.data, fitted.width, fitted.height, plan.plot, name.length * 31 + name.charCodeAt(name.length - 1))) fittedCtx.putImageData(grown, 0, 0)
          }
          canvas = fitted
          ctx = fittedCtx
        }
      }
    }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // a pier painted on a block of water: the block goes, the real sea shows instead
    if (def.pier) clearPaintedWater(pixels.data, canvas.width, canvas.height)
    // a picture with an overhang border is meant to reach beyond its footprint: it is not cut, only filled
    cleanPlotPixels(pixels.data, canvas.width, canvas.height, { w: def.size[0], h: def.size[1], pads: this.pads(key) }, !padded)
    naturalLook(pixels.data, canvas.width, canvas.height, name.length)
    ctx.putImageData(pixels, 0, 0)
    return canvas
  }

  /** Any other picture of the map (ground, roads, yards, trees, ships) in the natural look of the buildings. */
  private natural(key: string, image: HTMLImageElement): SpriteImage {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return image
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    naturalLook(pixels.data, canvas.width, canvas.height, key.length, !key.startsWith('ground/'))
    ctx.putImageData(pixels, 0, 0)
    return canvas
  }

  get(key: string): SpriteImage | undefined {
    return this.images.get(key)
  }

  private variantCache = new Map<string, string[]>()
  private variantVersion = 0

  /** All pictures of one thing: `base` itself and `base_2`, `base_3` ... (or `base_1` ...), whichever exist. */
  variants(base: string): string[] {
    if (this.variantVersion !== this.version) {
      // pictures that arrived after loading gave up waiting: look again
      this.variantCache.clear()
      this.variantVersion = this.version
    }
    let list = this.variantCache.get(base)
    if (!list || !this.ready) {
      list = []
      if (this.images.has(base)) list.push(base)
      for (let n = 1; n <= 32; n++) if (this.images.has(`${base}_${n}`)) list.push(`${base}_${n}`)
      // cropped pictures are not offered, unless there is nothing else
      const whole = list.filter((key) => !this.flawed.has(key))
      if (whole.length > 0) list = whole
      if (this.ready) this.variantCache.set(base, list)
    }
    return list
  }
}

export const sprites = new SpriteStore()
