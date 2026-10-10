import { config, getBuilding } from '../data'
import type { BuildingDef } from '../data'
import { addTo, cloneLedger } from './ledger'
import { getLinks, type Link } from './logistics'
import { stockCapacity } from './storage'
import type { CycleLedger, IslandState, PlacedBuilding, ProductionState, ProductionStatus } from './state'

type Stock = Record<string, number>

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

/** Good options of one input line: the main good first, then its alternatives. */
function options(input: { good: string; alternatives?: string[] }): string[] {
  return [input.good, ...(input.alternatives ?? [])]
}

/** Runs one tick of production, delivery and ordering for all producing buildings. */
export function processProduction(state: IslandState): IslandState {
  if (!state.buildings.some((building) => building.production)) return state
  const links = getLinks(state)
  const stock: Stock = { ...state.stock }
  const ledger = cloneLedger(state.economy.current)
  // Goods of all producers on their way to the store: they count against its capacity, so it never overflows.
  const underway: Stock = {}
  for (const building of state.buildings) {
    for (const shipment of building.production?.shipments ?? []) {
      if (shipment.kind === 'out' && shipment.arrive > state.tick) underway[shipment.good] = (underway[shipment.good] ?? 0) + shipment.amount
    }
  }
  const capacity = stockCapacity(state)
  const buildings = state.buildings.map((building) => {
    if (!building.production) return building
    return {
      ...building,
      production: stepBuilding(building, building.production, links.get(building.id), stock, underway, state.tick, ledger, capacity),
    }
  })
  return { ...state, stock, buildings, economy: { ...state.economy, current: ledger } }
}

function stepBuilding(
  building: PlacedBuilding,
  previous: ProductionState,
  link: Link | undefined,
  stock: Stock,
  underway: Stock,
  now: number,
  ledger: CycleLedger,
  capacity: number,
): ProductionState {
  const def = getBuilding(building.type)
  const output = def.output
  if (!output) return previous
  const p: ProductionState = { ...previous, inputs: { ...previous.inputs }, extra: { ...previous.extra }, shipments: [...previous.shipments] }

  deliver(p, stock, now)

  if (!building.active) return { ...p, status: { kind: 'inactive' } }
  if (!link || link.kind !== 'ok') return { ...p, status: { kind: link?.kind ?? 'noRoad' } }

  orderInputs(def, p, stock, now, link.delay)
  shipOutput(def, p, stock, underway, now, link.delay, capacity)
  p.status = produce(def, p, ledger)
  if (p.status.kind === 'producing') p.busyTicks += 1
  return p
}

/** Moves shipments that have arrived into the input buffer or the island store. */
function deliver(p: ProductionState, stock: Stock, now: number): void {
  const waiting = []
  for (const shipment of p.shipments) {
    if (shipment.arrive > now) {
      waiting.push(shipment)
    } else if (shipment.kind === 'in') {
      p.inputs[shipment.good] = (p.inputs[shipment.good] ?? 0) + shipment.amount
    } else {
      stock[shipment.good] = (stock[shipment.good] ?? 0) + shipment.amount
    }
  }
  p.shipments = waiting
}

/** Fetches missing inputs from the island store. They arrive after the road delay. */
function orderInputs(def: BuildingDef, p: ProductionState, stock: Stock, now: number, delay: number): void {
  for (const input of def.inputs ?? []) {
    const goods = options(input)
    const have = sum(goods.map((good) => p.inputs[good] ?? 0))
    const onTheWay = sum(p.shipments.filter((s) => s.kind === 'in' && goods.includes(s.good)).map((s) => s.amount))
    const wanted = input.amount * config.production.inputBufferCycles - have - onTheWay
    if (wanted <= 0) continue
    for (const good of goods) {
      const take = Math.min(wanted, stock[good] ?? 0)
      if (take <= 0) continue
      stock[good] -= take
      p.shipments.push({ kind: 'in', good, amount: take, arrive: now + delay })
      break
    }
  }
}

/**
 * Sends finished goods and byproducts to the island store, as far as the store has room. Goods that other producers
 * already have on the way count as taken.
 */
function shipOutput(def: BuildingDef, p: ProductionState, stock: Stock, underway: Stock, now: number, delay: number, capacity: number): void {
  const output = def.output
  if (!output) return
  const send = (good: string, waiting: number): number => {
    const room = capacity - (stock[good] ?? 0) - (underway[good] ?? 0)
    const amount = Math.min(waiting, room)
    if (amount <= 0) return 0
    underway[good] = (underway[good] ?? 0) + amount
    p.shipments.push({ kind: 'out', good, amount, arrive: now + delay })
    return amount
  }
  for (const [good, waiting] of Object.entries(p.extra)) {
    if (waiting > 0) p.extra[good] = waiting - send(good, waiting)
  }
  if (p.output > 0) p.output -= send(output.good, p.output)
}

/** Advances the running cycle or starts a new one. Returns what the building is doing. */
function produce(def: BuildingDef, p: ProductionState, ledger: CycleLedger): ProductionStatus {
  const output = def.output
  const cycleTicks = def.cycleTicks ?? 1
  if (!output) return { kind: 'noRoad' }

  if (p.progress === 0) {
    const used: [string, number][] = []
    for (const input of def.inputs ?? []) {
      const source = options(input).find((good) => (p.inputs[good] ?? 0) >= input.amount)
      if (!source) return { kind: 'waiting', good: input.good }
      used.push([source, input.amount])
    }
    const extraFull = (def.byproducts ?? []).some((extra) => (p.extra[extra.good] ?? 0) + extra.amount > config.production.outputBufferAmount)
    if (p.output + output.amount > config.production.outputBufferAmount || extraFull) return { kind: 'outputFull' }
    for (const [good, amount] of used) {
      p.inputs[good] -= amount
      addTo(ledger.consumed, good, amount)
    }
  }

  p.progress += 1
  if (p.progress >= cycleTicks) {
    p.output += output.amount
    addTo(ledger.produced, output.good, output.amount)
    for (const extra of def.byproducts ?? []) {
      p.extra[extra.good] = (p.extra[extra.good] ?? 0) + extra.amount
      addTo(ledger.produced, extra.good, extra.amount)
    }
    p.progress = 0
  }
  return { kind: 'producing' }
}

/** Shuts a building down or starts it again. Inactive buildings cost less upkeep. */
export function setBuildingActive(state: IslandState, buildingId: number, active: boolean): IslandState {
  const building = state.buildings.find((b) => b.id === buildingId)
  if (!building || building.active === active) return state
  return {
    ...state,
    buildings: state.buildings.map((b) => (b.id === buildingId ? { ...b, active } : b)),
  }
}

/** Upkeep per economy cycle of one building, depending on whether it is active. */
export function upkeepOf(building: PlacedBuilding): number {
  const { upkeep } = getBuilding(building.type)
  return building.active ? upkeep.active : upkeep.idle
}
