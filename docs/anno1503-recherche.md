# Anno 1503: Recherchebericht zu Spielablauf und Mechaniken

Stand: 9. Oktober 2026, zweite Fassung. Zweck: Gegenprüfung und Ergänzung von `docs/anno1503-analyse.md` und `docs/produktionsketten.md`. Festgehalten werden nur **Regeln und Zahlen**, keine Texte, Namen oder Grafiken aus Anno. Zahlen zu Gebäuden, Ketten und Preisen stehen in `docs/anno1503-gebaeudedaten.md`.

## 0. Quellen und Belastbarkeit

Die erste Fassung stützte sich auf Presse, Foren und einen Strategieguide. Die zweite nutzt zusätzlich das **AnnoWiki 1503** (1503.annowiki.de, Seite inzwischen offline, gelesen über Internet-Archive-Snapshots von 2022) und den Bedarfsrechner von mitret.de. Das Wiki ist die genaueste Quelle und hat mehrere Angaben der ersten Fassung korrigiert (siehe 14).

| Kennzeichen | Bedeutung |
|---|---|
| **[W]** | AnnoWiki 1503, Snapshot 2022. Genau, meist mit Versionshinweis (Classic, Add-on, Königsedition). |
| **[A]** | Von mehreren Quellen gestützt. |
| **[B]** | Einzelne Quelle (Forum, Strategieguide). Plausibel, nicht gegengeprüft. |
| **[C]** | Presse, grob. |
| **[?]** | Nicht gefunden oder widersprüchlich. |

Noch **nicht gefunden**: Verbrauch pro Einwohner in Tonnen pro Minute (nur indirekt über „Betriebe je Einwohner“, siehe 5.4), Preisschwankungen im Handel, Wahrscheinlichkeiten von Katastrophen, Zahlen zu Feuer-/Pest-Ausbreitung.

---

## 1. Grundprinzip

- Erscheinung 25.10.2002, Max Design / Sunflowers, Nachfolger von Anno 1602 **[A]**.
- **Keine Steuern.** Einnahmen nur aus dem Verkauf an die eigene Bevölkerung über Marktstände (und an andere Spieler). Ausgaben: Betriebskosten, Bau, Einkauf, Militär und Schiffe **[W]**.
- Fast alles kostet Bau und Unterhalt. Kosten fallen **pro Minute** an und laufen auch bei negativem Kontostand voll weiter **[W]**.
- Reine Produktionsinseln haben eine stark negative Stadtbilanz (Kosten, keine Einwohner, keine Einnahmen), sofern sie nicht direkt über das Kontor verkaufen **[W]**.
- Je höher die Stufe, desto mehr Waren lassen sich verkaufen und desto höher der Gewinn **[W]**.
- Anhaltend negative Bilanz: Konto leert sich, Schulden wachsen, der Spieler landet im **Kerker** und das Spiel endet **[W]**. Strategieguide nennt etwa −1000 als Schwelle **[B]**.
- Bilanzen beziehen sich auf eine Minute und werden alle 4 Sekunden aktualisiert. Es gibt Spielerbilanz (alles), Stadtbilanz (je Insel) und Handelsbilanz (Handel mit anderen Spielern, ungenau) **[W]**.
- Hohe Schwankungen der Verkäufe zeigen Versorgungsmängel an. Überproduktion belastet die Bilanz (Lager statt Verkauf) **[W]**.
- Kontostand begrenzt auf 999 Millionen, darüber Rücksetzung auf 0 **[W]**.

### 1.1 Start
- Endlosspiele: Der Spieler startet mit **einem Schiff** mit Werkzeug, Holz und Nahrung. In „Bürger“ (leichtester Modus) zusätzlich ein Kontor auf einer guten Insel, keine Piraten, keine Katastrophen **[W]**.
- Erstes Kontor: nur vom Schiff aus an der Küste, benötigt 5 Werkzeug, 12 Holz, 350 Münzen **[W]**. Der Scout kann es nicht bauen (trägt je Ware höchstens 10 t, aber 12 t Holz nötig). Der Scout kann stattdessen ein **Markthaupthaus** setzen: 10 t Holz und 10 t Werkzeug mitnehmen, Kosten 3 Werkzeug, 7 Holz, 250 Münzen **[W]**.
- Weitere Kontore später über das Baumenü (Küstengebäude). Pro Insel sind **mehrere Kontore** möglich (anders als 1602), praktisch für Handelsrouten **[W]**.
- Rat der Guides: zuerst 150 bis 200 Pioniere versorgen (Nahrung, Stoffe, Leder), Salz und Tabak weglassen, früh positive Bilanz erreichen, Werkzeug anfangs zukaufen **[B]**. Frühe Bauten: Kapelle, Wirtshaus, Schule **[B]**.

### 1.2 Endlosspiele **[W]**
| Spiel | Startkapital | Gegner (max) | Inseln | Völker |
|---|---|---|---|---|
| Bürger | 500.000 | 2 | 20 (feste Karte) | 2 |
| Baron | 50.000 | 3 | 27 | 3 |
| Freiherr | 45.000 | 3 | 28 | 3 |
| Graf | 30.000 | 4 | 27 | 3 |
| Herzog | 30.000 | 4 | 28 | 3 |
| Fürst | 30.000 | 3 | 23 | 4 |
| König | 25.000 | 4 | 27 | 5 |
| Kaiser | 20.000 | 4 | 28 | 5 |
| Imperator | 20.000 | 3 | 25 | 5 |

Inselwelt wird bei jedem Start zufällig aus einem Inselpool zusammengestellt (außer „Bürger“). Einstellbar: Katastrophen an/aus, Piraten an/aus, Zahl und Typ der Computergegner. Inselgrößen: 64x64, 80x80, 128x128, 256x256 Felder. Das Add-on bringt 3 weitere Endlosspiele **[W]**.

---

## 2. Bevölkerung: fünf Stufen

### 2.1 Häuser **[W]**
| Stufe | Einwohner (Start → Maximum) | Aufstieg verbraucht |
|---|---|---|
| Pioniere | 5 → 8 | Bau: 3 Holz (kein Geld) |
| Siedler | 9 → 15 | 4 Holz, 1 Werkzeug |
| Bürger | 16 → 28 | 2 Werkzeug, 2 Holz, 4 Ziegel |
| Kaufleute | 29 → 42 | 5 Werkzeug, 5 Holz, 4 Ziegel |
| Aristokraten | 30 (fix) | Bau: 12 Werkzeug, 10 Holz, 20 Ziegel, 5 Marmor, ab 1900 Kaufleuten |

- Alle Wohnhäuser sind im Original **4x4** Felder groß (Medikus-Seite: „wie auch alle Wohnhäuser“), Einzugsbereich der Wohnhäuser **22** **[W]**.
- Pionier- und Siedlerhäuser können **ohne Anlass anfangen zu brennen**. Bürger-, Kaufleute- und Aristokratenhäuser brennen nur durch Beschuss, Aufstände, Erdbeben und Vulkanausbrüche **[W]**.
- Aristokratenhäuser entstehen **nicht durch Aufstieg**, man baut sie. Fehlen Waren oder Gebäude, fallen sie **nicht** auf eine tiefere Stufe zurück, sondern **stürzen völlig zusammen** (bestätigt) **[W]**.
- Kaufleute sind die letzte automatische Stufe. (Eine Mod ändert das über `bgruppen.dat`.)
- Der Spieler sieht die Stimmung am Gesicht des Bewohners im Haus-Fenster: sehr unzufrieden, zufrieden, glücklich **[W]**.

### 2.2 Bedürfnisse im Detail **[W]**
Nahrung ist auf **allen Stufen** nötig. Fehlt bei den Zufriedenheitsbedürfnissen eine Ware, kann ein größeres Angebot einer anderen Ware es ausgleichen („Kompensation“). „Überleben“ = Stufe halten, „Aufstieg“ = nächste Stufe erreichen.

| Stufe | Zum Überleben | Für den Aufstieg |
|---|---|---|
| **Pioniere** | Nahrung | Nahrung + **zwei der drei** Waren Leder, Stoffe, Salz + Wirtshaus + Kapelle |
| **Siedler** | Nahrung + **zwei der fünf** Waren Leder, Stoffe, Salz, Tabakwaren, Gewürze (Tabak + Gewürze allein reichen nicht) + Wirtshaus + Kapelle | Nahrung + mindestens **drei der fünf** (Regel unten) + Wirtshaus + **Schule** + **Kirche** (ersetzt die Kapelle) |
| **Bürger** | Nahrung + **zwei weitere** Waren; eine davon muss Salz oder Stoffe sein, die andere beliebig (Tabak, Gewürze, Lampenöl, Seide) + Wirtshaus, Schule oder Universität, Kirche oder Kapelle (je eines davon im Einzugsbereich) | Nahrung + mindestens **fünf der sechs** Waren Stoffe, Salz, Gewürze, Tabak, Lampenöl, Seidenstoffe + Wirtshaus + Schule + Kirche + **Badehaus** + **Universität** |
| **Kaufleute** | Nahrung + **vier der sechs** Waren (Salz, Stoffe, Tabak, Gewürze, Lampenöl, Seide) + Wirtshaus + Kirche + Universität + Badehaus | (keine Stufe darüber) |
| **Aristokraten** | Nahrung + **Kleidung** + Kirche + Badehaus + Theater + **Pavillon** (in der Spielanleitung „Parkanlage“ genannt) | – |

Kombinationsregel Siedler → Bürger: Sind aus der ersten Reihe (Leder, Stoffe, Salz) **zwei** Waren da, genügt **eine** aus der zweiten Reihe (Gewürze oder Tabak). Ist nur **eine** aus der ersten Reihe da, braucht man **beide** der zweiten **[W]**.
Aristokraten kaufen Schmuck und Wein gerne (gute Einnahmen), brauchen sie aber nicht zum Überleben **[W]**.
Eine Universität ersetzt die Schule, eine große Kirche die Kapelle. **Pro Siedlung genügt eine Kirche und eine Universität**, die werten automatisch alle niedrigeren Gebäude auf **[W]**.
Kaufleute fallen nur zurück, wenn zu viele Bedürfnisse fehlen **[B]**.

### 2.3 Freischaltung nach Einwohnerzahl
Gebäude schalten sich bei **absoluter Einwohnerzahl einer Stufe** frei (nicht bei Stufe allein), plus Forschung und Belohnungsbauten **[W]/[B]**. Vollständige Liste in `anno1503-gebaeudedaten.md`, Abschnitt 6. Schlüsselwerte: Kapelle 125 Pioniere, Wirtshaus (klein) 80 Pioniere, Schule 50 Siedler, Kirche 240 Siedler, Universität 400 Bürger, Badehaus 600 Bürger, Theater und Pavillon 1500 Kaufleute, Schmuck-/Weinstand und Aristokratenhäuser 1900 Kaufleute.
Markthaupthaus 2 bei 50 Siedlern (Wiki-Text; Tabelle nennt 20), Markthaupthaus 3 bei 200 Bürgern **[W]**.

### 2.4 Prunkbauten **[B]**
Kathedrale (8x6, 12.000 Münzen) ab 600 Aristokraten, nur einmal. Schloss: Hauptteil ab 1000, weitere Teile ab 3000, alle (200 + Hauptteil) ab 5000 Aristokraten.

---

## 3. Märkte, Lager und Versorgung (Kernlogik) **[W]**

### 3.1 Siedlungsfläche und Einzugsbereiche
- Jedes **Kontor** und **Markthaupthaus** hat einen kreisförmigen Einzugsbereich (Radius **22** Felder bei Markthaus). Alle Einzugsbereiche zusammen bilden die **Siedlungsfläche**, nur dort darf gebaut werden.
- **Die Existenz aller Bauwerke hängt am Einzugsbereich eines Kontors/Markthauses.** Reißt man ein Markthaus ab, **verfallen sofort alle Gebäude**, die in keinem anderen Einzugsbereich liegen. Überbauen (Markthaus 2 über 1) ist erlaubt, zuerst abreißen nicht.
- Wohnhäuser haben einen eigenen Einzugsbereich (22): Dort müssen alle benötigten Gebäude und Stände zu finden sein, sonst wird der Bedarf nicht gedeckt. Die Gebäude müssen **von einer Seite erreichbar** sein (Schule und Kirche sind problematisch).
- Der angezeigte Einzugsbereich **öffentlicher** Gebäude dient nur zur groben Orientierung. **Entscheidend ist der Einzugsbereich des Wohnhauses.** Feuerwehr und Medikus: umgekehrt, das **Haus** muss im Einzugsbereich der Feuerwehr/des Arztes liegen.
- Bedeutungslos für die Bedürfnisse: Bibliothek (erhöht nur Wissenspunkte), Amtsgericht, Galgen, alle Zieranlagen. Der Radius des Pavillons hat keine Funktion.

### 3.2 Ein Lager je Insel
- Alle Waren liegen im **gemeinsamen Inselbestand**. Was ein Karrenfahrer in irgendein Kontor/Markthaus liefert, ist **überall** auf der Insel verfügbar, auch an jedem Marktstand.
- **Marktstände haben kein eigenes Lager und brauchen keinen Nachschub.** Ihr Radius ist bedeutungslos. Sie können beliebig weit vom Markthaus stehen, entscheidend ist nur, dass sie im Einzugsbereich des Wohnhauses liegen.
- Das **Wirtshaus** holt Alkohol selbst (Wirt geht aus dem Wirtshaus bis zu 18 bzw. 23 Felder zu Kontor, Markthaus, Kartoffelfarm, Brauerei oder Rumbrennerei). Wirtshäuser sollten nahe am Markthaus stehen.
- **Lagerkapazität je Ware und Insel:** erstes Kontor/Markthaus 50 t, danach insgesamt 70, 90, 110, 130, 150 t, dann nur noch +10 t je weiterem Kontor/Markthaus bis zum Maximum. Maximum **190 t** (Classic bis 1.04), **900 t** (Add-on und Königsedition). Kontor/Markthaus Stufe 2 und 3 erhöhen die Kapazität nicht.
- Zum Aufstieg muss zunächst die Ware **vorhanden** sein, zum Erhalt der Stufe muss sie **dauerhaft** in genügender Menge bereitstehen.
- Der Baumaterialbestand der Insel steht in der Infoleiste. Werften brauchen keinen Einzugsbereich und greifen direkt auf den Inselbestand zu. Bergwerke und Brüche haben keinen Einzugsbereich und brauchen keinen Nachschub.

### 3.3 Karrenfahrer
- Kontor I und Markthaus 1 haben **1 Karrenfahrer**, alle höheren Stufen **2**. Pro Fahrt höchstens **5 t**. Sie brauchen eine **durchgehende Wegverbindung** zum Betrieb, die vollständig im Einzugsbereich ihres Heimatgebäudes liegt. Das Abholen lässt sich nicht abschalten.
- Betriebe in mehreren Einzugsbereichen werden von allen dortigen Karrenfahrern bedient.
- **Handwerksbetriebe holen Rohstoffe selbst direkt beim Erzeuger** (Farm, Mine, Vorstufe) oder aus dem Lager. Darum bauen Spieler **Kombinate**: Erzeuger und Verarbeiter eng beieinander, nur der letzte Betrieb liegt an der Straße. Spart Wegefläche und Karrenkapazität, aber kein Lagerbestand der Zwischenwaren.
- Wege: Karrenfahrer und Wirte brauchen Wege. Medikus, Feuerwehr, Schule, Kirche u. ä. brauchen **keinen** Straßenanschluss (löschen/heilen „querfeldein“).

### 3.4 Kontor- und Markthaus-Stufen **[W]**
| Stufe | Voraussetzung | Material | Münzen | Unterhalt | Karrenfahrer |
|---|---|---|---|---|---|
| Markthaus 1 | keine | 3 Werkzeug, 7 Holz | 250 | 10 | 1 |
| Markthaus 2 | 50 Siedler | 5 Werkzeug, 12 Holz | 500 | 10 | 2 |
| Markthaus 3 | 200 Bürger | 10 Werkzeug, 8 Holz, 12 Ziegel | 800 | 10 | 2 |
| Kontor 1 | keine | 5 Werkzeug, 12 Holz | 350 | 15 | 1 |
| Kontor 2 | 50 Siedler | 5 Werkzeug, 12 Holz | 500 | 25 | 2 |
| Kontor 3 | 200 Bürger | 10 Werkzeug, 8 Holz, 12 Ziegel | 800 | 35 | 2 |

Classic (bis 1.04): Kontor/Markthaus werden **automatisch** mit der Stufe hochgerüstet, und die Unterhaltskosten steigen entsprechend. Add-on: frei wählbar, alle drei Stufen nebeneinander möglich.

### 3.5 Preise
Marktstandpreise je Tonne (Richtwerte aus dem Strategieguide **[B]**): Nahrung 45–50, Stoffe 75–80, Leder 80, Kleidung 140–145, Seidenstoffe 90–95, Salz 38–43, Tabakwaren 85–95, Gewürze 70–80, Lampenöl 90, Wein 75, Schmuck 205–210. Preise sind nur über Cheats änderbar **[B]**. Handelspreise im Kontor: Salz bei Standardpreisen etwa 22 Taler/t (Verkauf), Seidenstoff etwa 73 Taler/t (Einkauf) **[W]** (Beispiel auf der Völker-Seite).

### 3.6 Verbrauch und Bedarfsrechner **[B]**
Es gibt keine veröffentlichte Tonnen-pro-Einwohner-Tabelle. Aus `bgruppen.dat`: *Einwohner je Betrieb = Produktion bei 100 % (t/min) × 100 / Menge* **[B]**. Der Rechner von mitret.de (Version 1.0, auf Basis von 10.000 zufriedenen Kaufleuten optimiert, „ausgeglichen“) ergibt, wie viele **Kaufleute** je Betrieb versorgt werden:

| Betrieb | Kaufleute je Betrieb | Betriebe je 1000 Kaufleute |
|---|---|---|
| Fischer | 100 | 10,0 |
| Schaffarm | 303 | 3,3 |
| Weberei (groß) | 909 | 1,1 |
| Brauerei | 476 | 2,1 |
| Hopfenfarm | 238 | 4,2 |
| Tabakverarbeitung | 500 | 2,0 |
| Tabakplantage | 179 | 5,6 |
| Gewürzplantage | 278 | 3,6 |
| Färberei | 500 | 2,0 |
| Seidenplantage | 200 | 5,0 |
| Indigoplantage | 500 | 2,0 |
| Saline, Salzbergwerk (je) | 2500 | 0,4 |
| Transiederei | 1667 | 0,6 |
| Walfänger | 3333 | 0,3 |

Typische Siedlungen laut Wiki **[W]**:
- **Pioniere, 24 Häuser = 192 Personen:** 2 Jäger + 1 Gerberei, 2 Schaffarmen + 1 Webstube, 2 Kartoffelfarmen.
- **Siedler, 24 Häuser = 360:** dazu 2 Rinderfarmen + 1 Fleischerei, Weberei statt Webstube, 2 Hopfenfarmen + 1 Brauerei (oder 2 Zuckerrohr + 1 Rumbrennerei), 2 Tabakplantagen + 1 Verarbeiter, 2 Gewürzplantagen.
- **Bürger, 40 Häuser = 1120:** zusätzlich 4 Getreidefarmen + 2 Mühlen + 1 Bäckerei, 1 Salzmine + 1 Saline, 1 Walfänger + 1–2 Transiedereien, 4 Seidenplantagen + 2 Indigo + 2 Färbereien.
- **Kaufleute, 48 Häuser = 2016:** 8 Getreide + 4 Mühlen + 2 Bäckereien, 8 Tabak + 4 Verarbeiter, 6 Gewürze, 8 Seide + 4 Indigo + 4 Färbereien.
- **Aristokraten, 48 Häuser = 1440:** 16 Getreide + 8 Mühlen + 4 Bäckereien, 4 Schneidereien, 1 Pelztierjäger, 5–6 Weingüter, Goldmine + Edelsteinmine + Goldschmied (2–3 mal).

---

## 4. Welt, Klima, Fruchtbarkeit

### 4.1 Sechs Klimazonen **[W]**
Jede Insel gehört **genau einer** Zone. Überall außer Polar wachsen Bäume, Gras, **Kartoffeln, Hanf, Getreide**. Überall gibt es Eisenerz, Fisch und Stein.

| Zone | Eigenheiten | Bodenschätze | Völker |
|---|---|---|---|
| **Polar** | Eis und Fels, kein Pflanzenwuchs. Fisch, Pelztiere, Grauwale. Nur Pioniere ohne Hilfe ansiedelbar | Eisenerz, Stein (Salz/Marmor nur in Szenarien) | Inuit |
| **Tundra** | Karge Wiesen, Nadelwald, Jäger und Trapper, Walfang | Eisenerz, **Salz** | Mongolen |
| **Nord** | Gemäßigt. Wein, **Hopfen**, **Heilkräuter**. Wenige Pelztiere. Beste Siedlungszone | Eisenerz, Stein, **Salz**, **Marmor (nur hier)** | Mongolen, Indianer, Piratensiedlungen |
| **Prärie** | Wald und Trockengebiete. **Wein, Tabak, Baumwolle**. Nur Jäger, keine Pelztiere | nur Eisenerz, Stein | Indianer |
| **Steppe** | Spärliches Gras, Trockenheit. **Wein, Gewürze**. Reichhaltige Fauna, Pelztiere (Strauß, Gepard) ab Add-on | Eisenerz, Stein, **Edelstein**, selten Gold | Afrikaner, Beduinen, Mauren, Polynesier, selten Azteken |
| **Dschungel** | Sehr ertragreich. **Zuckerrohr, Baumwolle, Indigo, Seide (Maulbeer)**. Keine Pelztiere ab Add-on | Eisenerz, Stein, **Gold**, selten Edelstein | Azteken, Polynesier, Afrikaner |

- Die Salzmine kann **nicht in südlichen Zonen** gebaut werden (Dschungel-Salzvorkommen sind unbrauchbar).
- Beim Hovern über der Küste zeigt die Infoleiste die wachsenden Nutzpflanzen der Insel. Beim Bauen zeigt der **Fruchtbarkeitsbalken** (grün = gut) die Ergiebigkeit des Bodens.
- **Brunnen** (Forschung) verbessern die Fruchtbarkeit nur bis 100 % und schützen gegen Dürre **[B]**.

### 4.2 Völker (fremde Kulturen) **[W]**
Kleine Siedlungen mit 80 bis 120 Einwohnern, oft auf kleinen Inseln. **Nur Tauschhandel** (kein Geld), immer ohne Vertrag möglich, reagieren aggressiv, wenn man ihr Gebiet mit Truppen betritt (Landesinnere nur mit Scout erkunden). Jedes Volk hat Überschuss an einer Ware:

| Volk | Gibt | Will | Kontor? |
|---|---|---|---|
| Afrikaner | Heilkräuter | Tabak (+ Tierhäute ab Add-on) | ja |
| Azteken | Gold | Gewürze (+ Hanf) | nie (Scout) |
| Beduinen | Gewürze | Salz (+ Schlachtvieh) | nie (Scout) |
| Eskimos | Lampenöl (+ Walspeck) | Stoffe (+ Salz) | meist ja |
| Indianer | Stoffe (+ Tierhäute) | Tabak | nie (Scout) |
| Mongolen | Eisen | Alkohol (+ Felle) | nie (Scout) |
| Polynesier | Seidenstoffe (+ Tierhäute) | Salz | meist ja |
| Mauren | Edelsteine | Seidenstoffe | – |

Die Mengen sind klein (Nachfrage gering), für den Spielfortgang meist unwichtig. Beispiel Kurs: 17 t Seidenstoff für 26 t Salz **[W]**.

---

## 5. Forschung **[W]**
- Schule (ab 50 Siedlern) und Universität (ab 400 Bürgern) erzeugen **Wissenspunkte (WP)**, begrenzt je nach Stufe und Einrichtung (Strategieguide: bis 25 mit Siedlern und Schule, 70 mit 600 Bürgern + Universität, 100 mit Kaufleuten + Universität + Bibliothek **[B]**). Die Bibliothek (Forschung 60 WP, 2000 Münzen, ab 600 Bürgern) hebt den Maximalwert (+10 je Bibliothek).
- Jede Forschung kostet **Wissenspunkte und Münzen**, teils mit Einwohnerschwelle und Universität.
- Schule: nur bestimmte Techniken. Universität: alle Gebiete.

| Forschung | Münzen | WP | Schwelle |
|---|---|---|---|
| Brunnen | 50 | 5 | – |
| Feuerwehr (nach Brunnen) | 50 | 5 | – |
| Weberei | 300 | 20 | – |
| Tiefer Brunnen | 200 | 20 | – |
| Steinbrücke | 200 | 30 | 200 Bürger |
| Medikus (+ Heilkräuterplantage) | 200 | 50 | 200 Bürger |
| Große Erzmine | 500 | 40 | 200 Bürger |
| Amtsgericht | 200 | 30 | 400 Bürger |
| Schnelle Heilung | 500 | 60 | 600 Bürger |
| Bibliothek | 2000 | 60 | 600 Bürger |
| Schiffskanone | 300 | 18 | – |
| Mittleres Handelsschiff | 400 | 25 | 170 Siedler |
| Mittleres Kriegsschiff | 600 | 40 | 200 Bürger |
| Großes Handelsschiff (+ große Werft) | 800 | 50 | 200 Bürger |
| Großes Kriegsschiff | 1000 (Seite: 100, vermutlich Tippfehler) | 60 | 600 Bürger |
| Verstärkter Rumpf | 1000 | 70 | 600 Bürger |
| Schwerter 100/7, Bogen 120/8, Lanzen 200/10, Katapult 200/15, Kavallerie 100/7, Belagerungsturm 100/5, Brandpfeile 250/20, Armbrust 150/15, Muskete 500/30, Radschloss 500/40, weitere Pfeil-/Armbrust-Verbesserungen | | | |

Die Pest bricht ab etwa 1500 Einwohnern regelmäßig aus **[B]**, daher Medikus und Heilkräuter vorher erforschen.

---

## 6. Handel, Diplomatie, Piraten

### 6.1 Kontor-Handel **[W]**
- Im Kontormenü pro Ware **Verkauf** und **Einkauf** mit Menge und Preis einstellen (Reiter Verkauf/Einkauf, Bestandsübersichten Rohstoffe, Baumaterialien, Bedarfsgüter, Waffen).
- **Venezianer** (freie Händler) sichern die Grundversorgung: Sie verkaufen **immer Werkzeug**, **Eisen** (Wiki: Eisen, nicht Erz, vermutlich unbeabsichtigt; liefern, wenn mindestens ein Spieler eine Erzmine betreibt). Andere Waren nur, wenn ein Markt mit Angebot und Nachfrage existiert. Sie kaufen nur sehr begrenzt. **Aristokratenwaren** werden nicht gehandelt (Computerspieler entwickeln keine Aristokraten). Krieg gegen sie ändert nichts am Handel, neue Schiffe tauchen immer auf. Sie greifen feindliche Schiffe ohne weiße Flagge an.
- Handel mit anderen Spielern nur mit **Handelsvertrag** (Frieden) **[B]**.

### 6.2 Automatische Handelsrouten **[W]**
- Pro Schiff eine Liste von Kontoren (Wegpunkte) per Fahnen-Klick. Je Kontor Be- und Entladung: je Schiff mehrere **Ladebuchten à 50 t**, je Ware ein Schieberegler (ganz oben = 50 t).
- Ab **Version 1.05, Add-on, Königsedition** steht der Regler für den **Ladestand im Schiff** („bis X t auffüllen“), mehrere Waren pro Schiff sind sicher. In älteren Versionen ist es die **Zuladungsmenge pro Hafen**, mehrere Waren pro Schiff füllen das Schiff mit einer Ware.
- Ist im Hafen nicht genug da, wird nur geladen, was da ist. Passt die Entlademenge nicht ins Kontor, bleibt der Rest im Schiff. Empfehlung: Entlademenge höher als die Zuladung einstellen.
- Schiffsverhalten: weiße Flagge (friedlich) oder bewaffnet.

### 6.3 Piraten **[W]**
- Sie überfallen Schiffe, beschießen sie und nehmen die Ladung. Abschaltbar beim Spielstart.
- **Weiße Flagge** schützt fahrende Schiffe. **Bewaffnete** Handelsschiffe halten an und kämpfen (Reparatur an der Werft, Gefahr zu sinken), **unbewaffnete** fahren weiter und nehmen nur wenige Treffer. Ein **geankertes beladenes** Schiff mit weißer Flagge wird nicht angegriffen, aber **ausgeräumt**.
- Piratenkontor (wenn ein unbewaffnetes Schiff ankert): Handel (Piraten verkaufen Nahrung und Beute, kaufen nichts), **Schutzgeld** (Höhe nicht beeinflussbar), **Auftrag**, einen Mitspieler anzugreifen.
- Piraten gründen später kleine Siedlungen auf unbewohnten Inseln.

---

## 7. Katastrophen und Ereignisse
- **Erdbeben** (Add-on): zufällig, abschaltbar, nur in Siedlungen gefährlich: Häuser stürzen ein, **Brände** entstehen. Anzeige in der Infoleiste (rote Wellenlinien) **[W]**.
- **Feuer:** entsteht bei Pionier-/Siedlerhäusern von selbst, sonst durch Beschuss, Aufstände, Erdbeben, Vulkane. In dichten Siedlungen **springt es über**, auch auf das Markthaus (dann kann ein ganzer Stadtteil verloren gehen). Feuerwehr löscht selbstständig im Einzugsbereich (23). Ohne Feuerwehr hilft nur Abriss des brennenden Hauses **[W]**.
- **Pest:** Medikus (Praxis 4x4) heilt Hausbewohner im Einzugsbereich, braucht Heilkräuter (Nordzone). Auch Aristokraten sind betroffen. Arbeiter werden nicht krank. Meldung „Die Pest wütet in Eurer Stadt!“ **[W]**.
- **Dürre**, **Vulkanausbruch**, **Aufstände** bei Unzufriedenheit: laut Presse vorhanden **[C]**, Details nicht gefunden **[?]**.

---

## 8. Militär (Kurzfassung)
Landeinheiten und Gebäude siehe `anno1503-gebaeudedaten.md` 5. Grenzen: höchstens 100 Landeinheiten, bevölkerungsabhängig (Siedler 60, Bürger 80, Kaufleute 100), Schiffe höchstens 40 **[B]**. Einheiten haben Unterhalt. Zerstören von Lager/Markt erobert Gebiet **[B]**. Entern gegnerischer Schiffe gibt es mit dem Add-on **[C]**.

---

## 9. Erweiterungen und Verkauf **[C]**
Add-on „Schätze, Monster & Piraten“ (2003): 12 Szenarien, 3 Endlosspiele, Entern, neue Gegner, 10 neue Haustypen, automatische Pflanzfunktion (Felder setzt man in der Grundversion von Hand), Lager bis 900 t. Mehrspieler fehlte zum Start, kam 2020 mit der History Collection. Über 2 Mio. verkaufte Exemplare bis 2006.

---

## 10. Wirkung auf unser Spiel (Beobachtungen, nichts geändert)

**Passt gut:** Keine Steuern; fünf Stufen mit 8/15/28/42/30; Aristokraten ab 1900 Kaufleuten und **Zusammenbruch statt Rückfall** (bestätigt); Kombinat-Verhältnisse (Brot 4:2:1, Fleisch 2:1, Hopfen 2:1, Rum 2:1, Stoff 2:1 bzw. 3:1, Lampenöl 1:2); die Radien der öffentlichen Gebäude in `docs/anno1503-analyse.md` (Kapelle 19, Kirche 21, Badehaus 22) sind durch die Wiki-Tabelle **bestätigt** (nicht gegen unseren Code geprüft); und ein gemeinsames **Inselinventar** mit Marktständen ohne eigenes Lager.

**Weicht ab:**
1. **Bedürfnisse:** Im Original gibt es **Wahlregeln** (zwei von drei, drei von fünf, fünf von sechs), nicht feste Pflichten. Salz ist ein vollwertiger Ersatz, nicht nur ein „Bonus“. Schule und Universität sind Pflicht, Kirche ersetzt die Kapelle. Bei uns hat jede Stufe feste Bedürfnisse mit Salz als Ersatz.
2. **Aristokraten:** brauchen Nahrung, Kleidung, Kirche, Badehaus, Theater, Pavillon. Schmuck und Wein sind nur Zusatzverkäufe. Bei uns sind Schmuck, Wein, Theater und Kathedrale Pflicht, Kleidung fehlt.
3. **Aufstiegsmaterial** (`tiers.json`): Siedler Original 1 Werkzeug/4 Holz, bei uns 1/3/0. Bürger Original 2 Werkzeug/2 Holz/4 Ziegel, bei uns 2/4/4. Kaufleute Original 5/5/4, bei uns 3/5/8.
4. **Markthaus/Kontor:** Original 3 Ausbaustufen (50 Siedler, 200 Bürger), 1 bis 2 Karrenfahrer mit 5 t, Lager 50 t je Ware, Maximum 190 oder 900 t. Bei uns nicht modelliert.
5. **Siedlungsfläche und Abriss:** Gebäude verfallen, wenn ihr Markthaus fehlt. Bei uns zu prüfen.
6. **Klima:** Tabak nur Prärie, Gewürze nur Steppe, Wein in Nord/Prärie/Steppe, Seide/Indigo/Zucker/Baumwolle im Dschungel, Marmor nur Nord, Salz nur Nord/Tundra, Edelstein Steppe, Gold Steppe/Dschungel. Unsere `climates.json` setzt Tabak und Gewürze in Steppe **und** Dschungel, Wein fehlt in der Nordzone (Original: Nord, Prärie, Steppe). Vorkommen (Salz, Marmor, Gold) stehen in `land.json` und wurden nicht verglichen.
7. **Freischaltung** nach Einwohnerzahl, **Forschung** (Wissenspunkte) und **Brunnen/Dürre** fehlen.
8. **Katastrophen:** Pionier-/Siedlerhäuser brennen von selbst (Feuerwehr früh nötig), Feuer springt über, Pest ab ca. 1500 Einwohnern.
9. **Wohnhausgröße:** Original 4x4, bei uns 2x2 (Projektentscheidung).

---

## 11. Quellen
- AnnoWiki 1503 (1503.annowiki.de, Snapshots über web.archive.org, 2022): Seiten Bedürfnisse, Pioniere, Siedler, Bürger, Kaufleute, Aristokraten, Einflussbereich, Markthaupthaus, Kontor, Lager, Karrenfahrer, Kombinat, Staatshaushalt, Klimazonen, Völker, Venezianer, Piraten, Handelsroutenmenü, Feuerwehr, Medikus, Erdbeben, Endlosspiel, Forschung (4 Gebiete), Öffentliche Gebäude, Farmen und Plantagen, Handwerksbetriebe, Bergwerke und Minen, Küstengebäude. Beispiel: http://1503.annowiki.de/index.php?title=Bedürfnisse
- mitret.de, Bedarfsrechner: http://mitret.de/anno1503.html
- World of Anno, Gebäudeübersicht (Archiv): http://anno.worldofplayers.de/gebaeude-1503
- Strategieguide (Datenanhang): https://strategygamers.com/walkthrough/anno-1503-the-new-world
- AnnoZone: https://www.annozone.de/forum/thread/1284-gebaeude-informationen-part-1/ , https://www.annozone.de/forum/thread/2541-gebaeudeliste/ , https://www.annozone.de/forum/thread/9500-warenverbrauch-und-produktion/ , https://www.annozone.de/wiki-anno1503/record/219-bildung-und-wissen/
- Presse: https://www.pcgames.de/Anno-1503-Aufbruch-in-eine-neue-Welt-Spiel-17999/Tipps/Anno-1503-Zweite-Stadt-errichten-125900/ , https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/komplettloesung/komplettloesung-4614 , https://www.gameswelt.de/anno-1503-aufbruch-in-eine-neue-welt/test/anno-1503-aufbruch-in-eine-neue-welt-3754/2 , https://www.gamestar.de/artikel/anno-1503,1330008,seite3.html , https://en.wikipedia.org/wiki/Anno_1503

## 12. Offene Fragen
- Exakter Verbrauch je Einwohner und Stufe (Strategiebuch, `bgruppen.dat`).
- Preisbildung und Schwankungen im Kontor-Handel.
- Dürre, Vulkan, Aufstände: Auslöser und Zahlen.
- Weitere Wiki-Seiten (Schiffsliste, Armee, Waffen, Widerstand, Gerechtigkeit) liegen als Snapshot vor, wurden aber noch nicht ausgewertet.
