import { useSyncExternalStore } from 'react'
import type { BuildController } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { BuildingPanel } from './BuildingPanel'
import { BuildMenu } from './BuildMenu'
import { DrawBar } from './DrawBar'
import { PlaceBar } from './PlaceBar'
import { UndoChip } from './UndoChip'
import { t } from '../i18n/language'

interface BuildBarProps {
  tool: BuildController
  island: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
  onOpenTrade: () => void
  onOpenKontor: () => void
}

/** Bottom bar: the build menu, or the bar of the active build tool. */
export function BuildBar({ tool, island, onOpenStats, onOpenWorld, onOpenTrade, onOpenKontor }: BuildBarProps) {
  const snapshot = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  if (!island.owned) return <ForeignBar />
  const undo = snapshot.undo && snapshot.undo.islandId === island.id && snapshot.mode !== 'demolish' ? <UndoChip key={snapshot.undo.at} tool={tool} entry={snapshot.undo} /> : null
  if (snapshot.mode === 'place') {
    return (
      <>
        {undo}
        <PlaceBar tool={tool} snapshot={snapshot} state={island} />
      </>
    )
  }
  if (snapshot.mode === 'road' || snapshot.mode === 'demolish') {
    return (
      <>
        {undo}
        <DrawBar tool={tool} snapshot={snapshot} state={island} />
      </>
    )
  }
  return (
    <>
      {undo}
      {snapshot.selectedBuildingId !== null && (
        <BuildingPanel tool={tool} state={island} buildingId={snapshot.selectedBuildingId} onOpenKontor={onOpenKontor} />
      )}
      <BuildMenu tool={tool} state={island} onOpenStats={onOpenStats} onOpenWorld={onOpenWorld} onOpenTrade={onOpenTrade} />
    </>
  )

  function ForeignBar() {
    return (
      <div className="place-bar">
        <div className="place-info">
          <strong>{island.name}</strong>
          <span className="place-hint">
            {island.role === 'trader'
              ? t('Stadt der Händler: Waren kaufst und verkaufst du hier mit deinem Schiff (Handel, Routen).', 'Traders\' town: you buy and sell goods here with your ship (trade, routes).')
              : t('Noch nicht erschlossen: Mit einem Schiff und dem Kontor-Set gründest du hier eine Kolonie.', 'Not settled yet: with a ship and the trading post kit you can found a colony here.')}
          </span>
        </div>
        <div className="place-actions">
          <button type="button" className="action-button" onClick={onOpenWorld}>
            {t('Weltkarte', 'World map')}
          </button>
        </div>
      </div>
    )
  }
}
