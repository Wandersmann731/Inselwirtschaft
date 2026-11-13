# Inselwirtschaft

Isometrisches 2D-Aufbauspiel für Android-Smartphones (quer und hochkant), als PWA im Browser.
Es bildet die Wirtschaftsmechaniken aus docs/anno1503-analyse.md nach, mit eigenem Namen
und eigenen Grafiken. Keine Namen, Grafiken, Texte oder Sounds aus Anno verwenden.
Das Projekt ist privat und nicht kommerziell.

## Spielkern
- Einnahmen: Grundsteuer, ab dem ersten Bewohner. Bewohner holen ihre Waren selbst aus dem Lager, solange ein Kontor oder Markthaus sie erreicht (Einzugsgebiet). Je mehr ihrer Warenbedürfnisse erfüllt sind, desto mehr zahlen sie (config.tax.base ist der Anteil ohne Waren). Marktstände gibt es nicht mehr.
- Jedes Gebäude hat Unterhalt, aktiv oder stillgelegt (günstiger).
- 5 Stufen: Pioniere (8 Bewohner), Siedler (15), Bürger (28), Kaufleute (42),
  Aristokraten (30). Alle Wohnhäuser sind 2x2, ebenso alle Startgebäude (Betriebe, Markthaus, Kontor). Aufstieg nur bei 100 % Erfüllung und vorhandenem Baumaterial.
  Salz ersetzt bestimmte fehlende Waren. Aristokraten werden bei Mangel zu Ruinen.
  Kapelle und Kirche braucht man nur für den Aufstieg (`forRise`). Öffentliche Gebäude können zusätzlich eine
  Einwohnerschwelle haben (`unlock` in buildings.json). Das Lager je Ware wächst mit jedem Kontor und Markthaus.
- Jedes neue Spiel beginnt mit einem Kontor an der Küste der Heimatinsel und einem Schiff im Hafen (src/sim/newGame.ts).
- Öffentliche Gebäude und Marktstände wirken in einem Radius ab dem Gebäuderand.
- Mehrstufige Produktionsketten, mehrere Inseln mit Klimazonen und Fruchtbarkeiten,
  Handel per Schiff, Kontor und automatischer Handelsroute.
- Aufträge: Die Händlerstadt bittet ab und zu um eine Ware, die der Spieler herstellt, und zahlt gut dafür (src/data/quests.json, src/sim/quests.ts).
- Spielziel: eine Einwohnerzahl ab einer Stufe (src/data/scenario.json). Danach zeigt ein Endbildschirm die Bilanz, das Spiel läuft frei weiter.
- Militär, Piraten, Katastrophen und Forschung kommen nach dem MVP. Architektur dafür
  offen halten, aber nicht bauen.

## Technik
- Vite + React + TypeScript (strict). Deployment als statische Seite auf Vercel.
- React nur für Menüs, Leisten und Fenster. Die Karte zeichnet eine eigene Render-Klasse
  mit HTML5 Canvas 2D und requestAnimationFrame, außerhalb von React. Nur sichtbare
  Kacheln zeichnen, statisches Gelände in einem Offscreen-Canvas cachen.
- Isometrische Rautenkacheln 64x32 px. Bis echte Grafik da ist: farbige Platzhalterformen.
- Touch zuerst: Wischen verschiebt, zwei Finger zoomen (0,5x bis 2x), Tippen wählt,
  langes Drücken zeigt Infos. Maus zusätzlich zum Testen am PC.
- Quer- und Hochformat spielbar, Vollbild (Schaltfläche und Einstellung), Schaltflächen mindestens 48 px, lesbar auf 6-Zoll-Bildschirmen.
- src/sim enthält reine Funktionen ohne DOM, React oder Canvas:
  tick(state: GameState, rng: Rng): GameState. 1 Tick = 1 Sekunde bei 1x.
  Geschwindigkeiten Pause, 1x, 2x, 4x. Wirtschaftszyklus alle 60 Ticks.
- Alle Spielwerte stehen in src/data/*.json. Kein Spielwert fest im Code.
- Zufall nur über src/sim/rng.ts mit Seed.
- Speichern in IndexedDB, Autosave alle 120 s und bei visibilitychange, Spielstand mit
  Versionsnummer und Migrationen.
- Kein Backend, kein Login, keine Werbung, keine Tracker. Alles läuft offline.

## Grafiken
- Alles, was das Spiel zeigt, zeichnet der Code; es lädt keine Bilddatei mehr (public/sprites/index.json ist leer). Erzeugt wird beim ersten Gebrauch, dann gemerkt.
- Gebäude, Felder und Wohnhäuser: src/render/built (Baukasten kit.ts, Dächer roofs.ts, Materialien materials.ts, Verwitterung wear.ts, Fassaden facade.ts, Anbauten extras.ts; die einzelnen Gebäude in houses.ts, townhouses.ts, fields.ts, workshops.ts, mines.ts, stalls.ts, harbour.ts, shipyard.ts, publics.ts; Kleinteile in props.ts und yardProps.ts). Maß ist die Haustür (DOOR, 13 Weltpixel). Jede Wohnstufe hat sechs Baupläne (HOUSE_VARIANTS in look.ts).
- Bäume, Büsche, Felsen, Gipfel, Gras und Blumen: src/render/grown. Laubbäume, Büsche, Tannen und Palmen werden nicht gemalt, sondern aus Blattmassen, Ästen und Wedeln im Raum aufgebaut und dann je Bildpunkt beleuchtet (volume.ts); Felsen und Gipfel entstehen aus Höhenkarten (relief.ts). Schiff als kleines 3D-Modell in acht Fahrtrichtungen: src/render/vessel. Rauch: smokeFrames.ts.
- Boden: vier Böden in groundMade.ts, gemischt in groundTextures.ts. Wege: roadLayer.ts. Küste: surf.ts. Wasser: water.ts. Gärten und Hecken: gardenSprites.ts. Figuren und Ochsen: figures.ts, Karren: cartFigures.ts, gemeinsames Werkzeug: figureKit.ts (jede Schrittstellung wird einmal gemalt und gemerkt, acht je Schritt).
- Symbole der Oberfläche (Waren, Bewohner, Menü, Zustände): src/render/icons, in der Oberfläche über `<Icon name="goods/wood" />`. Jedes Symbol bekommt am Ende Kantenlicht und Körnung (finish in icons/index.ts). Schriftzug: src/ui/Wordmark.tsx (Aussehen in index.html, .wordmark). Startbild: src/ui/harbourScene.ts setzt eine Hafenstadt aus den Gebäuden, Bäumen und Schiffen des Spiels zusammen (Backdrop.tsx), Küste, Brandung und Boden der Insel rechnet harbourGround.ts je Bildpunkt aus; solange geladen wird, steht dahinter der Abendhimmel aus index.html (--scene). Das Menü steht im Querformat links, im Hochformat oben, die Insel liegt im freien Teil daneben (freeBeside, islandPlace).
- Hinweise über Gebäuden (Betrieb steht, Haus leidet Mangel) werden nicht gemalt: leuchtende Punkte aus HTML/CSS über der Karte (src/render/markLayer.ts, Aussehen in theme.css unter .map-mark; welches Gebäude einen bekommt: markOf in buildingRenderer.ts).
- Schatten: jedes Gebäudebild bringt seinen Bodenschatten mit (built/shadowCast.ts, Sonnenstand LIGHT in built/light.ts); crossShade.ts legt die Schatten der Nachbarn noch einmal über Sockel und untere Wand eines Gebäudes, damit sie nicht an dessen Grundstück enden. Felder haben ausgefranste Ränder (fray in built/fields.ts). Jedes Wohnhaus bekommt einen eigenen Farbton (drawTone in crossShade.ts).
- Bewegung: Bäume und Büsche neben Gebäuden wiegen im Wind (swayOf in decorDraw.ts), im Wald die Krone jedes zweiten Baums (forestSway.ts: sie wird aus dem fertigen Bodenbild genommen und leicht versetzt darübergelegt, nur ab Zoom 0,75), das Meer glitzert (glitter.ts), Möwen kreisen über dem Kontor (birds.ts); die Flügel der Mühle drehen sich, solange sie mahlt (built/sails.ts; sie sind kein Teil des Mühlenbilds, sondern werden darüber gezeichnet, auch in Baumenü und Startbild); alles ruht bei „Bewegung reduzieren“.
- An jedem Steg liegt ein Ruderboot, wo das Meer ihn berührt (boats.ts, berthOf). Wohnhäuser werden bis zu zwei Weltpixel versetzt gezeichnet (houseShift in spriteDraw.ts); das Grundstück bleibt, wo es ist.
- Bildspeicher: Gebäudebilder zusammen höchstens PICTURE_BUDGET (built/index.ts), die am längsten nicht gezeigten gehen zuerst; Straßenbilder wie Bodenbilder begrenzt (keptRoads); die Bilder des Startbilds werden beim Schließen des Menüs freigegeben (releaseHarbour).
- Gebäude-, Baum- und Schiffsbilder haben 4 Bildpunkte je Weltpixel, Gipfel 3 (PEAK_RES; wie groß ein Pflanzenbild in der Welt ist, sagt decorScale).
- Bilddateien gibt es nur noch dort, wo eine Datei nötig ist: die App-Symbole in public/icons (Startbildschirm des Handys, Lesezeichen) und public/sprites/app/splash.webp als Vorschaubild für geteilte Links. Die alten Master in art/ werden nicht mehr ausgeliefert (scripts/assets/optimize.mjs überspringt sie).

## Ton
- MP3 liegen in public/audio (sfx, loops, music) mit index.json. Das Spiel spielt nur, was im Index steht (src/audio). Erzeugen: scripts/assets/README.md.
- Ton startet erst nach dem ersten Tippen (Browserregel).

## Befehle
- npm run dev       Entwicklungsserver
- npm run build     Produktions-Build (muss fehlerfrei durchlaufen)
- npm test          Vitest-Tests für src/sim
- npm run compare   Bild der festen Testszene (scripts/compare/scene.json) neben docs/ziel/zielbild.jpg, z. B. `npm run compare -- phase1`

## Arbeitsregeln
1. Baue nur die Phase, die im Prompt genannt ist. Nichts aus späteren Phasen.
2. Keine Datei länger als ca. 400 Zeilen. Lieber aufteilen.
3. Ändere nur Dateien, die für die Aufgabe nötig sind. Funktionierenden Code nicht
   ohne Rückfrage löschen oder umbauen.
4. Code-Bezeichner und Kommentare auf Englisch, alle Texte im Spiel auf Deutsch.
5. Für jede neue Regel in src/sim mindestens einen Vitest-Test schreiben.
6. Vor dem Abschluss immer npm run build und npm test ausführen und Fehler beheben.
7. Nicht nach main pushen, solange ich es nicht ausdrücklich sage.
8. Am Ende jeder Aufgabe: geänderte Dateien, wie ich es am Handy teste, bekannte Grenzen.
9. Wenn etwas unklar ist, frage, bevor du baust.
