/** Terrain codes stored in GameMap.tiles. */
export const Terrain = {
  Water: 0,
  Beach: 1,
  Grass: 2,
  Forest: 3,
  Mountain: 4,
} as const

export type TerrainType = (typeof Terrain)[keyof typeof Terrain]

export const TERRAIN_NAMES: Record<number, string> = {
  [Terrain.Water]: 'Wasser',
  [Terrain.Beach]: 'Strand',
  [Terrain.Grass]: 'Gras',
  [Terrain.Forest]: 'Wald',
  [Terrain.Mountain]: 'Berg',
}

export interface GameMap {
  width: number
  height: number
  /** Row-major terrain codes, index = y * width + x. */
  tiles: number[]
}

export function tileIndex(map: GameMap, x: number, y: number): number {
  return y * map.width + x
}

export function inMap(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height
}
