import { describe, expect, it } from 'vitest'
import { isBehind, moverSlot } from '../src/render/depth'

const house = { x: 10, y: 10, w: 2, h: 2 }

describe('carts and residents between the buildings', () => {
  it('stand in front of a building on the tiles along its two front sides', () => {
    // the middle of the tile right of the front right side, and of the tile below the front left side
    expect(isBehind(12.5, 10.5, house)).toBe(false)
    expect(isBehind(10.5, 12.5, house)).toBe(false)
  })

  it('stand behind a building on the tiles along its two back sides', () => {
    expect(isBehind(9.5, 11.5, house)).toBe(true)
    expect(isBehind(11.5, 9.5, house)).toBe(true)
  })

  it('are drawn before the first building they stand behind, and after those in front of which they stand', () => {
    const back = { x: 10, y: 6, w: 2, h: 2 }
    const front = { x: 10, y: 10, w: 2, h: 2 }
    // on the road between the two houses: in front of the back one, behind the front one
    expect(moverSlot({ x: 10.5, y: 8.5 }, [back, front])).toBe(1)
    // in front of both
    expect(moverSlot({ x: 10.5, y: 12.5 }, [back, front])).toBe(2)
    // behind both
    expect(moverSlot({ x: 10.5, y: 5.5 }, [back, front])).toBe(0)
  })

  it('ignore a building far in front: its picture cannot reach them', () => {
    expect(moverSlot({ x: 10.5, y: 5.5 }, [{ x: 30, y: 30, w: 2, h: 2 }])).toBe(1)
  })

  it('skip trees and bushes in the order, which have no footprint', () => {
    expect(moverSlot({ x: 9.5, y: 11.5 }, [null, house])).toBe(1)
  })
})
