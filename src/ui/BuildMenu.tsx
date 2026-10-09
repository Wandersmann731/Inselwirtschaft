import { useState } from 'react'
import { buildings, tiers } from '../data'
import type { BuildingCategory } from '../data'
import type { BuildController } from '../game/buildController'
import type { GameState } from '../sim/state'
import { isBuildingUnlocked } from '../sim/tiers'
import { formatCost } from './messages'

const CATEGORIES: { id: BuildingCategory; label: string }[] = [
  { id: 'housing', label: 'Wohnen' },
  { id: 'public', label: 'Öffentlich' },
  { id: 'production', label: 'Produktion' },
  { id: 'infrastructure', label: 'Infrastruktur' },
]

const tierName = (id: string): string => tiers.find((tier) => tier.id === id)?.name ?? id

export function BuildMenu({ tool, state }: { tool: BuildController; state: GameState }) {
  const [open, setOpen] = useState<BuildingCategory | null>(null)
  const items = buildings.filter((def) => def.category === open)

  return (
    <div className="build-menu">
      {open && (
        <div className="build-items">
          {items.map((def) => (
            <button
              key={def.id}
              type="button"
              className="build-item"
              disabled={!isBuildingUnlocked(state, def.id)}
              onClick={() => (def.kind === 'road' ? tool.startRoads() : tool.startPlacing(def.id))}
            >
              <span className="build-item-name">{def.name}</span>
              <span className="build-item-size">
                {def.kind === 'road' ? 'ziehen' : `${def.size[0]}×${def.size[1]}`}
                {def.unlockTier !== 'pioneers' && ` · ab ${tierName(def.unlockTier)}`}
              </span>
              <span className="build-item-cost">{formatCost(def.cost)}</span>
            </button>
          ))}
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
      </div>
    </div>
  )
}
