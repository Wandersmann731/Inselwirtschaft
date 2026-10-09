import { config, tiers } from '../data'
import type { GameSpeed } from '../sim/state'
import { formatSigned, formatWhole } from './messages'
import { toggleFullscreen, useFullscreen } from './fullscreen'
import { Icon } from './Icon'

interface TopHudProps {
  islandName: string
  tick: number
  coins: number
  /** Income minus upkeep of the last settled cycle, null before the first one. */
  balance: number | null
  residentsByTier: Record<string, number>
  highestTier: number
  speed: GameSpeed
  onSpeedChange: (speed: GameSpeed) => void
  onOpenMenu: () => void
  /** Debug mode: also offer the fast speeds and the balancing window. */
  debug: boolean
  onOpenBalance: () => void
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
  islandName,
  onOpenMenu,
  debug,
  onOpenBalance,
}: TopHudProps) {
  const fullscreen = useFullscreen()
  const total = Object.values(residentsByTier).reduce((sum, value) => sum + value, 0)
  const balanceClass = balance === null ? 'hud-stat' : balance >= 0 ? 'hud-stat positive' : 'hud-stat negative'
  return (
    <div className="top-hud">
      <div className="hud-stats">
        <div className="hud-row">
        <span className={coins < 0 ? 'hud-stat negative' : 'hud-stat'}>
          <Icon name="ui/coin" size={20} title="Münzen" /> {formatWhole(coins)}
        </span>
        <span className={balanceClass}><Icon name={balance !== null && balance < 0 ? 'ui/balance_down' : 'ui/balance_up'} size={20} title="Bilanz" />{' '}
          {balance === null ? '–' : `${formatSigned(balance)} / Zyklus`}
        </span>
        <span className="hud-stat">Tick: {tick.toLocaleString('de-DE')}</span>
        <span className="hud-stat hud-island">{islandName}</span>
        </div>
        <div className="hud-row">
        <span className="hud-stat">
          <Icon name="ui/population" size={20} title="Einwohner" /> {formatWhole(total)}
        </span>
        {tiers.slice(0, highestTier + 1).map((tier) => (
          <span key={tier.id} className="hud-stat hud-tier">
            <Icon name={`tiers/${tier.id}`} size={18} title={tier.name} /> {formatWhole(residentsByTier[tier.id] ?? 0)}
          </span>
        ))}
        </div>
      </div>
      <div className="hud-speeds">
        {debug && (
          <button type="button" className="speed-button" onClick={onOpenBalance}>
            Balance
          </button>
        )}
        {fullscreen.supported && (
          <button
            type="button"
            className="speed-button"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen.active ? 'Vollbild beenden' : 'Vollbild'}
            title={fullscreen.active ? 'Vollbild beenden' : 'Vollbild'}
          >
            {fullscreen.active ? '⤡' : '⛶'}
          </button>
        )}
        <button type="button" className="speed-button" onClick={onOpenMenu} aria-label="Menü">
          Menü
        </button>
        {[...config.speeds, ...(debug ? config.debugSpeeds : [])].map((value) => (
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
