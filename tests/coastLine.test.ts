import { describe, expect, it } from 'vitest'
import { buildPieces, coastCurves, rounded, type TilePoint } from '../src/render/coastLine'
import { landShare } from '../src/render/groundTextures'
import { Terrain, type GameMap } from '../src/world/terrain'

/** A round island of grass in the middle of a square sea. */
function island(size: number, radius: number): GameMap {
  const tiles: number[] = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) tiles.push(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) < radius ? Terrain.Grass : Terrain.Water)
  return { width: size, height: size, tiles }
}

describe('the coast as a curve', () => {
  const map = island(30, 9)

  it('lies where the land of the ground picture ends', () => {
    for (const seed of [1, 4, 9]) {
      const curves = coastCurves(map, seed)
      expect(curves).toHaveLength(1)
      let off = 0
      for (const [u, v] of curves[0].line) off += Math.abs(landShare(map, seed, u, v) - 0.5)
      // on average within a few hundredths of the 0.5 line (cutting the corners moves the points a little)
      expect(off / curves[0].line.length).toBeLessThan(0.06)
    }
  })

  it('points out to sea at every point', () => {
    const { line, out } = coastCurves(map, 4)[0]
    let seaward = 0
    for (const [k, [u, v]] of line.entries()) {
      if (landShare(map, 4, u + out[k][0] * 0.4, v + out[k][1] * 0.4) < landShare(map, 4, u - out[k][0] * 0.4, v - out[k][1] * 0.4)) seaward++
    }
    expect(seaward / line.length).toBeGreaterThan(0.97)
  })

  it('is smooth: no bend sharper than a gentle turn from one point to the next', () => {
    const { line } = coastCurves(map, 4)[0]
    let sharp = 0
    for (let k = 1; k < line.length - 1; k++) {
      const a = Math.atan2(line[k][1] - line[k - 1][1], line[k][0] - line[k - 1][0])
      const b = Math.atan2(line[k + 1][1] - line[k][1], line[k + 1][0] - line[k][0])
      const turn = Math.abs(((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
      if (turn > 1.2) sharp++
    }
    expect(sharp / line.length).toBeLessThan(0.02)
  })

  it('goes around a building at the water, with sand between the two', () => {
    // a building on a sea tile right beside the island
    const index = 15 * 30 + 24
    expect(map.tiles[index]).toBe(Terrain.Water)
    const solid = (x: number, y: number): boolean => y === 15 && x === 24
    const reaches = (curves: { line: TilePoint[] }[]): number => Math.max(...curves.flatMap((curve) => curve.line.map(([u]) => u)))
    expect(reaches(coastCurves(map, 4, solid))).toBeGreaterThan(reaches(coastCurves(map, 4)) + 0.5)
    expect(reaches(coastCurves(map, 4, solid))).toBeGreaterThan(25)
  })
})

describe('cutting corners', () => {
  it('doubles the points of a closed line and keeps it closed', () => {
    const square: TilePoint[] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
    const round = rounded(square)
    expect(round).toHaveLength(9)
    expect(round[0]).toEqual(round[8])
    // no point is a corner of the square any more
    for (const [u, v] of round) expect((u === 0 || u === 4) && (v === 0 || v === 4)).toBe(false)
  })
})

describe('the coast in pieces', () => {
  it('shares end points between neighbours, so the foam is one line, and a wave arrives later along the coast', () => {
    const pieces = buildPieces(island(30, 9), 4)
    expect(pieces.length).toBeGreaterThan(4)
    for (let k = 1; k < pieces.length; k++) {
      const before = pieces[k - 1]
      expect(pieces[k].x[0]).toBe(before.x[before.x.length - 1])
      expect(pieces[k].y[0]).toBe(before.y[before.y.length - 1])
      expect(pieces[k].lag[0]).toBeGreaterThan(before.lag[0])
    }
    for (const piece of pieces) for (const rough of piece.rough) expect(rough >= 0 && rough <= 1).toBe(true)
  })
})
