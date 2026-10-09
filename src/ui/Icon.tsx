import { goods } from '../data'
import type { BuildingCost } from '../data'
import { spriteUrl } from '../render/sprites'
import { resourceName } from './messages'

/** A picture from the sprites/icons folder, e.g. name "ui/coin" or "goods/wood". */
export function Icon({ name, size = 24, title }: { name: string; size?: number; title?: string }) {
  return <img className="icon" src={spriteUrl(`icons/${name}`)} width={size} height={size} alt={title ?? ''} title={title} draggable={false} />
}

/** Cost as little pictures with numbers: coins first, then the goods that are needed. */
export function Cost({ cost, size = 18 }: { cost: BuildingCost; size?: number }) {
  const parts: { icon: string; amount: number; title: string }[] = []
  if (cost.coins > 0) parts.push({ icon: 'ui/coin', amount: cost.coins, title: 'Münzen' })
  for (const good of goods) {
    const amount = cost[good.id as keyof BuildingCost] ?? 0
    if (amount > 0) parts.push({ icon: `goods/${good.id}`, amount, title: resourceName(good.id) })
  }
  return (
    <span className="cost">
      {parts.map((part) => (
        <span key={part.icon} className="cost-part">
          <Icon name={part.icon} size={size} title={part.title} />
          {part.amount.toLocaleString('de-DE')}
        </span>
      ))}
    </span>
  )
}
