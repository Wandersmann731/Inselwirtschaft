import { world } from '../data'
import { createRng } from '../sim/rng'
import { largestComponent } from './grid'
import { fractalNoise, noiseField } from './noise'
import { Terrain, type GameMap } from './terrain'

/** Builds one island from a seed. Same seed always gives the same map. */
export function generateIsland(seed: number): GameMap {
  const cfg = world.island
  const rng = createRng(seed)
  const width = cfg.minSize + rng.nextInt(cfg.maxSize - cfg.minSize + 1)
  const height = cfg.minSize + rng.nextInt(cfg.maxSize - cfg.minSize + 1)
  const noise = fractalNoise(rng, width, height, cfg.noiseCells, cfg.noiseWeights)
  const forestNoise = noiseField(rng, width, height, cfg.forestCell)

  // Elevation: noise plus a falloff towards the map edge, so the island sits in the sea.
  const elevation = new Float32Array(width * height)
  const rawLand = new Uint8Array(width * height)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.min(1, Math.hypot((x - cx) / cx, (y - cy) / cy))
      const falloff = 1 - distance ** cfg.falloffPower
      const i = y * width + x
      elevation[i] = cfg.noiseShare * noise[i] + (1 - cfg.noiseShare) * falloff
      const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1
      rawLand[i] = !onBorder && elevation[i] > cfg.seaLevel ? 1 : 0
    }
  }
  const land = largestComponent(rawLand, width, height)

  // Mountains: the highest part of the island, reduced to one connected group.
  const landElevations: number[] = []
  for (let i = 0; i < land.length; i++) if (land[i]) landElevations.push(elevation[i])
  landElevations.sort((a, b) => b - a)
  const mountainCount = Math.max(1, Math.round(landElevations.length * cfg.mountainFraction))
  const mountainLevel = landElevations[Math.min(mountainCount, landElevations.length) - 1]
  const rawMountain = new Uint8Array(width * height)
  for (let i = 0; i < land.length; i++) {
    rawMountain[i] = land[i] && elevation[i] >= mountainLevel ? 1 : 0
  }
  const mountain = largestComponent(rawMountain, width, height)

  const touchesWater = (x: number, y: number): boolean => {
    for (let dy = -cfg.beachWidth; dy <= cfg.beachWidth; dy++) {
      for (let dx = -cfg.beachWidth; dx <= cfg.beachWidth; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true
        if (!land[ny * width + nx]) return true
      }
    }
    return false
  }

  const tiles: number[] = new Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!land[i]) tiles[i] = Terrain.Water
      else if (mountain[i]) tiles[i] = Terrain.Mountain
      else if (touchesWater(x, y)) tiles[i] = Terrain.Beach
      else if (forestNoise[i] > cfg.forestThreshold) tiles[i] = Terrain.Forest
      else tiles[i] = Terrain.Grass
    }
  }
  return { width, height, tiles }
}
