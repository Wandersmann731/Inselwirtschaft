import { describe, expect, it } from 'vitest'
import { blockVariant } from '../src/render/spriteKeys'
import { quarterBlocks } from '../src/render/quarterRenderer'
import { demolishBuilding } from '../src/sim/build'
import { planSettlement } from '../src/sim/settlementPlanner'
import { grassField } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 } }

describe('house blocks of a quarter', () => {
  it('collects the houses of each block with their bounding box', () => {
    const plan = planSettlement(grassField(40, 30, rich), 'house_pioneers', { x: 2, y: 2 }, { x: 7, y: 5 })
    const blocks = [...quarterBlocks(plan.result).values()]
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ x: 2, y: 2, w: 6, h: 4 })
    expect(blocks[0].members).toHaveLength(6)
  })

  it('drops a block down to one house: that house keeps its own plot', () => {
    const plan = planSettlement(grassField(40, 30, rich), 'house_pioneers', { x: 2, y: 2 }, { x: 5, y: 3 })
    const [first, second] = plan.result.buildings
    expect(quarterBlocks(plan.result).size).toBe(1)
    const alone = demolishBuilding(plan.result, second.id)
    expect(quarterBlocks(alone).size).toBe(0)
    expect(first.quarter).toBe(first.id)
  })

  it('gives every house of a block its own picture and shuffles the pictures per block', () => {
    for (let quarter = 1; quarter < 40; quarter++) {
      const pictures = Array.from({ length: 9 }, (_, slot) => blockVariant(16, quarter, slot))
      expect(new Set(pictures).size).toBe(9)
    }
    const firsts = new Set(Array.from({ length: 20 }, (_, q) => blockVariant(16, q + 1, 0)))
    expect(firsts.size).toBeGreaterThan(6)
  })
})
