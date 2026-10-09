# Grafik-Werkzeuge

Erzeugt die Spielgrafiken aus `docs/grafiken.csv` mit dem MCP-Server der VS-Code-Erweiterung **ImageGen**
(`marquaye.vscode-imagegen`) und schneidet sie für das Spiel zu. Nicht Teil des Spiel-Builds.

## Einrichtung
```bash
cd scripts/assets && npm install      # installiert sharp (Bildbearbeitung)
```
Der Server liest den Schlüssel des Anbieters aus der Umgebung (`OPENROUTER_API_KEY`, `GEMINI_API_KEY` oder `OPENAI_API_KEY`),
nicht aus dem Schlüsselbund von VS Code. Das Standardmodell ist `mai-image-2.6-flash` über OpenRouter (etwa 0,025 USD je Bild).

## Benutzung (vom Projektordner aus)
```bash
node scripts/assets/generate.mjs --dry                              # nur anzeigen, was erzeugt würde
node scripts/assets/generate.mjs --group "Gelände,Wohnhäuser"       # Gruppen aus docs/grafiken.csv
node scripts/assets/generate.mjs --only house_pioneers,good_wood    # einzelne Grafiken
node scripts/assets/generate.mjs --only church --force              # neu erzeugen (kostet ein Bild)
node scripts/assets/generate.mjs --reprocess                        # nur neu zuschneiden, ohne Bildkosten
node scripts/assets/sheet.mjs buildings 9 150                       # Übersichtsbild nach art-raw/
```
Weitere Optionen: `--parallel 5`, `--provider flux-2-pro` (je nach Anbieter und Schlüssel).

## Wie es funktioniert
- **Gebäude** (`docs/vorlagen/buildings/*_guide.png`): Der graue Block der Vorlage wird mit `edit_image` in das Gebäude verwandelt,
  danach wird der magentafarbene Hintergrund entfernt und auf die Zielgröße zugeschnitten. So passt die Grundfläche zur Raute.
- **Gelände**: die Raute der Vorlage wird mit Boden gefüllt und exakt auf die Rautenform maskiert.
- **Straßen**: aus **einem** erzeugten Pflastertextur-Bild zeichnet das Skript alle 16 Verbindungen selbst (Streifen in Kachelkoordinaten,
  projiziert in die Raute, mit Umriss). Die KI trifft Richtungen nicht zuverlässig.
- **Wasser** (`water_1..8`): aus **einer** erzeugten Wassertextur. Sie wird nahtlos gemacht und jede Kachel zeigt genau eine Periode,
  dadurch schließen Nachbarkacheln ohne Naht an. Über die 8 Bilder wandert die Textur um eine volle Periode und wird leicht verwellt,
  nach Bild 8 folgt wieder Bild 1 ohne Sprung. Empfohlen: 4 bis 6 Bilder pro Sekunde.
- **Rauch** (`smoke_1..12`): fünf Wolken (aus drei erzeugten Bildern) steigen auf, wachsen und blenden aus, gleichmäßig über die Schleife
  verteilt, so ist der Ablauf nahtlos. Empfohlen: 8 bis 10 Bilder pro Sekunde.
- **Feldgebäude** (Farmen, Plantagen, Weide, Weinberg): Vorlage ist flache Grundfläche mit einem kleinen Kasten für das Gebäude im hinteren
  Eck, damit sie wie ein bestelltes Feld aussehen und nicht wie ein Modell auf einer Erdplatte.
- **Symbole, Schiffe, Effekte**: frei erzeugt auf Magenta, freigestellt, auf die Größe eingepasst.
- Rohbilder bleiben in `art-raw/` (nicht im Git). Fertige PNG liegen in `art/` (Master). Für das Spiel gibt `node scripts/assets/optimize.mjs` daraus kleine WebP-Dateien in `public/sprites/` und die App-Icons in `public/icons/` aus.

## Natürliches Gelände (Dekor und Bodentexturen)
- `art/decor/` enthält **einzelne Objekte** (Bäume, Kiefern, Palmen, Büsche, Felsen, Gräser, Blumen, Berggipfel in drei Größen und mit Schnee).
  Das Spiel streut sie nach Rauschen (`src/world/decor.ts`) über den Boden: Haine und Lichtungen im Wald, Gipfel in der Mitte
  eines Bergs groß und am Fuß klein, Palmen nur in warmen Klimazonen, Kiefern eher in kalten. Es gibt kein Kachelmuster mehr.
- `art/ground/` enthält vier nahtlose **Bodentexturen** (Gras, Waldboden, Sand, Fels). Das Spiel malt den Boden pro Bildpunkt
  aus zwei verschieden skalierten Schichten, wackelt die Kachelgrenzen mit Rauschen (natürliche Küsten und Ränder), mischt weich
  zwischen Geländearten und setzt an der Küste Schaum und Flachwasser (`src/world/ground.ts`).
- Die festen Geländekacheln `terrain/beach|grass|forest|mountain_*` werden nicht mehr benutzt (nur Wasser noch).

## Varianten und Grundstücke
- **Wohnhäuser** haben 16 Varianten je Stufe (`house_pioneers_1..16` usw.) und 4 Ruinen. Das Spiel wählt eine nach der Position des Hauses
  (`pickVariant` in `src/render/spriteKeys.ts`), also immer dieselbe. Die Beschreibungen dazu stehen in `scripts/asset_data.py` (`HOUSE_STYLE`).
- Häuser, Forsthaus, Fischerei und Minen stehen auf einem **kleinen Grundstück**, das zum Rand hin ausblendet (`featherPlot`). Das Gebäude
  füllt nur die Mitte, deshalb überlappen Nachbarn nicht und sie fügen sich in Wald oder Berg ein.
- Bäume, Büsche und Felsen **direkt neben** einem Gebäude werden mit dem Gebäude tiefensortiert gezeichnet (`src/render/frontDecor.ts`),
  einige stehen also vor dem Gebäude. Unter Gebäuden und Straßen wächst nichts: der Wald wird dort gerodet.
- Alle Varianten sind erzeugt: 16 je Wohnhausstufe, 4 Ruinen, je 4 für Farmen, Forsthaus, Fischerei und Minen.
- Auch die Werkstätten (Weberei, Bäckerei, Mühle, Steinmetz, Schmelze, Werkzeugmacher, Brennerei, Gerberei, Tabakmanufaktur, Färberei, Trankocherei, Kelterei, Goldschmied) und das Markthaus stehen auf einem Grundstück (Werkhof aus Erde und Pflaster). Die Schornsteinpositionen für den Rauch stehen in `buildings.json` (`smoke`) und müssen nach dem Neuerzeugen eines Bildes geprüft werden.

## Ton
- `sound.mjs` erzeugt Geräusche und Schleifen aus `docs/ton.csv` mit der **ElevenLabs Sound-Effects-API** (Schlüssel nur aus der Umgebung: `ELEVENLABS_API_KEY`, wird nie in eine Datei geschrieben). Schleifen nutzen `loop: true`. Die Dauer steht in der CSV (0,5 bis 30 s). Höchstens 4 gleichzeitige Anfragen.
- `music.mjs` erzeugt die Musikstücke mit **Google Lyria 3 Pro** über OpenRouter (`OPENROUTER_API_KEY`), etwa 0,08 USD je Stück. Der verwendete ElevenLabs-Schlüssel hatte keine Berechtigung für Musik.
- Beide schreiben MP3 nach `public/audio/{sfx,loops,music}` und aktualisieren `public/audio/index.json` (das Spiel fragt nur Dateien an, die im Index stehen). Nur den Index neu schreiben: `node scripts/assets/audio-index.mjs`.
- Die Musik ist bewusst nicht im Offline-Speicher (zu groß, wird gestreamt). Geräusche und Schleifen sind es.
- Im Spiel: `src/audio/engine.ts` (Wiedergabe), `src/audio/mix.ts` (Regeln: welche Umgebung, welche Betriebsgeräusche, welche Ereignisse) und `src/audio/useGameAudio.ts` (Anbindung).
