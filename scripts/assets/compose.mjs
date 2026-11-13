// Brings the work done on a small master picture to the same picture at a higher resolution (see bake.mjs).
// Pictures are { data: RGBA pixels, width, height }. Pure: no files, so it can be tested.

/** Where the master changed the brightness of a pixel by more than this, its content was replaced, not just toned. */
const REPLACED = [28, 64]

/**
 * The finished master at `RES` times its size, with the fine detail of the raw picture: `sharpPicture` is the raw
 * picture at that size, `before` the same picture at the size of the master, `after` the finished master. For every
 * pixel of the master it is read off how much of the paint was kept (cut edges, faded rims) and what was laid
 * under it (added ground). The colour is that of the master plus what the sharp picture shows beyond its small
 * copy: so a toned meadow keeps its tone and gets its blades back, and where the master was left alone the result
 * is the raw picture, pixel for pixel. Where the master replaced what was painted, nothing of the raw picture shows.
 */
export function compose(sharpPicture, before, after, RES = 2) {
  const { width, height } = after
  const out = { data: new Uint8ClampedArray(width * RES * height * RES * 4), width: width * RES, height: height * RES }
  // per pixel of the master: kept share, ground alpha, share of detail, then both pictures weighted by their alpha
  const FIELDS = 11
  const field = new Float32Array(width * height * FIELDS)
  const light = (data, o) => 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2]
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const f = i * FIELDS
    const was = before.data[o + 3] / 255
    const now = after.data[o + 3] / 255
    field[f + 1] = now
    if (was > 0.06) {
      field[f] = Math.min(1, now / was)
      field[f + 1] = now > was ? (now - was) / (1 - was + 1e-6) : 0
      if (was > 0.5 && now > 0.5) {
        const t = Math.min(1, Math.max(0, (Math.abs(light(after.data, o) - light(before.data, o)) - REPLACED[0]) / (REPLACED[1] - REPLACED[0])))
        field[f + 2] = 1 - t * t * (3 - 2 * t)
      }
    }
    for (let c = 0; c < 3; c++) {
      field[f + 3 + c] = after.data[o + c] * now
      field[f + 7 + c] = before.data[o + c] * was
    }
    field[f + 6] = now
    field[f + 10] = was
  }
  const value = new Float32Array(FIELDS)
  for (let y = 0; y < out.height; y++) {
    const fy = Math.min(height - 1, Math.max(0, (y + 0.5) / RES - 0.5))
    const y0 = Math.min(height - 2, Math.floor(fy))
    const ty = fy - y0
    for (let x = 0; x < out.width; x++) {
      const fx = Math.min(width - 1, Math.max(0, (x + 0.5) / RES - 0.5))
      const x0 = Math.min(width - 2, Math.floor(fx))
      const tx = fx - x0
      const corner = (y0 * width + x0) * FIELDS
      for (let c = 0; c < FIELDS; c++) {
        const top = field[corner + c] * (1 - tx) + field[corner + FIELDS + c] * tx
        const bottom = field[corner + width * FIELDS + c] * (1 - tx) + field[corner + (width + 1) * FIELDS + c] * tx
        value[c] = top * (1 - ty) + bottom * ty
      }
      const o = (y * out.width + x) * 4
      const own = sharpPicture.data[o + 3] / 255
      const paint = own * value[0]
      const alpha = paint + value[1] * (1 - paint)
      if (alpha < 0.004 || value[6] < 0.004) continue
      const detail = own > 0.5 && value[10] > 0.5 ? value[2] : 0
      for (let c = 0; c < 3; c++) {
        const master = value[3 + c] / value[6]
        out.data[o + c] = Math.min(255, Math.max(0, master + (detail > 0 ? detail * (sharpPicture.data[o + c] - value[7 + c] / value[10]) : 0)))
      }
      out.data[o + 3] = alpha * 255
    }
  }
  return out
}
