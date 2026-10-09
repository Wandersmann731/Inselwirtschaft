// Image helpers (sharp): padding guides to a square, removing the flat background, masking and fitting.
import sharp from 'sharp'

export const SIZE = 1024
const MAGENTA = { r: 255, g: 0, b: 255 }

/** Puts a guide image on a square magenta canvas, scaled up with a margin. Returns the png and where the guide lies. */
export async function padToSquare(file, margin = 64) {
  const meta = await sharp(file).metadata()
  const scale = (SIZE - 2 * margin) / Math.max(meta.width, meta.height)
  const width = Math.round(meta.width * scale)
  const height = Math.round(meta.height * scale)
  const left = Math.round((SIZE - width) / 2)
  const top = Math.round((SIZE - height) / 2)
  const resized = await sharp(file).resize(width, height, { kernel: 'nearest' }).toBuffer()
  const buffer = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: MAGENTA } })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer()
  return { buffer, box: { left, top, width, height } }
}

/**
 * Makes the flat background transparent. Only pixels connected to the image border count as background,
 * so magenta-ish details inside the picture stay. Edge pixels get a soft alpha and the background colour
 * is taken out of their colour.
 */
export async function removeBackground(input, { low = 40, high = 100 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const at = (x, y) => (y * width + x) * 4
  // background colour: average of the corner areas
  const samples = []
  for (const [cx, cy] of [[0, 0], [width - 8, 0], [0, height - 8], [width - 8, height - 8]]) {
    for (let y = cy; y < cy + 8; y++) for (let x = cx; x < cx + 8; x++) samples.push(at(x, y))
  }
  const bg = [0, 1, 2].map((c) => Math.round(samples.reduce((sum, i) => sum + data[i + c], 0) / samples.length))
  const distance = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])

  const isBackground = new Uint8Array(width * height)
  const queue = []
  const push = (x, y) => {
    const index = y * width + x
    if (!isBackground[index] && distance(at(x, y)) < high) {
      isBackground[index] = 1
      queue.push(index)
    }
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    const x = index % width
    const y = (index - x) / width
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }

  // Enclosed holes of the same colour (the inside of a gear, between ship sails) are background too, if they are big enough.
  const minHole = Math.round(width * height * 0.0004)
  const seen = new Uint8Array(width * height)
  for (let start = 0; start < width * height; start++) {
    if (isBackground[start] || seen[start] || distance(start * 4) >= high) continue
    const region = [start]
    seen[start] = 1
    for (let head = 0; head < region.length; head++) {
      const index = region[head]
      const x = index % width
      const y = (index - x) / width
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const next = ny * width + nx
        if (!isBackground[next] && !seen[next] && distance(next * 4) < high) {
          seen[next] = 1
          region.push(next)
        }
      }
    }
    if (region.length >= minHole) for (const index of region) isBackground[index] = 1
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const i = at(x, y)
      if (isBackground[index]) {
        const alpha = Math.max(0, Math.min(1, (distance(i) - low) / (high - low)))
        data[i + 3] = 0
        if (alpha > 0) data[i + 3] = Math.round(alpha * 255)
        continue
      }
      // next to the background: soften the edge and remove the background tint
      let touches = false
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && isBackground[ny * width + nx]) touches = true
      }
      if (touches) {
        const alpha = Math.max(0.35, Math.min(1, (distance(i) - low * 0.5) / (high - low * 0.5)))
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - alpha) * bg[c]) / alpha)))
        }
        data[i + 3] = Math.round(alpha * 255)
      }
    }
  }
  // Left-over pure magenta inside the picture (for example between the sails of a mill) is removed as well.
  for (let i = 0; i < data.length; i += 4) {
    const magenta = Math.min(data[i], data[i + 2]) - data[i + 1]
    if (magenta > 80 && data[i] > 150 && data[i + 2] > 150) {
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, 1 - (magenta - 80) / 50))
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
}

/** Bounding box of the pixels that are not transparent. */
export async function opaqueBox(image, threshold = 24) {
  const { data, info } = await image.clone().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Crops to the visible part and fits it into width x height with a margin, centred (or aligned to the bottom). */
export async function fitInto(image, width, height, { margin = 0.06, align = 'center' } = {}) {
  const box = await opaqueBox(image)
  if (!box) throw new Error('the picture is empty')
  const cropped = await image.clone().extract(box).png().toBuffer()
  const maxW = Math.round(width * (1 - 2 * margin))
  const maxH = Math.round(height * (1 - 2 * margin))
  const scale = Math.min(maxW / box.width, maxH / box.height)
  const w = Math.max(1, Math.round(box.width * scale))
  const h = Math.max(1, Math.round(box.height * scale))
  const resized = await sharp(cropped).resize(w, h).png().toBuffer()
  const left = Math.round((width - w) / 2)
  const top = align === 'bottom' ? Math.round(height * (1 - margin)) - h : Math.round((height - h) / 2)
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer()
}

/** Keeps only the pixels inside a polygon (given in the target image's coordinates). */
export async function maskPolygon(buffer, width, height, points) {
  const polygon = points.map(([x, y]) => `${x},${y}`).join(' ')
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${polygon}" fill="#fff"/></svg>`)
  return sharp(buffer).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

const TILE_W = 128
const TILE_H = 64
const SUPER = 4

/**
 * Draws a road tile from a flat cobblestone texture. `name` lists the directions the road leaves the tile:
 * n = up right, e = down right, s = down left, w = up left (letters of "none" for a lone patch).
 * The strips are shaped in tile coordinates and projected into the isometric diamond, then outlined.
 */
export async function roadTile(textureFile, name, { halfWidth = 0.2, textureRepeat = 1.6 } = {}) {
  const W = TILE_W * SUPER
  const H = TILE_H * SUPER
  const tex = await sharp(textureFile).resize(512, 512).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const arms = name === 'none' ? '' : name
  const inside = (u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) return false
    const cu = Math.abs(u - 0.5)
    const cv = Math.abs(v - 0.5)
    if (!arms) return Math.hypot(u - 0.5, v - 0.5) <= halfWidth + 0.06
    if (cu <= halfWidth && cv <= halfWidth) return true
    return (
      (arms.includes('n') && cu <= halfWidth && v <= 0.5) ||
      (arms.includes('s') && cu <= halfWidth && v >= 0.5) ||
      (arms.includes('e') && cv <= halfWidth && u >= 0.5) ||
      (arms.includes('w') && cv <= halfWidth && u <= 0.5)
    )
  }
  const toUV = (x, y) => {
    const a = (x - W / 2) / (W / 2) // = u - v
    const b = y / (H / 1) // = (u + v) / 2 ... scaled below
    const sum = (y / H) * 2 // u + v
    return [(sum + a) / 2, (sum - a) / 2, b]
  }
  const mask = new Uint8Array(W * H)
  const inDiamond = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [u, v] = toUV(x + 0.5, y + 0.5)
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        inDiamond[y * W + x] = 1
        if (inside(u, v)) mask[y * W + x] = 1
      }
    }
  }
  // outline: mask pixels close to a non-mask pixel that is still inside the tile (open ends stay open)
  const r = SUPER * 2
  const out = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const index = y * W + x
      if (!mask[index]) continue
      let edge = false
      for (let dy = -r; dy <= r && !edge; dy += 2) {
        for (let dx = -r; dx <= r; dx += 2) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const ni = ny * W + nx
          if (inDiamond[ni] && !mask[ni] && Math.hypot(dx, dy) <= r) {
            edge = true
            break
          }
        }
      }
      const [u, v] = toUV(x + 0.5, y + 0.5)
      const tx = Math.floor(((u * textureRepeat) % 1) * 512)
      const ty = Math.floor(((v * textureRepeat) % 1) * 512)
      const ti = (ty * 512 + tx) * tex.info.channels
      const o = index * 4
      if (edge) {
        out[o] = 58
        out[o + 1] = 40
        out[o + 2] = 26
      } else {
        out[o] = tex.data[ti]
        out[o + 1] = tex.data[ti + 1]
        out[o + 2] = tex.data[ti + 2]
      }
      out[o + 3] = 255
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(TILE_W, TILE_H, { kernel: 'lanczos3' }).png().toBuffer()
}
