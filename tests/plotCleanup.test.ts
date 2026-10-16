import { describe, expect, it } from 'vitest'
import { cleanPlotPixels, measurePlot } from '../src/render/plotCleanup'

const NO_PADS = { l: 0, r: 0, t: 0, b: 0 }

/** A picture with a painted diamond: `inset` pixels smaller on each side, `lift` pixels above the bottom. */
function picture(width: number, height: number, inset: number, lift: number, colour = [200, 170, 90]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  const half = (width - 2 * inset) / 2
  const cx = width / 2
  const cy = height - lift - half / 2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs(x + 0.5 - cx) / half + Math.abs(y + 0.5 - cy) / (half / 2) > 1) continue
      const o = (y * width + x) * 4
      data.set([colour[0], colour[1], colour[2], 255], o)
    }
  }
  return data
}

const alphaAt = (data: Uint8ClampedArray, width: number, x: number, y: number): number => data[(y * width + x) * 4 + 3]

describe('plot cleanup', () => {
  it('measures a painted diamond that is smaller than the picture and floats above its bottom', () => {
    const plot = measurePlot(picture(256, 240, 14, 16), 256, 240)
    expect(plot).not.toBeNull()
    expect(plot!.left).toBeGreaterThanOrEqual(13)
    expect(plot!.left).toBeLessThanOrEqual(15)
    expect(plot!.right).toBeGreaterThanOrEqual(240)
    expect(plot!.bottom).toBeGreaterThanOrEqual(222)
    expect(plot!.bottom).toBeLessThanOrEqual(224)
  })

  it('finds no plot in an empty picture or a tall thin shape', () => {
    expect(measurePlot(new Uint8ClampedArray(64 * 64 * 4), 64, 64)).toBeNull()
    const pole = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 0; y < 64; y++) pole[(y * 64 + 32) * 4 + 3] = 255
    expect(measurePlot(pole, 64, 64)).toBeNull()
  })

  it('cuts away what lies below the lower edges of the footprint', () => {
    // 2x2 footprint over the full picture: 256 wide, the diamond 128 high at the bottom
    const width = 256
    const height = 200
    // a building colour everywhere, the plot painted in its own colour on top
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([90, 60, 160, 255], i * 4)
    const plot = picture(width, height, 0, 0)
    for (let i = 0; i < width * height; i++) if (plot[i * 4 + 3]) data.set(plot.subarray(i * 4, i * 4 + 4), i * 4)
    cleanPlotPixels(data, width, height, { w: 2, h: 2, pads: NO_PADS }, true)
    // left bottom corner of the picture lies below the lower left edge
    expect(alphaAt(data, width, 4, height - 4)).toBe(0)
    // the middle of the diamond stays
    expect(alphaAt(data, width, 128, height - 64)).toBe(255)
    // high above the diamond (the building) stays
    expect(alphaAt(data, width, 128, 10)).toBe(255)
  })

  it('removes ground-coloured earth that sticks out above the upper edges, but not the building', () => {
    const width = 256
    const height = 200
    const data = picture(width, height, 0, 0)
    // a lump of earth just above the upper left edge, and a wall in another colour above the top corner
    for (let y = 100; y < 116; y++) for (let x = 40; x < 50; x++) data.set([200, 170, 90, 255], (y * width + x) * 4)
    for (let y = 20; y < 80; y++) for (let x = 110; x < 146; x++) data.set([90, 60, 160, 255], (y * width + x) * 4)
    cleanPlotPixels(data, width, height, { w: 2, h: 2, pads: NO_PADS }, true)
    expect(alphaAt(data, width, 45, 104)).toBe(0)
    expect(alphaAt(data, width, 128, 40)).toBe(255)
  })

  it('fills a missing corner of the plot with the plot colour', () => {
    const width = 256
    const height = 128
    const data = picture(width, height, 0, 0)
    // knock out the left corner of the painted plot
    for (let y = 50; y < 78; y++) for (let x = 0; x < 40; x++) data[(y * width + x) * 4 + 3] = 0
    const result = cleanPlotPixels(data, width, height, { w: 2, h: 2, pads: NO_PADS }, true)
    expect(result.plot).toBe(true)
    expect(alphaAt(data, width, 20, 64)).toBe(255)
    expect(Math.abs(data[(64 * width + 20) * 4] - 200)).toBeLessThan(10)
  })

  it('leaves a picture without a plot unfilled', () => {
    const width = 256
    const height = 128
    const data = new Uint8ClampedArray(width * height * 4)
    const result = cleanPlotPixels(data, width, height, { w: 2, h: 2, pads: NO_PADS }, false)
    expect(result.plot).toBe(false)
    expect(alphaAt(data, width, 128, 64)).toBe(0)
  })
})
