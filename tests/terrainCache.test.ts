import { describe, expect, it, vi } from 'vitest'
import { world } from '../src/data'
import { Terrain, type GameMap } from '../src/world/terrain'

// renderChunk needs a DOM canvas: count the calls and hand out a stand-in picture
const renders: { rx: number; ry: number; scale: number }[] = []
vi.mock('../src/render/terrainChunk', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/render/terrainChunk')>()
  return {
    ...original,
    renderChunk: (rx: number, ry: number, _tiles: number[], _ctx: unknown, scale: number) => {
      renders.push({ rx, ry, scale })
      return { rx, ry, scale } as unknown as HTMLCanvasElement
    },
  }
})

const { TerrainCache } = await import('../src/render/terrainCache')
const { CHUNK_H, chunkDependencies, chunkTiles } = await import('../src/render/terrainChunk')

function makeMap(size: number): GameMap {
  return { width: size, height: size, tiles: new Array(size * size).fill(Terrain.Grass) }
}

function requestFor(map: GameMap) {
  const empty = new Array(map.width * map.height).fill(0)
  return { map, seed: 1, climate: 'north', occupancy: empty, roads: empty, yard: null, textures: {} as never }
}

/** One frame as drawTerrain does it: ask for every rectangle, then make some. */
function frame(cache: InstanceType<typeof TerrainCache>, keys: [number, number][], request: ReturnType<typeof requestFor>) {
  for (const [rx, ry] of keys) cache.request(rx, ry, request)
  cache.process(1e9)
}

describe('terrain cache', () => {
  const map = makeMap(140)
  const request = requestFor(map)
  // 6 x 6 = 36 rectangles on screen: more than the 28 kept at 2x
  const visible: [number, number][] = []
  for (let ry = 4; ry < 10; ry++) for (let rx = -3; rx < 3; rx++) visible.push([rx, ry])

  it('keeps every rectangle on screen at 2x even if there are more than the usual limit', () => {
    renders.length = 0
    const cache = new TerrainCache()
    cache.prepare(map, 2)
    frame(cache, visible, request)
    expect(renders).toHaveLength(visible.length)
    // later frames make nothing again and every rectangle stays drawable
    frame(cache, visible, request)
    frame(cache, visible, request)
    expect(renders).toHaveLength(visible.length)
    for (const [rx, ry] of visible) expect(cache.get(rx, ry)?.ready).toBe(true)
  })

  it('keeps showing the old pictures while a new picture scale is made', () => {
    renders.length = 0
    const cache = new TerrainCache()
    cache.prepare(map, 1)
    frame(cache, visible, request)
    cache.prepare(map, 2)
    for (const [rx, ry] of visible) {
      const shown = cache.request(rx, ry, request)
      expect(shown.ready).toBe(true)
      expect(shown.canvas).not.toBeNull()
    }
    cache.process(1e9)
    expect(renders.filter((r) => r.scale === 2)).toHaveLength(visible.length)
  })

  it('makes a rectangle again when a building appears just above it', () => {
    renders.length = 0
    const cache = new TerrainCache()
    cache.prepare(map, 1)
    const [rx, ry] = [0, 6]
    frame(cache, [[rx, ry]], request)
    // a tile whose bottom corner lies 60 px above the rectangle: its yard reaches down into it
    const tiles = new Set(chunkTiles(map, rx, ry))
    const ty = (ry * CHUNK_H - 60) / 32 - 0.5
    const index = Math.round(ty) * map.width + Math.round(ty)
    expect(tiles.has(index)).toBe(false)
    expect(chunkDependencies(map, rx, ry)).toContain(index)
    const occupancy = request.occupancy.slice()
    occupancy[index] = 7
    frame(cache, [[rx, ry]], { ...request, occupancy })
    expect(renders).toHaveLength(2)
  })

  it('reaches as far as the village yard plus the blending and the building ring', () => {
    const deps = new Set(chunkDependencies(map, 0, 6))
    const reach = world.settlement.radius + 2
    for (const index of chunkTiles(map, 0, 6)) {
      const tx = index % map.width
      const ty = (index - tx) / map.width
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const x = tx + dx
          const y = ty + dy
          if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue
          expect(deps.has(y * map.width + x)).toBe(true)
        }
      }
    }
  })
})
