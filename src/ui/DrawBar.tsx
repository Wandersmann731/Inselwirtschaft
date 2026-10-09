import { getBuilding } from '../data'
import type { BuildController, ToolMode } from '../game/buildController'
import { formatCost } from './messages'

export function DrawBar({ tool, mode }: { tool: BuildController; mode: ToolMode }) {
  const demolish = mode === 'demolish'
  return (
    <div className="place-bar">
      <div className="place-info">
        <strong>{demolish ? 'Abriss' : 'Straße'}</strong>
        <span className="place-cost">{demolish ? '50 % der Baukosten zurück' : formatCost(getBuilding('road').cost) + ' pro Kachel'}</span>
        <span className="place-hint">
          {demolish
            ? 'Gebäude oder Straße antippen oder darüber ziehen'
            : 'Mit dem Finger ziehen, um Straßen zu bauen. Zwei Finger bewegen die Karte.'}
        </span>
      </div>
      <div className="place-actions">
        <button type="button" className="action-button" onClick={() => tool.cancel()}>
          Fertig
        </button>
      </div>
    </div>
  )
}
