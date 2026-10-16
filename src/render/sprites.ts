// Loads all game sprites (WebP files in public/sprites) once and hands them out by key, e.g. "buildings/chapel".

import { buildings } from '../data'
import { cleanPlotPixels, measurePlot } from './plotCleanup'

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

class SpriteStore {
  private padData: Record<string, Pads> = {}
  private images = new Map<string, SpriteImage>()
  /** True once loading finished (also if some sprites are missing: drawing then falls back to colour shapes). */
  ready = false

  /** Loads every sprite listed in sprites/index.json. Gives up waiting after timeoutMs. */
  async load(timeoutMs = 20000): Promise<void> {
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
    const loading = keys.map(
      (key) =>
        new Promise<void>((resolve) => {
          const image = new Image()
          image.onload = () => {
            this.images.set(key, key.startsWith('buildings/') ? this.cleaned(key, image) : image)
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
    // A painted plot is often smaller than the footprint and floats above the bottom of the picture: then the ground
    // of the island shows around it. Scale the picture so that its plot covers the footprint exactly.
    const square = def.size[0] === def.size[1]
    if (square && !padded && !/_q(_\d+)?$/.test(name)) {
      const measured = measurePlot(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
      if (measured) {
        const scale = canvas.width / (measured.right - measured.left + 1)
        const fitted = document.createElement('canvas')
        fitted.width = canvas.width
        fitted.height = Math.ceil((measured.bottom + 1) * scale)
        const fittedCtx = fitted.getContext('2d', { willReadFrequently: true })
        if (fittedCtx) {
          fittedCtx.imageSmoothingQuality = 'high'
          fittedCtx.drawImage(image, -measured.left * scale, 0, image.naturalWidth * scale, image.naturalHeight * scale)
          canvas = fitted
          ctx = fittedCtx
        }
      }
    }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // a picture with an overhang border is meant to reach beyond its footprint: it is not cut, only filled
    cleanPlotPixels(pixels.data, canvas.width, canvas.height, { w: def.size[0], h: def.size[1], pads: this.pads(key) }, !padded)
    ctx.putImageData(pixels, 0, 0)
    return canvas
  }

  get(key: string): SpriteImage | undefined {
    return this.images.get(key)
  }

  private variantCache = new Map<string, string[]>()

  /** All pictures of one thing: `base` itself and `base_2`, `base_3` ... (or `base_1` ...), whichever exist. */
  variants(base: string): string[] {
    let list = this.variantCache.get(base)
    if (!list || !this.ready) {
      list = []
      if (this.images.has(base)) list.push(base)
      for (let n = 1; n <= 32; n++) if (this.images.has(`${base}_${n}`)) list.push(`${base}_${n}`)
      if (this.ready) this.variantCache.set(base, list)
    }
    return list
  }
}

export const sprites = new SpriteStore()
