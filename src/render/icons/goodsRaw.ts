// The symbols of what the land gives: wood and stone, what grows on fields and plantations, what comes out of the
// mines and from the animals.
import { hash2 } from '../../world/noise2d'
import { ball, barrel, bend, box, gloss, leaf, line, oval, poly, ring, rock, rounded, solid, speckle, tone, woodGrain, type Ctx, type Draw, type Rgb } from './kit'

/** A log lying across, its sawn end to the left: bark with furrows, round in the light, the rings of its years on the cut. */
function log(g: Ctx, x: number, y: number, long: number, r: number): void {
  box(g, x, y - r, long, r * 2, r, [122, 86, 54], 0.1)
  woodGrain(g, x + r, y - r, long - r, r * 2, Math.round(x * 3 + y))
  rounded(g, x, y - r, long, r * 2)
  // a knot, and the stub of a branch
  oval(g, x + long * 0.62, y - r * 0.2, 1.5, 1, 'rgba(60, 38, 22, 0.7)')
  ring(g, x + long * 0.62, y - r * 0.2, 2.4, 1.7, 0.4, 'rgba(60, 38, 22, 0.5)')
  oval(g, x + r * 0.6, y, r * 0.66, r, [112, 78, 48], 0, 0.1)
  oval(g, x + r * 0.6, y, r * 0.54, r * 0.86, [228, 192, 138], 0, 0.16)
  for (const k of [0.7, 0.5, 0.3]) ring(g, x + r * 0.6, y, r * 0.54 * k, r * 0.86 * k, 0.4, 'rgba(150, 104, 60, 0.6)')
  oval(g, x + r * 0.6, y, r * 0.07, r * 0.12, 'rgb(128, 84, 48)')
  line(g, [x + r * 0.6, y, x + r * 0.86, y - r * 0.6], 0.35, 'rgba(110, 72, 40, 0.7)')
}

/** An ear of grain at the end of a stalk. */
function ear(g: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  line(g, [x0, y0, x1, y1], 1, 'rgb(196, 158, 70)')
  const [dx, dy] = [(x1 - x0) / 5, (y1 - y0) / 5]
  for (let k = 0; k < 5; k++) for (const side of [-1, 1]) oval(g, x1 - dx * k * 0.44 + side * 1.5, y1 - dy * k * 0.44, 1.4, 2.4, [226, 182, 72], Math.atan2(dy, dx) + Math.PI / 2 + side * 0.5)
}

/** A cow seen from its side: a brown hide with pale patches, horns, an udder, hooves. */
function cow(g: Ctx): void {
  const hide: Rgb = [150, 94, 58]
  const hoof: Rgb = [50, 40, 36]
  for (const x of [22, 44]) {
    box(g, x, 40, 4, 15, 1.5, [104, 64, 42])
    box(g, x, 53, 4, 2.6, 1, hoof)
  }
  bend(g, 49.6, 28, 56.5, 31, 54.4, 43, 1.4, tone(hide, 0.8))
  oval(g, 54.2, 45.4, 1.7, 2.8, [70, 46, 34])
  oval(g, 32, 33, 18.5, 10.4, hide, 0, 0.1)
  oval(g, 44, 31.6, 8, 9.6, hide, 0, 0.1)
  oval(g, 21, 32.4, 8.4, 9.8, hide, 0, 0.1)
  rounded(g, 12, 22, 42, 22)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  oval(g, 36, 28.6, 7, 4.6, 'rgba(240, 230, 212, 0.94)', 0.3)
  oval(g, 27, 37.4, 4.4, 3, 'rgba(240, 230, 212, 0.9)', -0.4)
  oval(g, 47.4, 35, 3, 4, 'rgba(240, 230, 212, 0.9)', 0.2)
  g.restore()
  oval(g, 40.4, 43, 3.6, 2.6, [226, 172, 160])
  for (const x of [17, 39]) {
    box(g, x, 39, 4.4, 16, 1.6, hide)
    box(g, x, 53, 4.4, 2.6, 1, hoof)
  }
  solid(g, [12, 23, 22.4, 24, 24, 37, 15, 34], hide, 0.14)
  bend(g, 10.6, 21.6, 7.6, 20, 7.8, 16.4, 1.5, 'rgb(236, 226, 204)')
  bend(g, 15, 21, 18.8, 19.6, 18.8, 16, 1.5, 'rgb(236, 226, 204)')
  oval(g, 11.5, 26.5, 6.2, 5.6, hide, -0.3)
  oval(g, 17.6, 24.2, 3.2, 1.7, tone(hide, 0.8), 0.5)
  oval(g, 7.6, 29.6, 3.9, 3.3, [216, 180, 152])
  oval(g, 6.2, 29.4, 0.6, 0.5, 'rgb(60, 40, 36)')
  oval(g, 11.8, 25.4, 1.15, 1.15, 'rgb(30, 24, 22)')
  oval(g, 11.5, 25.1, 0.36, 0.36, 'rgba(255, 255, 255, 0.85)')
  oval(g, 12, 23.6, 2.6, 1.4, 'rgba(240, 230, 212, 0.8)', -0.2)
}

export const RAW: Record<string, Draw> = {
  wood: (g) => {
    log(g, 9, 46, 40, 6.4)
    log(g, 18, 46.4, 38, 6)
    log(g, 13, 34, 38, 6.2)
  },
  stone: (g) => {
    const grey: Rgb = [146, 144, 140]
    rock(g, 20, 44, 11, grey)
    rock(g, 43, 45, 10, [132, 130, 128])
    rock(g, 32, 29, 12, [156, 154, 148])
    rock(g, 33, 49, 7, grey)
  },
  marble_stone: (g) => {
    rock(g, 31, 36, 21, [226, 224, 218])
    line(g, [20, 30, 28, 38, 40, 34], 0.7, 'rgba(120, 124, 136, 0.5)')
    rock(g, 48, 50, 6, [214, 212, 208])
  },
  saltstone: (g) => {
    const salt: Rgb = [232, 234, 238]
    for (const [x, y, r] of [[19, 46, 8], [44, 46, 9], [31, 47, 8], [25, 33, 9], [39, 34, 8], [32, 22, 8]]) rock(g, x, y, r, salt)
  },
  ore: (g) => {
    rock(g, 32, 34, 22, [70, 62, 66])
    for (const [x, y] of [[24, 28], [38, 36], [30, 44], [42, 24]]) poly(g, [x - 4, y, x, y - 3, x + 4, y + 1, x + 1, y + 3], 'rgb(176, 78, 60)')
    gloss(g, 22, 24, 5, 2, 0.25)
  },
  gold: (g) => {
    const gold: Rgb = [236, 184, 52]
    for (const [x, y, r] of [[18, 46, 8], [46, 46, 8], [32, 48, 9], [24, 34, 8], [40, 34, 8], [32, 22, 8]]) {
      rock(g, x, y, r, gold)
      gloss(g, x - r * 0.3, y - r * 0.5, r * 0.3, r * 0.14, 0.6)
    }
  },
  gems: (g) => {
    // cut stones: a table on top, facets around it, each turned to the light its own way
    for (const [x, c] of [[15, [196, 44, 56]], [32, [52, 108, 206]], [49, [56, 164, 84]]] as [number, Rgb][]) {
      const facets: [number[], number][] = [
        [[x, 14, x - 9, 24, x - 3.4, 27, x, 20.6], 1.36], [[x, 14, x + 9, 24, x + 3.4, 27, x, 20.6], 0.94], [[x - 9, 24, x - 3.4, 27, x - 3.4, 37, x - 9, 40], 1.08],
        [[x + 9, 24, x + 3.4, 27, x + 3.4, 37, x + 9, 40], 0.6], [[x - 9, 40, x - 3.4, 37, x, 43.4, x, 50], 0.8], [[x + 9, 40, x + 3.4, 37, x, 43.4, x, 50], 0.46],
        [[x, 20.6, x + 3.4, 27, x + 3.4, 37, x, 43.4, x - 3.4, 37, x - 3.4, 27], 1.62],
      ]
      for (const [pts, k] of facets) poly(g, pts, tone(c, k))
      poly(g, [x - 2.6, 27.6, x + 0.4, 23, x + 0.4, 34, x - 2.6, 36], 'rgba(255, 255, 255, 0.34)')
      line(g, [x - 9, 24, x, 14, x + 9, 24], 0.4, 'rgba(255, 255, 255, 0.6)')
      // a spark where the light breaks
      poly(g, [x - 5, 19, x - 4.2, 21.2, x - 2, 22, x - 4.2, 22.8, x - 5, 25, x - 5.8, 22.8, x - 8, 22, x - 5.8, 21.2], 'rgba(255, 255, 255, 0.9)')
    }
  },
  grain: (g) => {
    for (const [x, y] of [[14, 12], [22, 7], [32, 5], [42, 7], [50, 12], [27, 10], [37, 10]]) ear(g, 32, 56, x, y)
    box(g, 26, 38, 12, 5, 2, [176, 120, 58])
  },
  potatoes: (g) => {
    const skin: Rgb = [172, 128, 78]
    for (const [x, y, rx, ry, turn] of [[22, 43, 13, 9, 0.2], [45, 42, 12, 9, -0.3], [33, 27, 13.4, 9.6, 0.1]]) {
      oval(g, x + 1, y + ry * 0.8, rx * 0.9, 2.4, 'rgba(30, 20, 20, 0.3)')
      oval(g, x, y, rx, ry, skin, turn, 0.2)
      rounded(g, x - rx, y - ry, rx * 2, ry * 2, 0.9)
      speckle(g, x, y, rx * 0.9, ry * 0.9, 34, 'rgba(98, 66, 38, 0.5)', x * 7 + y, 0.4)
      speckle(g, x, y, rx * 0.8, ry * 0.8, 12, 'rgba(240, 214, 160, 0.4)', x * 3 + y, 0.4)
      // the eyes of the potato: small hollows, dark above and light below
      for (const [dx, dy] of [[-5, -2], [3, 2.4], [5.4, -3], [-1, 4]]) {
        bend(g, x + dx - 1.2, y + dy, x + dx, y + dy - 1, x + dx + 1.2, y + dy, 0.6, 'rgba(84, 54, 30, 0.8)')
        bend(g, x + dx - 1, y + dy + 0.7, x + dx, y + dy + 1.3, x + dx + 1, y + dy + 0.7, 0.4, 'rgba(244, 220, 170, 0.6)')
      }
      gloss(g, x - rx * 0.36, y - ry * 0.46, rx * 0.3, ry * 0.14, 0.22, turn - 0.2)
    }
  },
  cotton: (g) => {
    bend(g, 26, 58, 30, 40, 34, 22, 2, 'rgb(104, 86, 58)')
    bend(g, 30, 42, 42, 40, 46, 34, 1.6, 'rgb(104, 86, 58)')
    bend(g, 29, 46, 22, 40, 20, 34, 1.4, 'rgb(104, 86, 58)')
    leaf(g, 28, 50, 14, 2.6)
    leaf(g, 30, 46, 12, 0.5)
    for (const [x, y] of [[34, 17], [47, 31], [20, 30]]) {
      // the dry husk the boll has burst out of, then the tufts
      for (let k = 0; k < 5; k++) leaf(g, x, y + 1, 9.4, 0.5 + (k / 5) * Math.PI * 2, [124, 92, 56])
      for (const [dx, dy] of [[-4, -3], [4, -3], [0, 3.4], [0, -1]]) ball(g, x + dx, y + dy, 5.2, [244, 242, 236])
      for (const [dx, dy] of [[-2, 0], [2.4, -1], [0, -4.4]]) bend(g, x + dx - 1.6, y + dy, x + dx, y + dy - 1.4, x + dx + 1.6, y + dy, 0.4, 'rgba(150, 150, 170, 0.5)')
    }
  },
  wool: (g) => {
    // a fleece: curl upon curl, tied once around
    const curls = Array.from({ length: 30 }, (_, i) => {
      const turn = hash2(i, 1, 801) * Math.PI * 2
      const far = Math.sqrt(hash2(i, 2, 801))
      return [32 + Math.cos(turn) * far * 19, 36 + Math.sin(turn) * far * 13, 4.6 + 2.4 * hash2(i, 3, 801)]
    }).sort((a, b) => a[1] - b[1])
    oval(g, 32, 37, 21, 15, [224, 220, 210])
    for (const [x, y, r] of curls) {
      ball(g, x, y, r, [242, 238, 228])
      bend(g, x - r * 0.5, y + r * 0.1, x, y - r * 0.6, x + r * 0.5, y + r * 0.2, 0.4, 'rgba(160, 156, 170, 0.5)')
    }
    rounded(g, 8, 18, 48, 38, 0.7)
    bend(g, 14, 30, 32, 38, 51, 29, 1.2, 'rgb(150, 112, 70)')
    oval(g, 33, 34.6, 1.6, 1.2, 'rgb(128, 92, 56)')
  },
  cattle: cow,
  hides: (g) => {
    // a hide laced into a frame of four poles to dry: the frame says what it is even when the symbol is small
    for (const [x0, y0, x1, y1] of [[8, 8, 56, 8], [8, 56, 56, 56], [8, 8, 8, 56], [56, 8, 56, 56]]) line(g, [x0, y0, x1, y1], 3.4, 'rgb(128, 96, 62)')
    for (const [x, y, tx, ty] of [[8, 8, 18, 17], [56, 8, 46, 17], [8, 56, 18, 47], [56, 56, 46, 47], [32, 8, 32, 14], [32, 56, 32, 50], [8, 32, 15, 32], [56, 32, 49, 32]]) line(g, [x, y, tx, ty], 0.9, 'rgb(226, 214, 190)')
    const hide: Rgb = [214, 164, 108]
    g.fillStyle = tone(hide, 0.86)
    g.beginPath()
    g.moveTo(18, 16)
    g.quadraticCurveTo(26, 20, 32, 13)
    g.quadraticCurveTo(38, 20, 46, 16)
    g.quadraticCurveTo(42, 26, 49, 32)
    g.quadraticCurveTo(42, 38, 46, 48)
    g.quadraticCurveTo(38, 44, 32, 51)
    g.quadraticCurveTo(26, 44, 18, 48)
    g.quadraticCurveTo(22, 38, 15, 32)
    g.quadraticCurveTo(22, 26, 18, 16)
    g.fill()
    oval(g, 32, 32, 11.5, 13, [236, 196, 146], 0, 0.14)
    line(g, [32, 20, 32, 44], 1, 'rgba(150, 104, 62, 0.55)')
  },
  hops: (g) => {
    // one large cone, its scales lying over each other like tiles; a leaf and a tendril say it grows on a vine
    bend(g, 34, 4, 22, 6, 30, 16, 1.6, 'rgb(96, 116, 60)')
    leaf(g, 34, 14, 22, -0.5, [70, 124, 58])
    leaf(g, 30, 14, 18, 3.5, [84, 136, 62])
    const rows = 7
    for (let row = rows - 1; row >= 0; row--) {
      const t = row / (rows - 1)
      const wide = 17 * Math.sin(Math.PI * (0.16 + 0.76 * t)) + 2
      const count = Math.max(1, Math.round(wide / 5))
      for (let k = 0; k < count; k++) {
        const x = 32 + (count === 1 ? 0 : ((k / (count - 1)) * 2 - 1) * (wide - 4))
        // each scale: a pale green drop with a light tip
        g.fillStyle = tone([150, 186, 78], 0.78 + 0.34 * (1 - Math.abs(x - 26) / 22))
        g.beginPath()
        g.moveTo(x - 5, 16 + row * 5.6)
        g.quadraticCurveTo(x, 12 + row * 5.6, x + 5, 16 + row * 5.6)
        g.quadraticCurveTo(x + 4, 24 + row * 5.6, x, 27 + row * 5.6)
        g.quadraticCurveTo(x - 4, 24 + row * 5.6, x - 5, 16 + row * 5.6)
        g.fill()
        oval(g, x - 1, 23.4 + row * 5.6, 1.4, 1, 'rgba(236, 246, 170, 0.6)')
      }
    }
  },
  sugar: (g) => {
    for (const [x, lean] of [[20, -4], [27, -1], [34, 1], [41, 3], [47, 5]]) {
      box(g, x - 2.4, 14, 4.8, 44, 2.2, [164, 184, 86])
      for (let y = 22; y < 56; y += 9) box(g, x - 2.6, y, 5.2, 1.3, 0.6, 'rgba(96, 116, 50, 0.7)')
      leaf(g, x, 14, 10, -1.6 + lean * 0.12, [112, 156, 66])
    }
    box(g, 14, 36, 38, 5, 2, [196, 160, 100])
  },
  grapes: (g) => {
    leaf(g, 32, 14, 17, 3.5)
    leaf(g, 32, 14, 17, -0.4)
    line(g, [32, 8, 32, 16], 1.8, 'rgb(104, 82, 56)')
    for (const [x, y] of [[22, 22], [32, 21], [42, 22], [27, 30], [37, 30], [22, 31], [42, 31], [32, 38], [27, 46], [37, 46], [32, 53]]) ball(g, x, y, 5.6, [116, 62, 140])
  },
  tobacco_leaf: (g) => {
    // a hand of cured leaves, tied at the stalks and hanging down: broad, golden brown, each with its rib
    for (const [x, long, wide, c] of [[14, 40, 9, [150, 100, 46]], [50, 40, 9, [142, 94, 44]], [23, 46, 10, [184, 128, 56]], [41, 46, 10, [176, 120, 52]], [32, 50, 11, [206, 150, 66]]] as [number, number, number, Rgb][]) {
      const top = 14
      g.fillStyle = (() => {
        const run = g.createLinearGradient(x - wide, 0, x + wide, 0)
        run.addColorStop(0, tone(c, 1.24))
        run.addColorStop(1, tone(c, 0.74))
        return run
      })()
      g.beginPath()
      g.moveTo(32 + (x - 32) * 0.2, top)
      g.bezierCurveTo(x - wide * 1.3, top + long * 0.3, x - wide, top + long * 0.8, x, top + long)
      g.bezierCurveTo(x + wide, top + long * 0.8, x + wide * 1.3, top + long * 0.3, 32 + (x - 32) * 0.2, top)
      g.fill()
      line(g, [32 + (x - 32) * 0.2, top + 2, x, top + long - 3], 0.8, tone(c, 0.6, 0.8))
      for (let k = 1; k < 5; k++) {
        const y = top + (long * k) / 5.4
        const mx = 32 + (x - 32) * (0.2 + 0.8 * (k / 5.4))
        line(g, [mx, y, mx - wide * 0.6, y + 3], 0.5, tone(c, 0.62, 0.6))
        line(g, [mx, y, mx + wide * 0.6, y + 3], 0.5, tone(c, 0.62, 0.6))
      }
    }
    box(g, 24, 8, 16, 8, 3, [112, 78, 46])
    line(g, [23, 13, 41, 13], 1.6, 'rgb(226, 206, 160)')
  },
  indigo: (g) => {
    bend(g, 38, 56, 40, 36, 46, 14, 1.6, 'rgb(72, 96, 80)')
    for (const [x, y, turn] of [[40, 44, -0.5], [42, 34, -2.6], [43, 28, -0.4], [45, 20, -2.7], [46, 14, -1.3]] as [number, number, number][]) leaf(g, x, y, 13, turn, [60, 96, 190])
    ball(g, 22, 42, 14, [44, 68, 168])
  },
  spices: (g) => {
    oval(g, 32, 36, 23, 9, [126, 82, 50])
    for (const [x, c] of [[19, [198, 62, 44]], [32, [228, 180, 56]], [45, [124, 152, 64]]] as [number, Rgb][]) {
      oval(g, x, 32, 8.6, 6.4, c)
      speckle(g, x, 31, 7.6, 5, 30, tone(c, 0.6, 0.6), x, 0.5)
      speckle(g, x, 30, 6.6, 4, 16, tone(c, 1.5, 0.7), x + 5, 0.4)
    }
    g.save()
    g.beginPath()
    g.rect(0, 36, 64, 28)
    g.clip()
    oval(g, 32, 36, 23, 17, [146, 98, 60])
    g.restore()
  },
  raw_silk: (g) => {
    for (const [x, y, turn] of [[22, 44, 0.4], [40, 46, -0.2], [32, 32, 0.2]]) {
      oval(g, x, y, 12, 7.4, [246, 244, 236], turn)
      rounded(g, x - 12, y - 8, 24, 16, 0.6)
      for (const k of [-0.6, -0.2, 0.2, 0.6]) bend(g, x - 10, y + k * 5, x, y + k * 9 - 2, x + 10, y + k * 5, 0.35, 'rgba(176, 170, 150, 0.6)')
      gloss(g, x - 3, y - 3, 4, 1.4, 0.7)
    }
    bend(g, 40, 28, 54, 8, 58, 26, 0.9, 'rgb(236, 232, 220)')
  },
  blubber: (g) => {
    barrel(g, 32, 58, 40, 36)
    for (const [x, y] of [[24, 20], [34, 17], [42, 21], [30, 24]]) solid(g, [x - 6, y, x - 2, y - 5, x + 5, y - 3, x + 6, y + 3, x - 3, y + 4], [244, 214, 96], 0.2)
  },
  food: (g) => {
    oval(g, 32, 44, 26, 9, [150, 104, 62])
    oval(g, 24, 32, 17, 9.6, [206, 150, 78], -0.25)
    rounded(g, 6, 22, 36, 20, 0.8)
    speckle(g, 24, 32, 15, 8, 40, 'rgba(120, 76, 34, 0.4)', 811, 0.4)
    speckle(g, 24, 30, 13, 6, 16, 'rgba(255, 240, 200, 0.5)', 812, 0.36)
    for (const dx of [-7, 0, 7]) line(g, [22 + dx, 27 - dx * 0.2, 27 + dx, 33 - dx * 0.2], 1.3, 'rgba(244, 214, 156, 0.9)')
    oval(g, 43, 41, 13, 5, [168, 184, 196], -0.1)
    oval(g, 43, 43, 11, 2.6, 'rgba(240, 244, 248, 0.5)', -0.1)
    for (let k = 0; k < 5; k++) for (const dy of [-1.6, 1]) bend(g, 40 + k * 3, 40 + dy - 1.2, 41.6 + k * 3, 40 + dy, 40 + k * 3, 40 + dy + 1.2, 0.35, 'rgba(90, 106, 124, 0.6)')
    poly(g, [42, 36.6, 47, 33.6, 49, 37], 'rgb(132, 150, 166)')
    poly(g, [54, 39, 61, 34, 60, 45], 'rgb(140, 158, 172)')
    oval(g, 35, 40, 0.9, 0.9, 'rgb(30, 30, 40)')
  },
}
