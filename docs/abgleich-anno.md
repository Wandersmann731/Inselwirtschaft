# Abgleich mit dem Original

Verglichen wurde unser Spiel (Stand 10.10.2026) mit `docs/anno1503-recherche.md` (Mechanik) und `docs/anno1503-gebaeudedaten.md` (Zahlen). Die Werte des Originals für die Gebäude, die es bei uns auch gibt, stehen in `scripts/anno_original.py`. `python3 scripts/compare-anno.py` vergleicht sie mit `src/data/buildings.json` (Stand jetzt: 320 von 320 Werten gleich), `python3 scripts/apply-anno.py` schreibt sie in die Daten.

## 1. Was schon gepasst hat
- Fünf Stufen mit 8, 15, 28, 42 und 30 Einwohnern. Aristokraten ab 1900 Kaufleuten.
- Aristokraten fallen bei Mangel nicht zurück, ihr Haus **stürzt zusammen** (Original bestätigt).
- Ein gemeinsames Lager je Insel, Waren liegen überall bereit. Das Original kennt genau das: Marktstände haben kein eigenes Lager, entscheidend ist der Einzugsbereich von Kontor und Markthaus (Recherche 3.2). Mit der Umstellung auf „Bewohner holen Waren aus dem Kontor“ sind wir näher am Original als vorher.
- Kontor und Markthaus als Hubs mit Einzugsbereich (Original: Radius 22 beim Markthaus).
- Ketten und Verhältnisse: Brot 4:2:1, Fleisch 2:1, Bier 2:1, Rum 2:1, Lampenöl 1:2, Salz 1:1, Marmor 1:1, Schmuck 1:1:1.
- Radien öffentlicher Gebäude: Kapelle 19, Kirche 21, Badehaus 22, Theater 22.
- Kapelle (6/10/700, Unterhalt 15) und Kirche (9/15/20/1600, Unterhalt 50) waren schon gleich.
- Kein Geld für Pionierhäuser in der Wirkung: bei uns 100 Münzen plus 3 Holz (Original: nur 3 Holz). Bewusst behalten, siehe 3.
- Unterhalt gilt pro Minute, bei uns pro Wirtschaftszyklus (60 Ticks): gleiche Einheit.
- Das Wirtshaus holt Alkohol selbst: bei uns kommt Alkohol über den Vorrat, der Unterschied ist klein.

## 2. Was angepasst wurde
| Bereich | Vorher | Jetzt (Original) |
|---|---|---|
| Bau- und Aufstiegskosten | 101 von 320 Werten gleich | alle 320 Werte der gemeinsamen Gebäude (Werkzeug, Holz, Ziegel, Marmor, Münzen, Unterhalt aktiv/stillgelegt) |
| Aufstieg Siedler | 1 Werkzeug, 3 Holz | 1 Werkzeug, 4 Holz |
| Aufstieg Bürger | 2 Werkzeug, 4 Holz, 4 Ziegel | 2 Werkzeug, 2 Holz, 4 Ziegel |
| Aufstieg Kaufleute | 3 Werkzeug, 5 Holz, 8 Ziegel | 5 Werkzeug, 5 Holz, 4 Ziegel |
| Markthaus | Einzugsbereich 20 | 22 |
| Wirtshaus | Radius 19 | 18 |
| Marktpreise (Grundlage der Steuer) | etwa halb so hoch (Nahrung 24, Stoffe 30 ...) | wie im Strategieguide (Nahrung 48, Stoffe 78, Salz 40, Tabak 90, Gewürze 75, Seide 92, Lampenöl 90, Wein 75, Schmuck 207) |
| Steuersatz je Einwohner | 3,9 / 6,8 / 10,1 / 13,2 / 17,4 | 8,7 / 12,5 / 19,1 / 24,6 / 31,0 (Summe aus Rate × Preis, also gleiche Logik wie vorher, höhere Preise für höheren Unterhalt) |
| Aristokraten | Schmuck, Wein, Theater und **Kathedrale** Pflicht | Theater Pflicht (Kirche und Badehaus kommen von den Stufen darunter). **Schmuck und Wein sind ein Bonus**: sie erhöhen die Steuer, werden aber nicht zum Bleiben gebraucht (Original: „kaufen sie gern, brauchen sie nicht zum Überleben“). Die Kathedrale ist ein Prunkbau, keine Pflicht. |
| Klimazonen | Tabak und Gewürze in Steppe und Dschungel, Wein nur Prärie und Steppe, Hopfen in der Prärie, Kartoffeln und Getreide nicht überall | wie Recherche 4.1: Kartoffeln, Getreide, Schafe, Rinder überall außer Polar. Tabak nur Prärie, Gewürze nur Steppe, Wein in Nord, Prärie und Steppe, Hopfen nur Nord, Baumwolle in Prärie und Dschungel, Zuckerrohr, Indigo und Seide nur Dschungel, Wal auch in der Tundra |
| Vorkommen der Inseln | Gold und Edelsteine in der Tundra, Marmor nur im Sonnenhain, Erz nur auf zwei Inseln | Marmor nur in der Nordzone (Heimatinsel), Salz in Nord und Tundra, Gold und Edelsteine in der Steppe, Gold im Dschungel, Eisenerz überall |

Folgen: Die Heimatinsel (Nord) kann jetzt Wein und Marmor selbst machen, aber weiter keinen Tabak, keine Gewürze, keine Seide und kein Lampenöl. Die Bürger kommen im Bot-Test nach 24 bis 32 statt 11 bis 13 Minuten, weil Werkzeug und Ziegel jetzt mehr kosten wie im Original.

## 3. Bewusst anders (Projektentscheidung)
- **Steuer.** Original: keine Steuern, Einnahmen nur über Marktstände. Bei uns Grundsteuer ab dem ersten Bewohner, mehr bei besserer Versorgung. Marktstände gibt es nicht mehr.
- **Wohnhaus 2x2** statt 4x4, Betriebe und Markthaus ebenfalls 2x2, öffentliche Gebäude kleiner (Kapelle 2x3, Kirche 4x5 ...). Der Einzugsbereich der Wohnhäuser (22) wird durch den Einzugsbereich von Kontor und Markthaus ersetzt.
- **Pionierhaus kostet 100 Münzen**, damit das Geld am Anfang eine Rolle spielt.
- **Bedürfnisse feste Liste mit Ersatz durch Salz**, statt „zwei von drei“, „drei von fünf“ und „fünf von sechs“.
- **Startkapital** 10.000 (Original je nach Spielart 20.000 bis 500.000) und Start mit Kontor plus Schiff wie im leichtesten Modus.

## 4. Was fehlt oder noch abweicht (Vorschläge, nicht umgesetzt)
1. **Wahlregeln der Bedürfnisse** (Recherche 2.2): Zwei von drei Waren für Pioniere, drei von fünf für Siedler, fünf von sechs für Bürger, vier von sechs für Kaufleute. Das macht die Versorgung flexibler (Salz und Leder als Ersatz) und wäre der größte Hebel für die Nähe zum Original. Aufwand: mittel (Bedürfnisse bekommen Gruppen mit „n aus m“), die Tests und der Bot müssen angepasst werden.
2. **Schule, Universität, Kirche statt Kapelle** als Pflicht für Siedler und Bürger. Schule und Universität fehlen komplett, Kirche ersetzt bei uns die Kapelle nicht (Kumulation der Bedürfnisse).
3. **Freischaltung nach Einwohnerzahl** (Recherche 2.3 und Gebäudedaten 6): Bei uns schaltet die Stufe frei. Das Original schaltet z. B. die Kapelle bei 125 Pionieren, die Kirche bei 240 Siedlern frei.
4. **Markthaus und Kontor mit drei Ausbaustufen**, Karrenfahrer (1 bis 2, je 5 t) und Lager je Ware (50 t, wachsend bis 190 oder 900 t). Bei uns gibt es eine Stufe und ein Lagerlimit von 200.
5. **Gebäude verfallen**, wenn ihr Einzugsbereich wegfällt (Markthaus abgerissen). Bei uns bleiben sie stehen, nur die Versorgung fällt aus.
6. **Pavillon, Schule, Universität, Bibliothek, Feuerwehr, Medikus, Amtsgericht, Brunnen**: fehlen. Forschung und Wissenspunkte ebenfalls.
7. **Kleidung** (Schneiderei mit Stoff und Pelzen), **Hanf und Seile**, **Köhlerei** und große Erzmine und -schmelze: fehlen (Pelztiere haben wir entfernt).
8. **Katastrophen**: Feuer bei Pionier- und Siedlerhäusern, Pest ab etwa 1500 Einwohnern. Die Architektur bleibt offen, gebaut wird es nach dem MVP.
9. **Handel**: Venezianer, Völker mit Tauschhandel, Handelsvertrag. Bei uns gibt es einen festen Händler am Kontor.
10. **Produktionsmengen:** Die Zyklen (`cycleTicks`) sind unsere Werte. Das Original rechnet in Tonnen pro Minute (z. B. Brauerei 2 t/min, Jagdhütte 2,05 t/min); die Verhältnisse (Kombinate) stimmen.
11. **Zuckerrohr und Tabak** im Original: Tabak-Kombinat 2 Plantagen auf 1 Verarbeitung, bei uns 1:1.
