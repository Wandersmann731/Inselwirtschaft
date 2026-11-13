// Round solids: towers, tubs, columns, and cones (spires, the cap of a mill, heaps and haystacks). Lit like
// everything else: light on their left, running into a cool shade on their right.
import { DUSK, HW, px, surface, type Ctx, type Face, type P3, type Scene, type Surface } from './kit'
import { material, type Mat } from './materials'

/** Shades something round between x = cx - a and cx + a. */
function roundShade(g: Ctx, cx: number, a: number, y: number, h: number): void {
  const shade = g.createLinearGradient(cx - a, 0, cx + a, 0)
  shade.addColorStop(0, 'rgba(255, 230, 186, 0.16)')
  shade.addColorStop(0.3, 'rgba(255, 230, 186, 0)')
  shade.addColorStop(0.55, `rgba(${DUSK}, 0.12)`)
  shade.addColorStop(1, `rgba(${DUSK}, 0.52)`)
  g.fillStyle = shade
  g.fillRect(cx - a - 1, y, 2 * a + 2, h)
}

/** Fills what is clipped with a material and its tint. */
function fill(g: Ctx, s: Surface, x: number, y: number, w: number, h: number): void {
  g.fillStyle = material(s.mat)
  g.fillRect(x, y, w, h)
  if (s.tint) {
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = s.tint
    g.fillRect(x, y, w, h)
    g.globalCompositeOperation = 'source-over'
  }
}

/** A round tower or tub around (u, v) with radius `r` tiles; `taper` is how much narrower its top is. */
export function cylinder(scene: Scene, u: number, v: number, r: number, z0: number, z1: number, side: Surface | Mat, top: Face = null, taper = 1): void {
  const pts: P3[] = []
  for (let k = 0; k < 8; k++) {
    const turn = (k / 8) * Math.PI * 2
    pts.push([u + Math.cos(turn) * r, v + Math.sin(turn) * r, z0], [u + Math.cos(turn) * r * taper, v + Math.sin(turn) * r * taper, z1])
  }
  scene.item(pts, (g) => {
    const [cx, cy] = px(u, v, z0)
    const [, ty] = px(u, v, z1)
    const a0 = r * HW * Math.SQRT2
    const a1 = a0 * taper
    g.save()
    g.beginPath()
    g.moveTo(cx - a1, ty)
    g.lineTo(cx - a0, cy)
    g.ellipse(cx, cy, a0, a0 / 2, 0, Math.PI, 0, true)
    g.lineTo(cx + a1, ty)
    g.ellipse(cx, ty, a1, a1 / 2, 0, 0, Math.PI, false)
    g.closePath()
    g.clip()
    const s = surface(side)
    fill(g, s, cx - a0 - 1, ty - a1, 2 * a0 + 2, cy - ty + a0 + a1)
    g.translate(cx - a0, ty)
    s.detail?.(g, 2 * a0, cy - ty)
    g.translate(-(cx - a0), -ty)
    roundShade(g, cx, a0, ty - a1, cy - ty + a0 + a1)
    g.restore()
    if (!top) return
    g.save()
    g.beginPath()
    g.ellipse(cx, ty, a1, a1 / 2, 0, 0, Math.PI * 2)
    g.clip()
    fill(g, surface(top), cx - a1, ty - a1, 2 * a1, 2 * a1)
    // the rim throws a little shade into it
    g.fillStyle = `rgba(${DUSK}, 0.16)`
    g.fillRect(cx - a1, ty - a1, 2 * a1, a1 * 0.7)
    g.restore()
  })
}

/** A cone on a round base: a spire, the cap of a mill, a haystack. */
export function cone(scene: Scene, u: number, v: number, r: number, z0: number, rise: number, side: Surface | Mat): void {
  const pts: P3[] = [[u, v, z0 + rise]]
  for (let k = 0; k < 8; k++) pts.push([u + Math.cos((k / 8) * Math.PI * 2) * r, v + Math.sin((k / 8) * Math.PI * 2) * r, z0])
  scene.item(pts, (g) => {
    const [cx, cy] = px(u, v, z0)
    const a = r * HW * Math.SQRT2
    g.save()
    g.beginPath()
    g.moveTo(cx, cy - rise)
    g.lineTo(cx - a, cy)
    g.ellipse(cx, cy, a, a / 2, 0, Math.PI, 0, true)
    g.closePath()
    g.clip()
    fill(g, surface(side), cx - a, cy - rise, 2 * a, rise + a)
    roundShade(g, cx, a, cy - rise, rise + a)
    g.restore()
  })
}
