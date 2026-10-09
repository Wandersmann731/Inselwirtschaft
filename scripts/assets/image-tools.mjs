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

/** Makes a texture tile without seams: blends it with a copy shifted by half its size. Returns raw RGB data. */
export async function tileableTexture(file, size = 512) {
  const { data } = await sharp(file).resize(size, size).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(size * size * 3)
  const half = size / 2
  for (let y = 0; y < size; y++) {
    const wy = Math.sin((Math.PI * (y + 0.5)) / size) ** 2
    for (let x = 0; x < size; x++) {
      const w = Math.sin((Math.PI * (x + 0.5)) / size) ** 2 * wy
      const a = (y * size + x) * 3
      const b = (((y + half) % size) * size + ((x + half) % size)) * 3
      for (let c = 0; c < 3; c++) out[a + c] = Math.round(data[a + c] * w + data[b + c] * (1 - w))
    }
  }
  return { data: out, size }
}

function sampleWrapped(texture, u, v) {
  const { data, size } = texture
  const x = (((u % 1) + 1) % 1) * size
  const y = (((v % 1) + 1) % 1) * size
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const at = (px, py) => ((py % size) * size + (px % size)) * 3
  const i00 = at(x0, y0)
  const i10 = at(x0 + 1, y0)
  const i01 = at(x0, y0 + 1)
  const i11 = at(x0 + 1, y0 + 1)
  const rgb = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    rgb[c] = (data[i00 + c] * (1 - fx) + data[i10 + c] * fx) * (1 - fy) + (data[i01 + c] * (1 - fx) + data[i11 + c] * fx) * fy
  }
  return rgb
}

/**
 * One frame of the water animation. The tile shows exactly one period of the seamless texture, so neighbouring
 * tiles join without a seam. Over the frames the texture drifts by one full period and is gently warped with
 * waves of whole periods, so frame 0 follows after the last frame without a jump.
 */
export async function waterFrame(texture, frame, frames, { amplitude = 0.018 } = {}) {
  const W = TILE_W * SUPER
  const H = TILE_H * SUPER
  const t = frame / frames
  const out = Buffer.alloc(W * H * 4)
  const overscan = 0.004 // tiles overlap a little so no hairline gaps show between them
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = (x + 0.5 - W / 2) / (W / 2)
      const sum = ((y + 0.5) / H) * 2
      const u = (sum + a) / 2
      const v = (sum - a) / 2
      if (u < -overscan || u > 1 + overscan || v < -overscan || v > 1 + overscan) continue
      const uu = u + t + amplitude * Math.sin(2 * Math.PI * (2 * v + t))
      const vv = v + amplitude * Math.sin(2 * Math.PI * (2 * u + t + 0.25))
      const [r, g, b] = sampleWrapped(texture, uu, vv)
      const o = (y * W + x) * 4
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
      out[o + 3] = 255
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(TILE_W, TILE_H, { kernel: 'lanczos3' }).png().toBuffer()
}

/**
 * One frame of rising smoke. Five puffs start at the chimney, drift up, grow and fade out; they are spread evenly
 * over the loop, so every puff is invisible at the start and end of its life and the loop has no jump.
 */
export async function smokeFrame(puffFiles, frame, frames, width = 128, height = 192) {
  const t = frame / frames
  const count = 5
  const puffs = []
  for (let i = 0; i < count; i++) {
    const age = (t + i / count) % 1
    const size = Math.round(30 + 48 * age)
    const alpha = Math.sin(Math.PI * age) ** 0.7 * 0.88
    const cx = width / 2 + 8 * Math.sin(2 * Math.PI * (1.3 * age + i * 0.37)) + 14 * age
    const cy = height - 30 - (height - 80) * age
    const source = puffFiles[i % puffFiles.length]
    const { data, info } = await sharp(source).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const grey = 0.74 + 0.1 * age // the AI puffs are almost white: tint them grey like smoke
    for (let p = 0; p < data.length; p += 4) {
      data[p] = Math.round(data[p] * grey)
      data[p + 1] = Math.round(data[p + 1] * grey)
      data[p + 2] = Math.round(data[p + 2] * grey)
      data[p + 3] = Math.round(data[p + 3] * alpha)
    }
    puffs.push({ age, left: Math.round(cx - info.width / 2), top: Math.round(cy - info.height / 2), image: await sharp(data, { raw: info }).png().toBuffer() })
  }
  puffs.sort((a, b) => b.age - a.age) // old puffs behind young ones
  // Draw on a larger canvas so puffs may reach over the edge, then cut out the frame.
  const margin = 100
  const big = await sharp({ create: { width: width + 2 * margin, height: height + 2 * margin, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(puffs.map(({ image, left, top }) => ({ input: image, left: left + margin, top: top + margin })))
    .png()
    .toBuffer()
  return sharp(big).extract({ left: margin, top: margin, width, height }).png().toBuffer()
}

/** Pulls the edge of the cut-out in by `passes` pixels, which removes the last pink fringe of the old background. */
export async function shrinkMatte(image, passes = 1) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  let alpha = new Uint8Array(width * height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(alpha)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let min = alpha[y * width + x]
        for (let dy = -1; dy <= 1 && min > 0; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const a = alpha[ny * width + nx]
            if (a < min) min = a
          }
        }
        next[y * width + x] = min
      }
    }
    alpha = next
  }
  for (let i = 0; i < alpha.length; i++) data[i * 4 + 3] = alpha[i]
  return sharp(data, { raw: { width, height, channels: 4 } })
}

const BODY_COLORS = [[150, 150, 150], [182, 182, 182], [226, 226, 226]] // wall, wall, roof of the guide block

/**
 * Lets the ground of a plot fade out towards its edge, so it blends into the terrain around it.
 * The building itself (found in the guide: the grey block) stays fully opaque.
 */
export async function featherPlot(buffer, guideFile, width, height) {
  const guide = await sharp(guideFile).resize(width, height, { kernel: 'nearest' }).removeAlpha().raw().toBuffer()
  // body = pixels of the guide block, grown by a margin for roofs and shadows
  const body = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = guide[i * 3]
    const g = guide[i * 3 + 1]
    const b = guide[i * 3 + 2]
    if (BODY_COLORS.some(([cr, cg, cb]) => Math.abs(r - cr) < 3 && Math.abs(g - cg) < 3 && Math.abs(b - cb) < 3)) body[i] = 1
  }
  const grow = 22
  const rows = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    let last = -1e9
    for (let x = 0; x < width; x++) {
      if (body[y * width + x]) last = x
      if (x - last <= grow) rows[y * width + x] = 1
    }
    last = 1e9
    for (let x = width - 1; x >= 0; x--) {
      if (body[y * width + x]) last = x
      if (last - x <= grow) rows[y * width + x] = 1
    }
  }
  const grown = new Uint8Array(width * height)
  for (let x = 0; x < width; x++) {
    let last = -1e9
    for (let y = 0; y < height; y++) {
      if (rows[y * width + x]) last = y
      if (y - last <= grow) grown[y * width + x] = 1
    }
    last = 1e9
    for (let y = height - 1; y >= 0; y--) {
      if (rows[y * width + x]) last = y
      if (last - y <= grow) grown[y * width + x] = 1
    }
  }
  // soft mask of the ground diamond, shrunk a little
  const top = height - width / 2
  const cx = width / 2
  const cy = top + width / 4
  const k = 0.84
  const points = [[cx, top], [width, top + width / 4], [cx, top + width / 2], [0, top + width / 4]]
    .map(([x, y]) => `${cx + (x - cx) * k},${cy + (y - cy) * k}`)
    .join(' ')
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/><polygon points="${points}" fill="#fff"/></svg>`)
  const soft = await sharp(svg).blur(11).greyscale().raw().toBuffer()
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < width * height; i++) {
    if (grown[i]) continue
    const f = Math.max(0, Math.min(1, (soft[i * (soft.length / (width * height))] / 255 - 0.12) / 0.7))
    data[i * 4 + 3] = Math.round(data[i * 4 + 3] * f)
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}
