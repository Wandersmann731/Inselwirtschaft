import { describe, expect, it } from 'vitest'
import { coastEdges, edgeFade, FADE_TILES } from '../src/render/coastFade'
import { shortGood } from '../src/render/buildingRenderer'
import { DAY_TICKS, duskShare } from '../src/render/sky'
import { config } from '../src/data'
import { createHouse } from '../src/sim/tiers'
import { Terrain, type GameMap } from '../src/world/terrain'

/** A map from rows: ~ water, . beach, , grass. */
function mapOf(rows: string[]): GameMap {
  const code: Record<string, number> = { '~': Terrain.Water, '.': Terrain.Beach, ',': Terrain.Grass }
  return { width: rows[0].length, height: rows.length, tiles: rows.flatMap((row) => Array.from(row, (char) => code[char])) }
}

describe('plots on the beach', () => {
  // grass in the north west, sand to the south and east, water beyond
  const map = mapOf([
    ',,,,..~',
    ',,,,..~',
    ',,,,..~',
    ',,,,..~',
    '......~',
    '~~~~~~~',
  ])
  const free = new Array(map.tiles.length).fill(0)

  it('fade at the edges that border free sand or the water, not at grass', () => {
    expect(coastEdges(map, free, { x: 2, y: 2, w: 2, h: 2 })).toEqual({ ne: false, se: true, sw: true, nw: false })
    expect(coastEdges(map, free, { x: 0, y: 0, w: 2, h: 2 })).toEqual({ ne: false, se: false, sw: false, nw: false })
    // the drawn beach reaches into the water tiles: an edge at the water fades as well
    expect(coastEdges(map, free, { x: 0, y: 3, w: 2, h: 2 }).sw).toBe(true)
    // beyond the map there is nothing to fade into
    expect(coastEdges(map, free, { x: 0, y: 0, w: 2, h: 2 }).nw).toBe(false)
  })

  it('stay hard against a neighbour that stands on the sand', () => {
    const taken = [...free]
    taken[2 * map.width + 4] = 7
    taken[3 * map.width + 4] = 7
    expect(coastEdges(map, taken, { x: 2, y: 2, w: 2, h: 2 }).se).toBe(false)
  })

  it('keep the picture whole inside and let it run out towards a fading edge', () => {
    const edges = { ne: false, se: true, sw: false, nw: false }
    expect(edgeFade(1, 1, 2, 2, edges)).toBe(1)
    expect(edgeFade(2, 1, 2, 2, edges)).toBe(0)
    expect(edgeFade(2.4, 1, 2, 2, edges)).toBe(0)
    const half = edgeFade(2 - FADE_TILES / 2, 1, 2, 2, edges)
    expect(half).toBeGreaterThan(0.3)
    expect(half).toBeLessThan(0.7)
    // the other edges are untouched
    expect(edgeFade(1, 2, 2, 2, edges)).toBe(1)
    expect(edgeFade(0, 0, 2, 2, edges)).toBe(1)
  })
})

describe('the evening', () => {
  it('comes once a day, softly, and is gone by morning', () => {
    expect(duskShare(0)).toBe(0)
    expect(duskShare(DAY_TICKS * 0.5)).toBe(0)
    expect(duskShare(DAY_TICKS * 0.85)).toBe(1)
    const coming = duskShare(DAY_TICKS * 0.75)
    expect(coming).toBeGreaterThan(0)
    expect(coming).toBeLessThan(1)
    expect(duskShare(DAY_TICKS * 0.99)).toBeLessThan(0.3)
    expect(duskShare(DAY_TICKS * 3.85)).toBe(1)
  })
})

describe('the mark on a house in shortage', () => {
  it('names the good the residents have run short of', () => {
    const fed = { ...createHouse('settlers'), needs: { food: 100, cloth: 100, chapel: 100, alcohol: 100, salt: 100, tavern: 100 } }
    expect(shortGood(fed)).toBeUndefined()
    expect(shortGood({ ...fed, needs: { ...fed.needs, alcohol: config.population.shortageBelow - 1 } })).toBe('alcohol')
    // a missing tavern is no good: the plain mark stays
    expect(shortGood({ ...fed, needs: { ...fed.needs, tavern: 0 } })).toBeUndefined()
  })
})
