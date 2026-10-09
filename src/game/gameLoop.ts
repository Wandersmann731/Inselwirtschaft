import { config } from '../data'
import { ticksDue } from '../sim/clock'
import { getIsland, onIsland, toIslandState } from '../sim/islands'
import { createRng } from '../sim/rng'
import type { GameSpeed, GameState, IslandState } from '../sim/state'
import { setSpeed, tick } from '../sim/tick'

type Listener = () => void

/** What the screen shows: the game and the island the player looks at. */
export interface GameView {
  state: GameState
  activeIsland: number
}

/**
 * Fixed-timestep driver for the simulation. Independent of drawing: the renderer
 * runs on requestAnimationFrame and only reads the state.
 */
export class GameLoop {
  private view: GameView
  private listeners = new Set<Listener>()
  private timer: number | undefined
  private lastTime = 0
  private accumulatorMs = 0

  constructor(initial: GameState) {
    const home = initial.islands.find((island) => island.owned) ?? initial.islands[0]
    this.view = { state: initial, activeIsland: home.id }
  }

  /** Changes whenever the state or the shown island changes. */
  getView = (): GameView => this.view

  getState = (): GameState => this.view.state

  get activeIsland(): number {
    return this.view.activeIsland
  }

  /** The game seen from the island on screen. */
  getIslandState = (): IslandState => toIslandState(this.view.state, this.view.activeIsland)

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
    const next = setSpeed(this.view.state, speed)
    if (next === this.view.state) return
    this.setState(next)
  }

  /** Shows another island. */
  setActiveIsland(islandId: number): void {
    getIsland(this.view.state, islandId)
    if (islandId === this.view.activeIsland) return
    this.view = { ...this.view, activeIsland: islandId }
    this.emit()
  }

  /** Applies a player command (a pure state transformation), e.g. sending a ship. */
  dispatch(command: (state: GameState) => GameState): void {
    const next = command(this.view.state)
    if (next === this.view.state) return
    this.setState(next)
  }

  /** Applies a command to the island on screen, e.g. building something. */
  dispatchIsland(command: (island: IslandState) => IslandState): void {
    const islandId = this.view.activeIsland
    this.dispatch((state) => onIsland(state, islandId, command))
  }

  /** Replaces the whole state, e.g. after loading a save. */
  replaceState(state: GameState): void {
    this.accumulatorMs = 0
    const stillThere = state.islands.some((island) => island.id === this.view.activeIsland)
    this.view = { state, activeIsland: stillThere ? this.view.activeIsland : state.islands[0].id }
    this.emit()
  }

  private setState(state: GameState): void {
    this.view = { ...this.view, state }
    this.emit()
  }

  private update = (): void => {
    const now = performance.now()
    const { state } = this.view
    const due = ticksDue(this.accumulatorMs, now - this.lastTime, state.speed, config.tickMillis, config.maxTicksPerUpdate)
    this.lastTime = now
    this.accumulatorMs = due.remainderMs
    if (due.ticks === 0) return
    let next = state
    for (let i = 0; i < due.ticks; i++) {
      next = tick(next, createRng(next.rngState))
    }
    this.setState(next)
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
