import { describe, expect, it } from 'vitest'
import { goods, tiers } from '../src/data'
import { GROUND_SIZE, groundTexel, type GroundName } from '../src/render/groundMade'
import { builtVariants } from '../src/render/built'
import { GROWN } from '../src/render/grown'
import { iconCanvas, iconNames, iconUrl } from '../src/render/icons'
import { FLEET, freeBeside, GREEN, islandPlace, TOWN } from '../src/ui/harbourScene'
import { landAt, streetAt } from '../src/ui/harbourGround'

describe('symbols drawn by code', () => {
  const names = new Set(iconNames())

  it('has one for every good and every tier of residents', () => {
    for (const good of goods) expect(names.has(`goods/${good.id}`), good.id).toBe(true)
    for (const tier of tiers) expect(names.has(`tiers/${tier.id}`), tier.id).toBe(true)
  })

  it('has every symbol the interface asks for', () => {
    const wanted = ['balance_down', 'balance_up', 'cat_demolish', 'cat_housing', 'cat_infrastructure', 'cat_production', 'cat_public', 'cat_statistics', 'cat_trade', 'cat_worldmap', 'coin', 'population', 'status_full', 'status_inactive', 'status_nohub', 'status_noroad', 'status_producing', 'status_waiting', 'warning']
    for (const name of wanted) expect(names.has(`ui/${name}`), name).toBe(true)
  })

  it('gives nothing for a name it does not know, and nothing where there is no canvas', () => {
    expect(iconCanvas('goods/no_such_thing')).toBeNull()
    expect(iconUrl('ui/no_such_thing')).toBe('')
    expect(iconCanvas('goods/wood')).toBeNull()
  })
})

describe('the grounds of the map, made by code', () => {
  const all: GroundName[] = ['grass', 'forest', 'sand', 'rock']
  const mean = (name: GroundName): number[] => {
    const sum = [0, 0, 0]
    let n = 0
    for (let y = 0; y < GROUND_SIZE; y += 3) {
      for (let x = 0; x < GROUND_SIZE; x += 3) {
        const texel = groundTexel(name, x, y)
        for (let c = 0; c < 3; c++) sum[c] += texel[c]
        n++
      }
    }
    return sum.map((v) => v / n)
  }

  it('repeat without a seam', () => {
    for (const name of all) {
      for (const k of [7, 90, 201]) {
        expect(groundTexel(name, 0, k)).toEqual(groundTexel(name, GROUND_SIZE, k))
        expect(groundTexel(name, k, 0)).toEqual(groundTexel(name, k, GROUND_SIZE))
        // and its last texel runs on into its first: no jump larger than the grain of the ground itself
        const jump = Math.abs(groundTexel(name, GROUND_SIZE - 1, k)[1] - groundTexel(name, 0, k)[1])
        expect(jump).toBeLessThan(90)
      }
    }
  })

  it('keep the colours the map was tuned for: a warm green meadow, dark forest floor, pale sand, grey rock', () => {
    const [grass, forest, sand, rock] = all.map(mean)
    // a meadow in afternoon light, as measured in docs/ziel/zielbild.jpg: green leads, red follows close, hardly any blue
    expect(grass[1]).toBeGreaterThan(grass[0])
    expect(grass[0]).toBeGreaterThan(grass[1] * 0.8)
    expect(grass[2]).toBeLessThan(grass[1] * 0.55)
    expect(Math.abs(grass[1] - 118)).toBeLessThan(6)
    expect((forest[0] + forest[1] + forest[2]) / 3).toBeLessThan(70)
    expect(sand[0]).toBeGreaterThan(235)
    expect(sand[2]).toBeLessThan(sand[0])
    expect(Math.abs(rock[0] - rock[2])).toBeLessThan(26)
    expect((rock[0] + rock[1] + rock[2]) / 3).toBeGreaterThan(95)
    expect((rock[0] + rock[1] + rock[2]) / 3).toBeLessThan(125)
  })

  it('have grain: sand is the calmest, grass and forest floor the liveliest', () => {
    const spread = (name: GroundName): number => {
      const m = mean(name)[1]
      let sum = 0
      let n = 0
      for (let y = 0; y < GROUND_SIZE; y += 5) for (let x = 0; x < GROUND_SIZE; x += 5, n++) sum += (groundTexel(name, x, y)[1] - m) ** 2
      return Math.sqrt(sum / n)
    }
    expect(spread('sand')).toBeLessThan(spread('rock'))
    expect(spread('rock')).toBeLessThan(spread('grass'))
    expect(spread('sand')).toBeGreaterThan(2)
  })
})

describe('the harbour scene behind the start menu', () => {
  it('is put together from what the game itself builds and grows, nothing else', () => {
    for (const [name] of TOWN) expect(builtVariants(`buildings/${name.replace(/_\d+$/, '')}`), name).toContain(`buildings/${name}`)
    for (const [kind, variant] of GREEN) expect(GROWN[kind]?.variants ?? 0, kind).toBeGreaterThanOrEqual(variant)
    expect(TOWN.length).toBeGreaterThan(10)
  })

  it('has a shore that wanders, with the town on dry land and the ships afloat', () => {
    for (const [name, u, v] of TOWN) for (const [du, dv] of [[0, 0], [2, 0], [0, 2], [2, 2]]) expect(landAt(u + du, v + dv), name).toBeGreaterThan(0.2)
    for (const [kind, , u, v] of GREEN) expect(landAt(u, v), kind).toBeGreaterThan(0)
    for (const [, u, v] of FLEET) expect(landAt(u, v)).toBeLessThan(-1)
    expect(landAt(40, 40)).toBeLessThan(-20)
    // no round island: the shore is nearer to the middle in one direction than in another
    const reach = (turn: number): number => {
      let far = 0
      while (landAt(5.7 + Math.cos(turn) * far, 5.4 + Math.sin(turn) * far) > 0) far += 0.1
      return far
    }
    const reaches = Array.from({ length: 24 }, (_, k) => reach((k / 24) * Math.PI * 2))
    expect(Math.max(...reaches) - Math.min(...reaches)).toBeGreaterThan(1)
  })

  it('lays streets between the houses', () => {
    expect(streetAt(8, 2.7)).toBe(1)
    expect(streetAt(8, 1.4)).toBe(0)
  })

  it('puts the island where the menu is not: beside it on a wide screen, under it on a tall one', () => {
    const wide = freeBeside(1100, 640, { x: 33, y: 140, w: 420, h: 360 })
    expect(wide.x).toBe(453)
    expect(wide.h).toBe(640)
    const tall = freeBeside(390, 844, { x: 12, y: 25, w: 366, h: 330 })
    expect(tall.y).toBe(355)
    expect(tall.w).toBe(390)
    expect(freeBeside(800, 600, null)).toEqual({ x: 0, y: 0, w: 800, h: 600 })
    // the island fits into its room and lies below the horizon
    const place = islandPlace(1100, 640, wide)
    expect(place.s * 920).toBeLessThanOrEqual(wide.w + 0.001)
    expect(place.origin[0]).toBeGreaterThan(wide.x)
    expect(place.horizon).toBeLessThan(place.origin[1] + 177.6 * place.s - 220 * place.s + 1)
    expect(place.horizon).toBeGreaterThanOrEqual(640 * 0.14)
  })
})
