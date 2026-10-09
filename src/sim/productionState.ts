import type { ProductionState } from './state'

/** Fresh production state of a newly built producer. */
export function createProduction(): ProductionState {
  return { progress: 0, busyTicks: 0, utilization: 0, inputs: {}, output: 0, status: { kind: 'noRoad' }, shipments: [] }
}
