import { config, goods } from '../data'
import type { GameSpeed } from '../sim/state'

interface TopHudProps {
  tick: number
  coins: number
  stock: Record<string, number>
  speed: GameSpeed
  onSpeedChange: (speed: GameSpeed) => void
}

function speedLabel(speed: GameSpeed): string {
  return speed === 0 ? 'Pause' : `${speed}x`
}

export function TopHud({ tick, coins, stock, speed, onSpeedChange }: TopHudProps) {
  return (
    <div className="top-hud">
      <div className="hud-stats">
        <span className="hud-stat">Münzen: {coins.toLocaleString('de-DE')}</span>
        {goods
          .filter((good) => good.id in config.startStock)
          .map((good) => (
            <span key={good.id} className="hud-stat">
              {good.name}: {(stock[good.id] ?? 0).toLocaleString('de-DE')}
            </span>
          ))}
        <span className="hud-stat">Tick: {tick.toLocaleString('de-DE')}</span>
      </div>
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
