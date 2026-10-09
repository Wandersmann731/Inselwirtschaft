import type { CycleLedger } from './state'

export function emptyLedger(): CycleLedger {
  return { income: 0, upkeep: 0, produced: {}, consumed: {} }
}

/** Copy that can be changed without touching the original (the records are copied too). */
export function cloneLedger(ledger: CycleLedger): CycleLedger {
  return { ...ledger, produced: { ...ledger.produced }, consumed: { ...ledger.consumed } }
}

export function addTo(record: Record<string, number>, good: string, amount: number): void {
  if (amount > 0) record[good] = (record[good] ?? 0) + amount
}
