import { config, tiers } from '../data'
import type { GameSpeed } from '../sim/state'
import { formatSigned, formatWhole } from './messages'

interface TopHudProps {
  tick: number
  coins: number
  /** Income minus upkeep of the last settled cycle, null before the first one. */
  balance: number | null
  residentsByTier: Record<string, number>
  highestTier: number
  speed: GameSpeed
  onSpeedChange: (speed: GameSpeed) => void
  onOpenStats: () => void
}

function speedLabel(speed: GameSpeed): string {
  return speed === 0 ? 'Pause' : `${speed}x`
}

export function TopHud({
  tick,
  coins,
  balance,
  residentsByTier,
  highestTier,
  speed,
  onSpeedChange,
  onOpenStats,
}: TopHudProps) {
  const total = Object.values(residentsByTier).reduce((sum, value) => sum + value, 0)
  const balanceClass = balance === null ? 'hud-stat' : balance >= 0 ? 'hud-stat positive' : 'hud-stat negative'
  return (
    <div className="top-hud">
      <div className="hud-stats">
        <div className="hud-row">
        <span className={coins < 0 ? 'hud-stat negative' : 'hud-stat'}>Münzen: {formatWhole(coins)}</span>
        <span className={balanceClass}>Bilanz: {balance === null ? '–' : `${formatSigned(balance)} / Zyklus`}</span>
        <span className="hud-stat">Tick: {tick.toLocaleString('de-DE')}</span>
        </div>
        <div className="hud-row">
        <span className="hud-stat">Einwohner: {formatWhole(total)}</span>
        {tiers.slice(0, highestTier + 1).map((tier) => (
          <span key={tier.id} className="hud-stat hud-tier">
            {tier.name} {formatWhole(residentsByTier[tier.id] ?? 0)}
          </span>
        ))}
        </div>
      </div>
      <button type="button" className="speed-button" onClick={onOpenStats}>
        Statistik
      </button>
      <div className="hud-speeds">
        {config.speeds.map((value) => (
          <button
            key={value}
            type="button"
            className={value === speed ? 'speed-button active' : 'speed-button'}
            onClick={() => onSpeedChange(value)}
          >
            {speedLabel(value)}
          </button>
        ))}
      </div>
    </div>
  )
}
