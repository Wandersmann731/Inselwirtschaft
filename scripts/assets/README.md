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
- **Symbole, Schiffe, Effekte**: frei erzeugt auf Magenta, freigestellt, auf die Größe eingepasst.
- Rohbilder bleiben in `art-raw/` (nicht im Git). Fertige PNG liegen in `public/art/`.
