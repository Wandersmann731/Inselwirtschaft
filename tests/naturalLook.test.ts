import { describe, expect, it } from 'vitest'
import { gradeNatural, softenInk } from '../src/render/naturalLook'

const WALL = [226, 208, 170]
const INK = [40, 28, 22]

function picture(width: number, height: number, colour: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([...colour, 255], i * 4)
  return data
}
const at = (data: Uint8ClampedArray, width: number, x: number, y: number): number[] => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)]
const brightness = (c: number[]): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

describe('the natural look of the pictures', () => {
  it('turns a thin ink line into a darker shade of the wall beside it', () => {
    const data = picture(40, 40, WALL)
    for (let y = 0; y < 40; y++) for (const x of [20, 21]) data.set([...INK, 255], (y * 40 + x) * 4)
    softenInk(data, 40, 40)
    const line = at(data, 40, 20, 20)
    // no longer black, but still clearly darker than the wall, and in its hue (more red than blue)
    expect(brightness(line)).toBeGreaterThan(100)
    expect(brightness(line)).toBeLessThan(brightness(WALL) - 40)
    expect(line[0]).toBeGreaterThan(line[2])
    // the wall itself is untouched
    expect(at(data, 40, 10, 20)).toEqual(WALL)
  })

  it('leaves a dark area alone: a window or a door is not a line', () => {
    const data = picture(40, 40, WALL)
    for (let y = 10; y < 22; y++) for (let x = 10; x < 20; x++) data.set([...INK, 255], (y * 40 + x) * 4)
    softenInk(data, 40, 40)
    expect(at(data, 40, 15, 16)).toEqual(INK)
    expect(at(data, 40, 10, 16)).toEqual(INK)
  })

  it('tones strong colours down more than weak ones and keeps transparency', () => {
    const data = picture(4, 1, [90, 220, 40])
    data.set([150, 160, 140, 255], 4)
    data.set([200, 30, 30, 0], 8)
    const strength = (c: number[]): number => (Math.max(...c) - Math.min(...c)) / Math.max(...c)
    const lime = strength(at(data, 4, 0, 0))
    const grey = strength(at(data, 4, 1, 0))
    gradeNatural(data, 4, 1)
    expect(strength(at(data, 4, 0, 0))).toBeLessThan(lime * 0.85)
    expect(Math.abs(strength(at(data, 4, 1, 0)) - grey)).toBeLessThan(0.06)
    // a transparent pixel is not touched
    expect([...data.subarray(8, 12)]).toEqual([200, 30, 30, 0])
  })
})
