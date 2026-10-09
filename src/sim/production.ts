import { config, getBuilding } from '../data'
import type { BuildingDef } from '../data'
import { getLinks, type Link } from './logistics'
import type { GameState, PlacedBuilding, ProductionState, ProductionStatus } from './state'

type Stock = Record<string, number>

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

/** Good options of one input line: the main good first, then its alternatives. */
function options(input: { good: string; alternatives?: string[] }): string[] {
  return [input.good, ...(input.alternatives ?? [])]
}

/** Runs one tick of production, delivery and ordering for all producing buildings. */
export function processProduction(state: GameState): GameState {
  if (!state.buildings.some((building) => building.production)) return state
  const links = getLinks(state)
  const stock: Stock = { ...state.stock }
  const buildings = state.buildings.map((building) => {
    if (!building.production) return building
    return {
      ...building,
      production: stepBuilding(building, building.production, links.get(building.id), stock, state.tick),
    }
  })
  return { ...state, stock, buildings }
}

function stepBuilding(
  building: PlacedBuilding,
  previous: ProductionState,
  link: Link | undefined,
  stock: Stock,
  now: number,
): ProductionState {
  const def = getBuilding(building.type)
  const output = def.output
  if (!output) return previous
  const p: ProductionState = { ...previous, inputs: { ...previous.inputs }, shipments: [...previous.shipments] }

  deliver(p, stock, now)

  if (!building.active) return { ...p, status: { kind: 'inactive' } }
  if (!link || link.kind !== 'ok') return { ...p, status: { kind: link?.kind ?? 'noRoad' } }

  orderInputs(def, p, stock, now, link.delay)
  shipOutput(def, p, stock, now, link.delay)
  p.status = produce(def, p)
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

/** Sends finished goods to the island store, as far as the store has room. */
function shipOutput(def: BuildingDef, p: ProductionState, stock: Stock, now: number, delay: number): void {
  const output = def.output
  if (!output || p.output <= 0) return
  const onTheWay = sum(p.shipments.filter((s) => s.kind === 'out').map((s) => s.amount))
  const room = config.production.stockCapacity - (stock[output.good] ?? 0) - onTheWay
  const amount = Math.min(p.output, room)
  if (amount <= 0) return
  p.output -= amount
  p.shipments.push({ kind: 'out', good: output.good, amount, arrive: now + delay })
}

/** Advances the running cycle or starts a new one. Returns what the building is doing. */
function produce(def: BuildingDef, p: ProductionState): ProductionStatus {
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
    if (p.output + output.amount > config.production.outputBufferAmount) return { kind: 'outputFull' }
    for (const [good, amount] of used) p.inputs[good] -= amount
  }

  p.progress += 1
  if (p.progress >= cycleTicks) {
    p.output += output.amount
    p.progress = 0
  }
  return { kind: 'producing' }
}

/** Shuts a building down or starts it again. Inactive buildings cost less upkeep. */
export function setBuildingActive(state: GameState, buildingId: number, active: boolean): GameState {
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
