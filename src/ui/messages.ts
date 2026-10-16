import { buildings, goods, landNames } from '../data'
import type { TierNeed } from '../data'
import type { BuildingCost } from '../data'
import type { PlacementError } from '../sim/build'
import type { IslandState, ProductionStatus } from '../sim/state'
import { config } from '../data'
import { numberLocale, oneDecimal, t } from '../i18n/language'

export function resourceName(id: string): string {
  if (id === 'coins') return t('Münzen', 'Coins')
  return goods.find((good) => good.id === id)?.name ?? id
}

/** German explanation for a refused placement. */
export function placementMessage(error: PlacementError): string {
  switch (error.code) {
    case 'outOfMap':
      return t('Außerhalb der Karte', 'Outside the map')
    case 'water':
      return t('Auf Wasser kann nicht gebaut werden', 'Cannot build on water')
    case 'mountain':
      return t('Auf Bergen kann nur ein Steinbruch oder eine Mine stehen', 'Only a quarry or a mine can stand on mountains')
    case 'notMountain':
      return t('Muss ganz auf einem Berg stehen', 'Must stand entirely on a mountain')
    case 'occupied':
      return t('Die Fläche ist schon belegt', 'The area is already taken')
    case 'notCoast':
      return t('Muss an der Küste stehen', 'Must stand on the coast')
    case 'notOwned':
      return t('Diese Insel gehört dir noch nicht', 'You do not own this island yet')
    case 'noFertility':
      return t(`Diese Insel hat kein Land für ${fertilityName(error.missing)}`, `This island has no land for: ${fertilityName(error.missing)}`)
    case 'noDeposit':
      return t(`Diese Insel hat kein Vorkommen: ${depositName(error.missing)}`, `This island has no deposit: ${depositName(error.missing)}`)
    case 'debt':
      return t('Münzen im Minus: Neubau gesperrt', 'Coins below zero: building blocked')
    case 'locked':
      return t('Noch nicht freigeschaltet', 'Not unlocked yet')
    case 'funds':
      return t(`Zu wenig ${resourceName(error.missing ?? 'coins')}`, `Not enough ${resourceName(error.missing ?? 'coins')}`)
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
      return t('Produziert', 'Producing')
    case 'waiting':
      return t(`Wartet auf ${resourceName(status.good ?? '')}`, `Waiting for ${resourceName(status.good ?? '')}`)
    case 'outputFull':
      return t('Lager voll', 'Store full')
    case 'noRoad':
      return t('Keine Straße', 'No road')
    case 'noHub':
      return t('Kein Markthaus oder Kontor in Reichweite', 'No market house or trading post in reach')
    case 'inactive':
      return t('Stillgelegt', 'Shut down')
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
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString(numberLocale())}`
}

export function formatWhole(value: number): string {
  return Math.floor(value).toLocaleString(numberLocale())
}

/** Text of a shortage warning toast. */
export function shortageText(good: string, cycles: number): string {
  const name = resourceName(good)
  return cycles <= 0
    ? t(`${name} ist ausgegangen`, `${name} has run out`)
    : t(`${name} reicht nur noch für ${oneDecimal(cycles)} Zyklen`, `${name} lasts only ${oneDecimal(cycles)} more cycles`)
}

/** The building materials in store, e.g. "Münzen 9.800 · Werkzeug 50 · Holz 97". */
export function formatStock(state: IslandState): string {
  const materials = goods
    .filter((good) => good.id in config.startStock)
    .map((good) => `${good.name} ${formatWhole(state.stock[good.id] ?? 0)}`)
  return [`${resourceName('coins')} ${formatWhole(state.coins)}`, ...materials].join(' · ')
}

export function fertilityName(id: string | undefined): string {
  return landNames.fertilities.find((entry) => entry.id === id)?.name ?? String(id)
}

export function depositName(id: string | undefined): string {
  return landNames.deposits.find((entry) => entry.id === id)?.name ?? String(id)
}

/** Short reason why a menu entry cannot be chosen on this island. */
export function blockerLabel(error: PlacementError, lockLabel: string): string {
  switch (error.code) {
    case 'locked':
      return lockLabel
    case 'noFertility':
      return t(`Braucht: ${fertilityName(error.missing)}`, `Needs: ${fertilityName(error.missing)}`)
    case 'noDeposit':
      return t(`Braucht: ${depositName(error.missing)}`, `Needs: ${depositName(error.missing)}`)
    default:
      return placementMessage(error)
  }
}
