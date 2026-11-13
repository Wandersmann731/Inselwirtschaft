// The symbols of what the workshops make: flour and salt in sacks, cloth and leather, tools and bricks, drink,
// and the fine things of the rich.
import { barrel, bend, box, gloss, line, oval, poly, rock, rounded, sack, solid, speckle, tone, type Ctx, type Draw, type Rgb } from './kit'

/** A bar of metal as it comes from the mould: its top narrower than its foot, the top face bright, the front in shade. */
function ingot(g: Ctx, x: number, y: number, c: Rgb): void {
  poly(g, [x - 13, y + 6, x - 10, y - 1, x + 10, y - 1, x + 13, y + 6], tone(c, 0.78))
  poly(g, [x + 10, y - 1, x + 13, y + 6, x + 9, y + 6, x + 7, y - 1], tone(c, 0.56))
  poly(g, [x - 10, y - 1, x - 7, y - 6, x + 7, y - 6, x + 10, y - 1], tone(c, 1.3))
  poly(g, [x - 7.4, y - 2, x - 5.4, y - 5, x + 5.4, y - 5, x + 7.4, y - 2], tone(c, 1.06))
  line(g, [x - 10, y - 1, x + 10, y - 1], 0.5, 'rgba(255, 255, 255, 0.7)')
  line(g, [x - 7, y - 6, x + 7, y - 6], 0.4, 'rgba(255, 255, 255, 0.5)')
  line(g, [x - 9, y + 2.4, x + 2, y + 2.4], 0.5, 'rgba(255, 255, 255, 0.2)')
  speckle(g, x, y + 2, 12, 4, 14, 'rgba(30, 30, 40, 0.3)', x + y, 0.36)
}

/** Folded cloth: three folds lying on each other, their layers showing at one end, a sheen running over each. */
function folded(g: Ctx, c: Rgb, shine: number): void {
  for (const [y, k] of [[44, 0.8], [35, 0.92], [26, 1.06]]) {
    const fold = c.map((v) => v * k) as Rgb
    box(g, 9, y, 46, 11, 5.4, fold)
    rounded(g, 9, y, 46, 11, 0.8)
    for (const dy of [3.2, 5.6, 8]) line(g, [46, y + dy, 53.6, y + dy], 0.5, tone(fold, 0.5, 0.8))
    bend(g, 13, y + 4.4, 28, y + 1.6, 45, y + 4.2, 1.5, `rgba(255, 255, 255, ${shine})`)
    bend(g, 13, y + 8.4, 30, y + 9.6, 45, y + 8, 0.5, tone(fold, 0.6, 0.6))
  }
}

export const MADE: Record<string, Draw> = {
  flour: (g) => {
    sack(g, 32, 58, 44, 36)
    oval(g, 32, 23, 13.6, 5, [150, 126, 90])
    oval(g, 32, 20, 12, 6.4, [250, 248, 242])
    oval(g, 30, 17, 6, 3.4, 'rgb(255, 255, 255)')
  },
  salt: (g) => {
    sack(g, 32, 58, 44, 34, [176, 160, 132])
    oval(g, 32, 25, 13.6, 5, [132, 116, 92])
    for (const [x, y, r] of [[26, 21, 5], [37, 21, 5], [32, 15, 5.4]]) rock(g, x, y, r, [240, 244, 248])
    line(g, [18, 34, 26, 38, 38, 38, 46, 34], 1.4, 'rgb(112, 92, 66)')
  },
  bricks: (g) => {
    const brick: Rgb = [176, 74, 54]
    for (const [x, y] of [[8, 42], [28, 42], [18, 30], [38, 30], [28, 18]]) {
      box(g, x, y, 19, 11, 1.6, brick)
      box(g, x + 1.4, y + 1.2, 16, 2.4, 1, 'rgba(255, 190, 160, 0.3)')
      box(g, x + 1, y + 8.6, 17, 1.8, 0.8, 'rgba(60, 20, 20, 0.3)')
      speckle(g, x + 9.5, y + 5.5, 9, 5, 16, 'rgba(90, 30, 24, 0.45)', x * 5 + y, 0.4)
      speckle(g, x + 9.5, y + 5.5, 9, 5, 8, 'rgba(255, 200, 170, 0.5)', x * 3 + y, 0.36)
    }
    box(g, 48, 42, 9, 11, 1.6, [150, 60, 46])
  },
  tools: (g) => {
    line(g, [14, 52, 44, 18], 4.4, 'rgb(142, 104, 66)')
    solid(g, [36, 10, 50, 8, 56, 20, 52, 26, 40, 22], [124, 128, 138])
    line(g, [50, 52, 30, 30], 4, 'rgb(128, 92, 58)')
    solid(g, [8, 26, 34, 34, 30, 40, 6, 32], [176, 180, 190])
    for (let k = 0; k < 6; k++) poly(g, [8 + k * 4, 31.6 + k * 1.3, 10 + k * 4, 35.4 + k * 1.3, 12 + k * 4, 32.8 + k * 1.3], 'rgb(176, 180, 190)')
  },
  cloth: (g) => {
    // a bolt of cloth: the roll, its end with the layers showing, and a length of it hanging loose
    solid(g, [34, 44, 56, 44, 58, 58, 40, 56], [226, 214, 190], 0.2)
    box(g, 16, 18, 40, 28, 4, [236, 226, 204])
    oval(g, 16, 32, 7, 14, [218, 206, 182])
    for (const r of [0.72, 0.46, 0.2]) oval(g, 16, 32, 7 * r, 14 * r, tone([170, 154, 128], 1, 0.6))
    for (const y of [24, 31, 38]) line(g, [26, y, 52, y], 0.7, 'rgba(170, 154, 128, 0.5)')
    gloss(g, 38, 21.4, 12, 1.4, 0.5, 0)
  },
  silk: (g) => folded(g, [124, 66, 170], 0.6),
  leather: (g) => folded(g, [112, 68, 42], 0.18),
  iron: (g) => {
    ingot(g, 22, 46, [150, 154, 164])
    ingot(g, 44, 46, [138, 142, 152])
    ingot(g, 33, 30, [162, 166, 176])
  },
  marble: (g) => {
    solid(g, [10, 22, 32, 12, 54, 22, 54, 46, 32, 56, 10, 46], [232, 232, 230], 0.2)
    poly(g, [10, 22, 32, 12, 54, 22, 32, 32], 'rgb(250, 250, 248)')
    poly(g, [32, 32, 54, 22, 54, 46, 32, 56], 'rgba(120, 126, 144, 0.3)')
    line(g, [16, 30, 24, 40, 22, 50], 0.7, 'rgba(120, 124, 140, 0.5)')
    line(g, [40, 34, 46, 44], 0.7, 'rgba(100, 104, 120, 0.5)')
  },
  alcohol: (g) => {
    barrel(g, 46, 56, 24, 22)
    oval(g, 20, 42, 13, 14, [140, 78, 48])
    box(g, 16, 14, 8, 16, 2, [140, 78, 48])
    box(g, 15, 11, 10, 5, 2, [176, 140, 96])
    gloss(g, 14, 36, 2.4, 6, 0.4, 0.2)
  },
  wine: (g) => {
    box(g, 12, 26, 14, 30, 3, [58, 110, 62])
    box(g, 16.4, 8, 5.2, 20, 2, [58, 110, 62])
    box(g, 12, 38, 14, 10, 0, 'rgba(236, 226, 196, 0.9)')
    gloss(g, 15, 32, 1.2, 9, 0.5, 0)
    g.save()
    g.beginPath()
    g.rect(30, 30, 30, 14)
    g.clip()
    oval(g, 44, 30, 10, 12, [140, 34, 52])
    g.restore()
    oval(g, 44, 30, 10, 2.4, 'rgb(170, 52, 70)')
    g.save()
    g.beginPath()
    g.rect(30, 16, 30, 14)
    g.clip()
    oval(g, 44, 30, 10, 13, 'rgba(226, 236, 240, 0.5)')
    g.restore()
    box(g, 43, 42, 2, 12, 1, 'rgba(226, 236, 240, 0.8)')
    oval(g, 44, 55, 7, 2, 'rgba(226, 236, 240, 0.8)')
  },
  tobacco: (g) => {
    for (const y of [22, 31]) {
      box(g, 6, y, 40, 8, 4, [124, 80, 46])
      box(g, 14, y, 4, 8, 0, 'rgba(214, 170, 80, 0.9)')
    }
    oval(g, 46, 46, 9, 8, [206, 196, 180])
    oval(g, 46, 42, 7, 3, 'rgb(70, 56, 46)')
    bend(g, 38, 48, 24, 52, 12, 44, 3.4, 'rgb(142, 96, 58)')
    bend(g, 46, 36, 42, 28, 48, 22, 1.2, 'rgba(220, 220, 226, 0.7)')
  },
  dye: (g) => {
    for (const [x, y, c] of [[16, 34, [52, 96, 190]], [34, 44, [64, 150, 80]], [50, 32, [190, 56, 58]]] as [number, number, Rgb][]) {
      oval(g, x, y + 2, 11.4, 9, [132, 86, 56])
      oval(g, x, y - 2, 10.4, 5, [104, 66, 44])
      oval(g, x, y - 1.6, 8.4, 3.6, c)
    }
  },
  lamp_oil: (g) => {
    oval(g, 30, 44, 18, 10, [222, 170, 54])
    solid(g, [44, 40, 60, 30, 61, 34, 46, 48], [222, 170, 54])
    bend(g, 14, 40, 4, 36, 12, 50, 2.6, 'rgb(196, 146, 44)')
    box(g, 22, 52, 16, 5, 2, [196, 146, 44])
    oval(g, 30, 34, 6, 3, [196, 146, 44])
    box(g, 28.6, 26, 2.8, 6, 1, [196, 146, 44])
    g.fillStyle = 'rgb(250, 150, 50)'
    g.beginPath()
    g.moveTo(30, 8)
    g.quadraticCurveTo(38, 20, 30, 26)
    g.quadraticCurveTo(22, 20, 30, 8)
    g.fill()
    oval(g, 30, 21, 2.4, 4, 'rgb(255, 232, 150)')
    gloss(g, 24, 40, 6, 2, 0.5)
  },
  jewelry: (g) => {
    g.strokeStyle = 'rgb(222, 170, 54)'
    g.lineWidth = 2.6
    g.setLineDash([3, 2])
    g.beginPath()
    g.moveTo(10, 8)
    g.quadraticCurveTo(12, 40, 32, 40)
    g.quadraticCurveTo(52, 40, 54, 8)
    g.stroke()
    g.setLineDash([])
    solid(g, [32, 34, 43, 45, 32, 60, 21, 45], [222, 170, 54])
    solid(g, [32, 39, 39, 45, 32, 54, 25, 45], [196, 40, 66], 0.4)
    gloss(g, 29, 43, 1.6, 3, 0.6, 0.4)
  },
}
