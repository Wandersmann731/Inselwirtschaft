// Loads all game sprites (WebP files in public/sprites) once and hands them out by key, e.g. "buildings/chapel".

// The pictures arrive finished: scripts/assets/bake.mjs has cut them to their plots, taken out the comic outlines
// and graded them, so nothing is worked out here.

const BASE = `${import.meta.env.BASE_URL}sprites/`

/** A loaded picture: the file itself, or a copy made of it while the game runs (a faded shore edge, see coastFade.ts). */
export type SpriteImage = HTMLImageElement | HTMLCanvasElement

/**
 * World pixels per picture pixel for buildings, trees and ships: these pictures are made at four times the game's
 * tile size (a tile is 64 world pixels wide, 256 pixels in a picture), so they stay sharp when zoomed in on a phone.
 */
export const PICTURE_SCALE = 0.25

export function spriteUrl(key: string): string {
  return `${BASE}${key}.webp`
}

/** Extra border of a building picture beyond its footprint box, in picture pixels (see scripts/assets/bake.mjs). */
export interface Pads {
  l: number
  r: number
  t: number
  b: number
}

class SpriteStore {
  private padData: Record<string, Pads> = {}
  private smokeData: Record<string, [number, number]> = {}
  private images = new Map<string, SpriteImage>()
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
    try {
      this.smokeData = (await (await fetch(`${BASE}smoke.json`)).json()) as Record<string, [number, number]>
    } catch {
      this.smokeData = {}
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
            this.images.set(key, image)
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

  /**
   * Where the chimney opens in a picture that was made smaller than its master (see scripts/assets/bake.mjs), as a
   * share of the picture. Undefined for a picture that kept its size: then the place in the building data holds.
   */
  smoke(key: string): [number, number] | undefined {
    return this.smokeData[key.replace(/^buildings\//, '')]
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
      if (this.ready) this.variantCache.set(base, list)
    }
    return list
  }
}

export const sprites = new SpriteStore()
