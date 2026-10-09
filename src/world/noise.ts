import type { Rng } from '../sim/rng'

const smooth = (t: number): number => t * t * (3 - 2 * t)

/** Smooth value noise in [0, 1], one value per cell of a width x height grid. */
export function noiseField(rng: Rng, width: number, height: number, cell: number): Float32Array {
  const gridW = Math.ceil(width / cell) + 2
  const gridH = Math.ceil(height / cell) + 2
  const lattice = new Float32Array(gridW * gridH)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next()

  const out = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const fy = y / cell
    const iy = Math.floor(fy)
    const ty = smooth(fy - iy)
    for (let x = 0; x < width; x++) {
      const fx = x / cell
      const ix = Math.floor(fx)
      const tx = smooth(fx - ix)
      const a = lattice[iy * gridW + ix]
      const b = lattice[iy * gridW + ix + 1]
      const c = lattice[(iy + 1) * gridW + ix]
      const d = lattice[(iy + 1) * gridW + ix + 1]
      out[y * width + x] = a + (b - a) * tx + (c + (d - c) * tx - (a + (b - a) * tx)) * ty
    }
  }
  return out
}

/** Several noise octaves blended by weight, normalised back to [0, 1]. */
export function fractalNoise(
  rng: Rng,
  width: number,
  height: number,
  cells: number[],
  weights: number[],
): Float32Array {
  const out = new Float32Array(width * height)
  let total = 0
  cells.forEach((cell, octave) => {
    const weight = weights[octave]
    const field = noiseField(rng, width, height, cell)
    for (let i = 0; i < out.length; i++) out[i] += field[i] * weight
    total += weight
  })
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}
