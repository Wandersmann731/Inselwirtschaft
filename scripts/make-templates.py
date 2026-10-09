#!/usr/bin/env python3
"""Draws the template images for the graphics list into docs/vorlagen/ (plain Python, no libraries needed).

For every building, tile and icon of docs/grafiken.md there are two files:
  <name>_guide.png      magenta background with a grey block of the right size and shape:
                        use it as structure / depth reference when generating the picture.
  <name>_footprint.png  transparent, only the outline of the ground area with tile grid and the
                        corner markers: lay it over the finished picture to check size and anchor.

Run from the project root:  python3 scripts/make-templates.py
"""
import json
import struct
import zlib
from pathlib import Path

from asset_data import B, FARM_BUILDING_HEIGHT, FARM_IDS, PLOT_IDS, TILE_H, TILE_W

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "vorlagen"
buildings = {b["id"]: b for b in json.loads((ROOT / "src/data/buildings.json").read_text())}

MAGENTA = (255, 0, 255, 255)
CLEAR = (0, 0, 0, 0)
INK = (24, 24, 24, 255)
GRID = (110, 110, 110, 255)
LEFT_WALL = (150, 150, 150, 255)
RIGHT_WALL = (182, 182, 182, 255)
ROOF = (226, 226, 226, 255)
GROUND = (205, 205, 205, 255)
RED = (230, 30, 30, 255)
BLUE = (30, 90, 230, 255)
ROAD = (139, 107, 74, 255)


class Image:
    def __init__(self, width, height, background):
        self.w, self.h = width, height
        self.pixels = bytearray(bytes(background) * (width * height))

    def polygon(self, points, color):
        """Fills a convex or simple polygon (scanline, no anti-aliasing: crisp edges for guides)."""
        ys = [p[1] for p in points]
        top, bottom = max(0, int(min(ys))), min(self.h - 1, int(max(ys)))
        n = len(points)
        row_color = bytes(color)
        for y in range(top, bottom + 1):
            cy = y + 0.5
            xs = []
            for i in range(n):
                (x1, y1), (x2, y2) = points[i], points[(i + 1) % n]
                if (y1 <= cy < y2) or (y2 <= cy < y1):
                    xs.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            for k in range(0, len(xs) - 1, 2):
                x0, x1 = max(0, round(xs[k])), min(self.w, round(xs[k + 1]))
                if x1 > x0:
                    self.pixels[(y * self.w + x0) * 4 : (y * self.w + x1) * 4] = row_color * (x1 - x0)

    def line(self, a, b, color, width=3):
        (x1, y1), (x2, y2) = a, b
        dx, dy = x2 - x1, y2 - y1
        length = max((dx * dx + dy * dy) ** 0.5, 1e-9)
        nx, ny = -dy / length * width / 2, dx / length * width / 2
        self.polygon([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)], color)

    def outline(self, points, color, width=3):
        for i in range(len(points)):
            self.line(points[i], points[(i + 1) % len(points)], color, width)

    def square(self, center, size, color):
        x, y = center
        self.polygon([(x - size, y - size), (x + size, y - size), (x + size, y + size), (x - size, y + size)], color)

    def save(self, path):
        raw = b"".join(b"\x00" + bytes(self.pixels[y * self.w * 4 : (y + 1) * self.w * 4]) for y in range(self.h))

        def chunk(kind, data):
            body = kind + data
            return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(raw, 9))
        png += chunk(b"IEND", b"")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png)


def footprint_points(w, h, extra):
    """Corners of the ground area in a building canvas: top, right, bottom, left."""
    return [
        (h * TILE_W / 2, extra),
        ((w + h) * TILE_W / 2, extra + w * TILE_H / 2),
        (w * TILE_W / 2, extra + (w + h) * TILE_H / 2),
        (0, extra + h * TILE_H / 2),
    ]


def grid_lines(w, h, extra):
    """Lines that divide the ground area into tiles."""
    top, right, bottom, left = footprint_points(w, h, extra)

    def mix(a, b, t):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

    lines = []
    for i in range(1, w):  # lines parallel to the top-left edge
        t = i / w
        lines.append((mix(top, right, t), mix(left, bottom, t)))
    for j in range(1, h):  # lines parallel to the top-right edge
        t = j / h
        lines.append((mix(top, left, t), mix(right, bottom, t)))
    return lines


def building_guide(bid, w, h, height):
    cw, ch = (w + h) * TILE_W // 2, (w + h) * TILE_H // 2 + height
    top, right, bottom, left = footprint_points(w, h, height)
    lift = lambda p: (p[0], p[1] - height)  # noqa: E731
    img = Image(cw, ch, MAGENTA)
    # block: left wall, right wall, roof
    img.polygon([left, bottom, lift(bottom), lift(left)], LEFT_WALL)
    img.polygon([bottom, right, lift(right), lift(bottom)], RIGHT_WALL)
    img.polygon([lift(top), lift(right), lift(bottom), lift(left)], ROOF)
    for a, b in grid_lines(w, h, height):
        img.line(lift(a), lift(b), GRID, 2)
    img.outline([lift(top), lift(right), lift(bottom), lift(left)], INK, 3)
    img.line(left, bottom, INK, 3)
    img.line(bottom, right, INK, 3)
    img.line(lift(left), left, INK, 3)
    img.line(lift(bottom), bottom, INK, 3)
    img.line(lift(right), right, INK, 3)
    img.save(OUT / "buildings" / f"{bid}_guide.png")


def farm_guide(bid, w, h, height, rx=0.15, ry=0.15, rw=0.8, rh=0.8, box_lift=None):
    """Field building: flat ground (no block) and a small box for the farm building at the back corner."""
    cw, ch = (w + h) * TILE_W // 2, (w + h) * TILE_H // 2 + height
    top, right, bottom, left = footprint_points(w, h, height)

    def p(x, y, lift=0):  # tile coordinates inside the footprint -> canvas
        return ((x - y) * TILE_W / 2 + h * TILE_W / 2, (x + y) * TILE_H / 2 + height - lift)

    img = Image(cw, ch, MAGENTA)
    img.polygon([top, right, bottom, left], GROUND)
    for a, b in grid_lines(w, h, height):
        img.line(a, b, GRID, 2)
    img.outline([top, right, bottom, left], INK, 3)
    lift = FARM_BUILDING_HEIGHT - 10 if box_lift is None else box_lift
    a, b, c, d = p(rx, ry), p(rx + rw, ry), p(rx + rw, ry + rh), p(rx, ry + rh)
    img.polygon([d, c, p(rx + rw, ry + rh, lift), p(rx, ry + rh, lift)], LEFT_WALL)
    img.polygon([c, b, p(rx + rw, ry, lift), p(rx + rw, ry + rh, lift)], RIGHT_WALL)
    img.polygon([p(rx, ry, lift), p(rx + rw, ry, lift), p(rx + rw, ry + rh, lift), p(rx, ry + rh, lift)], ROOF)
    img.outline([p(rx, ry, lift), p(rx + rw, ry, lift), p(rx + rw, ry + rh, lift), p(rx, ry + rh, lift)], INK, 3)
    img.line(d, c, INK, 3)
    img.line(c, b, INK, 3)
    img.line(d, p(rx, ry + rh, lift), INK, 3)
    img.line(c, p(rx + rw, ry + rh, lift), INK, 3)
    img.line(b, p(rx + rw, ry, lift), INK, 3)
    img.save(OUT / "buildings" / f"{bid}_guide.png")


def building_footprint(bid, w, h, height):
    cw, ch = (w + h) * TILE_W // 2, (w + h) * TILE_H // 2 + height
    top, right, bottom, left = footprint_points(w, h, height)
    img = Image(cw, ch, CLEAR)
    img.outline([(0, 0), (cw - 1, 0), (cw - 1, ch - 1), (0, ch - 1)], BLUE, 2)
    img.polygon([top, right, bottom, left], (255, 255, 0, 70))
    for a, b in grid_lines(w, h, height):
        img.line(a, b, RED, 2)
    img.outline([top, right, bottom, left], RED, 4)
    for corner in (top, right, bottom, left):
        img.square((round(corner[0]), round(corner[1])), 6, BLUE)
    # the anchor: bottom corner of the ground area, which sits on the lower image edge
    img.square((round(bottom[0]), min(round(bottom[1]), ch - 8)), 9, RED)
    img.save(OUT / "buildings" / f"{bid}_footprint.png")


def tile_points():
    return [(TILE_W / 2, 0), (TILE_W, TILE_H / 2), (TILE_W / 2, TILE_H), (0, TILE_H / 2)]


def tile_guides():
    img = Image(TILE_W, TILE_H, MAGENTA)
    img.polygon(tile_points(), GROUND)
    img.outline(tile_points(), INK, 2)
    img.save(OUT / "terrain" / "tile_guide.png")
    fp = Image(TILE_W, TILE_H, CLEAR)
    fp.polygon(tile_points(), (255, 255, 0, 70))
    fp.outline(tile_points(), RED, 2)
    fp.save(OUT / "terrain" / "tile_footprint.png")


ARMS = {"n": (96, 16), "e": (96, 48), "s": (32, 48), "w": (32, 16)}
NAMES = ["none", "n", "e", "ne", "s", "ns", "es", "nes", "w", "nw", "ew", "new", "sw", "nsw", "esw", "nesw"]


def road_guides():
    for name in NAMES:
        img = Image(TILE_W, TILE_H, MAGENTA)
        img.polygon(tile_points(), GROUND)
        centre = (TILE_W / 2, TILE_H / 2)
        for letter in name if name != "none" else "":
            img.line(centre, ARMS[letter], ROAD, 16)
        img.square((round(centre[0]), round(centre[1])), 8, ROAD)
        img.outline(tile_points(), INK, 2)
        img.save(OUT / "roads" / f"road_{name}_guide.png")


def icon_guide(name, size, inset):
    img = Image(size, size, MAGENTA)
    img.polygon([(inset, inset), (size - inset, inset), (size - inset, size - inset), (inset, size - inset)], GROUND)
    img.outline([(inset, inset), (size - inset, inset), (size - inset, size - inset), (inset, size - inset)], INK, 2)
    img.save(OUT / "icons" / f"{name}.png")


README = """# Vorlagen für die Grafiken

Jede Datei in `docs/grafiken.md` hat hier eine Vorlage mit gleichem Namen. Es gibt zwei Arten:

- **`*_guide.png`**: magenta Hintergrund (#FF00FF), darauf ein grauer Block in genau der richtigen Größe und Perspektive.
  Als **Struktur- oder Tiefenreferenz** mitgeben (bei Stable Diffusion als ControlNet "Depth" oder "Canny", bei anderen Werkzeugen
  als Bildreferenz mit der Anweisung, die Form beizubehalten). Das Gebäude soll den Block füllen, ohne darüber hinauszuragen.
  Dunkle Linien zeigen die Kanten, dünne graue Linien die Kachelteilung auf dem Dach.
- **`*_footprint.png`**: durchsichtig, nur die Grundfläche. **Rot** ist die Grundfläche mit Kachelraster, **blau** der Bildrand und die
  vier Ecken, das **große rote Quadrat** ist der Anker (untere Ecke der Grundfläche). Lege sie in einem Bildeditor über das
  fertige Bild, um zu prüfen, ob das Gebäude auf der Grundfläche steht.

Ordner:

| Ordner | Inhalt |
|---|---|
| `buildings/` | Block und Grundfläche für jedes Gebäude, Haus, Stand und die Ruine, Größe wie in der Liste |
| `terrain/` | `tile_guide.png` und `tile_footprint.png` für alle Geländekacheln (128 x 64 px) |
| `roads/` | 16 Straßenvorlagen mit den Armen in die richtigen Richtungen (braun) |
| `icons/` | Rahmen für Symbole (128 x 128 px, App-Icon 512 x 512 px) |

Die Größen stimmen mit der Spalte "Größe (px)" der Grafikliste überein. Die Bilder werden mit
`python3 scripts/make-templates.py` neu erzeugt (kein zusätzliches Programm nötig).
"""


def main():
    count = 0
    # one template per building id of the graphics list (houses by tier, stands, public buildings, producers, infrastructure)
    for bid, (_description, height) in B.items():
        if bid.startswith("house_"):
            w, h = 2, 2
        else:
            w, h = buildings[bid]["size"]
        if bid in FARM_IDS:
            farm_guide(bid, w, h, height)
        elif bid.startswith("house_") or bid in PLOT_IDS:
            # houses stand on a small plot: the block covers only the middle of the ground, so neighbours do not overlap
            farm_guide(bid, w, h, height, 0.17, 0.17, 0.66, 0.66, box_lift=int(height * 0.62))
        else:
            building_guide(bid, w, h, height)
        building_footprint(bid, w, h, height)
        count += 2
    tile_guides()
    road_guides()
    icon_guide("icon_guide_128", 128, 12)
    icon_guide("app_icon_guide_512", 512, 0)
    count += 2 + len(NAMES) + 2
    (OUT / "README.md").write_text(README, encoding="utf-8")
    print(f"{count} Vorlagen in {OUT.relative_to(ROOT)} geschrieben")


main()
