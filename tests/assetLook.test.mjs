import { describe, expect, it } from 'vitest'
import { compose } from '../scripts/assets/compose.mjs'
import { deink, grade } from '../scripts/assets/derender.mjs'
import { layGround } from '../scripts/assets/ground-fill.mjs'

/** A picture of one colour, with rectangles painted into it: [x0, y0, x1, y1, [r, g, b, a]]. */
function picture(width, height, colour, ...boxes) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set(colour, i * 4)
  for (const [x0, y0, x1, y1, paint] of boxes) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set(paint, (y * width + x) * 4)
  return { data, width, height }
}
const pixel = (image, x, y) => [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)]
const light = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b

describe('taking the comic outlines out of a picture', () => {
  it('paints a thin black line over with the surface beside it', () => {
    const image = picture(40, 40, [200, 180, 150, 255], [18, 0, 21, 40, [20, 14, 10, 255]])
    deink(image.data, 40, 40, { crease: 0 })
    expect(light(pixel(image, 19, 20))).toBeGreaterThan(150)
  })

  it('lets two surfaces meet in the middle of the line that parted them', () => {
    const image = picture(40, 40, [210, 200, 180, 255], [20, 0, 40, 40, [150, 60, 40, 255]], [18, 0, 22, 40, [16, 12, 10, 255]])
    deink(image.data, 40, 40, { crease: 0 })
    expect(pixel(image, 18, 20)[0]).toBeGreaterThan(190)
    expect(pixel(image, 21, 20)[1]).toBeLessThan(90)
  })

  it('leaves a dark window alone: it is wide, not a line', () => {
    const image = picture(60, 60, [200, 180, 150, 255], [20, 20, 40, 44, [30, 34, 48, 255]])
    deink(image.data, 60, 60)
    expect(pixel(image, 30, 32)).toEqual([30, 34, 48, 255])
  })

  it('keeps a joint between roof tiles as a soft shade of the roof', () => {
    const image = picture(40, 40, [170, 70, 40, 255], [0, 19, 40, 21, [110, 40, 24, 255]])
    deink(image.data, 40, 40, { crease: 0 })
    const joint = pixel(image, 20, 20)[0]
    expect(joint).toBeGreaterThan(125)
    expect(joint).toBeLessThan(165)
  })

  it('removes the outline around the whole shape too, where it borders empty space', () => {
    const image = picture(40, 40, [0, 0, 0, 0], [8, 8, 32, 32, [18, 12, 10, 255]], [11, 11, 29, 29, [190, 170, 140, 255]])
    deink(image.data, 40, 40, { crease: 0 })
    expect(light(pixel(image, 9, 20))).toBeGreaterThan(140)
    expect(pixel(image, 4, 20)[3]).toBe(0)
  })
})

describe('grading a picture like a photograph', () => {
  it('tones strong colours down more than weak ones and keeps transparent pixels empty', () => {
    const image = picture(8, 8, [120, 220, 40, 255], [0, 0, 4, 8, [150, 160, 140, 255]], [7, 0, 8, 8, [9, 9, 9, 0]])
    grade(image.data, 8, 8, { grain: 0, mottle: 0, grit: 0 })
    const strong = pixel(image, 5, 4)
    const weak = pixel(image, 1, 4)
    expect(strong[1] - strong[2]).toBeLessThan(180 * 0.75)
    expect(weak[1] - weak[2]).toBeGreaterThan(20 * 0.6)
    expect(pixel(image, 7, 4)).toEqual([9, 9, 9, 0])
  })
})

describe('bringing the work on a master to the sharp picture', () => {
  const sharpOf = (image) => {
    const out = picture(image.width * 2, image.height * 2, [0, 0, 0, 0])
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) out.data.set(pixel(image, x >> 1, y >> 1), (y * out.width + x) * 4)
    return out
  }

  it('gives back the sharp picture where the master was left alone', () => {
    const master = picture(16, 16, [180, 150, 120, 255])
    const sharp = sharpOf(master)
    // detail only the sharp picture has
    sharp.data.set([60, 50, 40, 255], (10 * 32 + 10) * 4)
    const out = compose(sharp, master, master)
    expect(pixel(out, 10, 10)).toEqual([60, 50, 40, 255])
    expect(pixel(out, 20, 20)).toEqual([180, 150, 120, 255])
  })

  it('cuts away what the master cut away', () => {
    const before = picture(16, 16, [180, 150, 120, 255])
    const after = picture(16, 16, [180, 150, 120, 255], [0, 8, 16, 16, [180, 150, 120, 0]])
    const out = compose(sharpOf(before), before, after)
    expect(pixel(out, 16, 4)[3]).toBe(255)
    expect(pixel(out, 16, 28)[3]).toBe(0)
  })

  it('shows ground that the master laid where nothing was painted', () => {
    const before = picture(16, 16, [0, 0, 0, 0], [0, 0, 8, 16, [180, 150, 120, 255]])
    const after = picture(16, 16, [110, 140, 80, 255], [0, 0, 8, 16, [180, 150, 120, 255]])
    const out = compose(sharpOf(before), before, after)
    expect(pixel(out, 26, 16)).toEqual([110, 140, 80, 255])
    expect(pixel(out, 4, 16)).toEqual([180, 150, 120, 255])
  })

  it('keeps the tone of the master and the detail of the sharp picture', () => {
    const before = picture(16, 16, [120, 200, 60, 255])
    const after = picture(16, 16, [118, 160, 84, 255])
    const sharp = sharpOf(before)
    sharp.data.set([100, 180, 40, 255], (16 * 32 + 16) * 4)
    const out = compose(sharp, before, after)
    expect(pixel(out, 4, 4)).toEqual([118, 160, 84, 255])
    // the darker blade of grass is still darker than the meadow around it
    expect(pixel(out, 16, 16)[1]).toBeLessThan(150)
  })

  it('shows nothing of the raw picture where the master replaced it', () => {
    const before = picture(16, 16, [40, 30, 24, 255])
    const after = picture(16, 16, [170, 160, 120, 255])
    const sharp = sharpOf(before)
    sharp.data.set([10, 8, 6, 255], (16 * 32 + 16) * 4)
    expect(pixel(compose(sharp, before, after), 16, 16)).toEqual([170, 160, 120, 255])
  })
})

describe('the yard around a building that is drawn smaller than its footprint', () => {
  it('fills the footprint diamond under what is painted and leaves the rest empty', () => {
    const image = picture(256, 160, [0, 0, 0, 0], [118, 80, 138, 100, [90, 60, 40, 255]])
    layGround(image, { w: 2, h: 2, pads: { l: 0, r: 0, t: 0, b: 0 } }, { colour: [160, 140, 100], fringe: [118, 142, 86] }, 3)
    // the middle of the diamond: yard; the painted house: untouched; a corner of the picture: empty
    expect(pixel(image, 128, 130)[3]).toBe(255)
    expect(Math.abs(pixel(image, 128, 130)[0] - 160)).toBeLessThan(45)
    expect(pixel(image, 128, 90)).toEqual([90, 60, 40, 255])
    expect(pixel(image, 4, 156)[3]).toBe(0)
    expect(pixel(image, 4, 40)[3]).toBe(0)
  })
})
