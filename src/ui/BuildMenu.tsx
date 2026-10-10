import { useState, useSyncExternalStore } from 'react'
import { buildings } from '../data'
import type { BuildingCategory } from '../data'
import type { BuildController } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { BuildItem } from './BuildItem'
import { Icon } from './Icon'
import { ProductionMenu } from './ProductionMenu'

const CATEGORIES: { id: BuildingCategory; label: string; icon: string }[] = [
  { id: 'housing', label: 'Wohnen', icon: 'ui/cat_housing' },
  { id: 'public', label: 'Öffentlich', icon: 'ui/cat_public' },
  { id: 'production', label: 'Produktion', icon: 'ui/cat_production' },
  { id: 'infrastructure', label: 'Infrastruktur', icon: 'ui/cat_infrastructure' },
]

interface BuildMenuProps {
  tool: BuildController
  state: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
  onOpenTrade: () => void
}

export function BuildMenu({ tool, state, onOpenStats, onOpenWorld, onOpenTrade }: BuildMenuProps) {
  const [open, setOpen] = useState<BuildingCategory | 'recent' | null>(null)
  const { recent } = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  // ids from older versions may no longer exist
  const recentDefs = recent.flatMap((id) => buildings.find((def) => def.id === id && !def.hidden) ?? [])
  const items =
    open === 'recent' ? recentDefs : open && open !== 'production' ? buildings.filter((def) => def.category === open && !def.hidden) : []

  return (
    <div className="build-menu">
      {open === 'production' && <ProductionMenu tool={tool} state={state} />}
      {items.length > 0 && (
        <div className="build-items">
          {items.map((def) => (
            <BuildItem key={def.id} def={def} state={state} tool={tool} />
          ))}
        </div>
      )}
      <div className="build-categories">
        {recentDefs.length > 0 && (
          <button
            type="button"
            className={open === 'recent' ? 'category-button active' : 'category-button'}
            onClick={() => setOpen(open === 'recent' ? null : 'recent')}
          >
            <span className="category-glyph" aria-hidden="true">
              ↺
            </span>
            <span>Zuletzt</span>
          </button>
        )}
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
