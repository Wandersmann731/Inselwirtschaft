import { config } from '../data'
import type { GameSpeed } from '../sim/state'

interface TopHudProps {
  tick: number
  coins: number
  speed: GameSpeed
  onSpeedChange: (speed: GameSpeed) => void
}

function speedLabel(speed: GameSpeed): string {
  return speed === 0 ? 'Pause' : `${speed}x`
}

export function TopHud({ tick, coins, speed, onSpeedChange }: TopHudProps) {
  return (
    <div className="top-hud">
      <div className="hud-stat">Münzen: {coins.toLocaleString('de-DE')}</div>
      <div className="hud-stat">Tick: {tick.toLocaleString('de-DE')}</div>
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
