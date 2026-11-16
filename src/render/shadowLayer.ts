// All shadows on the ground are laid down as one. Each is drawn as a plain shape into a layer of its own, where a
// place is covered once however many shadows fall on it, and the layer is then laid on the ground at the strength
// of a shadow: a lane between two houses is as dark as the shadow of one house, not twice as dark.

let layer: HTMLCanvasElement | null = null
/** The layer never holds more pixels than this, however large the screen and however far the view. */
const MOST = 1.6e6

/**
 * Layer pixels per world pixel for a view of `scale` device pixels per world pixel on a canvas `width` by `height`:
 * a shadow is soft, so one is enough; never more than the screen has, and fewer where a large screen shows much of
 * the world. Pure.
 */
export function layerScale(scale: number, width: number, height: number): number {
  return Math.min(1, scale, Math.sqrt(MOST / ((width / scale) * (height / scale))))
}

/**
 * Lets `paint` draw shadows (the cover of what it draws says where shadow is) and lays all of them on the ground
 * together, `depth` dark. `ctx` must be set up for world pixels.
 */
export function layShadows(ctx: CanvasRenderingContext2D, depth: number, paint: (g: CanvasRenderingContext2D) => void): void {
  const view = ctx.getTransform()
  const res = layerScale(view.a, ctx.canvas.width, ctx.canvas.height)
  const left = Math.floor(-view.e / view.a)
  const top = Math.floor(-view.f / view.d)
  const w = Math.ceil((ctx.canvas.width / view.a) * res) + 2
  const h = Math.ceil((ctx.canvas.height / view.d) * res) + 2
  layer ??= document.createElement('canvas')
  if (layer.width < w || layer.height < h) {
    layer.width = Math.max(layer.width, w)
    layer.height = Math.max(layer.height, h)
  }
  const g = layer.getContext('2d')
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w, h)
  g.setTransform(res, 0, 0, res, -left * res, -top * res)
  paint(g)
  ctx.save()
  ctx.globalAlpha = depth
  ctx.drawImage(layer, 0, 0, w, h, left, top, w / res, h / res)
  ctx.restore()
}
