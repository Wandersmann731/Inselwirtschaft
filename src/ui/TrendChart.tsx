import type { CycleSnapshot } from '../game/history'
import { t } from '../i18n/language'
import { formatSigned, formatWhole } from './messages'
import { HEIGHT, linePoints, PAD, WIDTH } from './trendLine'

function Trend({ title, values, latest, tone }: { title: string; values: number[]; latest: string; tone: string }) {
  const points = linePoints(values)
  return (
    <figure className="trend">
      <figcaption>
        <span>{title}</span>
        <strong>{latest}</strong>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${latest}`}>
        <polygon className={`trend-area ${tone}`} points={`${PAD},${HEIGHT - PAD} ${points} ${WIDTH - PAD},${HEIGHT - PAD}`} />
        <polyline className={`trend-line ${tone}`} points={points} />
      </svg>
    </figure>
  )
}

/** How residents and coins developed over the last economy cycles, drawn as two small line charts. */
export function TrendChart({ history }: { history: CycleSnapshot[] }) {
  if (history.length < 2) {
    return <p className="stats-note">{t('Der Verlauf erscheint nach zwei Wirtschaftszyklen.', 'The trend appears after two economy cycles.')}</p>
  }
  const last = history[history.length - 1]
  return (
    <>
      <div className="trends">
        <Trend title={t('Einwohner', 'Residents')} values={history.map((entry) => entry.residents)} latest={formatWhole(last.residents)} tone="people" />
        <Trend title={t('Münzen', 'Coins')} values={history.map((entry) => entry.coins)} latest={formatWhole(last.coins)} tone="coins" />
        <Trend title={t('Bilanz pro Zyklus', 'Balance per cycle')} values={history.map((entry) => entry.balance)} latest={formatSigned(last.balance)} tone="balance" />
      </div>
      <p className="stats-note">
        {t(`Die letzten ${history.length} Zyklen seit dem Laden des Spiels.`, `The last ${history.length} cycles since the game was loaded.`)}
      </p>
    </>
  )
}
