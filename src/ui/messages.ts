import { buildings, goods } from '../data'
import type { TierNeed } from '../data'
import type { BuildingCost } from '../data'
import type { PlacementError } from '../sim/build'
import type { GameState, ProductionStatus } from '../sim/state'
import { config } from '../data'

const RESOURCE_NAMES: Record<string, string> = {
  coins: 'Münzen',
  ...Object.fromEntries(goods.map((good) => [good.id, good.name])),
}

export function resourceName(id: string): string {
  return RESOURCE_NAMES[id] ?? id
}

/** German explanation for a refused placement. */
export function placementMessage(error: PlacementError): string {
  switch (error.code) {
    case 'outOfMap':
      return 'Außerhalb der Karte'
    case 'water':
      return 'Auf Wasser kann nicht gebaut werden'
    case 'mountain':
      return 'Auf Bergen kann nur ein Steinbruch oder eine Mine stehen'
    case 'notMountain':
      return 'Muss ganz auf einem Berg stehen'
    case 'occupied':
      return 'Die Fläche ist schon belegt'
    case 'notCoast':
      return 'Muss an der Küste stehen'
    case 'debt':
      return 'Münzen im Minus: Neubau gesperrt'
    case 'locked':
      return 'Noch nicht freigeschaltet'
    case 'funds':
      return `Zu wenig ${resourceName(error.missing ?? 'coins')}`
  }
}

/** "Münzen 500 · Holz 10": only the non-zero parts of a cost. */
export function formatCost(cost: BuildingCost): string {
  const order = ['coins', ...goods.map((good) => good.id)]
  return order
    .filter((id) => (cost[id as keyof BuildingCost] ?? 0) > 0)
    .map((id) => `${resourceName(id)} ${cost[id as keyof BuildingCost]}`)
    .join(' · ')
}

/** German text for the state of a producing building. */
export function statusText(status: ProductionStatus): string {
  switch (status.kind) {
    case 'producing':
      return 'Produziert'
    case 'waiting':
      return `Wartet auf ${resourceName(status.good ?? '')}`
    case 'outputFull':
      return 'Lager voll'
    case 'noRoad':
      return 'Keine Straße'
    case 'noHub':
      return 'Kein Markthaus oder Kontor in Reichweite'
    case 'inactive':
      return 'Stillgelegt'
  }
}

/** Display name of a need: the good it asks for or the public building that must cover the house. */
export function needLabel(need: TierNeed): string {
  if (need.building) return buildings.find((def) => def.id === need.building)?.name ?? need.building
  return resourceName(need.good ?? need.id)
}

/** Signed number with thousands separators, e.g. "+1.250" or "-40". */
export function formatSigned(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('de-DE')}`
}

export function formatWhole(value: number): string {
  return Math.floor(value).toLocaleString('de-DE')
}

/** Text of a shortage warning toast. */
export function shortageText(good: string, cycles: number): string {
  const name = resourceName(good)
  return cycles <= 0 ? `${name} ist ausgegangen` : `${name} reicht nur noch für ${cycles.toFixed(1).replace('.', ',')} Zyklen`
}

/** The building materials in store, e.g. "Münzen 9.800 · Werkzeug 50 · Holz 97". */
export function formatStock(state: GameState): string {
  const materials = goods
    .filter((good) => good.id in config.startStock)
    .map((good) => `${good.name} ${formatWhole(state.stock[good.id] ?? 0)}`)
  return [`Münzen ${formatWhole(state.coins)}`, ...materials].join(' · ')
}
