// Some harbour pictures were painted on a block of water with side walls. On the map that block stands in the
// real, moving sea like a box. Here the painted water is taken out, so the sea shows through and the hut, the
// pier and the boat stand in it.

/** Painted sea: clearly blue, from the dark side walls of the block to the light ripples on top. */
function isWater(r: number, g: number, b: number): boolean {
  return b > r + 28 && b >= g - 4 && b > 60
}

/** The lower share of the picture whose blue pixels start the search: the side walls of the block. */
const SEED_SHARE = 0.22
/** Water pixels next to something else keep this much of themselves, so the cut has no hard rim. */
const RIM_ALPHA = 0.45
/** Pixels fainter than this (alpha) are the blurred rim of the picture, not something painted. */
const FAINT = 100
/** Pixels darker than this are outlines. */
const OUTLINE_DARK = 80
/** Leftover parts smaller than this many pixels and darker than LOOSE_DARK on average are loose outlines (foam is lighter). */
const LOOSE_AREA = 400
const LOOSE_DARK = 150

/**
 * Removes the painted water of a picture in place: everything blue that hangs together with the blue at the bottom
 * of the picture. A blue roof is not touched, walls and outlines separate it from the water. Returns the number of
 * pixels removed. Pure: no canvas, so it can be tested.
 */
export function clearPaintedWater(data: Uint8ClampedArray, width: number, height: number): number {
  const water = (i: number): boolean => data[i * 4 + 3] > 0 && isWater(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  for (let y = Math.floor(height * (1 - SEED_SHARE)); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (water(i)) {
        seen[i] = 1
        stack.push(i)
      }
    }
  }
  const found: number[] = []
  while (stack.length > 0) {
    const i = stack.pop()!
    found.push(i)
    const x = i % width
    for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (n < 0 || n >= width * height || seen[n] || !water(n)) continue
      seen[n] = 1
      stack.push(n)
    }
  }
  // the outline of the block is left over as dark lines along the water that is gone. First the dark pixels with
  // water but nothing solid near them go; that breaks the line into loose bits.
  const solid = (i: number): boolean => data[i * 4 + 3] > FAINT && !seen[i] && 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2] >= OUTLINE_DARK
  const lines: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (data[i * 4 + 3] === 0 || seen[i] || solid(i)) continue
      let held = false
      let wet = false
      for (let dy = -2; dy <= 2 && !held; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = ny * width + nx
          if (solid(n)) held = true
          else if (seen[n]) wet = true
        }
      }
      if (!held && wet) lines.push(i)
    }
  }
  for (const i of lines) data[i * 4 + 3] = 0
  // Then what remains is split into connected parts, and small dark parts go as well. The hut, the boat and
  // patches of foam are big or light, they stay.
  const part = new Uint8Array(width * height)
  for (let start = 0; start < width * height; start++) {
    if (part[start] || seen[start] || data[start * 4 + 3] <= FAINT) continue
    const members: number[] = []
    let light = 0
    stack.push(start)
    part[start] = 1
    while (stack.length > 0) {
      const i = stack.pop()!
      members.push(i)
      light += 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]
      const x = i % width
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const n = i + dy * width + dx
          if (nx < 0 || nx >= width || n < 0 || n >= width * height || part[n] || seen[n] || data[n * 4 + 3] <= FAINT) continue
          part[n] = 1
          stack.push(n)
        }
      }
    }
    if (members.length < LOOSE_AREA && light / members.length < LOOSE_DARK) for (const i of members) data[i * 4 + 3] = 0
  }
  for (const i of found) {
    const x = i % width
    const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]
    // at the edge of something that stays (a post, the boat, foam) a soft rim of water remains
    const rim = neighbours.some((n) => n >= 0 && n < width * height && !seen[n] && data[n * 4 + 3] > 0)
    data[i * 4 + 3] = rim ? Math.round(data[i * 4 + 3] * RIM_ALPHA) : 0
  }
  return found.length
}
