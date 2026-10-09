# Vorlagen für die Grafiken

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
