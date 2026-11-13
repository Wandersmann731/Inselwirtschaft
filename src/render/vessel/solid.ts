// A small painter for things that turn: a ship is seen from eight sides, so it cannot be put together from the
// boxes of the building kit, which all stand square to the tiles. Here a thing is a heap of flat faces and thin
// bars in its own space (x forward, y to its left, in tiles; z up, in world pixels). For a heading they are turned,
// lit from the top left like everything else, and painted from the back to the front. Nothing has an outline.

export type P3 = [number, number, number]
export type Rgb = [number, number, number]

const HW = 32
const HH = 16
/** World pixels to a tile, for telling which way a face looks. */
const TILE = 45.25
/** To the sun and to the eye, along (u, v, z): the left walls of the buildings are lit, the right ones in shade. */
const SUN: P3 = [-0.52, 0.42, 0.74]
const EYE: P3 = [0.61, 0.61, 0.5]

interface Face {
  pts: P3[]
  colour: Rgb
  /** Seen from both sides (cloth), or only from outside (a hull, a box). */
  cloth: boolean
  /** Painted this much nearer than it is: for what lies on another face. */
  near: number
  /** As light as this whatever way it looks (paint on a sail). */
  glow?: number
}

interface Bar {
  a: P3
  b: P3
  thick: number
  colour: string
  near: number
  /** A spar or a timber, not a rope: it has the grain of wood. */
  wood: boolean
}

/** How light a face is that looks along (nx, ny, nz) in the space of the map: 0.5 in shade, up to 1.1 in the sun. Pure. */
export function lightOf(nx: number, ny: number, nz: number): number {
  const d = Math.hypot(nx, ny, nz) || 1
  return 0.5 + 0.6 * Math.max(0, (nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / d)
}

/** Where a point of the thing lies on the map for a heading (radians, 0 is along u): u, v in tiles, z unchanged. Pure. */
export function turned(p: P3, heading: number): P3 {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]
}

export class Solid {
  private faces: Face[] = []
  private bars: Bar[] = []

  /** A flat face between corners given around it. */
  face(pts: P3[], colour: Rgb, cloth = false, near = 0, glow?: number): void {
    this.faces.push({ pts, colour, cloth, near, glow })
  }

  /** A thin round thing between two points: a mast, a yard, a rope. */
  bar(a: P3, b: P3, thick: number, colour: string, near = 0): void {
    this.bars.push({ a, b, thick, colour, near, wood: thick >= 0.9 && !colour.startsWith('rgba') })
  }

  /**
   * Paints the thing for a heading; (0, 0, 0) of its space lies at (ox, oy) of the picture. With `woodOnly` it paints
   * no colours but a stencil: opaque wherever wood shows and clear wherever cloth lies before it, so that what is
   * laid over wood alone (its grain) never falls on a sail.
   */
  paint(g: CanvasRenderingContext2D, heading: number, ox: number, oy: number, woodOnly = false): void {
    const flat = (p: P3): [number, number] => [ox + (p[0] - p[1]) * HW, oy + (p[0] + p[1]) * HH - p[2]]
    const depth = (p: P3): number => p[0] + p[1] + p[2] * 0.003
    const jobs: { at: number; draw: () => void }[] = []
    for (const face of this.faces) {
      const pts = face.pts.map((p) => turned(p, heading))
      const [a, b, c] = pts
      const u = [(b[0] - a[0]) * TILE, (b[1] - a[1]) * TILE, b[2] - a[2]]
      const v = [(c[0] - a[0]) * TILE, (c[1] - a[1]) * TILE, c[2] - a[2]]
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const toEye = n[0] * EYE[0] + n[1] * EYE[1] + n[2] * EYE[2]
      if (toEye < 0) {
        // it looks away: a hull has nothing to show there, cloth shows its other side
        if (!face.cloth) continue
        n = n.map((value) => -value)
      }
      let light = face.glow ?? lightOf(n[0], n[1], n[2])
      // cloth lets the light through: a sail is never as dark as a wall, on neither of its sides
      if (face.cloth && face.glow === undefined) light = 0.8 + 0.5 * (light - 0.5) - (toEye < 0 ? 0.05 : 0)
      // in shade a colour is not only darker but cooler
      const cool = light < 0.62 ? (0.62 - light) * 1.4 : 0
      const colour = face.colour.map((value, i) => Math.round(Math.min(255, value * light * (1 - cool) + [44, 52, 80][i] * cool)))
      const shape = pts.map(flat)
      jobs.push({
        at: pts.reduce((sum, p) => sum + depth(p), 0) / pts.length + face.near,
        draw: () => {
          g.globalCompositeOperation = woodOnly && face.cloth ? 'destination-out' : 'source-over'
          g.fillStyle = woodOnly ? '#000' : `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`
          g.beginPath()
          const mx = shape.reduce((sum, p) => sum + p[0], 0) / shape.length
          const my = shape.reduce((sum, p) => sum + p[1], 0) / shape.length
          // a hair larger than it is, so no seam shows between neighbours
          shape.forEach(([x, y], i) => (i ? g.lineTo(x + Math.sign(x - mx) * 0.14, y + Math.sign(y - my) * 0.14) : g.moveTo(x + Math.sign(x - mx) * 0.14, y + Math.sign(y - my) * 0.14)))
          g.closePath()
          g.fill()
        },
      })
    }
    for (const bar of this.bars) {
      const a3 = turned(bar.a, heading)
      const b3 = turned(bar.b, heading)
      const [a, b] = [flat(a3), flat(b3)]
      jobs.push({
        at: (depth(a3) + depth(b3)) / 2 + bar.near,
        draw: () => {
          const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
          const nx = (-(b[1] - a[1]) / d) * (bar.thick / 2)
          const ny = ((b[0] - a[0]) / d) * (bar.thick / 2)
          // ropes and pennants are no wood: in a stencil they are left out
          if (woodOnly && !bar.wood) return
          g.globalCompositeOperation = 'source-over'
          g.fillStyle = woodOnly ? '#000' : bar.colour
          g.beginPath()
          g.moveTo(a[0] + nx, a[1] + ny)
          g.lineTo(b[0] + nx, b[1] + ny)
          g.lineTo(b[0] - nx, b[1] - ny)
          g.lineTo(a[0] - nx, a[1] - ny)
          g.closePath()
          g.fill()
        },
      })
    }
    jobs.sort((p, q) => p.at - q.at)
    for (const job of jobs) job.draw()
    g.globalCompositeOperation = 'source-over'
  }
}
