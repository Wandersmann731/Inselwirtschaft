import { goods } from '../data'
import type { BuildingCost } from '../data'
import type { PlacementError } from '../sim/build'

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
