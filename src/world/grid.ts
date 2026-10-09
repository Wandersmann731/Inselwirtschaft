/**
 * Keeps only the largest 4-connected group of set cells in a mask.
 * Ties go to the group found first when scanning row by row.
 */
export function largestComponent(mask: Uint8Array, width: number, height: number): Uint8Array {
  const visited = new Uint8Array(mask.length)
  const stack: number[] = []
  let best: number[] = []

  const visit = (index: number): void => {
    if (mask[index] && !visited[index]) {
      visited[index] = 1
      stack.push(index)
    }
  }

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue
    const group: number[] = []
    visit(start)
    while (stack.length > 0) {
      const index = stack.pop()!
      group.push(index)
      const x = index % width
      const y = (index - x) / width
      if (x > 0) visit(index - 1)
      if (x < width - 1) visit(index + 1)
      if (y > 0) visit(index - width)
      if (y < height - 1) visit(index + width)
    }
    if (group.length > best.length) best = group
  }

  const result = new Uint8Array(mask.length)
  for (const index of best) result[index] = 1
  return result
}
