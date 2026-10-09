import type { DecorItem } from '../world/decor'
import { sprites } from './sprites'

/** Draws one object (tree, peak ...) standing with its base at (baseX, baseY). Returns false if the picture is missing. */
export function drawDecor(ctx: CanvasRenderingContext2D, item: DecorItem, baseX: number, baseY: number): boolean {
  const sprite = sprites.get(`decor/${item.kind}_${item.variant}`)
  if (!sprite) return false
  const width = (sprite.width / 2) * item.scale
  const height = (sprite.height / 2) * item.scale
  const left = baseX - width / 2
  const top = baseY - height
  if (item.flip) {
    ctx.save()
    ctx.translate(left + width, top)
    ctx.scale(-1, 1)
    ctx.drawImage(sprite, 0, 0, width, height)
    ctx.restore()
  } else {
    ctx.drawImage(sprite, left, top, width, height)
  }
  return true
}
