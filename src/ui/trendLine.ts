export const WIDTH = 300
export const HEIGHT = 64
export const PAD = 4

/** Points of a line through the values, scaled into the chart. A flat series runs through the middle. */
export function linePoints(values: number[], width = WIDTH, height = HEIGHT, pad = PAD): string {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low
  const step = values.length > 1 ? (width - 2 * pad) / (values.length - 1) : 0
  return values
    .map((value, index) => {
      const share = span > 0 ? (value - low) / span : 0.5
      return `${(pad + index * step).toFixed(1)},${(height - pad - share * (height - 2 * pad)).toFixed(1)}`
    })
    .join(' ')
}
