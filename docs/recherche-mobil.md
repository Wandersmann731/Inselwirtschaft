# Recherche: Anno 1503 und Bedienung von Aufbauspielen am Handy

Stand 10.10.2026. Ergänzt `anno1503-recherche.md` (Mechanik) und `abgleich-anno.md` (Abgleich mit unserem Spiel). Piraten, Militär und Katastrophen sind ausgeklammert.

## 1. Anno 1503: neue oder bestätigte Punkte
| Befund | Quelle | Umgesetzt |
|---|---|---|
| Pioniere brauchen zum **Bleiben** nur Nahrung. Kapelle und Wirtshaus braucht man erst für den **Aufstieg**. | AnnoWiki „Bedürfnisse“ (siehe `anno1503-recherche.md` 2.2) | ja: Bedürfnisse mit `forRise` (Kapelle, Kirche). Fehlen sie, ziehen keine Bewohner aus, das Haus steigt nur nicht auf. |
| Öffentliche Gebäude werden nach **Einwohnerzahl** freigeschaltet (Kapelle 125 Pioniere, Kirche 240 Siedler, Theater 1500 Kaufleute, Kathedrale 600 Aristokraten). | AnnoZone/Wiki, `anno1503-gebaeudedaten.md` 6 | ja. Kirche 240, Theater 1500 und Kathedrale 600 wie im Original. Die Kapelle schon ab **64** Pionieren (halber Wert): Mit 125 kamen die Siedler im Bot-Test erst nach 43 bis 56 statt nach 8 Minuten. Das Badehaus hat keine Schwelle, weil Kaufleute es zum Bleiben brauchen und sonst zurückfallen würden. |
| Das Lager je Ware **wächst mit jedem Kontor und Markthaus** (50, 70, 90, 110, 130, 150, dann +10 bis 190 t). | AnnoWiki „Lager“ | ja, im gleichen Verhältnis: 200, dann je +40 (fünfmal), dann +20 bis 760. |
| Reißt man ein Markthaus ab, verfallen die Gebäude außerhalb jedes Einzugsbereichs. | AnnoWiki „Einflussbereich“ | teilweise: Beim Abriss warnt das Spiel, wie viele Häuser danach keine Waren mehr bekommen. Verfall nicht, weil man bei uns auch außerhalb bauen darf. |
| Im Hausfenster zeigt ein **Gesicht** die Stimmung (sehr unzufrieden, zufrieden, glücklich). | AnnoWiki „Pioniere“ | ja: ☹️ 🙂 😊 mit kurzem Satz. |
| Die Baumaterialien der Insel stehen dauerhaft in der Infoleiste. Eine Statistik zeigt den Zustand der Städte. | Gold-Edition-Beschreibung, GameSpot | war schon da (Materialleiste oben, Statistik). |
| Strategietipp aus Komplettlösungen: **Baumaterial für den Aufstieg sperren**, damit es nicht für Aufstiege verbraucht wird. | gameswelt.de Komplettlösung | war schon da (Markthaus/Kontor: Aufstiege sperren). |

Nicht umgesetzt (Aufwand oder spätere Phase): Wahlregeln „zwei aus drei“ usw., Schule und Universität, Kontor- und Markthausstufen mit Karrenfahrern, Forschung.

## 2. Bedienung am Handy: Muster aus anderen Aufbauspielen
| Muster | Wo gesehen | Bei uns |
|---|---|---|
| **Bau als eigener Modus**: Vorschau des Gebäudes, Häkchen und Kreuz, bezahlt wird erst beim Bestätigen, der Rest der Oberfläche tritt zurück. | iOS-Aufbauspiele, Diskussionen zu Bau-Modi auf GitHub | war schon da (Bauen/Abbrechen, Vorschau grün/rot). |
| **Vorschau erscheint sofort** in der Bildmitte und lässt sich mit dem Finger **ziehen**, statt erst eine Stelle antippen zu müssen. | Konzepte für mobile Aufbauspiele | neu: Die Vorschau startet auf dem freien Platz nahe der Bildmitte (bevorzugt im Einzugsgebiet) und lässt sich ziehen. Antippen der Vorschau baut wie bisher beim zweiten Tippen. |
| **Rückgängig** nach Fehlgriffen. Pocket City wurde in Tests genau dafür kritisiert, dass es fehlt. | Pocket Gamer, Test zu Pocket City | neu: Knopf „Rückgängig“ über der Leiste, 12 Sekunden lang, volle Erstattung. |
| **Mehrfach bauen** durch Ziehen oder Wiederholen (Zonen in Pocket City). | Destructoid, Test zu Pocket City | war schon da (Viertel aufziehen). Neu: nach dem Bau steht die nächste Vorschau gleich daneben, „Bauen“ noch einmal baut eine Reihe. |
| **Wenige Einträge pro Menü**, oft benutztes schnell erreichbar. Anno 1800 auf Konsole stellt die Zahl der Einträge im Ringmenü einstellbar. | Ubisoft, Barrierefreiheit Anno 1800 Konsole | neu: Menüpunkt „Zuletzt“ mit den letzten sechs Gebäuden. |
| **Große Ziele, Rückmeldung bei jeder Aktion** (Haptik, Ton). | Hinweise zu Touch-Bau-Modi | war schon da (48 px, Vibration). |
| **Bildschirm bleibt an**, solange man spielt. | übliche Spiele-Einstellung | neu: Einstellung „Bildschirm anlassen“ (Wake Lock). |

## 3. Quellen
- gameswelt.de, Komplettlösung und Tipps zu Anno 1503: https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/komplettloesung/komplettloesung-4614/11 , https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/tipp/anno-1503-positive-bilanz-erwirtschaften-112710
- GameSpot, Bilder und Vorschau zu Anno 1503: https://gamespot.com/articles/new-anno-1503-screens/1100-2687799/
- GOG-Forum zum Hausverfall: https://gog.com/forum/anno_series/housing_collapsing_why
- Pocket Gamer, Test zu Pocket City (Steuerung, fehlendes Rückgängig): https://www.pocketgamer.com/pocket-city/review/
- Destructoid, Test zu Pocket City (Ziehen zum Bauen): https://destructoid.com/?p=227371
- TouchArcade, Test zu Pocket City 2: https://toucharcade.com/2023/04/18/pocket-city-2-review-mobile-iphone-ipad-premium-city-builder/
- Ubisoft, Anno 1800 Konsole (Ringmenü, Barrierefreiheit): https://news.ubisoft.com/en-us/article/6xDLQxuay1FASfTGQyquJl , https://anno-union.com/revealing-anno-1800-console-edition/
- GitHub-Diskussionen zu Bau-Modi (Häkchen/Kreuz, sichtbares Abbrechen): https://github.com/craigmroberts/crownrush/issues/137 , https://github.com/dampfhub/goodcomp4x/issues/206
- Pocket Gamer zu Townscaper (Tippen setzt sofort): https://www.pocketgamer.com/articles/086084/cute-city-builder-townscaper-is-expanding-to-mobile-and-switch-later-this-year/
