import { config } from '../data'
import { ticksDue } from '../sim/clock'
import { createRng } from '../sim/rng'
import type { GameSpeed, GameState } from '../sim/state'
import { setSpeed, tick } from '../sim/tick'

type Listener = () => void

/**
 * Fixed-timestep driver for the simulation. Independent of drawing: the renderer
 * runs on requestAnimationFrame and only reads getState().
 */
export class GameLoop {
  private state: GameState
  private listeners = new Set<Listener>()
  private timer: number | undefined
  private lastTime = 0
  private accumulatorMs = 0

  constructor(initial: GameState) {
    this.state = initial
  }

  getState = (): GameState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    if (this.timer !== undefined) return
    this.lastTime = performance.now()
    this.timer = window.setInterval(this.update, config.loopIntervalMs)
  }

  stop(): void {
    if (this.timer === undefined) return
    window.clearInterval(this.timer)
    this.timer = undefined
  }

  setSpeed(speed: GameSpeed): void {
    const next = setSpeed(this.state, speed)
    if (next === this.state) return
    this.state = next
    this.emit()
  }

  /** Replaces the whole state, e.g. after loading a save. */
  replaceState(state: GameState): void {
    this.state = state
    this.accumulatorMs = 0
    this.emit()
  }

  private update = (): void => {
    const now = performance.now()
    const due = ticksDue(
      this.accumulatorMs,
      now - this.lastTime,
      this.state.speed,
      config.tickMillis,
      config.maxTicksPerUpdate,
    )
    this.lastTime = now
    this.accumulatorMs = due.remainderMs
    if (due.ticks === 0) return
    let next = this.state
    for (let i = 0; i < due.ticks; i++) {
      next = tick(next, createRng(next.rngState))
    }
    this.state = next
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
