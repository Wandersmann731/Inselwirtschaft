import type { GroundTextures, Texture } from '../world/ground'
import { sprites } from './sprites'

const SIZE = 256

function toTexture(key: string): Texture | null {
  const image = sprites.get(key)
  if (!image) return null
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image, 0, 0, SIZE, SIZE)
  return { data: ctx.getImageData(0, 0, SIZE, SIZE).data, size: SIZE }
}

let cached: GroundTextures | null | undefined

/** The four ground textures as pixel data, or null if one of them is missing (then the map is drawn in flat colours). */
export function groundTextures(): GroundTextures | null {
  if (cached !== undefined) return cached
  const grass = toTexture('ground/grass')
  const forest = toTexture('ground/forest')
  const sand = toTexture('ground/sand')
  const rock = toTexture('ground/rock')
  cached = grass && forest && sand && rock ? { grass, forest, sand, rock } : null
  return cached
}
