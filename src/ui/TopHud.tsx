import { config, tiers } from '../data'
import type { GameSpeed } from '../sim/state'
import { MATERIALS } from '../game/needsOverview'
import { formatSigned, formatWhole, resourceName } from './messages'
import { toggleFullscreen, useFullscreen } from './fullscreen'
import { Icon } from './Icon'
import { useCountUp } from './useCountUp'
import { numberLocale, t } from '../i18n/language'

interface TopHudProps {
  islandName: string
  /** Store of the island on screen: the building materials are shown. */
  stock: Record<string, number>
  /** Only the player's islands have a store worth showing. */
  owned: boolean
  tick: number
  coins: number
  /** Income minus upkeep of the last settled cycle, null before the first one. */
  balance: number | null
  residentsByTier: Record<string, number>
  highestTier: number
  speed: GameSpeed
  onSpeedChange: (speed: GameSpeed) => void
  onOpenMenu: () => void
  /** A tap on the numbers opens the statistics, where they are explained. */
  onOpenStats: () => void
  /** Debug mode: also offer the fast speeds and the balancing window. */
  debug: boolean
  onOpenBalance: () => void
}

/** Below this many tons a building material is shown in red: building will soon stop. */
const LOW_MATERIAL = 10

function speedLabel(speed: GameSpeed): string {
  return speed === 0 ? t('Pause', 'Pause') : `${speed}x`
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
  stock,
  owned,
  onOpenMenu,
  onOpenStats,
  debug,
  onOpenBalance,
}: TopHudProps) {
  const fullscreen = useFullscreen()
  // the coins run to their new value when taxes come in or something is paid
  const shownCoins = useCountUp(coins)
  const total = Object.values(residentsByTier).reduce((sum, value) => sum + value, 0)
  const balanceClass = balance === null ? 'hud-stat' : balance >= 0 ? 'hud-stat positive' : 'hud-stat negative'
  return (
    <div className="top-hud">
      <button type="button" className="hud-stats" onClick={onOpenStats} aria-label={t('Statistik öffnen', 'Open the statistics')}>
        <div className="hud-row">
        <span className={coins < 0 ? 'hud-stat negative' : 'hud-stat'}>
          <Icon name="ui/coin" size={20} title={resourceName('coins')} /> {formatWhole(shownCoins)}
        </span>
        {/* fills up until taxes and upkeep are settled again */}
        <span
          className="cycle-ring"
          style={{ '--share': (tick % config.economyCycleTicks) / config.economyCycleTicks } as React.CSSProperties}
          title={t('Zeit bis zur nächsten Abrechnung', 'Time until the next settlement')}
        />
        <span className={balanceClass}><Icon name={balance !== null && balance < 0 ? 'ui/balance_down' : 'ui/balance_up'} size={20} title={t('Bilanz', 'Balance')} />{' '}
          {balance === null ? '–' : `${formatSigned(balance)} ${t('/ Zyklus', '/ cycle')}`}
        </span>
        {owned && MATERIALS.map((good) => (
          <span key={good} className={(stock[good] ?? 0) < LOW_MATERIAL ? 'hud-stat hud-material low' : 'hud-stat hud-material'}>
            <Icon name={`goods/${good}`} size={20} title={resourceName(good)} /> {formatWhole(stock[good] ?? 0)}
          </span>
        ))}
        {debug && <span className="hud-stat">Tick: {tick.toLocaleString(numberLocale())}</span>}
        </div>
        <div className="hud-row">
        <span className="hud-stat">
          <Icon name="ui/population" size={20} title={t('Einwohner', 'Residents')} /> {formatWhole(total)}
        </span>
        {tiers.slice(0, highestTier + 1).map((tier) => (
          <span key={tier.id} className="hud-stat hud-tier">
            <Icon name={`tiers/${tier.id}`} size={18} title={tier.name} /> {formatWhole(residentsByTier[tier.id] ?? 0)}
          </span>
        ))}
        <span className="hud-stat hud-island">{islandName}</span>
        </div>
      </button>
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
            aria-label={fullscreen.active ? t('Vollbild beenden', 'Exit full screen') : t('Vollbild', 'Full screen')}
            title={fullscreen.active ? t('Vollbild beenden', 'Exit full screen') : t('Vollbild', 'Full screen')}
          >
            {fullscreen.active ? '⤡' : '⛶'}
          </button>
        )}
        <button type="button" className="speed-button" onClick={onOpenMenu} aria-label={t('Menü', 'Menu')}>
          {t('Menü', 'Menu')}
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
