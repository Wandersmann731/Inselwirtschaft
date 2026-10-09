import { getBuilding } from '../data'
import { footprint, demolishTiles, placeBuilding, placeRoads } from '../sim/build'
import { setBuildingActive } from '../sim/production'
import { buildShip } from '../sim/ships'
import type { GameLoop } from './gameLoop'
import { grabRoute, moveRoute, releaseRoute, resetWaypoints, tapRoute, EMPTY_ROUTE, type RouteDraft } from './routeDraft'
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
  /** Road mode: draw by hand instead of planning a route between two points. */
  freehand: boolean
  /** Road mode: the planned route. */
  route: RouteDraft
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
  freehand: false,
  route: EMPTY_ROUTE,
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
    return this.snapshot.mode === 'demolish' || (this.snapshot.mode === 'road' && this.snapshot.freehand)
  }

  /** True while a finger on the route picks up handles instead of panning the map. */
  get grabbing(): boolean {
    const { mode, freehand, route } = this.snapshot
    return mode === 'road' && !freehand && route.plan !== null
  }

  /** How single-finger drags on the map are read right now. */
  get inputMode(): 'pan' | 'draw' | 'grab' {
    return this.drawing ? 'draw' : this.grabbing ? 'grab' : 'pan'
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

  /** Builds a ship at the shipyard of the island on screen. */
  buildShip(): void {
    const islandId = this.loop.activeIsland
    this.loop.dispatch((state) => buildShip(state, islandId))
  }

  /** Switches a building on or off (shut down). */
  setActive(id: number, active: boolean): void {
    this.loop.dispatchIsland((state) => setBuildingActive(state, id, active))
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
    this.loop.dispatchIsland((state) => placeBuilding(state, typeId, origin.x, origin.y, rotated))
    // Stay in placing mode so several buildings of one kind can follow each other.
    this.set({ ...this.snapshot, center: null, origin: null })
  }

  setFreehand(on: boolean): void {
    if (this.snapshot.mode !== 'road') return
    this.set({ ...this.snapshot, freehand: on, stroke: [], route: EMPTY_ROUTE })
  }

  /** Tap in route mode: sets the start, then the end of the road. */
  routeTap(tile: Tile): void {
    if (this.snapshot.mode !== 'road' || this.snapshot.freehand) return
    this.setRoute(tapRoute(this.loop.getIslandState(), this.snapshot.route, tile))
  }

  /** Finger down on the map in route mode. True if it picked up a handle or the route. */
  routeGrab(tile: Tile): boolean {
    const grabbed = grabRoute(this.loop.getIslandState(), this.snapshot.route, tile)
    if (!grabbed) return false
    this.setRoute(grabbed)
    return true
  }

  routeMove(tile: Tile): void {
    this.setRoute(moveRoute(this.loop.getIslandState(), this.snapshot.route, tile))
  }

  routeRelease(): void {
    this.setRoute(releaseRoute(this.loop.getIslandState(), this.snapshot.route))
  }

  /** Back to the best route without waypoints. */
  routeReset(): void {
    this.setRoute(resetWaypoints(this.loop.getIslandState(), this.snapshot.route))
  }

  /** Throws the planned route away and starts over with a new start point. */
  routeClear(): void {
    this.setRoute(EMPTY_ROUTE)
  }

  /** Builds the planned route. Stays in road mode for the next one. */
  routeConfirm(): void {
    const plan = this.snapshot.route.plan
    if (this.snapshot.mode !== 'road' || !plan) return
    this.loop.dispatchIsland((state) => placeRoads(state, plan.newTiles))
    this.setRoute(EMPTY_ROUTE)
  }

  private setRoute(route: RouteDraft): void {
    if (route === this.snapshot.route) return
    this.set({ ...this.snapshot, route })
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
    if (mode === 'road') this.loop.dispatchIsland((state) => placeRoads(state, stroke))
    else if (mode === 'demolish') this.loop.dispatchIsland((state) => demolishTiles(state, stroke))
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
