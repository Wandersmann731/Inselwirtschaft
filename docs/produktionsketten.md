# Produktionsketten im Spiel

Grundlage: die Kettenübersichten auf annoinfo.de (Anno 1503, Seite „Produktionsketten“). Übernommen wurde nur die **Struktur** (welcher Betrieb macht was aus was, Verhältnis der Gebäude), nicht Grafik, Text oder Namen. Mengen und Zeiten stehen auf der Seite nicht, die Zyklen (`cycleTicks`) sind meine Werte, so gewählt, dass die Gebäudeverhältnisse der Seite aufgehen. Alle Werte stehen in `src/data/buildings.json`.

Ein Betrieb mit `cycleTicks` 40 macht 1,5 Waren pro Wirtschaftszyklus (60 Ticks), mit 20 Ticks 3, mit 10 Ticks 6.

| Ware | Kette im Spiel | Verhältnis (wie auf der Seite) |
|---|---|---|
| Holz | Forsthaus | 1 |
| Nahrung (Fisch) | Fischerei an der Küste | 1 |
| Nahrung (Wild) | Jagdhütte (braucht Wildbestand), liefert Tierhäute dazu | 1 |
| Nahrung (Fleisch) | 2 Rinderfarm → Schlachtvieh → 1 Fleischerei (liefert Tierhäute dazu) | 2 : 1 |
| Nahrung (Brot) | 4 Getreidefarm → 2 Mühle → 1 Bäckerei | 4 : 2 : 1 |
| Alkohol (Kartoffeln) | Kartoffelfarm macht Alkohol direkt | 1 |
| Alkohol (Hopfen) | 2 Hopfenfarm → 1 Brauerei | 2 : 1 |
| Alkohol (Zuckerrohr) | 2 Zuckerrohrplantage → 1 Rumbrennerei | 2 : 1 |
| Leder | Tierhäute (Jagdhütte oder Fleischerei) → Gerberei | 1 |
| Stoffe | Schaffarm oder Baumwollplantage → Wolle → Weberei | 1 : 1 |
| Salz | Salzmine → Salzstein → Saline | 1 : 1 |
| Ziegel | Steinbruch → Stein → Steinmetz | 1 : 1 |
| Eisen | Erzmine → Erz; Erzschmelze mit Holz | 1 : 1 |
| Werkzeug | Eisen + Holz → Werkzeugmacher | 1 |
| Gewürze | Gewürzplantage | 1 |
| Tabakwaren | Tabakplantage → Tabak → Tabakmanufaktur | 1 : 1 |
| Seidenstoffe | Seidenplantage (Seide) + Indigofarm (Farbstoffe) → Färberei | 1 : 1 : 1 |
| Marmor | Marmorsteinbruch (braucht Marmorvorkommen) → Marmorstein → Marmorsteinmetz | 1 : 1 |
| Lampenöl | 1 Walfänger → Walspeck → 2 Trankocherei | 1 : 2 |
| Wein | Weinberg macht Wein direkt | 1 |
| Schmuck | Goldmine + Edelsteinmine → Goldschmied | 1 : 1 : 1 |

## Was sich dadurch geändert hat
- Kartoffeln und Weintrauben als Zwischenwaren sind weg, Kartoffelfarm und Weinberg liefern direkt Alkohol und Wein. Die Kelterei gibt es nicht mehr, die Brennerei ist jetzt die Rumbrennerei (Zuckerrohr).
- Neue Betriebe: Brauerei, Saline, Fleischerei, Jagdhütte, Marmorsteinbruch, Marmorsteinmetz. Neue Waren: Salzstein, Schlachtvieh, Marmorstein, Farbstoffe (statt Indigo). Neu: Nebenprodukte (Fleischerei und Jagdhütte liefern Tierhäute zusätzlich).
- Neue Insel-Eigenschaften: Wildbestand (Nord, Tundra, Prärie) und das Vorkommen Marmor (nur Sonnenhain, die Heimatinsel hat keinen Marmor).
- Freischaltung der Betriebe nach Stufe: Hopfen ab Siedlern, Zuckerrohr ab Bürgern, Marmor ab Bürgern, Wein ab Kaufleuten (wie die Seite), der Rest wie vorher.
- Alte Spielstände (Version 9) werden migriert: Kelterei-Gebäude werden entfernt, Waren Kartoffeln und Trauben entfallen, Indigo wird zu Farbstoffen.

## Prüfung der Ketten
`tests/chainAudit.test.ts` prüft bei jedem Testlauf die Daten: jede Ware wird irgendwo hergestellt und von Bewohnern, beim Bauen oder von einem anderen Betrieb gebraucht, jeder Betrieb liefert etwas Gebrauchtes, jedes Bedürfnis einer Stufe ist mit Betrieben erreichbar, die bis zu dieser Stufe freigeschaltet sind, und jede Fruchtbarkeit und jedes Vorkommen wird von einem Gebäude genutzt. Dabei gefunden und behoben: Die Erzmine war erst ab Siedlern baubar, obwohl schon Pioniergebäude Werkzeug kosten (jetzt ab Pionieren), und die Fruchtbarkeit „Pelztiere“ hatte keinen Betrieb (entfernt).

Das Baumenü gruppiert die Betriebe nach Ketten (`src/data/chains.json`), zeigt je Betrieb Vorschaubild und Waren (Eingang → Ausgang) und je Kette, wer sie braucht.

## Noch nicht im Spiel (stehen auf der Seite)
Seile (Hanfplantage, Seilerei), Kleidung (Schneiderei mit Stoffen und Pelzen, Pelztierjäger), Webstube als zweite Weberei, große Erzmine und große Erzschmelze mit Holzkohle (Köhlerei), Wissen, Papier und Bücher (Schule, Universität) und alle Militärwaren. Auch die Freischaltung nach Einwohnerzahl (zum Beispiel Salz ab 125 Pionieren) ist nicht eingebaut, bei uns schaltet die Stufe frei.
