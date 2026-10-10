import { getBuilding } from '../data'
import { demolishBuilding, demolishTiles, footprint, placeBuilding, placeRoads } from '../sim/build'
import { haptic } from './haptic'
import { buildSettlement, planSettlement } from '../sim/settlementPlanner'
import { setBuildingActive } from '../sim/production'
import { setUpgradeStop } from '../sim/population'
import { buildShip } from '../sim/ships'
import type { IslandState } from '../sim/state'
import { recordBuild, undoBuild, type BuildRecord } from '../sim/undo'
import type { GameLoop } from './gameLoop'
import { nearestSpot, originAt } from './placeSearch'
import { loadRecent, pushRecent } from './recent'
import { grabRoute, moveRoute, releaseRoute, resetWaypoints, tapRoute, EMPTY_ROUTE, type RouteDraft } from './routeDraft'
import { strokeLine, type Tile } from './stroke'

export type ToolMode = 'none' | 'place' | 'road' | 'demolish'

/** How long the last build action can be taken back, in milliseconds. */
export const UNDO_MS = 12000

/** The last build action, which "Rückgängig" can take back for its full cost. */
export interface UndoEntry {
  record: BuildRecord
  islandId: number
  /** performance.now() when it was built. */
  at: number
  /** What was built, for the button: "Förster", "3 Häuser", "Straße". */
  label: string
}

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
  /** Placing houses: drag an area and let the game lay out a village in it. */
  areaMode: boolean
  /** The dragged area (both corners) and the houses planned in it. */
  area: { a: Tile; b: Tile; origins: Tile[]; blocks: number[]; outOfMoney: boolean } | null
  /** Road mode: draw by hand instead of planning a route between two points. */
  freehand: boolean
  /** Road mode: the planned route. */
  route: RouteDraft
  /** Building whose info panel is open (mode 'none'). */
  selectedBuildingId: number | null
  /** The last build action, while it can still be taken back. Kept across tool changes. */
  undo: UndoEntry | null
  /** Building types built last, newest first. Kept across tool changes. */
  recent: string[]
}

const IDLE: ToolSnapshot = {
  mode: 'none',
  typeId: null,
  center: null,
  rotated: false,
  origin: null,
  stroke: [],
  areaMode: false,
  area: null,
  freehand: false,
  route: EMPTY_ROUTE,
  selectedBuildingId: null,
  undo: null,
  recent: [],
}

/**
 * Holds the current build tool (placing a building, drawing roads, demolishing) and turns
 * confirmed actions into commands for the simulation. Lives outside React.
 */
export class BuildController {
  private loop: GameLoop
  private snapshot: ToolSnapshot = IDLE
  private listeners = new Set<() => void>()
  private undoEntry: UndoEntry | null = null
  private recent: string[] = loadRecent()
  /** The tile in the middle of the map view; set by the map canvas. */
  private viewCenter: () => Tile | null = () => null
  /** While the ghost building is dragged: where the finger holds it, relative to its centre. */
  private dragOffset: { x: number; y: number; moved: boolean } | null = null

  constructor(loop: GameLoop) {
    this.loop = loop
    this.snapshot = { ...IDLE, recent: this.recent }
  }

  /** The map canvas tells where the middle of the view lies, so a new ghost starts there. */
  setViewCenter(provider: () => Tile | null): void {
    this.viewCenter = provider
  }

  getSnapshot = (): ToolSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** True while single-finger drags should draw instead of pan the map. */
  get drawing(): boolean {
    const { mode, freehand, areaMode } = this.snapshot
    return mode === 'demolish' || (mode === 'road' && freehand) || (mode === 'place' && areaMode)
  }

  /** True while a finger may pick up something (route handles, the ghost building) instead of panning the map. */
  get grabbing(): boolean {
    const { mode, freehand, route, areaMode, origin } = this.snapshot
    if (mode === 'place') return !areaMode && origin !== null
    return mode === 'road' && !freehand && route.plan !== null
  }

  /** How single-finger drags on the map are read right now. */
  get inputMode(): 'pan' | 'draw' | 'grab' {
    return this.drawing ? 'draw' : this.grabbing ? 'grab' : 'pan'
  }

  /** Starts placing a building. The ghost appears on the free spot closest to the middle of the view. */
  startPlacing(typeId: string): void {
    const middle = this.viewCenter()
    const center = middle ? nearestSpot(this.loop.getIslandState(), typeId, false, middle) : null
    this.set({ ...IDLE, mode: 'place', typeId, center }, true)
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

  /** Allows or stops houses of the island on screen rising into a tier. */
  setUpgradeStop(tierId: string, stopped: boolean): void {
    this.loop.dispatchIsland((state) => setUpgradeStop(state, tierId, stopped))
  }

  /** Switches a building on or off (shut down). */
  setActive(id: number, active: boolean): void {
    this.loop.dispatchIsland((state) => setBuildingActive(state, id, active))
  }

  /** Switches between placing single houses and dragging an area. Only for houses. */
  setAreaMode(on: boolean): void {
    const { mode, typeId } = this.snapshot
    if (mode !== 'place' || !typeId || !getBuilding(typeId).houseTier) return
    this.set({ ...this.snapshot, areaMode: on, area: null, center: null, origin: null })
  }

  rotate(): void {
    if (this.snapshot.mode !== 'place') return
    this.set({ ...this.snapshot, rotated: !this.snapshot.rotated }, true)
  }

  /** Moves the ghost building so that it is centred on the tapped tile. */
  setCenter(tile: Tile): void {
    if (this.snapshot.mode !== 'place' || this.snapshot.areaMode) return
    this.set({ ...this.snapshot, center: tile }, true)
  }

  /** Builds the ghost building. Does nothing if the placement is invalid or unaffordable. */
  confirm(): void {
    const { mode, typeId, origin, rotated, area } = this.snapshot
    if (mode !== 'place' || !typeId) return
    if (area) {
      if (area.origins.length === 0) return
      const count = area.origins.length
      this.track(`${count} ${count === 1 ? 'Haus' : 'Häuser'}`, typeId, () => this.loop.dispatchIsland((state) => buildSettlement(state, typeId, area.origins, area.blocks)))
      haptic()
      this.set({ ...this.snapshot, area: null })
      return
    }
    if (!origin) return
    const built = this.track(getBuilding(typeId).name, typeId, () =>
      this.loop.dispatchIsland((state) => placeBuilding(state, typeId, origin.x, origin.y, rotated)),
    )
    if (!built) return // not possible here: the ghost stays for another try
    haptic()
    // Production buildings are built one at a time: back to the overview. Houses and the like can follow each other.
    if (getBuilding(typeId).category === 'production') return this.cancel()
    // the next ghost waits on the free spot next to the one just built: "Bauen" again builds a row
    const center = this.snapshot.center ? nearestSpot(this.loop.getIslandState(), typeId, rotated, this.snapshot.center, 6) : null
    this.set({ ...this.snapshot, center }, true)
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

  /** Finger down on the map: picks up a route handle or the ghost building. True if it took something. */
  grab(tile: Tile): boolean {
    const { mode, origin, center, typeId, rotated } = this.snapshot
    if (mode === 'place') {
      if (!origin || !center || !typeId) return false
      const { w, h } = footprint(getBuilding(typeId), rotated)
      // one tile of slack around the ghost: a finger is wider than a tile
      const inside = tile.x >= origin.x - 1 && tile.x <= origin.x + w && tile.y >= origin.y - 1 && tile.y <= origin.y + h
      if (!inside) return false
      this.dragOffset = { x: tile.x - center.x, y: tile.y - center.y, moved: false }
      return true
    }
    const grabbed = grabRoute(this.snapshot.route, tile)
    if (!grabbed) return false
    this.setRoute(grabbed)
    return true
  }

  grabMove(tile: Tile): void {
    if (this.snapshot.mode === 'place') {
      const drag = this.dragOffset
      const center = this.snapshot.center
      if (!drag || !center) return
      const next = { x: tile.x - drag.x, y: tile.y - drag.y }
      if (next.x === center.x && next.y === center.y) return
      drag.moved = true
      this.set({ ...this.snapshot, center: next }, true)
      return
    }
    this.setRoute(moveRoute(this.loop.getIslandState(), this.snapshot.route, tile))
  }

  /** Finger up after a grab. For the ghost building: false if it was not moved (the touch was a tap on it). */
  grabRelease(): boolean {
    if (this.snapshot.mode === 'place') {
      const moved = this.dragOffset?.moved ?? false
      this.dragOffset = null
      return moved
    }
    this.setRoute(releaseRoute(this.loop.getIslandState(), this.snapshot.route))
    return true
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
    this.track('Straße', null, () => this.loop.dispatchIsland((state) => placeRoads(state, plan.newTiles)))
    haptic()
    this.cancel() // the road is built: back to the overview
  }

  /** Takes the last build action back, for its full cost. Only on the island it happened on and only for a while. */
  undo(): void {
    const entry = this.undoEntry
    if (!entry || entry.islandId !== this.loop.activeIsland || performance.now() - entry.at > UNDO_MS) return
    this.loop.dispatchIsland((state) => undoBuild(state, entry.record))
    haptic()
    this.undoEntry = null
    this.set({ ...this.snapshot })
  }

  /** Forgets the last build action (its time ran out). */
  dropUndo(): void {
    if (!this.undoEntry) return
    this.undoEntry = null
    this.set({ ...this.snapshot })
  }

  /** Runs a build command and remembers what it added for "Rückgängig". True if something was built. */
  private track(label: string, typeId: string | null, build: () => void): boolean {
    const before: IslandState = this.loop.getIslandState()
    build()
    const record = recordBuild(before, this.loop.getIslandState())
    if (!record) return false
    this.undoEntry = { record, islandId: this.loop.activeIsland, at: performance.now(), label }
    if (typeId) this.recent = pushRecent(this.recent, typeId)
    return true
  }

  private setArea(a: Tile, b: Tile): void {
    const typeId = this.snapshot.typeId
    if (!typeId) return
    const plan = planSettlement(this.loop.getIslandState(), typeId, a, b)
    this.set({ ...this.snapshot, area: { a, b, origins: plan.origins, blocks: plan.blocks, outOfMoney: plan.outOfMoney } })
  }

  private setRoute(route: RouteDraft): void {
    if (route === this.snapshot.route) return
    this.set({ ...this.snapshot, route })
  }

  strokeStart(tile: Tile): void {
    if (!this.drawing) return
    if (this.snapshot.mode === 'place') {
      this.setArea(tile, tile)
      return
    }
    const { mode, stroke } = this.snapshot
    // Demolishing collects tiles over several taps and drags until it is confirmed.
    if (mode === 'demolish') {
      const known = stroke.some((t) => t.x === tile.x && t.y === tile.y)
      this.set({ ...this.snapshot, stroke: known ? [...stroke.filter((t) => t.x !== tile.x || t.y !== tile.y), tile] : [...stroke, tile] })
      return
    }
    this.set({ ...this.snapshot, stroke: [tile] })
  }

  strokeMove(tile: Tile): void {
    const { stroke, area, mode } = this.snapshot
    if (mode === 'place') {
      if (area && (area.b.x !== tile.x || area.b.y !== tile.y)) this.setArea(area.a, tile)
      return
    }
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
    if (mode === 'place') return // the area stays until it is built or dragged again
    if (stroke.length === 0) return
    if (mode === 'road') {
      this.track('Straße', null, () => this.loop.dispatchIsland((state) => placeRoads(state, stroke)))
      haptic()
      this.cancel() // the road is built: back to the overview
      return
    }
    // demolish: the marked tiles stay until confirmDemolish
  }

  /** Demolishes everything marked in demolish mode. */
  confirmDemolish(): void {
    const { mode, stroke } = this.snapshot
    if (mode !== 'demolish' || stroke.length === 0) return
    this.loop.dispatchIsland((state) => demolishTiles(state, stroke))
    haptic()
    this.set({ ...this.snapshot, stroke: [] })
  }

  /** Unmarks everything in demolish mode. */
  clearStroke(): void {
    if (this.snapshot.stroke.length > 0) this.set({ ...this.snapshot, stroke: [] })
  }

  /** Demolishes one building, from its info panel. */
  demolish(buildingId: number): void {
    this.loop.dispatchIsland((state) => demolishBuilding(state, buildingId))
    haptic()
    this.set({ ...this.snapshot, selectedBuildingId: null })
  }

  /** Long press: leaves any build tool and shows the info panel of the building (or nothing). */
  inspect(buildingId: number | null): void {
    this.set({ ...IDLE, selectedBuildingId: buildingId })
  }

  strokeCancel(): void {
    // a second finger came down: a road or area drag is dropped, marked demolish tiles stay
    if (this.snapshot.mode === 'demolish') return
    if (this.snapshot.stroke.length > 0) this.set({ ...this.snapshot, stroke: [] })
  }

  private set(next: ToolSnapshot, recomputeOrigin = false): void {
    const kept = { ...next, undo: this.undoEntry, recent: this.recent }
    this.snapshot = recomputeOrigin ? { ...kept, origin: this.originFor(kept) } : kept
    this.listeners.forEach((listener) => listener())
  }

  private originFor({ typeId, center, rotated }: ToolSnapshot): Tile | null {
    return typeId && center ? originAt(typeId, rotated, center) : null
  }
}
