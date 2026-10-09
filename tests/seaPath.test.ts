import { describe, expect, it } from 'vitest'
import type { WorldChart } from '../src/sim/state'
import { findSeaPath, portCell, reachableSea } from '../src/world/seaPath'

/** Builds a chart from rows: . sea, digits land of island (digit - 1... digit d = island d - 1). */
function chart(rows: string[]): WorldChart {
  const cells = rows.flatMap((row) => Array.from(row, (c) => (c === '.' ? 0 : Number(c))))
  return { width: rows[0].length, height: rows.length, cells, placements: [] }
}

describe('findSeaPath', () => {
  it('sails straight over open sea and ends at the goal', () => {
    const path = findSeaPath(chart(['.....', '.....', '.....']), { x: 0, y: 1 }, { x: 4, y: 1 })!
    expect(path).toHaveLength(4)
    expect(path[path.length - 1]).toEqual({ x: 4, y: 1 })
  })

  it('goes diagonally when that is shorter', () => {
    const path = findSeaPath(chart(['.....', '.....', '.....', '.....', '.....']), { x: 0, y: 0 }, { x: 4, y: 4 })!
    expect(path).toHaveLength(4)
  })

  it('sails around land', () => {
    const rows = ['.......', '...1...', '...1...', '...1...', '.......']
    const path = findSeaPath(chart(rows), { x: 0, y: 2 }, { x: 6, y: 2 })!
    expect(path.some((p) => p.y !== 2)).toBe(true)
    for (const p of path) expect(rows[p.y][p.x]).toBe('.')
  })

  it('does not squeeze diagonally between two land corners', () => {
    const rows = ['.1.', '1..', '...']
    // from (0,0) the only way to (1,1) would be diagonal between land at (1,0) and (0,1)
    expect(findSeaPath(chart(rows), { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull()
  })

  it('returns null if the goal is enclosed or on land', () => {
    const rows = ['.....', '.111.', '.1.1.', '.111.', '.....']
    expect(findSeaPath(chart(rows), { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull()
    expect(findSeaPath(chart(rows), { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull()
  })

  it('returns an empty path if start and goal are the same cell', () => {
    expect(findSeaPath(chart(['...']), { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([])
  })
})

describe('reachableSea and portCell', () => {
  const rows = ['.......', '.11111.', '.1...1.', '.11111.', '.......', '..2....']

  it('leaves out bays that are closed off from the open sea', () => {
    const sea = reachableSea(chart(rows))
    expect(sea[2 * 7 + 3]).toBe(0) // inside the ring of island 1
    expect(sea[0]).toBe(1)
  })

  it('docks at a reachable sea cell next to the island', () => {
    const c = chart(rows)
    const port = portCell(c, 0)!
    expect(c.cells[port.y * c.width + port.x]).toBe(0)
    const neighbours = [
      [port.x - 1, port.y],
      [port.x + 1, port.y],
      [port.x, port.y - 1],
      [port.x, port.y + 1],
    ]
    expect(neighbours.some(([x, y]) => c.cells[y * c.width + x] === 1)).toBe(true)
    expect(reachableSea(c)[port.y * c.width + port.x]).toBe(1)
  })

  it('has no port for an island that does not exist', () => {
    expect(portCell(chart(rows), 5)).toBeNull()
  })
})
