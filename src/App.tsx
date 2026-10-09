import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { tiers } from './data'
import { BuildController } from './game/buildController'
import type { GameLoop } from './game/gameLoop'
import { balanceOf } from './sim/economy'
import { toIslandState } from './sim/islands'
import { residentsOfTier } from './sim/tiers'
import { BuildBar } from './ui/BuildBar'
import { MapCanvas } from './ui/MapCanvas'
import { RotateHint } from './ui/RotateHint'
import { StatsPanel } from './ui/StatsPanel'
import { Toasts } from './ui/Toasts'
import { TopHud } from './ui/TopHud'
import { WorldMap } from './ui/WorldMap'

export function App({ loop }: { loop: GameLoop }) {
  const { state, activeIsland } = useSyncExternalStore(loop.subscribe, loop.getView)
  const tool = useMemo(() => new BuildController(loop), [loop])
  const [showStats, setShowStats] = useState(false)
  const [showWorld, setShowWorld] = useState(false)
  const island = toIslandState(state, activeIsland)
  const residentsByTier = Object.fromEntries(tiers.map((tier) => [tier.id, residentsOfTier(state, tier.id)]))

  // Looking at another island drops the current tool and selection.
  useEffect(() => tool.cancel(), [tool, activeIsland])

  const settled = state.islands.flatMap((entry) => (entry.economy.last ? [entry.economy.last] : []))
  const balance = settled.length > 0 ? settled.reduce((sum, ledger) => sum + balanceOf(ledger), 0) : null

  return (
    <>
      <MapCanvas getState={loop.getIslandState} tool={tool} />
      <TopHud
        tick={state.tick}
        coins={state.coins}
        balance={balance}
        residentsByTier={residentsByTier}
        highestTier={state.highestTier}
        speed={state.speed}
        islandName={island.name}
        onSpeedChange={(speed) => loop.setSpeed(speed)}
      />
      <Toasts state={state} />
      {showStats && <StatsPanel state={state} island={island} onClose={() => setShowStats(false)} />}
      {showWorld && (
        <WorldMap
          state={state}
          activeIsland={activeIsland}
          onSelect={(id) => {
            loop.setActiveIsland(id)
            setShowWorld(false)
          }}
          onClose={() => setShowWorld(false)}
        />
      )}
      <BuildBar
        tool={tool}
        island={island}
        onOpenStats={() => setShowStats(true)}
        onOpenWorld={() => setShowWorld(true)}
      />
      <RotateHint />
    </>
  )
}
