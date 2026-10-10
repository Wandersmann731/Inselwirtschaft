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
- Master-PNG liegen in art/ (siehe docs/grafiken.md). Das Spiel lädt die kleinen WebP-Dateien aus public/sprites.
- Neu erzeugen: scripts/assets/README.md. Nach Änderungen an art/ immer `node scripts/assets/optimize.mjs` ausführen.
- Fehlt ein Sprite, zeichnet der Renderer die alten Farbformen als Ersatz.

## Ton
- MP3 liegen in public/audio (sfx, loops, music) mit index.json. Das Spiel spielt nur, was im Index steht (src/audio). Erzeugen: scripts/assets/README.md.
- Ton startet erst nach dem ersten Tippen (Browserregel).

## Befehle
- npm run dev       Entwicklungsserver
- npm run build     Produktions-Build (muss fehlerfrei durchlaufen)
- npm test          Vitest-Tests für src/sim

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
