import { getBuilding } from '../data'
import { footprint, demolishTiles, placeBuilding, placeRoads } from '../sim/build'
import { setBuildingActive } from '../sim/production'
import type { GameLoop } from './gameLoop'
import { strokeLine, type Tile } from './stroke'

export type ToolMode = 'none' | 'place' | 'road' | 'demolish'

/** Everything the UI and the renderer need to know about the current build tool. */
export interface ToolSnapshot {
  mode: ToolMode
  /** Building being placed (mode 'place'). */
  typeId: string | null
  /** Tile the player tapped; the building is centred on it. Null until the first tap. */
  center: Tile | null
  rotated: boolean
  /** Top-left tile of the ghost building, derived from center and rotation. */
  origin: Tile | null
  /** Tiles touched by the current drag (modes 'road' and 'demolish'). */
  stroke: Tile[]
  /** Building whose info panel is open (mode 'none'). */
  selectedBuildingId: number | null
}

const IDLE: ToolSnapshot = {
  mode: 'none',
  typeId: null,
  center: null,
  rotated: false,
  origin: null,
  stroke: [],
  selectedBuildingId: null,
}

/**
 * Holds the current build tool (placing a building, drawing roads, demolishing) and turns
 * confirmed actions into commands for the simulation. Lives outside React.
 */
export class BuildController {
  private loop: GameLoop
  private snapshot: ToolSnapshot = IDLE
  private listeners = new Set<() => void>()

  constructor(loop: GameLoop) {
    this.loop = loop
  }

  getSnapshot = (): ToolSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** True while single-finger drags should draw instead of pan the map. */
  get drawing(): boolean {
    return this.snapshot.mode === 'road' || this.snapshot.mode === 'demolish'
  }

  startPlacing(typeId: string): void {
    this.set({ ...IDLE, mode: 'place', typeId })
  }

  startRoads(): void {
    this.set({ ...IDLE, mode: 'road' })
  }

  startDemolish(): void {
    this.set({ ...IDLE, mode: 'demolish' })
  }

  cancel(): void {
    this.set(IDLE)
  }

  /** Opens or closes the info panel of a building. Only works while no build tool is active. */
  selectBuilding(id: number | null): void {
    if (this.snapshot.mode !== 'none' || this.snapshot.selectedBuildingId === id) return
    this.set({ ...this.snapshot, selectedBuildingId: id })
  }

  /** Switches a building on or off (shut down). */
  setActive(id: number, active: boolean): void {
    this.loop.dispatch((state) => setBuildingActive(state, id, active))
  }

  rotate(): void {
    if (this.snapshot.mode !== 'place') return
    this.set({ ...this.snapshot, rotated: !this.snapshot.rotated }, true)
  }

  /** Moves the ghost building so that it is centred on the tapped tile. */
  setCenter(tile: Tile): void {
    if (this.snapshot.mode !== 'place') return
    this.set({ ...this.snapshot, center: tile }, true)
  }

  /** Builds the ghost building. Does nothing if the placement is invalid or unaffordable. */
  confirm(): void {
    const { mode, typeId, origin, rotated } = this.snapshot
    if (mode !== 'place' || !typeId || !origin) return
    this.loop.dispatch((state) => placeBuilding(state, typeId, origin.x, origin.y, rotated))
    // Stay in placing mode so several buildings of one kind can follow each other.
    this.set({ ...this.snapshot, center: null, origin: null })
  }

  strokeStart(tile: Tile): void {
    if (!this.drawing) return
    this.set({ ...this.snapshot, stroke: [tile] })
  }

  strokeMove(tile: Tile): void {
    const { stroke } = this.snapshot
    if (!this.drawing || stroke.length === 0) return
    const last = stroke[stroke.length - 1]
    if (last.x === tile.x && last.y === tile.y) return
    const known = new Set(stroke.map((t) => `${t.x},${t.y}`))
    const added = strokeLine(last, tile).filter((t) => !known.has(`${t.x},${t.y}`))
    if (added.length === 0) return
    this.set({ ...this.snapshot, stroke: [...stroke, ...added] })
  }

  /** Applies the dragged tiles: roads are laid or buildings and roads removed. */
  strokeEnd(): void {
    const { mode, stroke } = this.snapshot
    if (stroke.length === 0) return
    if (mode === 'road') this.loop.dispatch((state) => placeRoads(state, stroke))
    else if (mode === 'demolish') this.loop.dispatch((state) => demolishTiles(state, stroke))
    this.set({ ...this.snapshot, stroke: [] })
  }

  strokeCancel(): void {
    if (this.snapshot.stroke.length > 0) this.set({ ...this.snapshot, stroke: [] })
  }

  private set(next: ToolSnapshot, recomputeOrigin = false): void {
    this.snapshot = recomputeOrigin ? { ...next, origin: this.originFor(next) } : next
    this.listeners.forEach((listener) => listener())
  }

  private originFor({ typeId, center, rotated }: ToolSnapshot): Tile | null {
    if (!typeId || !center) return null
    const { w, h } = footprint(getBuilding(typeId), rotated)
    return { x: center.x - Math.floor(w / 2), y: center.y - Math.floor(h / 2) }
  }
}
