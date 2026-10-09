// Loads all game sprites (WebP files in public/sprites) once and hands them out by key, e.g. "buildings/chapel".

const BASE = `${import.meta.env.BASE_URL}sprites/`

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
  private images = new Map<string, HTMLImageElement>()
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
            this.images.set(key, image)
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

  get(key: string): HTMLImageElement | undefined {
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
