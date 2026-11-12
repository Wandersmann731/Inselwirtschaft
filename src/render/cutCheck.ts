// Some house pictures were cropped when they were made: a wall or roof ends in a straight vertical line, with no
// outline, as if cut with a knife. A painted wall always ends in a dark outline. This check finds the cut ones, so
// the game can leave them out and use the whole pictures of the same house instead.

/** Only the upper part of a picture is looked at: below it lies the plot, which may end anywhere. */
const UPPER_SHARE = 0.62
/** A side counts as straight if this many rows begin in the same column (give or take one). */
const MIN_ROWS = 40
/** A painted edge is dark in at least this share of its rows. */
const MIN_DARK = 0.45
const DARK = 75

/**
 * True if the left or right side of the picture is a straight vertical cut without an outline. Works on RGBA
 * pixels. Pure: no canvas, so it can be tested.
 */
export function isCutOff(data: Uint8ClampedArray, width: number, height: number): boolean {
  const rows = Math.floor(height * UPPER_SHARE)
  for (const step of [1, -1]) {
    // for every row the column of its first painted pixel, seen from this side
    const starts = new Map<number, number[]>()
    for (let y = 0; y < rows; y++) {
      for (let k = 0; k < width; k++) {
        const x = step === 1 ? k : width - 1 - k
        if (data[(y * width + x) * 4 + 3] <= 200) continue
        const list = starts.get(x)
        if (list) list.push(y)
        else starts.set(x, [y])
        break
      }
    }
    let column = -1
    let run: number[] = []
    for (const x of starts.keys()) {
      const near = [x - 1, x, x + 1].flatMap((c) => starts.get(c) ?? [])
      if (near.length > run.length) {
        column = x
        run = near
      }
    }
    if (run.length < MIN_ROWS) continue
    let dark = 0
    for (const y of run) {
      for (const x of [column - 1, column, column + 1]) {
        if (x < 0 || x >= width) continue
        const o = (y * width + x) * 4
        if (data[o + 3] > 200 && 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] < DARK) {
          dark++
          break
        }
      }
    }
    if (dark / run.length < MIN_DARK) return true
  }
  return false
}
