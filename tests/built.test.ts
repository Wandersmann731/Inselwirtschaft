import { describe, expect, it } from 'vitest'
import { buildings } from '../src/data'
import { built, builtVariants } from '../src/render/built'
import { makerOf } from '../src/render/built/catalog'
import { behind } from '../src/render/built/kit'
import { LIGHT } from '../src/render/built/light'
import { texelOf, type Mat } from '../src/render/built/materials'
import { DOOR, STOREY, leanOf, roofAt, roofHeight } from '../src/render/built/parts'
import { breadthAt, sheerAt } from '../src/render/built/shipyard'
import { AWNING } from '../src/render/built/stalls'
import { eaveLine, ridgeLine, ridgeSag } from '../src/render/built/roofs'
import { mossAt, stainAt } from '../src/render/built/wear'
import { hull } from '../src/render/built/shadowCast'
import { buildingKey, ghostKey } from '../src/render/spriteKeys'
import { createHouse } from '../src/sim/tiers'

describe('buildings made by code', () => {
  it('cover every building of the game, and nothing that is no building', () => {
    for (const def of buildings) {
      if (def.kind === 'road') expect(makerOf(def.id)).toBeNull()
      else expect(builtVariants(`buildings/${def.id}`).length).toBeGreaterThan(0)
    }
    expect(builtVariants('buildings/no_such_thing')).toEqual([])
    expect(builtVariants('decor/tree_1')).toEqual([])
  })

  it('have houses of every tier in several variants, and a ruin', () => {
    for (const tier of ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats', 'ruin']) {
      const keys = builtVariants(`buildings/house_${tier}`)
      expect(keys.length).toBeGreaterThanOrEqual(3)
      expect(keys[0]).toBe(`buildings/house_${tier}`)
      expect(keys[1]).toBe(`buildings/house_${tier}_2`)
    }
  })

  it('give a house the picture of its tier, a ruin the ruin, and always the same one in the same place', () => {
    const at = (x: number, y: number, tier: string, ruin = false) => buildingKey({ type: 'house_pioneers', x, y, house: { ...createHouse(tier), ruin } })
    expect(at(4, 4, 'citizens')).toMatch(/^buildings\/house_citizens/)
    expect(at(4, 4, 'citizens', true)).toMatch(/^buildings\/house_ruin/)
    expect(at(4, 4, 'citizens')).toBe(at(4, 4, 'citizens'))
    const seen = new Set<string>()
    for (let x = 0; x < 40; x++) seen.add(at(x, 3, 'settlers'))
    expect(seen.size).toBeGreaterThanOrEqual(3)
    expect(ghostKey('bakery')).toBe('buildings/bakery')
  })

  it('are not made where there is no canvas (tests, a server): the caller falls back', () => {
    expect(built('buildings/bakery')).toBeNull()
  })
})

describe('the measure of all buildings', () => {
  it('is the house door: a storey is about a door and a half', () => {
    expect(DOOR).toBe(13)
    expect(STOREY / DOOR).toBeGreaterThan(1.3)
    expect(STOREY / DOOR).toBeLessThan(1.6)
  })

  it('knows how high a roof is between ridge and eaves', () => {
    expect(roofHeight(20, 10, 0.5, 0)).toBe(30)
    expect(roofHeight(20, 10, 0.5, 0.25)).toBe(25)
    expect(roofHeight(20, 10, 0.5, 0.5)).toBe(20)
    expect(roofHeight(20, 10, 0.5, -0.25)).toBe(25)
  })
})

describe('the order solids are drawn in', () => {
  const box = (u0: number, v0: number, u1: number, v1: number, z0 = 0, n = 0) => ({ u0, v0, u1, v1, z0, n })

  it('draws what stands further back first, along either axis', () => {
    expect(behind(box(0, 0, 1, 1), box(1, 0, 2, 1))).toBe(true)
    expect(behind(box(1, 0, 2, 1), box(0, 0, 1, 1))).toBe(false)
    expect(behind(box(0, 0, 1, 1), box(0, 1, 1, 2))).toBe(true)
    expect(behind(box(0, 1, 1, 2), box(0, 0, 1, 1))).toBe(false)
  })

  it('draws what stands on something after it: a roof after its walls, a chimney after the roof', () => {
    const walls = box(0, 0, 1, 1, 0, 0)
    const roof = box(-0.1, -0.1, 1.1, 1.1, 18, 1)
    const stack = box(0.4, 0.4, 0.6, 0.6, 30, 2)
    expect(behind(walls, roof)).toBe(true)
    expect(behind(roof, stack)).toBe(true)
    expect(behind(stack, walls)).toBe(false)
  })
})

describe('shadows', () => {
  it('fall to the right and a little down, away from the sun in the top left', () => {
    expect(LIGHT.x).toBeGreaterThan(0)
    expect(LIGHT.y).toBeGreaterThan(0)
    expect(LIGHT.x).toBeGreaterThan(LIGHT.y)
  })

  it('are the outline of a solid seen from the sun: the hull of where its corners land', () => {
    const square = hull([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3]])
    expect(square).toHaveLength(4)
    for (const corner of [[0, 0], [4, 0], [4, 4], [0, 4]]) expect(square).toContainEqual(corner)
  })
})

describe('materials', () => {
  const all: Mat[] = ['plaster', 'stone', 'ashlar', 'brick', 'boards', 'planks', 'logs', 'timber', 'tile', 'slate', 'verdigris', 'thatch', 'shingle', 'cloth', 'flags', 'deck', 'marble', 'rock']

  it('repeat without a seam', () => {
    for (const mat of all) {
      for (const k of [3, 40, 97]) {
        expect(texelOf(mat, 0, k)).toEqual(texelOf(mat, 128, k))
        expect(texelOf(mat, k, 0)).toEqual(texelOf(mat, k, 128))
      }
    }
  })

  it('show roofs tile by tile: a dark joint between two tiles of a row, and a line of shade under the edge of every row', () => {
    const mean = (mat: Mat, pick: (x: number, y: number) => boolean): number => {
      let sum = 0
      let n = 0
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          if (!pick(x, y)) continue
          sum += texelOf(mat, x, y)[0]
          n++
        }
      }
      return sum / n
    }
    // rows are 8 texels high; a tile is 8 texels long, a slate 16, and every other row is moved by half
    for (const [mat, long] of [['tile', 8], ['slate', 16]] as [Mat, number][]) {
      const along = (x: number, y: number): number => ((x + (Math.floor(y / 8) % 2) * (long / 2)) % 256) % long
      const joint = mean(mat, (x, y) => along(x, y) === 0 && y % 8 >= 2)
      const middle = mean(mat, (x, y) => along(x, y) === long / 2 && y % 8 >= 2)
      expect(joint).toBeLessThan(middle * 0.86)
      const under = mean(mat, (_x, y) => y % 8 === 0)
      const face = mean(mat, (_x, y) => y % 8 === 3)
      expect(under).toBeLessThan(face * 0.8)
    }
  })

  it('have structure: no material is one flat colour', () => {
    for (const mat of all) {
      let darkest = 255
      let lightest = 0
      for (let i = 0; i < 600; i++) {
        const [r, g, b] = texelOf(mat, (i * 37) % 128, (i * 91) % 128)
        const grey = (r + g + b) / 3
        darkest = Math.min(darkest, grey)
        lightest = Math.max(lightest, grey)
      }
      expect(lightest - darkest).toBeGreaterThan(12)
    }
  })

  it('show courses on a roof: the lower edge of a row of tiles lies in the shade of the next', () => {
    // down one row of tiles (8 texels) the light changes much more than along it
    let down = 0
    let along = 0
    for (let i = 0; i < 300; i++) {
      const x = (i * 37) % 120
      const y = (i * 53) % 120
      const here = texelOf('tile', x, y)[0]
      down += Math.abs(texelOf('tile', x, y + 4)[0] - here)
      along += Math.abs(texelOf('tile', x + 1, y)[0] - here)
    }
    expect(down).toBeGreaterThan(along)
  })
})

describe('houses that are not all alike', () => {
  it('have six plans per tier', () => {
    for (const tier of ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats']) expect(builtVariants(`buildings/house_${tier}`)).toHaveLength(6)
  })

  it('know how high a roof is over a place: lowest at the walls, highest at the ridge', () => {
    const saddle = { eaves: 40, ridge: 60, top: [0, 0, 2, 1] as [number, number, number, number], low: 38, rise: 20, span: 0.5, over: 0.05, shape: 'u' as const }
    expect(roofAt(saddle, 1, 0.5)).toBe(60)
    expect(roofAt(saddle, 1, 0)).toBe(40)
    expect(roofAt(saddle, 0.1, 0.25)).toBe(50)
    // a hipped roof falls to all four walls
    expect(roofAt({ ...saddle, shape: 'hip' }, 0.1, 0.5)).toBeCloseTo(44)
  })
})

describe('roofs that have stood for years', () => {
  it('hang in the ridge if they are long and of tiles or straw, not if they are short or of copper', () => {
    expect(ridgeSag('tile', 50, 0.5)).toBeGreaterThan(0.8)
    expect(ridgeSag('thatch', 50, 0.5)).toBeGreaterThan(ridgeSag('slate', 50, 0.5))
    expect(ridgeSag('tile', 10, 0.5)).toBe(0)
    expect(ridgeSag('verdigris', 50, 0.5)).toBe(0)
    // never so much that the roof looks broken
    expect(ridgeSag('thatch', 60, 1)).toBeLessThan(4)
  })

  it('keep the ends of the ridge where they are and hang lowest in between', () => {
    const line = ridgeLine([0, 10], [40, 30], 2, 7)
    expect(line[0]).toEqual([0, 10])
    expect(line[line.length - 1]).toEqual([40, 30])
    const deepest = Math.max(...line.map(([x, y]) => y - (10 + x / 2)))
    expect(deepest).toBeGreaterThan(1.6)
    expect(deepest).toBeLessThan(2.3)
    expect(ridgeLine([0, 0], [40, 0], 0, 7).every(([, y]) => y === 0)).toBe(true)
  })

  it('end their eaves tile by tile: never short of the line, never further beyond it than allowed', () => {
    const line = eaveLine([0, 0], [30, 0], [0, 1], 0.5, 3)
    expect(line.length).toBeGreaterThan(10)
    for (const [, y] of line) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(0.5)
    }
    expect(new Set(line.map(([, y]) => y.toFixed(3))).size).toBeGreaterThan(4)
    expect(eaveLine([0, 0], [30, 0], [0, 1], 0, 3)).toEqual([[0, 0], [30, 0]])
  })
})

describe('wear', () => {
  it('repeats without a seam and only ever darkens', () => {
    for (const k of [5, 77, 190]) {
      expect(stainAt(0, k)).toBeCloseTo(stainAt(256, k))
      expect(stainAt(k, 0)).toBeCloseTo(stainAt(k, 256))
      expect(mossAt(0, k).cover).toBeCloseTo(mossAt(256, k).cover)
    }
    let darkest = 1
    for (let i = 0; i < 2000; i++) {
      const s = stainAt((i * 37) % 256, (i * 91) % 256)
      expect(s).toBeLessThanOrEqual(1)
      darkest = Math.min(darkest, s)
    }
    expect(darkest).toBeGreaterThanOrEqual(0.55)
    expect(darkest).toBeLessThan(0.85)
  })

  it('leaves most of a roof free of moss', () => {
    let covered = 0
    for (let i = 0; i < 4000; i++) if (mossAt((i * 37) % 256, (i * 91) % 256).cover > 0.3) covered++
    expect(covered).toBeGreaterThan(20)
    expect(covered).toBeLessThan(1200)
  })
})

describe('walls that do not stand quite true', () => {
  it('lean a little if they are of timber, less if of rubble, not at all if of dressed stone or brick', () => {
    let timber = 0
    let rubble = 0
    for (let seed = 0; seed < 200; seed++) {
      const [u, v] = leanOf('plaster', seed)
      // never more than a hand's breadth per storey: a house must not look as if it fell
      expect(Math.hypot(u, v)).toBeLessThan(0.025)
      timber += Math.hypot(u, v)
      rubble += Math.hypot(...leanOf('stone', seed))
      expect(leanOf('ashlar', seed)).toEqual([0, 0])
      expect(leanOf('brick', seed)).toEqual([0, 0])
      expect(leanOf('plaster', seed, 0)).toEqual([0, 0])
    }
    expect(timber).toBeGreaterThan(rubble * 2)
    expect(timber / 200).toBeGreaterThan(0.004)
  })

  it('lean the same way every time for the same house', () => {
    expect(leanOf('logs', 12)).toEqual(leanOf('logs', 12))
    expect(leanOf('logs', 12)).not.toEqual(leanOf('logs', 13))
  })
})

describe('the hull on the slip of the shipyard', () => {
  it('is widest amidships and comes to a point at both ends', () => {
    expect(breadthAt(0)).toBeCloseTo(0)
    expect(breadthAt(1)).toBeCloseTo(0)
    expect(breadthAt(0.45)).toBeGreaterThan(0.9)
    expect(breadthAt(0.2)).toBeGreaterThan(breadthAt(0.05))
  })

  it('rises towards bow and stern, and is higher than a door amidships', () => {
    expect(sheerAt(0.5, 14)).toBe(14)
    expect(sheerAt(0, 14)).toBeGreaterThan(sheerAt(0.5, 14))
    expect(sheerAt(1, 14)).toBeCloseTo(sheerAt(0, 14))
    expect(sheerAt(0.5, 14)).toBeGreaterThan(DOOR)
  })
})

describe('market stalls', () => {
  it('are much lower than a house: the edge of the awning hangs at little more than half a door', () => {
    expect(AWNING / DOOR).toBeGreaterThanOrEqual(0.55)
    expect(AWNING / DOOR).toBeLessThanOrEqual(0.7)
  })
})
