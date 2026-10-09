export interface GameConfig {
  startCoins: number
  startSeed: number
  speeds: number[]
  defaultSpeed: number
  tickMillis: number
  loopIntervalMs: number
  maxTicksPerUpdate: number
  economyCycleTicks: number
  autosaveSeconds: number
}

export interface GoodDef {
  id: string
  name: string
}

export interface BuildingInput {
  good: string
  amount: number
  alternatives?: string[]
}

export interface BuildingDef {
  id: string
  name: string
  size: [number, number]
  cost: { tools: number; wood: number; bricks: number; marble: number; coins: number }
  upkeep: { active: number; idle: number }
  unlockTier: string
  inputs: BuildingInput[]
  output: { good: string; amount: number }
  cycleTicks: number
  needsRoad: boolean
}

export interface TierDef {
  id: string
  name: string
  residents: number
  size: [number, number]
  needs: string[]
}

export interface ClimateDef {
  id: string
  name: string
  fertilities: string[]
}
