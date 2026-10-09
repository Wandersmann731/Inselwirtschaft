import { describe, expect, it } from 'vitest'
import { playthrough, report } from './bot/run'

// A computer player plays the home island for 150 game minutes. Slow, so it is not part of `npm test`: run `npm run playtest`.
// It checks that the economy can carry a growing town. It does NOT prove that every playing style works.

const STABLE_SEEDS = [1, 2, 3, 4, 6]

describe('playthrough with the bot', () => {
  for (const seed of STABLE_SEEDS) {
    it(`seed ${seed}: the town grows and the economy stays healthy`, () => {
      const summary = playthrough(seed, 150)
      console.log(report(summary))
      const last = summary.history[summary.history.length - 1]
      expect(summary.milestones.settlers?.minutes ?? 999, 'settlers by minute 15').toBeLessThanOrEqual(15)
      expect(summary.milestones.citizens, 'citizens reached at least once').toBeDefined()
      expect(last.residents, 'residents at the end').toBeGreaterThanOrEqual(150)
      expect(last.coins, 'coins at the end').toBeGreaterThan(0)
      expect(last.balance, 'balance per cycle at the end').toBeGreaterThan(0)
      expect(summary.lowestCoins, 'never deep in debt').toBeGreaterThan(-200)
    }, 120000)
  }

  it('reports (without checking) the weak seed and the state of the merchants', () => {
    const summary = playthrough(5, 150)
    console.log(report(summary))
    expect(summary.history.length).toBe(150)
  }, 120000)
})
