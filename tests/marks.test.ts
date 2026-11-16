import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { markOf, STATUS_COLORS } from '../src/render/buildingRenderer'
import { glowOf, markSize } from '../src/render/markLayer'
import { PICTURE_BUDGET, picturesToDrop } from '../src/render/built'
import { keptRoads } from '../src/render/roadLayer'
import { SHADE_BAND, shadeAtHeight, toneOf } from '../src/render/crossShade'
import { swayOf } from '../src/render/decorDraw'
import { capAt, cellGrowth, sparkAt } from '../src/render/glitter'
import { layerScale, layShadows } from '../src/render/shadowLayer'
import { SHADOW_DEPTH } from '../src/render/built/shadowCast'
import { gullAt } from '../src/render/birds'
import { tornFoam } from '../src/render/surf'
import { crownParts, SWAY_FROM_ZOOM, swaysHere } from '../src/render/forestSway'
import { berthOf } from '../src/render/boats'
import { liftedShadow, TALLER } from '../src/render/crossShade'
import { houseShift } from '../src/render/spriteDraw'
import { Terrain } from '../src/world/terrain'
import { SAIL_TURNS, sailAngle } from '../src/render/built/sails'
import { LIGHT } from '../src/render/built/light'
import type { IslandState } from '../src/sim/state'
import { createHouse } from '../src/sim/tiers'

type Building = IslandState['buildings'][number]
const base = { id: 1, type: 'forester', x: 0, y: 0, active: true } as unknown as Building
const producer = (status: object): Building => ({ ...base, production: { status } } as unknown as Building)
const home = (needs: Record<string, number>): Building => ({ ...base, type: 'house', house: { ...createHouse('settlers'), residents: 6, needs } } as unknown as Building)
const full = { food: 100, cloth: 100, chapel: 100, alcohol: 100, salt: 100, tavern: 100 }

describe('the hints over the buildings', () => {
  it('shows no mark where all is well, and none in the towns of others', () => {
    expect(markOf(true, producer({ kind: 'producing' }))).toBeNull()
    expect(markOf(true, home(full))).toBeNull()
    expect(markOf(true, base)).toBeNull()
    expect(markOf(false, producer({ kind: 'noRoad' }))).toBeNull()
  })

  it('names what a workshop waits for and what a house has run short of', () => {
    expect(markOf(true, producer({ kind: 'waiting', good: 'wool' }))).toEqual({ colour: STATUS_COLORS.waiting, good: 'wool' })
    expect(markOf(true, producer({ kind: 'noRoad' }))).toEqual({ colour: STATUS_COLORS.noRoad })
    expect(markOf(true, home({ ...full, alcohol: config.population.shortageBelow - 1 }))).toEqual({ colour: STATUS_COLORS.noRoad, good: 'alcohol' })
    // a house that only lacks something to rise is not marked: nothing is wrong there
    expect(markOf(true, home({ ...full, cloth: 90 }))).toBeNull()
  })

  it('glows in the colour of the problem and stays readable at every zoom', () => {
    expect(glowOf('#ff4d4d', 0.5)).toBe('rgba(255, 77, 77, 0.5)')
    expect(glowOf('#ff4d4d', 1, 0.5)).toBe('rgba(255, 166, 166, 1)')
    for (const badge of [false, true]) {
      expect(markSize(0.5, badge)).toBeGreaterThanOrEqual(14)
      expect(markSize(2, badge)).toBeGreaterThan(markSize(0.5, badge))
      expect(markSize(2, badge)).toBeLessThanOrEqual(40)
      expect(markSize(1, badge)).toBe(markSize(1, badge))
    }
    // a disc with a picture on it must be large enough to tell the good on a phone
    expect(markSize(0.5, true)).toBeGreaterThanOrEqual(24)
  })
})

describe('picture memory on a phone', () => {
  it('lets go of the building pictures not seen for longest once they outgrow their budget, never of one on screen', () => {
    const kept = [
      { id: 'old', bytes: 40e6, used: 10 },
      { id: 'older', bytes: 30e6, used: 5 },
      { id: 'shown', bytes: 30e6, used: 995 },
    ]
    expect(picturesToDrop(kept, 72e6, 1000, 180)).toEqual(['older'])
    expect(picturesToDrop(kept, 20e6, 1000, 180)).toEqual(['older', 'old'])
    expect(picturesToDrop(kept, 200e6, 1000, 180)).toEqual([])
    // everything on screen: nothing goes, even over the budget
    expect(picturesToDrop(kept.map((picture) => ({ ...picture, used: 990 })), 20e6, 1000, 180)).toEqual([])
    expect(PICTURE_BUDGET.bytes).toBeLessThanOrEqual(96e6)
  })

  it('keeps fewer road pictures when they are sharp', () => {
    expect(keptRoads(2)).toBeLessThan(keptRoads(1))
    expect(keptRoads(2) * 2.1).toBeLessThan(64)
  })
})

describe('shadows between buildings', () => {
  it('carries the shadow of a neighbour over the foot of a house and lets it fade up the wall', () => {
    expect(shadeAtHeight(0)).toBe(1)
    expect(shadeAtHeight(SHADE_BAND / 2)).toBeCloseTo(0.5)
    expect(shadeAtHeight(SHADE_BAND)).toBe(0)
    expect(shadeAtHeight(SHADE_BAND * 3)).toBe(0)
    // never higher than the ground floor: the upper storeys stay in the sun
    expect(SHADE_BAND).toBeLessThanOrEqual(32)
  })

  it('has an afternoon sun: a shadow is about as long as what throws it is high, and falls to the right', () => {
    const long = Math.hypot(LIGHT.x, LIGHT.y)
    expect(long).toBeGreaterThan(0.95)
    expect(long).toBeLessThan(1.4)
    expect(LIGHT.x).toBeGreaterThan(LIGHT.y * 2)
  })
})

describe('what keeps a town from looking stamped and still', () => {
  it('gives the houses of one plan different shades, always the same for the same house', () => {
    const tones = new Set<number>()
    for (let id = 1; id <= 40; id++) {
      tones.add(toneOf(id))
      expect(toneOf(id)).toBe(toneOf(id))
    }
    expect(tones.size).toBe(5)
  })

  it('moves trees in the wind by a pixel or two at their top, and leaves stones alone', () => {
    let widest = 0
    for (let t = 0; t < 20000; t += 137) widest = Math.max(widest, Math.abs(swayOf('tree', t, 40)))
    expect(widest * 80).toBeGreaterThan(0.5)
    expect(widest * 80).toBeLessThan(2.5)
    expect(swayOf('rock', 1234, 40)).toBe(0)
    expect(swayOf('tree', 1000, 10)).not.toBe(swayOf('tree', 1000, 500))
  })

  it('lets the sea sparkle: a spark is dark most of the time and flares for a moment', () => {
    let lit = 0
    for (let t = 0; t < 40000; t += 50) if (sparkAt(3, 7, t) > 0) lit++
    expect(lit).toBeGreaterThan(0)
    expect(lit / 800).toBeLessThan(0.25)
    expect(sparkAt(3, 7, 500)).toBeLessThanOrEqual(1)
  })

  it('lets crests break: a cap shows for part of its beat and is gone for the rest, each cell on its own', () => {
    let white = 0
    let most = 0
    for (let t = 0; t < 60000; t += 100) {
      const cap = capAt(5, 2, t)
      expect(cap).toBeGreaterThanOrEqual(0)
      expect(cap).toBeLessThanOrEqual(1)
      if (cap > 0.08) white++
      most = Math.max(most, cap)
    }
    expect(white / 600).toBeGreaterThan(0.2)
    expect(white / 600).toBeLessThan(0.55)
    expect(most).toBeGreaterThan(0.3)
    // neighbours do not break in step
    let together = 0
    for (let t = 0; t < 60000; t += 100) if (capAt(5, 2, t) > 0.08 === capAt(6, 2, t) > 0.08) together++
    expect(together).toBeLessThan(590)
  })

  it('shows a screen full of sea about as many caps and sparks from afar as from near', () => {
    expect(cellGrowth(3)).toBe(1)
    expect(cellGrowth(2.25)).toBe(1)
    // a phone zoomed out all the way: four times the sea on screen, cells four times the area
    expect(cellGrowth(1.5)).toBe(2)
    expect(cellGrowth(0.5)).toBeLessThanOrEqual(4)
    for (const scale of [0.4, 0.8, 1.2, 2, 4]) expect(cellGrowth(scale)).toBeGreaterThanOrEqual(cellGrowth(scale * 1.5))
  })

  it('lays all shadows on the ground as one: they are drawn into a layer, and the layer once, as dark as one shadow', () => {
    const calls: string[] = []
    const context = (name: string, canvas: object): Record<string, unknown> => ({
      canvas,
      globalAlpha: 1,
      getTransform: () => ({ a: 3, d: 3, e: -300, f: -150 }),
      setTransform: () => undefined,
      clearRect: () => calls.push(`${name} clear`),
      save: () => undefined,
      restore: () => undefined,
      drawImage(this: { globalAlpha: number }) {
        calls.push(`${name} draw ${this.globalAlpha}`)
      },
    })
    const layer: Record<string, unknown> = { width: 0, height: 0 }
    layer.getContext = () => context('layer', layer)
    const world = globalThis as { document?: unknown }
    const before = world.document
    world.document = { createElement: () => layer }
    try {
      const screen = context('screen', { width: 900, height: 600 })
      layShadows(screen as unknown as CanvasRenderingContext2D, SHADOW_DEPTH, (g) => {
        // two houses whose shadows overlap
        g.drawImage({} as CanvasImageSource, 0, 0)
        g.drawImage({} as CanvasImageSource, 10, 0)
      })
    } finally {
      world.document = before
    }
    expect(calls).toEqual(['layer clear', 'layer draw 1', 'layer draw 1', `screen draw ${SHADOW_DEPTH}`])
    // one layer pixel per world pixel: a third of the screen in each direction at three device pixels per world pixel
    expect(layer.width as number).toBeLessThan(900 / 3 + 4)
    expect(SHADOW_DEPTH).toBeGreaterThan(0.45)
    expect(SHADOW_DEPTH).toBeLessThan(0.7)
  })

  it('keeps the shadow layer small: a pixel per world pixel on a phone, fewer on a large screen that shows much of the world', () => {
    // a phone held sideways, zoomed in and all the way out
    expect(layerScale(6, 2532, 1170)).toBe(1)
    expect(layerScale(1.5, 2532, 1170)).toBe(1)
    // a large screen far out: never more than about one and a half million pixels
    const far = layerScale(1, 5120, 2880)
    expect(far).toBeLessThan(0.4)
    expect(5120 * far * 2880 * far).toBeLessThan(1.7e6)
    // and never more pixels than the screen has
    expect(layerScale(0.5, 800, 400)).toBeLessThanOrEqual(0.5)
  })

  it('tears the white edge of the surf: whole where the froth is thick, gone where it is thin', () => {
    expect(tornFoam(1)).toBe(1)
    expect(tornFoam(0.1)).toBe(0)
    expect(tornFoam(0.35)).toBeGreaterThan(0)
    expect(tornFoam(0.35)).toBeLessThan(1)
  })

  it('lets gulls circle: each on its own round, above the ground, beating its wings', () => {
    const a = gullAt(0, 0)
    const b = gullAt(0, 4000)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(10)
    expect(gullAt(1, 0).x).not.toBe(a.x)
    for (let t = 0; t < 30000; t += 900) {
      const gull = gullAt(2, t)
      expect(gull.high).toBeGreaterThan(30)
      expect(Math.abs(gull.flap)).toBeLessThanOrEqual(1)
      expect(Math.hypot(gull.x, gull.y)).toBeLessThan(420)
    }
  })

  it('turns the sails of a mill while it grinds and lets them stand when it does not', () => {
    expect(sailAngle(5000, false)).toBe(sailAngle(0, false))
    expect(sailAngle(1000, true) - sailAngle(0, true)).toBeCloseTo(SAIL_TURNS * Math.PI * 2)
    // unhurried: a turn takes several seconds
    expect(1 / SAIL_TURNS).toBeGreaterThan(5)
    expect(1 / SAIL_TURNS).toBeLessThan(20)
  })

  it('moors a boat where the sea touches a pier, on its open side, and none where there is no sea', () => {
    // 6 by 6 tiles: land on the left, sea from column 4 on
    const tiles = Array.from({ length: 36 }, (_, i) => (i % 6 >= 4 ? Terrain.Water : Terrain.Grass))
    const map = { width: 6, height: 6, tiles }
    const berth = berthOf(map, { x: 2, y: 2, w: 2, h: 2 })
    expect(berth?.x).toBe(4)
    expect(berth && berth.y >= 2 && berth.y <= 3).toBe(true)
    expect(berthOf(map, { x: 0, y: 0, w: 2, h: 2 })).toBeNull()
  })

  it('lays the shadow of a taller house on a roof nearer to that house and higher up', () => {
    const [dx, dy] = liftedShadow(40)
    expect(dx).toBeLessThan(0)
    expect(dy).toBeLessThan(-40)
    expect(liftedShadow(0).map(Math.abs)).toEqual([0, 0])
    expect(TALLER).toBeGreaterThan(1)
  })

  it('draws every house a little off its plot, never by more than two pixels, always the same way', () => {
    const shifts = new Set<string>()
    for (let x = 0; x < 12; x++) {
      const [dx, dy] = houseShift(x, 3)
      expect(Math.abs(dx)).toBeLessThanOrEqual(2)
      expect(Math.abs(dy)).toBeLessThanOrEqual(1.2)
      expect(houseShift(x, 3)).toEqual([dx, dy])
      shifts.add(`${dx.toFixed(2)},${dy.toFixed(2)}`)
    }
    expect(shifts.size).toBeGreaterThan(8)
  })

  it('moves the forest: the crown of every other tree, more at its top than further down, never its trunk', () => {
    let moving = 0
    for (let x = 0; x < 60; x += 3) for (let y = 0; y < 60; y += 3) if (swaysHere('pine', x, y)) moving++
    expect(moving).toBe(200)
    expect(swaysHere('rock', 0, 0)).toBe(false)
    const parts = crownParts(80, 0.014)
    expect(Math.abs(parts[0][2])).toBeGreaterThan(Math.abs(parts[1][2]))
    expect(Math.abs(parts[0][2])).toBeLessThan(1.2)
    // the lowest part of the picture - trunk and foot - is not among the parts
    expect(Math.max(...parts.map((part) => part[1]))).toBeLessThan(0.7)
    expect(crownParts(80, 0).every((part) => part[2] === 0)).toBe(true)
    expect(SWAY_FROM_ZOOM).toBeGreaterThan(0.5)
  })
})
