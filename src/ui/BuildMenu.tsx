import { useState } from 'react'
import { buildings, tiers } from '../data'
import type { BuildingCategory } from '../data'
import type { BuildController } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { buildingBlocker } from '../sim/build'
import { blockerLabel, formatCost } from './messages'

const CATEGORIES: { id: BuildingCategory; label: string }[] = [
  { id: 'housing', label: 'Wohnen' },
  { id: 'public', label: 'Öffentlich' },
  { id: 'production', label: 'Produktion' },
  { id: 'infrastructure', label: 'Infrastruktur' },
]

const tierName = (id: string): string => tiers.find((tier) => tier.id === id)?.name ?? id

interface BuildMenuProps {
  tool: BuildController
  state: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
}

export function BuildMenu({ tool, state, onOpenStats, onOpenWorld }: BuildMenuProps) {
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
              <span className="build-item-cost">{formatCost(def.cost)}</span>
            </button>
            )
          })}
        </div>
      )}
      <div className="build-categories">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={id === open ? 'category-button active' : 'category-button'}
            onClick={() => setOpen(id === open ? null : id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="category-button demolish" onClick={() => tool.startDemolish()}>
          Abriss
        </button>
        <button type="button" className="category-button" onClick={onOpenStats}>
          Statistik
        </button>
        <button type="button" className="category-button" onClick={onOpenWorld}>
          Weltkarte
        </button>
      </div>
    </div>
  )
}
