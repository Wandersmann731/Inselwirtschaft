import { config } from '../../src/data'
import { snapshotOf, type CycleSnapshot } from '../../src/game/history'
import { createRng } from '../../src/sim/rng'
import { createInitialState, type GameState } from '../../src/sim/state'
import { tick } from '../../src/sim/tick'
import { residentsOfTier } from '../../src/sim/tiers'
import { Bot } from './bot'

export interface Milestone {
  /** Game minutes at which the first house of this tier appeared. */
  minutes: number
  residents: number
}

export interface Summary {
  seed: number
  ticks: number
  state: GameState
  bot: Bot
  history: CycleSnapshot[]
  /** First time each tier had at least one resident, by tier id. */
  milestones: Record<string, Milestone>
  lowestCoins: number
  /** Cycles in which the balance was negative. */
  lossCycles: number
  houses: number
}

const TIERS = ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats']

/** Lets the bot play the home island for `minutes` of game time (1 tick = 1 second). */
export function playthrough(seed: number, minutes: number, startCoins = config.startCoins): Summary {
  let state = createInitialState(seed, startCoins)
  const bot = new Bot(0)
  const history: CycleSnapshot[] = []
  const milestones: Record<string, Milestone> = {}
  let lowestCoins = state.coins
  let lossCycles = 0
  const total = minutes * 60
  for (let i = 0; i < total; i++) {
    const before = state
    state = tick(state, createRng(state.rngState))
    if (state.tick % 30 === 0) state = bot.step(state)
    lowestCoins = Math.min(lowestCoins, state.coins)
    if (Math.floor(state.tick / config.economyCycleTicks) !== Math.floor(before.tick / config.economyCycleTicks)) {
      const snap = snapshotOf(state, config.economyCycleTicks)
      history.push(snap)
      if (snap.balance < 0) lossCycles++
      for (const tier of TIERS) {
        if (!milestones[tier] && residentsOfTier(state, tier) > 0) milestones[tier] = { minutes: Math.round(state.tick / 60), residents: snap.residents }
      }
    }
  }
  const home = state.islands[0]
  return { seed, ticks: total, state, bot, history, milestones, lowestCoins: Math.floor(lowestCoins), lossCycles, houses: home.buildings.filter((b) => b.house).length }
}

/** A readable report of a playthrough. */
export function report(summary: Summary): string {
  const lines: string[] = []
  lines.push(`Seed ${summary.seed}: ${summary.ticks / 60} Minuten gespielt, ${summary.houses} Häuser`)
  for (const tier of TIERS) {
    const m = summary.milestones[tier]
    lines.push(`  ${tier.padEnd(12)} ${m ? `ab Minute ${m.minutes} (${m.residents} Einwohner im Reich)` : 'nie erreicht'}`)
  }
  const last = summary.history[summary.history.length - 1]
  lines.push(`  am Ende: ${last?.residents ?? 0} Einwohner, ${last?.coins ?? 0} Münzen, Bilanz ${last?.balance ?? 0}/Zyklus`)
  lines.push(`  niedrigster Münzstand ${summary.lowestCoins}, Verlustzyklen ${summary.lossCycles} von ${summary.history.length}`)
  const home = summary.state.islands[0]
  const counts = new Map<string, number>()
  for (const b of home.buildings) counts.set(b.type, (counts.get(b.type) ?? 0) + 1)
  lines.push(`  Gebäude: ${[...counts].map(([k, v]) => `${k} ${v}`).join(', ')}`)
  const status = home.buildings.filter((b) => b.production).map((b) => `${b.type}:${b.production!.status.kind}${b.production!.status.good ? '(' + b.production!.status.good + ')' : ''}`).join(', ')
  lines.push(`  Betriebe: ${status}`)
  const stock = Object.entries(home.stock).filter(([, v]) => v >= 1).map(([k, v]) => `${k} ${Math.floor(v)}`).join(', ')
  lines.push(`  Vorrat: ${stock}`)
  const needs: Record<string, number[]> = {}
  for (const b of home.buildings) {
    if (!b.house || b.house.ruin) continue
    for (const [need, percent] of Object.entries(b.house.needs)) (needs[need] ??= []).push(percent)
  }
  lines.push(`  Erfüllung im Schnitt: ${Object.entries(needs).map(([k, v]) => `${k} ${Math.round(v.reduce((a, c) => a + c, 0) / v.length)}%`).join(', ')}`)
  const blockers = [...summary.bot.stuck].sort((a, b) => b[1] - a[1]).slice(0, 20)
  lines.push(`  Hänger des Bots: ${blockers.map(([k, v]) => `${k} (${v}x)`).join('; ') || 'keine'}`)
  return lines.join('\n')
}
