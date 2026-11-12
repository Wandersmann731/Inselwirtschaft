import { waitingToRise } from '../game/needsOverview'
import { t } from '../i18n/language'
import type { IslandState } from '../sim/state'
import { Icon } from './Icon'
import { resourceName } from './messages'

/**
 * Says for the whole island that houses are ready to rise but wait for building materials, and for which. A tap
 * shows the buildings that make the first missing material.
 */
export function RiseNotice({ island, onShow }: { island: IslandState; onShow: (good: string) => void }) {
  if (!island.owned) return null
  const { houses, goods } = waitingToRise(island)
  if (houses === 0 || goods.length === 0) return null
  const names = goods.map(resourceName).join(', ')
  return (
    <button type="button" className="toast wait" onClick={() => onShow(goods[0])}>
      <Icon name={`goods/${goods[0]}`} size={24} />
      {houses === 1
        ? t(`1 Haus wartet für den Aufstieg auf ${names}`, `1 house is waiting for ${names} to rise`)
        : t(`${houses} Häuser warten für den Aufstieg auf ${names}`, `${houses} houses are waiting for ${names} to rise`)}{' '}
      <span aria-hidden="true">›</span>
    </button>
  )
}
