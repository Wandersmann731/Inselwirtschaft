// Loads all game sprites (WebP files in public/sprites) once and hands them out by key, e.g. "buildings/chapel".

const BASE = `${import.meta.env.BASE_URL}sprites/`

export function spriteUrl(key: string): string {
  return `${BASE}${key}.webp`
}

class SpriteStore {
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
