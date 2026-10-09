import type { ProductionStatusKind } from '../sim/state'

export const STATUS_ICONS: Record<ProductionStatusKind, string> = {
  producing: 'ui/status_producing',
  waiting: 'ui/status_waiting',
  outputFull: 'ui/status_full',
  noRoad: 'ui/status_noroad',
  noHub: 'ui/status_nohub',
  inactive: 'ui/status_inactive',
}
