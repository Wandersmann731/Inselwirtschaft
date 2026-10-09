# Anno 1503: Recherchebericht zu Spielablauf, Produktionsketten und Mechaniken

Stand der Recherche: 9. Oktober 2026. Zweck: Gegenprüfung und Ergänzung von `docs/anno1503-analyse.md` und `docs/produktionsketten.md` mit Daten aus Fan- und Pressequellen. Es werden nur **Regeln und Zahlen** festgehalten, keine Texte, Namen oder Grafiken aus Anno für das Spiel übernommen.

## 0. Wie belastbar sind die Angaben?

| Kennzeichen | Bedeutung |
|---|---|
| **[A]** | Aus einer ausführlichen Fan-Referenz (Strategieguide mit Datenanhang, AnnoZone-Foren, Wiki). Wird von mehreren Stellen gestützt. |
| **[B]** | Einzelne Quelle oder Forenbeitrag. Plausibel, aber nicht gegengeprüft. |
| **[C]** | Presse oder allgemeine Beschreibung. Nur grob. |
| **[?]** | Nicht gefunden oder widersprüchlich. |

Wichtig vorab:
- **Nicht gefunden** wurden verlässliche Zahlen zu Verbrauch pro Einwohner (Tonnen pro Minute), zur genauen Handelslogik (Preise, Handelsrouten-Details), zu den Radien fast aller Gebäude und zu den Katastrophen-Regeln (Auslöser, Wahrscheinlichkeiten). Diese Zahlen stehen im offiziellen Strategiebuch bzw. in den Spieldateien (`bgruppen.dat`), nicht frei im Netz.
- Mehrere Wikis waren nicht erreichbar (1503.annowiki.de, anno.worldofplayers.de, mitret.de). Die Wiki-Seiten dort könnten die Lücken füllen.
- Die Fanquellen basieren auf Spielversion 1.0 bis Königsedition. Die Presse-Texte sind teils ungenau (zum Beispiel „vier Klimazonen“, siehe 6.1).

---

## 1. Grundprinzip des Spiels

- Erscheinung 25.10.2002, Max Design / Sunflowers, direkter Nachfolger von Anno 1602 **[A]**.
- Spielziel im Kern: Inseln besiedeln, Bewohner mit immer mehr Waren und öffentlichen Diensten versorgen, damit sie aufsteigen. Keine Insel hat alles, daher Produktionsinseln und Handel **[A]**.
- **Keine Steuern.** Geld kommt aus dem Verkauf von Waren an Marktständen und aus dem Handel. Kosten sind Betriebskosten, Bau, Militär, Einkauf von Waren **[A]**.
- Bankrott ist die Hauptschwierigkeit in fast jedem Szenario. Das System wirkt anfangs unfertig und braucht mehrere Partien zum Verstehen **[C]** (Gameswelt-Test, GameStar).
- Bis zu 1 menschlicher und 3 KI-Spieler im Endlosspiel, Persönlichkeit der KI einstellbar **[C]**.
- Über 300 vorgefertigte Inseln in Kampagne und Szenarien, größer als in 1602 **[C]**.
- Mehr Gebäude- und Einheitentypen als 1602: mehr als 7 Landeinheiten (1602: 4); laut GameStar bildet die große Festung 12 Truppentypen aus **[C]**.

### 1.1 Erste Spielminuten (Kampagne, Mission 1)
- Start mit einem kleinen Handelsschiff, Kundschafter (Scout), etwas Holz, Werkzeug und Nahrung. Im Endlosspiel wählt man das Startkapital über die Schwierigkeit (siehe 9).
- Kontor kostet **350 Münzen, 12 Holz, 5 Werkzeug**; Markthaupthaus **250 Münzen, 7 Holz, 3 Werkzeug**. Das Schiff muss die Materialien und das Gold an Bord haben, damit der Bau startet **[A]**.
- Empfehlung der Guides: zuerst 150 bis 200 Pioniere ansiedeln, nur Nahrung, Stoffe und Leder liefern, Salz und Tabak weglassen (kosten nur), früh eine positive Bilanz erreichen, erst dann expandieren. Werkzeug anfangs zukaufen statt selbst herstellen. Nahrung lieber über Fischer als über viele Markthäuser, weil Markthäuser teuer sind **[B]**.
- Frühe Baureihenfolge: Kapelle, Wirtshaus, Schule (Schule schaltet die Forschung der Feuerwehr frei) **[B]**.

---

## 2. Bevölkerung: fünf Stufen

### 2.1 Einwohner je Haus (Maximum) **[A]**
| Stufe | Einwohner | Bemerkung |
|---|---|---|
| Pioniere | 8 | |
| Siedler | 15 | |
| Bürger | 28 | |
| Kaufleute | 42 | Haus beginnt mit etwa 29 und wächst bis 42 **[B]** |
| Aristokraten | 30 | Beginnen mit 30, wachsen nicht weiter **[B]** |

Aristokratenhäuser **entstehen nicht durch Aufstieg**, sondern werden von Hand gebaut (Größe 4x4, Kosten laut Guide 12 Werkzeug, 10 Holz, 20 Ziegel, 5 Marmor). Sie werden ab **1900 Kaufleuten** freigeschaltet **[A]**. Bewohner sind „anspruchsvoll“: Wenn sie auch nur leicht unzufrieden werden, verlassen sie das Haus **[B]** (die Analyse spricht von „Ruinen“, das konnte nicht bestätigt werden **[?]**).

### 2.2 Bedürfnismatrix **[A]** (Strategieguide, Anhang „Civilization requirements“)
E = nötig, damit die Bewohner dieser Stufe zufrieden bleiben. U = nötig, um in die **nächste** Stufe aufzusteigen. * = Bonus, erhöht Zufriedenheit/Gewinn.

| | Pioniere | Siedler | Bürger | Kaufleute | Aristokraten |
|---|---|---|---|---|---|
| Nahrung | E | E | E | E | E |
| Stoffe | U | E | E | E | |
| Leder | E | E | | | |
| Kleidung | | | | | E |
| Alkohol (Wirtshaus) | | | | | |
| Gewürze **oder** Tabak | | U | E | E | |
| Lampenöl **oder** Seidenstoffe | | | U | E | |
| Salz | * | ? | ? | * | |
| Schmuck | | | | | * |
| Wein | | | | | * |
| Kapelle | U | E | | | |
| Kirche | | U | E | E | E |
| Wirtshaus | U | E | E | E | |
| Schule | | U | E | | |
| Badehaus | | | U | E | E |
| Universität | | | U | E | |
| Theater | | | | | E |
| Pavillon | | | | | E |

Bemerkungen:
- „Gewürze oder Tabak“: eines reicht, beide dürfen verkauft werden (mehr Gewinn). Ebenso „Lampenöl oder Seidenstoffe“ **[A]**.
- AnnoZone: Kaufleute bleiben zufrieden mit **Nahrung plus vier der sechs** Waren Salz, Stoffe, Tabak, Gewürze, Lampenöl, Seide, also eine weniger als für den Aufstieg **[B]**. Das passt zur Salz-Ersatzregel aus der Analyse, die Quelle dafür ist allerdings nur ein Forenbeitrag.
- Schule und Universität: Siedler und Bürger brauchen sie, Pioniere und Aristokraten nicht **[A]**. Die Schule muss im Einflussbereich des Hauses liegen, aber nicht ans Wegenetz angeschlossen sein **[A]**.
- Bürger brauchen laut Guide etwa 50 % **mehr Stoffe** als Kaufleute, verbrauchen insgesamt etwa doppelt so viele Waren wie Siedler **[B]**.
- Kaufleute fallen nur zurück, wenn weder Seide noch Lampenöl da ist **[B]**.

### 2.3 Aufstiegsmaterial je Haus **[A]**
| Aufstieg | Werkzeug | Holz | Ziegel |
|---|---|---|---|
| Pioniere → Siedler | 1 | 4 | 0 |
| Siedler → Bürger | 2 | 2 | 4 |
| Bürger → Kaufleute | 5 | 5 | 4 |

Pionierhaus: 3 Holz Baukosten, 4x4 laut Forum **[B]**. Ein Aufstieg braucht das Material **im Lager des zuständigen Markthaupthauses**.

### 2.4 Weitere Schwellen
- Wohndichte: etwa 118 Häuser für 3000 Bürger, also rund 25 je Haus **[B]**.
- Szenarioziele nennen 600 bis 900 Bürger als „Stadt auf Bürgerniveau“ **[B]**.
- Prunkbau **Schloss** (Aristokraten): Hauptteil ab 1000, weitere Teile ab 3000, alle Teile (200 + Hauptteil) ab 5000 Aristokraten **[B]**. Die **Kathedrale** (8x6, 12.000 Münzen) ab 600 Aristokraten, nur einmal pro Spiel **[B]**.
- Forschungsgrenzen siehe 8.

---

## 3. Freischaltung von Gebäuden nach Einwohnerzahl **[B]**
Quelle: AnnoZone-Beitrag zur Königsedition, gilt „überall“. **Wichtig für die Spielentwicklung:** Freigeschaltet wird nach **absoluter Einwohnerzahl** der Stufe, nicht nach Stufe allein.

| Gebäude | Freischaltung |
|---|---|
| Kleine Festung | 30 Pioniere |
| Wirtshaus (klein) | 80 Pioniere |
| Kapelle | 125 Pioniere |
| Salzmine + Saline | 125 Pioniere |
| Schule, Rinderfarm, Fleischerei, Steinbruch + Steinmetz | 50 Siedler |
| Markthaupthaus/Kontor II | 50 Siedler |
| Hanffarm, Seilerei, kleine Werft | 25 Siedler |
| Tabak-/Gewürzplantage, Tabak-/Gewürzstand, Tabakverarbeitung, Schmiede, kleine Erzmine, kleine Erzschmelze | 80 Siedler |
| Kanonenturm | 120 Siedler |
| Kirche | 240 Siedler |
| Hopfenfarm, Brauerei | 360 Siedler |
| Getreidefarm, Mühle, Bäckerei, Zuckerrohr, Rumbrennerei | 200 Bürger |
| Markthaupthaus/Kontor III | 200 Bürger |
| Baumwollplantage | 120 Bürger |
| Mittlere Festung | 120 Bürger |
| Galgen, Kleidungs-/Seidenstoffstand | 400 Bürger |
| Universität, Marmorsteinbruch + Steinmetz, Seiden-/Indigoplantage, Färberei | 400 Bürger |
| Lampenölstand, Badehaus, Köhlerei, Walfänger, Transiederei | 600 Bürger |
| Pelztierjäger | 1100 Bürger |
| Große Erzschmelze | 1100 Bürger |
| Weingut, Goldschmiede, Gold- und Edelsteinmine | 750 Kaufleute |
| Große Festung, große Werft, großes Wirtshaus | 250 Kaufleute |
| Theater, Pavillon | 1500 Kaufleute |
| Schmuckstand, Weinstand, Aristokratenhäuser | 1900 Kaufleute |

Per Forschung: Weberei, große Erzmine, Waffengebäude, Feuerwehr, Medikus, Heilkräuterfarm, Amtsgericht, Bibliothek, Brunnen.

---

## 4. Gebäudedaten

Quelle: AnnoZone-Forum „Gebäude-Informationen“ **[B]**. Kosten in Münzen, Material H = Holz, S = Stein/Ziegel, W = Werkzeug, M = Marmor. **Betrieb „x/y“ = aktiv/stillgelegt** (der Thread erklärt es nicht, der Strategieguide nennt „Active/Passive“). Größe in Kacheln. Einzelne Werte sind laut Forum falsch oder unklar (siehe 4.6).

### 4.1 Öffentliche Gebäude
| Gebäude | Kosten | Material | Betrieb | Größe |
|---|---|---|---|---|
| Markthaupthaus | 250 | 7H 3W | 10 (steigt mit Ausbau) | 3x4 |
| Kontor | 350 | 12H 5W | 15 | |
| Kapelle | 700 | 10H 6W | 15 | 3x4 |
| Wirtshaus klein / groß | 500 / 900 | 9H 5W / 10H 8W | 20 (+50) | 3x4 / 4x4 |
| Schule | 400 | 8H 6S 4W | 10 | 4x4 |
| Kirche | 1600 | 15H 20S 9W | 50 | 7x6 |
| Badehaus | 1600 | 15H 25S 20W 10M | 90 | 6x5 |
| Universität | 2500 | 30H 32S 25W | 150 | 8x8 |
| Theater | 2500 | 15H 30S 35W 20M | 200 | 7x6 |
| Pavillon | 600 | 5H 6S 10W 3M | 40 | 3x3 |
| Bibliothek | 200 (+ Forschung 2000) | 20H 12S 24W 12M | 100 | 6x5 |
| Feuerwehr | 200 | 6H 4W | 15/8 | 3x3 |
| Medikus | 500 | 8H 5S 4W | 20 | 4x4 |
| Amtsgericht | 400 | 3H 4S 4W | 40 | 3x3 |
| Galgen | 500 | 9H 5W | | 3x3 |
| Brunnen | 100 | 2H 3S 4W | | 1x1 |
| Marktstände (alle Arten) | 50 (Schmuck/Wein 80) | 1H 1W | 5 | 1x1 |

Marktstand-Typen: Nahrung+Salz, Stoffe+Leder, Tabak+Gewürze, Kleidung+Seide, Lampenöl, Schmuck, Wein **[B]**.

### 4.2 Farmen und Plantagen
| Gebäude | Kosten | Betrieb | Fläche | Ausgabe |
|---|---|---|---|---|
| Forsthaus | 150 | 12/4 | 11x11 | Holz |
| Jagdhütte | 140 | 20/8 | 17x17 | Nahrung + Tierhäute |
| Schafsfarm | 220 | 10/5 | 11x11 | Wolle |
| Rinderfarm | 300 | 15/10 | 9x9 | Schlachtvieh |
| Getreidefarm | 200 | 10/5 | 7x7 | Getreide |
| Kartoffelfarm | 250 | 20/8 | 7x7 | Alkohol direkt |
| Hopfenfarm | 250 | 18/10 | 9x9 | Hopfen |
| Hanfplantage | 200 | 18/8 | 9x9 | Hanf |
| Baumwollplantage | 380 | 20/10 | 9x9 | Baumwolle |
| Tabakplantage | 350 | 30/15 | 9x9 | Tabak |
| Gewürzplantage | 390 | 40/20 | 9x9 | Gewürze (direkt verkaufbar) |
| Zuckerrohrplantage | 310 | 18/12 | 9x9 | Zuckerrohr |
| Seidenplantage | 300 | 35/1 | 9x9 | Seide |
| Indigoplantage | 200 | 40/20 | 9x9 | Farbstoffe |
| Weingut | 400 | 45/20 | 9x9 | Wein direkt |
| Heilkräuterplantage | 200 | 15/5 | 7x7 | Heilkräuter (Nordzone) |
| Pelztierjäger | 100 | 20/15 | 25x25 | Pelze |

### 4.3 Verarbeitung
| Gebäude | Kosten | Betrieb | Umwandlung |
|---|---|---|---|
| Webstube | 300 | 15/10 | Wolle → Stoffe |
| Weberei | 500 | 30/10 | Wolle oder Baumwolle → Stoffe (ergiebiger) |
| Gerberei | 300 | 9/5 | Tierhäute → Leder |
| Schneiderei | 500 | 30/15 | Stoffe + Pelze → Kleidung |
| Färberei | 500 | 40/35 | Farbstoffe + Seide → Seidenstoffe |
| Mühle | 300 | 16/9 | Getreide → Mehl |
| Bäckerei | 300 | 15/10 | Mehl → Nahrung |
| Fleischerei | 350 | 22/12 | Schlachtvieh → Nahrung |
| Brauerei | 300 | 20/10 | Hopfen → Alkohol |
| Rumbrennerei | 300 | 20/5 | Zuckerrohr → Alkohol |
| Saline | 400 | 30/12 | Salzstein → Salz |
| Steinmetz | 250 | 18/7 | Stein → Ziegel |
| Marmorsteinmetz | 300 | 18/7 | Roh-Marmor → Marmor |
| Kleine Erzschmelze | 800 | 40/20 | Erz + Holz → Eisen |
| Große Erzschmelze | 1000 | 75/32 | Erz + Holzkohle → Eisen |
| Köhlerei | 100 | 12/5 | Holz → Holzkohle |
| Schmied (Werkzeug) | 500 | 25/15 | Holz + Eisen → Werkzeug |
| Seilerei | 400 | 16/6 | Hanf → Seile |
| Tabakverarbeitung | 300 | 16/8 | Tabak → Tabakwaren |
| Transiederei | 500 | 20/10 | Walspeck → Lampenöl |
| Goldschmied | 400 | 40/20 | Gold + Edelsteine → Schmuck |

### 4.4 Bergbau und Küste
| Gebäude | Kosten | Betrieb | Ausgabe |
|---|---|---|---|
| Salzbergwerk | 700 | 25/10 | Salzstein |
| Steinbruch | 300 | – | Stein |
| Marmorsteinbruch | 400 | – | Roh-Marmor |
| Kleine Erzmine | 1200 | 40/15 | Eisenerz (etwa 5 t/min) |
| Große Erzmine | 1700 | 65/30 | Eisenerz |
| Goldmine | 1500 | 50/20 | Gold |
| Edelsteinmine | 1500 | 80/30 | Edelsteine |
| Fischer | 180 | 20/12 | Nahrung |
| Walfänger | 500 | 20/10 | Walspeck (baut auch ein Schiff) |
| Kleine Werft | 1200 | – | Schiffe (Stoffe, Holz, Seile) |
| Große Werft | 2000 | – | Schiffe |

### 4.5 Militärgebäude (Auswahl)
Kleine Festung 600 (4 Einheiten, 4x4), mittlere 1000 (6x6), große 2500 (8x8, 8 produziert/8 beherbergt); Kanonenturm 200; Wachturm 100; Stadtmauer 50 je Teil. Waffenbetriebe: kleine Waffenschmiede (Eisen → Schwerter), große (Eisen + Holz → Äxte, Lanzen), Bogenmacher (Holz + Seile → Bögen, Armbrüste), Büchsenmacher (Holz + Eisen → Musketen), Kanonengießerei (Holzkohle + Eisen → Kanonen, Mörser), Rüstungsbauer (Leder + Eisen), Kriegsmaschinenbauer (Seile + Holz). Betriebe, die nur auf Bestellung arbeiten (Werften, Festungen, manche Waffenschmieden), haben im Leerlauf keinen Unterhalt **[A]**.

### 4.6 Hinweise zur Datenqualität
- Laut Forenkommentaren **falsch oder unklar**: Funktion von Amtsgericht (nur gegen Räuber), Galgen (angeblich ohne Funktion), Rüstungsbauer (Upgrades sind „Lost Features“), Kriegsmaschinenbauer (Bau kann Fehler auslösen).
- Beim Strategieguide stehen leicht abweichende Werte (zum Beispiel Armorer 300 Münzen, Kirche ab 240 Siedlern 1600 Münzen, Kathedrale 12.000). Die Kosten stimmen in den geprüften Fällen mit dem Forum überein.
- Die Radien in `docs/anno1503-analyse.md` (Kapelle 19, Kirche 21, Badehaus 22, Kathedrale 22, Galgen 23, Marktstand 4) fanden sich in der Recherche nur teilweise wieder: Der Strategieguide nennt „Service Area“ 19 für Waffenschmiede und 23 für Aristokratenhaus. Für die Radien der öffentlichen Gebäude gab es **keine unabhängige Bestätigung** **[?]**.

---

## 5. Wirtschaftsmechanik

### 5.1 Markthaupthaus (Markt), Lager und Karren **[B]**
- Ein Markthaupthaus (oder Kontor) bildet ein **Versorgungsgebiet**. Betriebe liefern ihre Waren per Karren **nur an das Markthaupthaus ihres eigenen Gebiets**. Karren transportieren nur innerhalb des Gebiets zwischen Betrieben und diesem Markt.
- Jedes Markthaus/Kontor hat eigene Karren, etwa 2 je Gebäude (Pionierstufe 1, ab Siedlern +1). Überlastete Karrenschieber senken die Produktion, deshalb sind Mengenangaben „Richtwerte“.
- Lager: etwa 20 t je Markt/Lager für die ersten, dann 15 t; höchstens etwa 190 t je Insel **[B]**.
- Markt-Unterhalt 10, 15, 30 je Stufe (Pioniere, Siedler, Bürger und höher), Lager 15, 25, 35 **[B]**. **Wohnhäuser haben keinen Unterhalt, Schiffe und Militär schon.** Stillgelegte Betriebe sparen nur einen Teil, öffentliche Gebäude lassen sich nur durch Abriss einsparen **[B]**.
- Bankrott: wenn das Konto dauerhaft unter etwa **−1000** liegt **[B]**.
- Markt-Ausbau: Markthaupthaus/Kontor II ab 50 Siedlern, III ab 200 Bürgern; die Stufen werden teurer und größer **[B]**.

### 5.2 Wie Waren bei den Bewohnern ankommen
- Marktstände (1x1) stehen im Gebiet der Wohnhäuser. Die Bewohner kaufen dort, und die Ware kommt aus dem Lager des Markthaupthauses. **Maßgeblich ist der Einflussbereich des Hauses**, nicht der des Stands **[B]** (der Guide schreibt, die Reichweite der Stände habe „keine Bedeutung“). Lange Warteschlangen am Stand zeigen ein Angebotsproblem **[C]**.
- Öffentliche Gebäude (Kapelle, Schule, Kirche, Wirtshaus, Bad, Arzt, Pavillon) müssen im Einflussbereich des Hauses liegen. Das Gebäude selbst muss nicht im Gebiet des Hauses stehen **[B]**.
- Produktionsbetriebe: Rohstoffe müssen im Wirkbereich liegen (Steinmetz braucht Steinbruch in Reichweite, Wirtshaus braucht Alkohol-Quelle). **Verarbeiter brauchen Straßenanschluss, Wohnhäuser nicht.** Grüne Pfeile in den Bauplänen markieren Eingänge **[B]**.

### 5.3 Preise (Verkauf am Marktstand, je Tonne) **[B]**
Werte aus dem Strategieguide für ein ausgebautes Gebiet, je nach Klimazone leicht abweichend:

| Ware | Preis | Ware | Preis |
|---|---|---|---|
| Nahrung | 45–50 | Salz | 38–43 |
| Stoffe | 75–80 | Tabakwaren | 85–95 |
| Leder | 80 | Gewürze | 70–80 |
| Kleidung | 140–145 | Lampenöl | 90 |
| Seidenstoffe | 90–95 | Wein | 75 |
| Schmuck | 205–210 | | |

Die Preise sind laut AnnoZone nur über Cheats änderbar **[B]**. Die Zahl der genutzten Preis-Spalten („Metropol“) ist im Guide nicht erklärt.

### 5.4 Verbrauch
Es gibt **keine** veröffentlichte Tabelle „Tonnen pro Einwohner“. Die Spieldatei `bgruppen.dat` enthält einen Faktor „Menge“, aus dem sich ergibt, **wie viele Einwohner ein Betrieb versorgt**: *Einwohner = Produktion bei 100 % (t/min) × 100 / Menge*. Beispiele: Jäger 2,05 t/min bei Menge 1,0 → 205 Pioniere; Brauerei 2 t/min bei Menge 0,4 → 500 Pioniere **[B]**. Die Betriebe in 6.2 nutzen diese Methode.

---

## 6. Welt, Klimazonen und Fruchtbarkeit

### 6.1 Zonen
Sechs Zonen: Polar, Tundra, Nord, Prärie, Steppe, Dschungel **[A]**. (GameStar nennt „vier Klimazonen“, der Strategieguide und die Spielpraxis kennen sechs.)

| Zone | Eingeborene | Typische Vorkommen |
|---|---|---|
| Polar | Eskimos | Wale, Wild, Eisenerz, Stein |
| Tundra | Mongolen (Eskimos in Kampagne) | Wale, Wild, Bäume, Kartoffeln, Hanf, Getreide, Salz, Marmor, Erz, Stein |
| Nord | Mongolen, Indianer, Venezianer | Wein, Hopfen, Heilkräuter, Wild, Bäume, Kartoffeln, Hanf, Getreide, Salz, Marmor, Erz, Stein |
| Prärie | Indianer | Wein, Tabak, Baumwolle, Wild, Bäume, Kartoffeln, Hanf, Getreide, Edelsteine (unsicher), Erz, Stein |
| Steppe | Afrikaner, Beduinen, Mauren, Südseebewohner | Wein, Gewürze, Wild, Bäume, Kartoffeln, Hanf, Getreide, Edelsteine, Erz, Stein |
| Dschungel | Afrikaner, Azteken, Mauren, Südseebewohner | Zuckerrohr, Baumwolle, Seide, Indigo, Wild, Bäume, Kartoffeln, Hanf, Getreide, Edelsteine, Gold, Erz, Stein |

- **Hanf, Getreide und Kartoffeln wachsen auf jeder Insel**, auch in der Tundra **[B]**.
- Vor dem Bau einer Plantage zeigt ein farbiger Balken die Fruchtbarkeit („je grüner, desto mehr“). Gute Effizienz braucht Grün. Wüstenartige Inseln sind etwa zur Hälfte unfruchtbar. Bäume werden vom Balken ignoriert **[A]**.
- **Brunnen** erhöhen die Fruchtbarkeit nur unter 100 % und schützen gegen Dürre: etwa 5 bis 7 Felder gerettet je Brunnen, ohne Brunnen etwa die Hälfte der Felder verloren. Ein Brunnen muss einen Teil der Farm in seinem Bereich haben; ein Brunnen kann mehrere Farmen versorgen, weitere bringen nichts **[B]**.
- Wale nur an Polar-/Tundraküsten, keine Buchten. Pelztierjäger brauchen weiße Tiere (Tundra); im Dschungel jagen sie Leoparden/Tiger **[B]**. Kein Marmor auf manchen Karten, daher ist Marmor ein knappes Gut **[B]**.
- Die Bergwerke gehen nicht aus (Minen „scheinen sich nicht zu erschöpfen“) **[B]**.

---

## 7. Produktionsketten

### 7.1 Zusammenfassung
```
Holz        Forsthaus (liest Bäume im Gebiet)
Nahrung     Fischer | Jagdhütte (+Tierhäute) | Rinderfarm → Fleischerei | Getreide → Mühle → Bäckerei | Kleine Farm
Alkohol     Kartoffelfarm (direkt) | Hopfen → Brauerei | Zuckerrohr → Rumbrennerei
Stoffe      Schaf (Wolle) oder Baumwolle → Webstube / Weberei
Leder       Tierhäute (Jagdhütte, Fleischerei) → Gerberei
Kleidung    Stoffe + Pelze (Pelztierjäger) → Schneiderei
Seide       Seidenplantage + Indigo → Färberei
Salz        Salzbergwerk → Salzstein → Saline
Ziegel      Steinbruch → Steinmetz
Marmor      Marmorsteinbruch → Marmorsteinmetz
Eisen       Erzmine + Erzschmelze (klein: Holz, groß: Holzkohle aus Köhlerei)
Werkzeug    Eisen + Holz → Schmied
Seile       Hanf → Seilerei (für Schiffe, Bögen, Kriegsmaschinen)
Tabak       Tabakplantage → Tabakverarbeitung
Gewürze     Gewürzplantage (direkt)
Lampenöl    Walfänger → Walspeck → Transiederei
Wein        Weingut (direkt)
Schmuck     Goldmine + Edelsteinmine → Goldschmied
Heilkräuter Heilkräuterplantage (Nordzone) → Medikus
Waffen      Eisen (+ Holz, Leder, Seile, Holzkohle) → Waffenbetriebe
```

### 7.2 Mengen und Verhältnisse **[B]** (Strategieguide, „Production efficiency“)
Rohstoffbedarf je Tonne Produkt und Produktionszeit je Tonne:

| Betrieb | Eingang je 1 t | Zeit je t |
|---|---|---|
| Bäckerei | 0,98 t Mehl | 10 s |
| Mühle | 1,17 t Getreide | 20 s |
| Fleischerei | 1,33 t Schlachtvieh | 20 s |
| Schafsfarm | 15,3 t Gras je t Wolle | 45 s |
| Weberei | 1,33 t Wolle/Baumwolle | 20 s |
| Webstube | 1,85 t Wolle | 43 s |
| Große Erzschmelze | 1,05 t Erz + 0,59 t Holzkohle | etwa 8 s |
| Kleine Erzschmelze | 1,23 t Erz + 0,76 t Holz | 15 s |
| Köhlerei | 0,78 t Holz | 10 s |
| Seilerei | 2,34 t Hanf | 50 s |
| Weingut | 5,9 t Weinbau-Ertrag | 39 s |
| Saline | 1,02 t Salzstein | 10 s |

Empfohlene Kombinationen („Combines“):
- Nahrung (Brot): **4 Getreidefarmen : 2 Mühlen : 1 Bäckerei** (Guide verweist auf Optimum 7:4:2); (Fleisch): **2 Rinderfarmen : 1 Fleischerei**.
- Stoffe: **2 Schaffarmen : 1 Webstube** oder **3 Schaffarmen : 1 Weberei** (doppelter Ertrag).
- Seile: 3 Hanfplantagen : 2 Seilereien.
- Eisen klein: 1 Erzmine, 1 kleine Schmelze, 2 Forsthäuser; groß: 1 große Mine, 1 große Schmelze, 1 Köhlerei. **Eine Schmelze versorgt zwei Schmiede** **[B]**.
- Alkohol: 2 Hopfenfarmen : 1 Brauerei; 2 Zuckerrohr : 1 Rumbrennerei.
- Tabak: 2 Plantagen : 1 Verarbeitung. Lampenöl: 1 Walfänger : 2 Transiedereien.
- Schmuck: 1 Goldmine : 1 Edelsteinmine : 1 Goldschmied.
- Salz: 1 Bergwerk : 1 Saline. Marmor: 1 Steinmetz : 1 Steinbruch.
- Seide: 2 Seidenplantagen : 1 Indigoplantage : 1 Färberei.
- Ziel: etwa **80 % Effizienz** je Betrieb, alle Betriebe einer Kette ähnlich ausgelastet **[B]**.

### 7.3 Versorgte Einwohner je Betrieb (Richtwerte) **[B]**
| Betrieb/Kombination | Versorgt etwa |
|---|---|
| Jagdhütte | 205 (bis 228) |
| Fischer | 80–89 |
| Kleine Farm (Nahrung) | 72–80 |
| 2 Rinderfarmen + Fleischerei | 300–333 |
| Getreide-Kombination (4:2:1) | 600–700 |
| Brauerei | 500 Pioniere |
| Gerberei | 417–556 |
| Weberei-Kombination | 750 Pioniere, 600 Siedler/Bürger, 1000 Kaufleute |
| Saline + Salzbergwerk | 2400–3000 |
| Transiederei (Lampenöl) | etwa 1500 |
| Schneiderei-Kombination | etwa 1716 Aristokraten |
| Kleine Erzmine | etwa 5 t/min |

Hinweis: Für Werkzeug, Holz und Ziegel (Baumaterial) gibt es keine Einwohner-Zuordnung, sie hängen vom Baufortschritt ab.

---

## 8. Wissen und Forschung **[B]**
- **Wissenspunkte (WP)** begrenzen, was man erforschen darf. Schule: Siedler bis 25 WP, Bürger bis 70 WP (nach Tabelle Strategieguide: 20 mit 50 Siedlern + Schule, 25 mit 170 Siedlern, 50 mit 200 Bürgern, 70 mit 600 Bürgern + Universität, 80 mit Bibliothek, 90 mit 750 Kaufleuten + Universität, 100 mit Bibliothek).
- Die Schule (ab **50 Siedlern**, nicht 190 wie in der Analyse; der Wert dort ist nicht belegt) wird mit der **Universität** aufgewertet; die Universität (2500 Münzen, Unterhalt 150, ab 400 Bürgern) wertet alle Schulen auf. Bibliothek: nur nach Forschung (60 WP, 2000 Münzen) und ab 600 Bürgern; erhöht die WP-Grenze (+10 bis 110, danach +15).
- Forschbar: Feuerwehr (Schule), Medikus und Heilkräuterplantage (**vor 1500 Einwohnern**, weil ab dort regelmäßig die Pest ausbricht), Brunnen, Weberei, große Erzmine, Waffengebäude, Kanonen, großes Handelsschiff (große Werft schon ab 200 Bürgern), großes Kriegsschiff (ab 600 Bürgern).
- Schiffskanonen kommen aus der ersten Kanonenforschung der Schule, Landkanonen brauchen weitere Forschung an der Universität.
- Kosten in Wissenspunkten zeigt das Spiel im Baumenü als Quickinfo. Die Forschungsbäume (Waffen, Bogen, Militär, Marine, Zivil) stehen im Strategieguide, wurden hier aber nicht vollständig erfasst.

---

## 9. Handel, Diplomatie, Piraten

### 9.1 Handel mit der KI und Eingeborenen **[B]**
- **Handelsvertrag** setzt Frieden voraus (Friedenstaube muss grün sein). Vertrag gilt für alle Städte der KI, diese handelt aber meist nur von der Hauptinsel aus.
- **Venezianer** sind neutrale Zwischenhändler: sie verkaufen Werkzeug, Ziegel, Holz und kaufen Nahrung; Erz kaufen sie, wenn man selbst fördert. Neutrale Seehändler vergleichen Preise der Kontore, zu teure Waren bleiben liegen, zu niedrige Gebote lassen Händler abziehen **[C]**.
- **Eingeborene** tauschen über den Scout nach variablen Kursen (Venezianer und KI nicht): einzeln verkaufen, so viel wie erlaubt nehmen.

| Volk | Verkauft | Kauft |
|---|---|---|
| Afrikaner | Heilkräuter | Tabak |
| Azteken | Gold | Gewürze |
| Beduinen | Gewürze | Salz |
| Eskimos | Lampenöl | Stoffe |
| Mongolen | Eisen | Alkohol |
| Mauren | Edelsteine | Seidenstoffe |
| Indianer | Stoffe | Tabak |
| Südseebewohner | Seidenstoffe | Salz |

### 9.2 Kontor und automatische Routen **[B]**
- Kontor-Schieberegler legen fest, wie viel einer Ware im Lager bleibt; der Überschuss wird angeboten.
- Auf automatischen Routen **warten Schiffe nicht** auf volle Ladung. Teilen sich zwei Waren eine Route und eine ist am Ziel voll, kann das Entladen scheitern (bekanntes Problem). Eine Route pro Ware ist daher sicherer.
- Schiffsladung: **50 t je Frachtplatz**, das kleine Handelsschiff fasst 200 t, das mittlere 6 Plätze (300 t). Höchstens 40 Schiffe, Unterhalt kleines Handelsschiff 10 Münzen **[B]**.

### 9.3 Piraten und Feinde **[B]**
- Piraten fordern Schutzgeld; unbewaffnete Schiffe können sich mit einer weißen Flagge schützen **[B]**. Piraten lassen sich anheuern.
- Eingeborene greifen nur an, wenn man sie reizt; Mongolen und Azteken gelten als gefährlich und stellen Truppen schnell wieder auf.
- Schiffe lassen sich entern (Erweiterung vervollständigt es).

---

## 10. Militär **[B]**
- Landeinheiten: Schwertkämpfer, Pikeniere, Lanzenreiter/Kavallerie, Bogen- und Armbrustschützen, Musketiere, Kundschafter, Sanitäter, dazu Katapult, Mörser, Kanone (mit Besatzung).
- Limit: Gesamt 100 Einheiten; Bevölkerungsgrenze 60 (Siedler), 80 (Bürger), 100 (Kaufleute).
- Einheiten haben Unterhalt, der sich nicht senken lässt. Nur Kanonen, Mörser, Katapulte, Bogenschützen mit Brandpfeilen zerstören Lager/Märkte und können damit Gebiet erobern.
- Schiffe mit Kanonen: kleine Kriegsschiffe 6, mittlere 8, große 10–12. Reparatur eines schwer beschädigten mittleren Schiffs etwa 2500 Münzen.

---

## 11. Katastrophen und Ereignisse
Gesichert **[C]** (Gameswelt-Test, 4P/Wikipedia): Pest, Dürre, Brände (auch durch Aufstände), Vulkanausbrüche, Räuber (vom Galgen abgeschreckt) und Aufstände bei Unzufriedenheit. Ereignisse treten ständig auf.
Konkret **[B]**: Pest bricht ab etwa 1500 Einwohnern regelmäßig aus (Medikus und Heilkräuter vorher erforschen); Brunnen gegen Dürre (siehe 6.2); Feuerwehr gegen Feuer.
**Nicht gefunden** **[?]**: Auslöser, Wahrscheinlichkeiten, Dauer, Schaden.

---

## 12. Schwierigkeit im Endlosspiel **[B]**
| Stufe | Startgeld | Piraten | Inseln | Eingeborene |
|---|---|---|---|---|
| Bürger | 500.000 | keine | 20 | 2 |
| Baron | 50.000 | sehr leicht | 27 | 3 |
| Vizegraf | 45.000 | sehr leicht | 27 | 3 |
| Graf | 30.000 | leicht | 27 | 3 |
| Marquis | 30.000 | mittel | 28 | 3 |
| Herzog | 30.000 | mittel | 23 | 4 |
| Prinz | 25.000 | schwer | 27 | 5 |
| König | 20.000 | sehr schwer | 28 | 5 |
| Kaiser | 20.000 | schwer | 25 | 5 |

---

## 13. Erweiterungen, Verkaufsdaten (Kurzfassung)
- Erweiterung „Schätze, Monster & Piraten“ (2003): 12 Szenarien, 3 Endlosspiele, Entern von Schiffen, neue Gegner (Spinnen, Krokodile, Piraten), 10 neue Haustypen, Änderungen an Lampenöl-Produktion **[C]**.
- Mehrspieler fehlte zum Start, kam mit der History Collection (2020) **[C]**.
- Über 2 Mio. Exemplare weltweit bis 2006, in Deutschland 2002 meistverkauftes PC-Spiel **[C]**.

---

## 14. Abgleich mit dem Projekt (nur Beobachtungen, nichts geändert)

**Passt zur Recherche:** Keine Steuern, Marktverkauf; fünf Stufen mit 8/15/28/42/30 Bewohnern; Aristokraten ab 1900 Kaufleuten; Salz als Ersatz; Ketten Brot 4:2:1, Fleisch 2:1, Hopfen 2:1, Zucker 2:1; Lampenöl 1 Walfänger : 2 Transiedereien; Klimazonen mit sechs Zonen.

**Weicht ab oder fehlt (zur Entscheidung):**
1. **Bedürfnismatrix:** Im Original brauchen Siedler **Leder, Wirtshaus, Kapelle**; **Salz nur als Bonus**; Gewürze/Tabak sind Bedingung für den Aufstieg zu Bürgern. Bei uns ist Salz Pflichtbedürfnis der Siedler. Kapelle ist Aufstiegsbedingung der Pioniere, Wirtshaus ab Pionieren, Schule ab Siedlern, Universität ab Bürgern.
2. **Schule und Universität** sind als Bedürfnis nicht umgesetzt (Wissen steht auf der Liste „noch nicht im Spiel“).
3. **Aristokraten:** Original braucht Kirche, Pavillon, Badehaus, Theater, Kleidung; die Kathedrale ist ein einmaliger Prunkbau ab 600 Aristokraten, kein Bedürfnis.
4. **Freischaltung nach Einwohnerzahl** (Abschnitt 3) statt nur nach Stufe. Auch die **Markt-Ausbaustufen** (II ab 50 Siedlern, III ab 200 Bürgern) und das Karrenlimit fehlen.
5. **Aufstiegsmaterial** im Original: Pioniere → Siedler 1 Werkzeug/4 Holz, Siedler → Bürger 2/2/4 Ziegel, Bürger → Kaufleute 5/5/4. Unsere Werte weichen ab (zum Beispiel Kaufleute 3/5/8).
6. **Fehlende Ketten:** Seile/Hanf, Kleidung (Schneiderei, Pelztierjäger), Webstube vs. Weberei, große Erzmine/Schmelze mit Köhlerei, Waffen, Forschung. **Brunnen und Dürre** als eigene Regel.
7. **Pest bei 1500 Einwohnern** und Medikus/Heilkräuter wären ein klarer, belegter Auslöser für spätere Katastrophen (Phase nach MVP).
8. **Alle Wohnhäuser 2x2** ist Projektentscheidung; im Original sind sie größer (Aristokraten 4x4, Pioniere bis 4x4 laut Forum).

---

## 15. Quellen
- Strategieguide mit Datenanhang (Bedürfnismatrix, Aufstiegsmaterial, Produktionseffizienz, Klimazonen, Handel, Schwierigkeit): https://strategygamers.com/walkthrough/anno-1503-the-new-world
- AnnoZone Gebäude-Informationen (Kosten, Unterhalt, Größen): https://www.annozone.de/forum/thread/1284-gebaeude-informationen-part-1/
- AnnoZone Gebäudeliste (Freischaltung nach Einwohnern): https://www.annozone.de/forum/thread/2541-gebaeudeliste/
- AnnoZone Häuserkapazitäten und Entwicklungsstufen: https://www.annozone.de/forum/thread/83-haeuserkapazitaeten-und-entwicklungsstufen/
- AnnoZone Bildung und Wissen: https://www.annozone.de/wiki-anno1503/record/219-bildung-und-wissen/
- AnnoZone Zivilisationsstufen: https://www.annozone.de/wiki-anno1503/record/174-zivilisationsstufen/
- AnnoZone Warenverbrauch und Produktion: https://www.annozone.de/forum/thread/9500-warenverbrauch-und-produktion/
- PC Games Zweite Stadt (Kontor, Markthaupthaus): https://www.pcgames.de/Anno-1503-Aufbruch-in-eine-neue-Welt-Spiel-17999/Tipps/Anno-1503-Zweite-Stadt-errichten-125900/
- Gameswelt Komplettlösung Seite 1 (Wirtschaft, Mission 1): https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/komplettloesung/komplettloesung-4614
- Gameswelt Test (Wirtschaft, Katastrophen): https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/test/anno-1503-aufbruch-in-eine-neue-welt-3754/2
- GameStar Artikel Seite 3: https://www.gamestar.de/artikel/anno-1503,1330008,seite3.html
- 4P Test: https://www.4p.de/test/anno_1503/3009888
- Wikipedia (EN): https://en.wikipedia.org/wiki/Anno_1503
- Anno-Reihe im Vergleich (de-academic): https://de-academic.com/dic.nsf/dewiki/83787

## 16. Offene Fragen (gezielt nachrecherchieren, falls nötig)
- Verbrauchsraten je Einwohner und Stufe (nur über Strategiebuch/Spieldateien).
- Radien der öffentlichen Gebäude und Marktstände.
- Handelslogik im Detail: Ein-/Verkaufspreise im Kontor, Schwankung, Preisfaktoren.
- Katastrophen: Auslöser und Zahlen.
- Forschungsbaum mit Wissenspunkt-Kosten.
- Das 1503-Wiki (annowiki.de) und das „Große inoffizielle Handbuch“ als vollständige Referenzen.
