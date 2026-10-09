import { useMemo, useState, useSyncExternalStore } from 'react'
import { balanceOf } from './sim/economy'
import { residentsOfTier } from './sim/tiers'
import { tiers } from './data'
import { BuildController } from './game/buildController'
import type { GameLoop } from './game/gameLoop'
import { BuildBar } from './ui/BuildBar'
import { MapCanvas } from './ui/MapCanvas'
import { RotateHint } from './ui/RotateHint'
import { StatsPanel } from './ui/StatsPanel'
import { Toasts } from './ui/Toasts'
import { TopHud } from './ui/TopHud'

export function App({ loop }: { loop: GameLoop }) {
  const state = useSyncExternalStore(loop.subscribe, loop.getState)
  const tool = useMemo(() => new BuildController(loop), [loop])
  const [showStats, setShowStats] = useState(false)
  const residentsByTier = Object.fromEntries(tiers.map((tier) => [tier.id, residentsOfTier(state, tier.id)]))

  return (
    <>
      <MapCanvas getState={loop.getState} tool={tool} />
      <TopHud
        tick={state.tick}
        coins={state.coins}
        balance={state.economy.last ? balanceOf(state.economy.last) : null}
        residentsByTier={residentsByTier}
        highestTier={state.highestTier}
        speed={state.speed}
        onSpeedChange={(speed) => loop.setSpeed(speed)}
        onOpenStats={() => setShowStats(true)}
      />
      <Toasts state={state} />
      {showStats && <StatsPanel state={state} onClose={() => setShowStats(false)} />}
      <BuildBar tool={tool} loop={loop} />
      <RotateHint />
    </>
  )
}
