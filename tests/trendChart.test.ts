import { describe, expect, it } from 'vitest'
import { linePoints } from '../src/ui/trendLine'

describe('trend line', () => {
  it('spreads the values over the width and puts the highest at the top', () => {
    const points = linePoints([0, 5, 10], 100, 50, 0).split(' ').map((pair) => pair.split(',').map(Number))
    expect(points).toEqual([[0, 50], [50, 25], [100, 0]])
  })

  it('draws a flat series through the middle instead of dividing by zero', () => {
    expect(linePoints([7, 7], 100, 50, 0)).toBe('0.0,25.0 100.0,25.0')
  })
})
