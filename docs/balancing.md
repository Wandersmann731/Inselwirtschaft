# Balancing: was der automatische Spieler gezeigt hat

Mit `npm run playtest` spielt ein Computer-Spieler (Bot, `tests/bot/`) 150 Spielminuten auf der Heimatinsel. Er benutzt nur die normalen Bauregeln und sein eigenes Geld. Der Test läuft in wenigen Sekunden und gehört nicht zu `npm test`. Sein Verhalten ist eine Heuristik: Scheitert der Bot, heißt das nicht, dass das Spiel unspielbar ist. Läuft er gut, heißt es nicht, dass jeder Spielstil funktioniert.

## Gefundene Probleme und was ich geändert habe
Alle Werte stehen in `src/data/*.json`. Sie waren meine Startwerte, die Analyse nennt sie nicht (nur Kosten und Unterhalt der öffentlichen Gebäude, die ich nicht angefasst habe).

| Befund | Änderung |
|---|---|
| Die Einnahmen pro Einwohner (etwa 1,3 bis 2,3 Münzen pro Zyklus) trugen nicht einmal die Betriebskosten einer Minimalstadt: Die Stadt fiel immer ins Minus. | Warenpreise an den Marktständen verdreifacht (`goods.json`, Feld `price`). Jetzt etwa 3,9 Münzen pro Einwohner und Zyklus. Die Handelspreise (`tradePrice`) blieben gleich. |
| Schon eine kleine Kette (zwölf Gebäude) kostete etwa 290 Münzen Unterhalt pro Zyklus. | Unterhalt aller Produktionsbetriebe halbiert. Ab etwa 70 Einwohnern trägt sich eine Minimalstadt. |
| Werkzeug-Falle: Die Werkzeugkette braucht selbst Werkzeug zum Bauen. Mit 50 Werkzeug am Start war es nach etwa 20 Gebäuden aufgebraucht, danach ging nichts mehr. | Startvorrat Werkzeug 80, Holz 150, Ziegel 80. Erz, Schmelze und Werkzeugmacher arbeiten schneller (25, 25 und 20 Ticks statt 40). |

## Ergebnis nach den Änderungen (Bot, 150 Minuten)
- Fünf von sechs Karten: Siedler ab Minute 8 bis 9, 220 bis 310 Einwohner, 20.000 bis 50.000 Münzen, Bilanz plus 500 bis 1.100 pro Zyklus.
- Karte 5: Der Bot bleibt bei 61 Einwohnern im Minus hängen (er baut zu früh zu viel und kommt nicht mehr heraus). Das ist die schon geplante Gefahr „Todesspirale“, nicht notwendigerweise ein Fehler der Zahlen.
- **Kaufleute erreicht der Bot nie.** Bürger erreicht er nur kurz, danach fällt er zurück. Ursachen im Bot: Er findet für Kirche (7×6) und Badehaus keinen Platz mehr zwischen seinen Häusern und baut zu wenig Ziegel. Ob das Spiel selbst bis Kaufleute spielbar ist, ist damit noch nicht belegt. Das sollte ein Mensch am Handy prüfen oder der Bot sollte weiter verbessert werden.

## Was du am Handy prüfen solltest
- Die ersten 15 Minuten: Reicht das Startgeld, und wann wird die Bilanz positiv?
- Wird Werkzeug knapp? Wie lange dauert es, bis die Stadt wächst?
- Kommen die Bürger über Salz (ohne Tabak und Gewürze) wirklich an Kirche und Badehaus?

## Grundsteuer statt Marktstände (Spielstand-Version 11)
- Bewohner holen ihre Waren automatisch aus dem Inselvorrat, wenn ein Kontor oder Markthaus sie im Einzugsgebiet (`catchment`) erreicht. Die Marktstände sind weg (alte Spielstände werden migriert, die Stände entfallen).
- Jedes bewohnte Haus zahlt je Zyklus `Einwohner × tax(Stufe) × (base + (1 − base) × Versorgung)`. `tax` steht in `tiers.json` (die Summe aus Rate × Preis aller Waren bis zu dieser Stufe, so bleibt der Ertrag bei voller Versorgung wie vorher), `base` (0,35) in `config.json`. Versorgung = Mittel der erfüllten Warenbedürfnisse.
- Öffentliche Gebäude (Kapelle, Wirtshaus ...) wirken weiter im Radius.
- Bot-Playtest: Seeds 1–6 laufen durch, Bürger nach 11–13 Minuten, Bilanz am Ende 480–800 pro Zyklus. Der Bot sucht für große Gebäude jetzt in 18 statt 14 Kacheln einen Platz.
