import { describe, expect, it } from 'vitest'
import { isCutOff } from '../src/render/cutCheck'
import { growPlot, MAX_FIT, planFit } from '../src/render/plotFit'

type Colour = [number, number, number]
const GRASS: Colour = [96, 150, 60]
const WALL: Colour = [226, 208, 170]
const OUTLINE: Colour = [40, 28, 22]

function blank(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4)
}
const set = (data: Uint8ClampedArray, width: number, x: number, y: number, colour: Colour): void => data.set([...colour, 255], (y * width + x) * 4)
const alpha = (data: Uint8ClampedArray, width: number, x: number, y: number): number => data[(y * width + x) * 4 + 3]

describe('fitting a picture to its footprint', () => {
  it('enlarges a plot that is nearly as wide as the footprint until it fills it', () => {
    const plan = planFit({ left: 8, right: 247, cornerY: 150, bottom: 214 }, 256)
    expect(plan.scale).toBeCloseTo(256 / 240)
    expect(plan.plot).toBeNull()
    // the plot ends up in the middle and its side corners on the row of the footprint's side corners
    expect(plan.dx + 128 * plan.scale).toBeCloseTo(128)
    expect(plan.height).toBe(Math.ceil(150 * plan.scale + 64))
  })

  it('never enlarges by more than a little: a small plot keeps its size and gets ground around it', () => {
    const plan = planFit({ left: 52, right: 202, cornerY: 212, bottom: 253 }, 256)
    expect(plan.scale).toBe(MAX_FIT)
    expect(plan.plot).not.toBeNull()
    expect(plan.plot!.cx).toBe(128)
    expect(plan.plot!.half).toBeCloseTo((151 * MAX_FIT) / 2)
    expect(plan.plot!.cy).toBeCloseTo(212 * MAX_FIT)
    expect(plan.height).toBe(Math.ceil(212 * MAX_FIT + 64))
  })
})

describe('adding ground around a small painted plot', () => {
  // picture 128 wide, footprint diamond 128 by 64 at the bottom: centre (64, 68). The painted plot is half as wide.
  const plot = { cx: 64, cy: 68, half: 32 }
  function painted(): Uint8ClampedArray {
    const data = blank(128, 100)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 128; x++) {
        const d = Math.abs(x + 0.5 - 64) / 32 + Math.abs(y + 0.5 - 68) / 16
        if (d <= 1) set(data, 128, x, y, GRASS)
        // the slab the plot was painted on: a dark side wall below its lower edges
        else if (y > 68 && d <= 1.25) set(data, 128, x, y, OUTLINE)
      }
    }
    return data
  }

  it('fills the whole footprint in the colour of the plot and leaves the outside empty', () => {
    const data = painted()
    expect(growPlot(data, 128, 100, plot)).toBe(true)
    // far left inside the footprint: was empty, is ground now, greenish like the plot
    expect(alpha(data, 128, 14, 68)).toBe(255)
    const o = (68 * 128 + 14) * 4
    expect(data[o + 1]).toBeGreaterThan(data[o])
    expect(data[o + 1]).toBeGreaterThan(data[o + 2])
    // the middle of the painted plot is untouched
    expect([...data.slice((66 * 128 + 64) * 4, (66 * 128 + 64) * 4 + 4)]).toEqual([...GRASS, 255])
    // outside the footprint diamond nothing is painted
    expect(alpha(data, 128, 4, 40)).toBe(0)
    expect(alpha(data, 128, 120, 96)).toBe(0)
  })

  it('removes the dark slab below the painted plot', () => {
    const data = painted()
    growPlot(data, 128, 100, plot)
    // just below the bottom corner of the painted plot there was the dark side wall
    const o = (87 * 128 + 64) * 4
    expect(data[o + 3]).toBe(255)
    expect(data[o + 1]).toBeGreaterThan(90)
  })

  it('does nothing when the plot shows no ground to take a colour from', () => {
    const data = blank(128, 100)
    expect(growPlot(data, 128, 100, plot)).toBe(false)
    expect(data.every((value) => value === 0)).toBe(true)
  })
})

describe('pictures with cropped walls', () => {
  /** A wall from row 10 to 69 between x 40 and 89; with `outline`, its sides are dark as painted walls are. */
  function house(outline: boolean): Uint8ClampedArray {
    const data = blank(128, 120)
    for (let y = 10; y < 70; y++) for (let x = 40; x < 90; x++) set(data, 128, x, y, outline && (x < 42 || x > 87) ? OUTLINE : WALL)
    return data
  }

  it('are told from whole ones by the missing outline on a straight side', () => {
    expect(isCutOff(house(true), 128, 120)).toBe(false)
    expect(isCutOff(house(false), 128, 120)).toBe(true)
  })

  it('are not suspected when the side is not straight', () => {
    // a gable: every row begins in another column
    const data = blank(128, 120)
    for (let y = 10; y < 70; y++) for (let x = 64 - (y - 9); x < 64 + (y - 9); x++) set(data, 128, x, y, WALL)
    expect(isCutOff(data, 128, 120)).toBe(false)
  })
})
