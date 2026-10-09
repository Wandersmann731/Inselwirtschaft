#!/usr/bin/env python3
"""Writes docs/grafiken.md and docs/grafiken.csv: the list of all graphics the game needs, with prompts.

Sizes come from src/data/*.json, so the list stays in step with the game data.
Run from the project root:  python3 scripts/make-asset-list.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
buildings = {b["id"]: b for b in json.loads((ROOT / "src/data/buildings.json").read_text())}
goods = json.loads((ROOT / "src/data/goods.json").read_text())
tiers = json.loads((ROOT / "src/data/tiers.json").read_text())

BASE = (
    "isometric 2D video game asset, true 2:1 dimetric view (looking down at 30 degrees), "
    "hand-painted cel-shaded look with clean dark-brown outlines and soft saturated colours, "
    "light coming from the top left, no cast shadow on the ground, one single object centred, "
    "plain flat magenta background (#FF00FF) with nothing else in the picture, no text, no watermark, "
    "no frame, setting: European colonial trading settlement around the year 1500"
)
NEGATIVE = (
    "text, letters, logo, watermark, frame, border, multiple objects, people in the foreground, "
    "perspective distortion, fisheye, photo realism, 3D render, cast shadow, gradient background, "
    "cropped object, blurry"
)

from asset_data import B, TILE_H, TILE_W  # noqa: E402

# --- goods icons -----------------------------------------------------------------------------------
G = {
    "tools": "pile of hammer, saw and pickaxe",
    "wood": "stack of cut logs",
    "bricks": "stack of red clay bricks",
    "marble": "block of white marble with grey veins",
    "stone": "heap of rough grey stone blocks",
    "ore": "chunk of dark iron ore with reddish streaks",
    "iron": "three iron ingots",
    "wool": "bundle of fluffy white wool",
    "cotton": "branch with white cotton bolls",
    "cloth": "folded roll of plain woven cloth",
    "leather": "folded brown leather hide",
    "hides": "raw animal hide, stretched",
    "grain": "sheaf of golden wheat ears",
    "flour": "open sack of white flour",
    "food": "loaf of bread and a fish on a board",
    "potatoes": "few brown potatoes",
    "hops": "cluster of green hop cones",
    "sugar": "bundle of sugar cane stalks",
    "alcohol": "clay bottle and a small keg of spirits",
    "salt": "small white pile of salt in a sack",
    "tobacco_leaf": "bundle of dried brown tobacco leaves",
    "tobacco": "rolled cigars and a clay pipe",
    "spices": "wooden bowl with red, yellow and green spices",
    "raw_silk": "white silk cocoons and a thread",
    "indigo": "blue indigo dye lump and a blue-leaved plant",
    "silk": "folded bolt of shiny purple silk",
    "blubber": "wooden barrel of whale blubber, yellowish",
    "lamp_oil": "brass oil lamp with a flame",
    "grapes": "bunch of purple grapes with leaves",
    "wine": "dark green wine bottle with a glass of red wine",
    "gold": "pile of gold nuggets",
    "gems": "three cut gemstones, red, blue and green",
    "jewelry": "gold necklace with a big red gem",
}
GOOD_NAMES = {g["id"]: g["name"] for g in goods}

TIER_ICONS = {
    "pioneers": "simple settler figure with a straw hat and a bundle",
    "settlers": "farmer figure with a hat and a hoe",
    "citizens": "townsman in a doublet and cap",
    "merchants": "merchant in a fine coat with a money pouch",
    "aristocrats": "noble in a velvet coat and plumed hat",
}

UI = {
    "cat_housing": ("Kategorie Wohnen", "small house with a heart-shaped window"),
    "cat_public": ("Kategorie Öffentlich", "chapel with bell tower"),
    "cat_production": ("Kategorie Produktion", "gear wheel with a hammer"),
    "cat_infrastructure": ("Kategorie Infrastruktur", "paved road with an anchor"),
    "cat_demolish": ("Abriss", "pickaxe breaking a wall"),
    "cat_statistics": ("Statistik", "scroll with a bar chart"),
    "cat_worldmap": ("Weltkarte", "old compass rose over a map"),
    "cat_trade": ("Handel", "sailing ship with a coin"),
    "status_producing": ("Status produziert", "green gear wheel"),
    "status_waiting": ("Status wartet", "yellow hourglass"),
    "status_full": ("Status Lager voll", "orange full crate"),
    "status_noroad": ("Status keine Straße", "red broken road sign"),
    "status_nohub": ("Status außer Reichweite", "red house with a cross"),
    "status_inactive": ("Status stillgelegt", "grey pause symbol"),
    "coin": ("Münze", "shiny gold coin with an anchor emblem"),
    "population": ("Einwohner", "two simple human silhouettes"),
    "balance_up": ("Bilanz plus", "green arrow up with a coin"),
    "balance_down": ("Bilanz minus", "red arrow down with a coin"),
    "warning": ("Warnung", "yellow triangle with an exclamation mark, no text letters other than the exclamation mark"),
}

FOOT = {"1x1": (1, 1)}


def canvas(size, extra):
    w, h = size
    return (w + h) * TILE_W // 2, (w + h) * TILE_H // 2 + extra


def full_prompt(descriptor, kind="building"):
    if kind == "icon":
        return (
            f"{descriptor}, game UI icon, centred, simple bold shapes, thick dark-brown outline, saturated flat colours, "
            "plain flat magenta background (#FF00FF), no text, no frame, no watermark, hand-painted cel-shaded"
        )
    return f"{descriptor}. {BASE}"


rows = []  # id, group, file, canvas, footprint, descriptor

# buildings (+ tier variants for houses)
house_tiers = ["house_pioneers", "house_settlers", "house_citizens", "house_merchants", "house_aristocrats", "house_ruin"]
for bid in house_tiers:
    w, h = (2, 2)
    cw, ch = canvas((w, h), B[bid][1])
    rows.append((bid, "Wohnhäuser", f"buildings/{bid}.png", f"{cw}x{ch}", "2x2", B[bid][0]))
order = [
    "food_salt_stand", "cloth_stand", "drink_stand", "tobacco_spice_stand", "lamp_oil_stand", "jewelry_stand",
    "chapel", "tavern", "church", "bathhouse", "theater", "cathedral",
]
for bid in order:
    b = buildings[bid]
    cw, ch = canvas(tuple(b["size"]), B[bid][1])
    group = "Marktstände" if b["size"] == [1, 1] else "Öffentliche Gebäude"
    rows.append((bid, group, f"buildings/{bid}.png", f"{cw}x{ch}", "x".join(map(str, b["size"])), B[bid][0]))
for bid, b in buildings.items():
    if b["category"] == "production":
        cw, ch = canvas(tuple(b["size"]), B[bid][1])
        rows.append((bid, "Produktionsbetriebe", f"buildings/{bid}.png", f"{cw}x{ch}", "x".join(map(str, b["size"])), B[bid][0]))
for bid in ["kontor", "market_house", "shipyard"]:
    b = buildings[bid]
    cw, ch = canvas(tuple(b["size"]), B[bid][1])
    rows.append((bid, "Infrastruktur", f"buildings/{bid}.png", f"{cw}x{ch}", "x".join(map(str, b["size"])), B[bid][0]))

# terrain
terrain = [
    ("water", 4, "calm blue sea water surface with gentle light ripples, tileable", "Wasser (4 Animationsbilder)"),
    ("beach", 3, "pale sand with a few pebbles and shells, tileable", "Strand"),
    ("grass", 4, "lush green meadow with small flowers and tufts, tileable", "Gras"),
    ("forest", 4, "dense green forest floor with 3 to 5 round-crowned trees, tileable, trees stay inside the tile diamond", "Wald"),
    ("mountain", 4, "grey rocky mountain tile with jagged cliffs and a few snow-free peaks, tileable", "Berg"),
]
terrain_rows = []
for tid, n, desc, label in terrain:
    for i in range(1, n + 1):
        terrain_rows.append((f"{tid}_{i}", "Gelände", f"terrain/{tid}_{i}.png", f"{TILE_W}x{TILE_H}", "1x1 Kachel", desc + f", variant {i} of {n}"))
roads = []
NAMES = ["none", "n", "e", "ne", "s", "ns", "es", "nes", "w", "nw", "ew", "new", "sw", "nsw", "esw", "nesw"]
for mask, name in enumerate(NAMES):
    desc = "cobblestone path tile with brown packed earth edges"
    if name == "none":
        desc += ", a small isolated patch of path in the middle, no connections"
    else:
        arms = {"n": "up-right (north-east on screen)", "e": "down-right (south-east on screen)", "s": "down-left (south-west on screen)", "w": "up-left (north-west on screen)"}
        desc += ", path arms leave the tile centre towards " + ", ".join(arms[c] for c in name)
    roads.append((f"road_{name}", "Straßen", f"roads/road_{name}.png", f"{TILE_W}x{TILE_H}", "1x1 Kachel", desc))

goods_rows = [
    (f"good_{gid}", "Warensymbole", f"icons/goods/{gid}.png", "128x128", "-", f"{G[gid]} ({GOOD_NAMES[gid]})")
    for gid in G
]
tier_rows = [(f"tier_{tid}", "Stufensymbole", f"icons/tiers/{tid}.png", "128x128", "-", d) for tid, d in TIER_ICONS.items()]
ui_rows = [(uid, "Oberfläche", f"icons/ui/{uid}.png", "128x128", "-", f"{name}: {d}") for uid, (name, d) in UI.items()]

other = [
    ("ship_top", "Schiffe", "ships/ship_top.png", "128x128", "-", "wooden three-masted trading ship seen from straight above (top-down), bow pointing up, white square sails, simple shapes"),
    ("ship_iso_s", "Schiffe", "ships/ship_iso_s.png", "256x256", "-", "wooden trading ship in isometric view, bow pointing to the bottom-right (south-east), white square sails with a red cross-less pennant"),
    ("ship_iso_e", "Schiffe", "ships/ship_iso_e.png", "256x256", "-", "same ship, bow pointing to the right (east)"),
    ("ship_iso_n", "Schiffe", "ships/ship_iso_n.png", "256x256", "-", "same ship, bow pointing to the top-right (north-east)"),
    ("ship_iso_nw", "Schiffe", "ships/ship_iso_nw.png", "256x256", "-", "same ship, bow pointing to the top-left (north-west)"),
    ("ship_iso_sw", "Schiffe", "ships/ship_iso_sw.png", "256x256", "-", "same ship, bow pointing to the bottom-left (south-west)"),
]
effects = []
for i in range(1, 7):
    effects.append((f"smoke_{i}", "Effekte", f"effects/smoke_{i}.png", "128x192", "-", f"puff of grey chimney smoke rising, animation frame {i} of 6, soft cartoon smoke, loops seamlessly"))
effects.append(("scaffold_2x2", "Effekte", "effects/scaffold_2x2.png", "256x224", "2x2", "wooden construction scaffold around an empty building plot with planks and a rope"))
effects.append(("island_icon", "Effekte", "effects/island_icon.png", "256x256", "-", "small top-down island with a palm tree and a tiny harbour, for a map marker"))

APP = [
    ("icon_512", "App", "app/icon-512.png", "512x512", "-", "app icon: a small green island with a red-roofed house and a sailing ship, bold simple shapes, centred, fills the whole square, no transparent corners"),
    ("icon_maskable_512", "App", "app/icon-maskable-512.png", "512x512", "-", "same motif but smaller, kept inside the central 80 percent, island-green background filling the whole square"),
    ("icon_192", "App", "app/icon-192.png", "192x192", "-", "same as icon_512, downscaled"),
    ("splash", "App", "app/splash.png", "1920x1080", "-", "landscape key art of a harbour town on an island with a trading ship, warm morning light, no text, leave the top third calm for a title"),
    ("logo", "App", "app/logo.png", "1024x256", "-", "title logo reading Inselwirtschaft in a bold carved wooden sign style with a small anchor, transparent background, the only picture that may contain text"),
]

groups = [rows, terrain_rows, roads, goods_rows, tier_rows, ui_rows, other, effects, APP]

# --- CSV ------------------------------------------------------------------------------------------
out_dir = ROOT / "docs"
with (out_dir / "grafiken.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["id", "gruppe", "dateiname", "groesse_px", "grundflaeche", "beschreibung_en", "prompt_komplett", "negativ_prompt"])
    for group in groups:
        for rid, g, fn, size, foot, desc in group:
            kind = "icon" if fn.startswith("icons/") else "building"
            if fn.startswith("app/") and rid in ("icon_512", "icon_maskable_512", "icon_192", "splash", "logo"):
                prompt = f"{desc}, polished game key art, hand-painted cel-shaded style"
            else:
                prompt = full_prompt(desc, kind)
            w.writerow([rid, g, fn, size, foot, desc, prompt, NEGATIVE])

# --- Markdown -------------------------------------------------------------------------------------
total = sum(len(g) for g in groups)
md = []
md.append("# Grafikliste für Inselwirtschaft\n")
md.append(f"Alle Grafiken, die das Spiel für Phase 7 braucht: **{total} Dateien**. **Stand:** Alle Dateien sind bereits mit dem ImageGen-Werkzeug erzeugt und liegen fertig zugeschnitten in `public/art/` (erstellt mit `scripts/assets`, siehe dort die `README.md`). Der Einbau ins Spiel (Sprite-Atlas statt Platzhalterformen) ist Teil von Phase 7. Die Tabellen entstehen aus den Spieldaten (`scripts/make-asset-list.py`), die Datei `docs/grafiken.csv` enthält dieselbe Liste mit fertigen Prompts je Zeile.\n")
md.append("## 1. Wichtig vorab\n")
md.append("""- **Keine Anno-Bezüge:** In keinem Prompt Namen, Bilder oder Stile von Anno nennen oder hochladen. Alles muss eigenes Design sein.
- **Perspektive:** Das Spiel nutzt eine isometrische Karte mit Rautenkacheln im Verhältnis 2:1. Alle Gebäude, Gelände und Straßen müssen genau in diese Raute passen. Das ist für KI-Bildgeneratoren schwer. Deshalb zuerst ein Stilbild festlegen (siehe Abschnitt 4) und danach die Raute als Vorlage mitgeben.
- **Maßstab:** Das Spiel zeigt 64 x 32 px je Kachel. Die Grafiken sollen in doppelter Auflösung (128 x 64 px je Kachel) kommen, damit sie auf Handys mit hoher Pixeldichte scharf bleiben. Das Spiel skaliert sie herunter.
- **Dateiformat:** PNG mit Transparenz (RGBA, 8 Bit je Kanal, sRGB). Keine JPG, keine WebP, keine Animations-GIFs. Animationen kommen als einzelne nummerierte PNGs.
- **Hintergrund:** Die meisten KI-Werkzeuge liefern keine echte Transparenz. Lasse deshalb auf einfarbigem **Magenta (#FF00FF)** erzeugen (kommt im Spiel nirgends vor). Das Magenta wird später per Skript entfernt und die Bilder werden in einen Atlas sortiert. Wenn dein Werkzeug echte Transparenz kann, ist das auch gut.
- **Licht:** Immer von links oben. Keine geworfenen Schatten auf den Boden, nur weiche Eigenschatten am Gebäude. Dann kann ich Gebäude spiegeln, wenn sie gedreht werden.
- **Keine Schrift in den Bildern** (außer im Logo).
""")
md.append("## 2. Größen und Anker (Gebäude)\n")
md.append(f"""Eine Kachel ist im doppelten Maßstab **{TILE_W} x {TILE_H} px**. Ein Gebäude mit `w x h` Kacheln steht auf einer Raute, die `(w + h) x 64` px breit und `(w + h) x 32` px hoch ist.

- **Bildbreite** = `(w + h) x 64` px.
- **Bildhöhe** = `(w + h) x 32` px (Raute) plus die Höhe des Gebäudes über dem Boden (steht in der Tabelle).
- Die Grundfläche liegt **unten im Bild**. Bei quadratischen Gebäuden ist sie eine Raute, bei 3x4, 7x6 und Ähnlichem ein Parallelogramm. Mit `E` = Höhe über dem Boden (Tabelle) hat sie diese Ecken im Bild: oben `(h x 64, E)`, rechts `((w + h) x 64, E + w x 32)`, unten `(w x 64, E + (w + h) x 32)`, links `(0, E + h x 32)`. Ihre untere Spitze liegt immer auf der unteren Bildkante, aber nur bei quadratischen Gebäuden in der Mitte.
- Wände beginnen an den Kanten der Grundfläche. Dächer dürfen nach oben ragen, aber nie über die Bildränder.
- **Fertige Vorlagen** für jede Datei liegen in `docs/vorlagen/` (siehe dort die `README.md`).
- Nicht quadratische Gebäude (3x4, 7x6, 6x5, 6x7, 8x6) liefere nur in **einer** Ausrichtung. Gedrehte Gebäude entstehen im Spiel durch Spiegeln.
""")

def table(title, items, note=None):
    md.append(f"### {title}\n")
    if note:
        md.append(note + "\n")
    md.append("| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |")
    md.append("|---|---|---|---|---|")
    for rid, g, fn, size, foot, desc in items:
        md.append(f"| `{rid}` | `{fn}` | {size} | {foot} | {desc} |")
    md.append("")

md.append("## 3. Die Liste\n")
group_names = []
for group in groups[:1]:
    pass
by_group = {}
for group in groups:
    for item in group:
        by_group.setdefault(item[1], []).append(item)
notes = {
    "Gelände": "Jede Kachel ist eine **nahtlose Raute** (128 x 64 px), außerhalb der Raute transparent. Die Varianten sollen sich nur im Detail unterscheiden, damit das Muster nicht auffällt. Wasser besteht aus 4 Bildern einer Schleife (Wellen). Wald: Bäume bleiben innerhalb der Raute.",
    "Straßen": "16 Kacheln für alle Verbindungen. Die Namen zeigen die Richtungen, in die die Straße weitergeht: n = oben rechts, e = unten rechts, s = unten links, w = oben links (auf dem Bildschirm). Die Arme enden genau in der Mitte der Rautenkante, damit sie an Nachbarkacheln anschließen.",
    "Wohnhäuser": "Alle Wohnhäuser stehen auf 2x2 Kacheln. Die fünf Stufen sollen sich klar in Größe und Pracht unterscheiden, so dass man sie am Handy auf einen Blick erkennt. Dazu kommt die Ruine.",
    "Marktstände": "Stände sind 1x1 Kachel groß und klein. Sie sollen sich durch die Ware und die Farbe der Markise deutlich unterscheiden.",
    "Produktionsbetriebe": "Alle Betriebe stehen auf 2x2 Kacheln. Felder und Plantagen sollen den Boden der Raute **ausfüllen**, damit sie wie ein bepflanztes Feld mit kleinem Gebäude wirken. Steinbruch, Minen und Goldmine stehen auf Bergkacheln. Fischerei und Walfänger stehen an der Küste.",
    "Warensymbole": "Alle Symbole 128 x 128 px, später im Spiel etwa 32 bis 48 px groß: einfache, kräftige Formen, die auch klein erkennbar sind.",
    "Schiffe": "Das Schiff wird derzeit nur auf der Weltkarte gezeigt (von oben). Die isometrischen Ansichten sind für später gedacht und können zuerst weggelassen werden. Weitere Richtungen entstehen durch Spiegeln.",
    "Effekte": "Rauch gehört zu Gebäuden mit Schornstein (Bäckerei, Erzschmelze, Brennerei, Trankocherei, Werkzeugmacher). Das Gerüst wird beim Bauen gezeigt.",
    "App": "Für die Installation als App auf dem Startbildschirm und den Startbildschirm des Spiels.",
}
order_groups = ["Gelände", "Straßen", "Wohnhäuser", "Marktstände", "Öffentliche Gebäude", "Produktionsbetriebe", "Infrastruktur", "Warensymbole", "Stufensymbole", "Oberfläche", "Schiffe", "Effekte", "App"]
for name in order_groups:
    table(name, by_group[name], notes.get(name))

md.append("## 4. Prompts\n")
md.append(f"""### Stilbild zuerst
Bevor du die ganze Liste erzeugst, erzeuge **ein** Stilbild mit Haus, Gelände und einem Symbol nebeneinander, das dir gefällt. Dieses Bild gibst du bei allen weiteren Bildern als Stilreferenz mit (bei Midjourney `--sref`, bei anderen Werkzeugen "style reference" oder "image prompt"). So bleiben die 200 Bilder einheitlich.

### Basis-Prompt für Gebäude, Gelände, Straßen, Schiffe
Die Spalte `prompt_komplett` in `docs/grafiken.csv` enthält je Zeile den fertigen Prompt. Er besteht aus der Beschreibung der Zeile plus diesem Basis-Teil:

```
{BASE}
```

### Negativ-Prompt (wenn dein Werkzeug einen hat)
```
{NEGATIVE}
```

### Beispiele
- **Pionierhaus:** `small simple wooden settler hut with a thatched roof, rough timber walls, one door, tiny chimney. {BASE}`
- **Grasfläche 1:** `lush green meadow with small flowers and tufts, tileable, variant 1 of 4. {BASE}`
- **Symbol Holz:** `stack of cut logs, game UI icon, centred, simple bold shapes, thick dark-brown outline, saturated flat colours, plain flat magenta background (#FF00FF), no text, no frame, no watermark, hand-painted cel-shaded`

### Tipps gegen typische KI-Fehler
- Die Raute stimmt nicht: Gib eine **Rautenvorlage** als Bild mit (ControlNet / "structure reference"). Die Vorlagen für jede Datei liegen in `docs/vorlagen/` (erzeugt mit `scripts/make-templates.py`).
- Zwei Gebäude im Bild: im Prompt `one single object` betonen, Negativ-Prompt nutzen.
- Der Hintergrund ist nicht einfarbig: nochmal erzeugen oder mit einem Hintergrundentferner (zum Beispiel rembg) freistellen.
- Die Stile weichen ab: immer dieselbe Stilreferenz und dieselben Basis-Wörter nutzen. Gleiche Farbpalette je Kategorie (Wohnen warm, Betriebe erdig, öffentlich hell).
- Erzeuge zuerst in **1024 x 1024** oder größer und skaliere danach auf die Zielgröße. Das Seitenverhältnis des Zielbilds ist wichtig: Bei Gebäuden lieber etwas Rand lassen, der Zuschnitt auf die Zielgröße geschieht später per Skript.

## 5. Ablage und Lieferung
Lege die Dateien in diese Ordner (Namen genau wie in der Tabelle):

```
public/art/
  terrain/   water_1..4, beach_1..3, grass_1..4, forest_1..4, mountain_1..4
  roads/     road_none, road_n, road_e, ... road_nesw (16 Dateien)
  buildings/ alle Gebäude, die Ruine und die Marktstände
  icons/
    goods/   eine Datei je Ware
    tiers/   fünf Stufensymbole
    ui/      Kategorien, Status und sonstige Symbole
  ships/     ship_top und die optionalen Ansichten
  effects/   smoke_1..6, scaffold_2x2, island_icon
  app/       Icons, Startbild, Logo
```

Aus den Dateien wird per Skript ein Sprite-Atlas gebaut (eine große Datei plus Positionsliste), mit Ankern und gespiegelten Varianten für gedrehte Gebäude. Die Platzhalterformen bleiben als Ersatz, falls eine Datei fehlt. Es kann also Stück für Stück geliefert werden.

## 6. Reihenfolge, wenn du nicht alles auf einmal machen willst
1. **Gelände und Straßen** (22 + 16 Dateien): verändern das Gesamtbild am meisten.
2. **Wohnhäuser, Marktstände, Kapelle, Markthaus, Kontor**: sieht man ständig.
3. **Warensymbole und Oberflächensymbole**: verbessern die Bedienung.
4. **Produktionsbetriebe**: nach Wichtigkeit: Forsthaus, Fischerei, Weberei, Schaffarm, Getreidefarm, Mühle, Bäckerei, Steinbruch, Steinmetz, Erzmine, Erzschmelze, Werkzeugmacher.
5. **Rest, Effekte, App-Grafiken.**

## 7. Rechtliches
Nur Bilder verwenden, an denen du die Rechte zur privaten Nutzung hast. Bei KI-Werkzeugen die Nutzungsbedingungen prüfen. Keine Grafiken, Namen oder Stile aus Anno verwenden.
""")
(out_dir / "grafiken.md").write_text("\n".join(md), encoding="utf-8")
print(f"{total} Grafiken, docs/grafiken.md und docs/grafiken.csv geschrieben")
