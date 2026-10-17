// The state of the build tool as the UI and the renderer see it (see buildController.ts).

import type { BuildRecord } from '../sim/undo'
import { EMPTY_ROUTE, type RouteDraft } from './routeDraft'
import type { Tile } from './stroke'

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

export const IDLE: ToolSnapshot = {
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
