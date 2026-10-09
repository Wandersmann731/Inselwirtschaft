import { useState } from 'react'
import { buildings, tiers } from '../data'
import type { BuildingCategory } from '../data'
import type { BuildController } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { buildingBlocker } from '../sim/build'
import { blockerLabel } from './messages'
import { Cost, Icon } from './Icon'

const CATEGORIES: { id: BuildingCategory; label: string; icon: string }[] = [
  { id: 'housing', label: 'Wohnen', icon: 'ui/cat_housing' },
  { id: 'public', label: 'Öffentlich', icon: 'ui/cat_public' },
  { id: 'production', label: 'Produktion', icon: 'ui/cat_production' },
  { id: 'infrastructure', label: 'Infrastruktur', icon: 'ui/cat_infrastructure' },
]

const tierName = (id: string): string => tiers.find((tier) => tier.id === id)?.name ?? id

interface BuildMenuProps {
  tool: BuildController
  state: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
  onOpenTrade: () => void
}

export function BuildMenu({ tool, state, onOpenStats, onOpenWorld, onOpenTrade }: BuildMenuProps) {
  const [open, setOpen] = useState<BuildingCategory | null>(null)
  const items = buildings.filter((def) => def.category === open)

  return (
    <div className="build-menu">
      {open && (
        <div className="build-items">
          {items.map((def) => {
            const blocker = buildingBlocker(state, def)
            const unavailable = blocker !== null && blocker.code !== 'debt'
            return (
            <button
              key={def.id}
              type="button"
              className="build-item"
              disabled={unavailable}
              onClick={() => (def.kind === 'road' ? tool.startRoads() : tool.startPlacing(def.id))}
            >
              <span className="build-item-name">{def.name}</span>
              <span className="build-item-size">
                {def.kind === 'road' ? 'ziehen' : `${def.size[0]}×${def.size[1]}`}
                {unavailable && blocker ? ` · ${blockerLabel(blocker, tierName(def.unlockTier))}` : def.unlockTier !== 'pioneers' ? ` · ab ${tierName(def.unlockTier)}` : ''}
              </span>
              <span className="build-item-cost">
                <Cost cost={def.cost} size={16} />
              </span>
            </button>
            )
          })}
        </div>
      )}
      <div className="build-categories">
        {CATEGORIES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={id === open ? 'category-button active' : 'category-button'}
            onClick={() => setOpen(id === open ? null : id)}
          >
            <Icon name={icon} size={26} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="category-button demolish" onClick={() => tool.startDemolish()}>
          <Icon name="ui/cat_demolish" size={26} />
          <span>Abriss</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenStats}>
          <Icon name="ui/cat_statistics" size={26} />
          <span>Statistik</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenWorld}>
          <Icon name="ui/cat_worldmap" size={26} />
          <span>Weltkarte</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenTrade}>
          <Icon name="ui/cat_trade" size={26} />
          <span>Handel</span>
        </button>
      </div>
    </div>
  )
}
