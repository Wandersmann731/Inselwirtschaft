# Grafikliste für Inselwirtschaft

Alle Grafiken, die das Spiel für Phase 7 braucht: **175 Dateien**. **Stand:** Alle Dateien sind bereits mit dem ImageGen-Werkzeug erzeugt und liegen fertig zugeschnitten in `art/` (erstellt mit `scripts/assets`, siehe dort die `README.md`). Der Einbau ins Spiel (Sprite-Atlas statt Platzhalterformen) ist Teil von Phase 7. Die Tabellen entstehen aus den Spieldaten (`scripts/make-asset-list.py`), die Datei `docs/grafiken.csv` enthält dieselbe Liste mit fertigen Prompts je Zeile.

## 1. Wichtig vorab

- **Keine Anno-Bezüge:** In keinem Prompt Namen, Bilder oder Stile von Anno nennen oder hochladen. Alles muss eigenes Design sein.
- **Perspektive:** Das Spiel nutzt eine isometrische Karte mit Rautenkacheln im Verhältnis 2:1. Alle Gebäude, Gelände und Straßen müssen genau in diese Raute passen. Das ist für KI-Bildgeneratoren schwer. Deshalb zuerst ein Stilbild festlegen (siehe Abschnitt 4) und danach die Raute als Vorlage mitgeben.
- **Maßstab:** Das Spiel zeigt 64 x 32 px je Kachel. Die Grafiken sollen in doppelter Auflösung (128 x 64 px je Kachel) kommen, damit sie auf Handys mit hoher Pixeldichte scharf bleiben. Das Spiel skaliert sie herunter.
- **Dateiformat:** PNG mit Transparenz (RGBA, 8 Bit je Kanal, sRGB). Keine JPG, keine WebP, keine Animations-GIFs. Animationen kommen als einzelne nummerierte PNGs.
- **Hintergrund:** Die meisten KI-Werkzeuge liefern keine echte Transparenz. Lasse deshalb auf einfarbigem **Magenta (#FF00FF)** erzeugen (kommt im Spiel nirgends vor). Das Magenta wird später per Skript entfernt und die Bilder werden in einen Atlas sortiert. Wenn dein Werkzeug echte Transparenz kann, ist das auch gut.
- **Licht:** Immer von links oben. Keine geworfenen Schatten auf den Boden, nur weiche Eigenschatten am Gebäude. Dann kann ich Gebäude spiegeln, wenn sie gedreht werden.
- **Keine Schrift in den Bildern** (außer im Logo).

## 2. Größen und Anker (Gebäude)

Eine Kachel ist im doppelten Maßstab **128 x 64 px**. Ein Gebäude mit `w x h` Kacheln steht auf einer Raute, die `(w + h) x 64` px breit und `(w + h) x 32` px hoch ist.

- **Bildbreite** = `(w + h) x 64` px.
- **Bildhöhe** = `(w + h) x 32` px (Raute) plus die Höhe des Gebäudes über dem Boden (steht in der Tabelle).
- Die Grundfläche liegt **unten im Bild**. Bei quadratischen Gebäuden ist sie eine Raute, bei 3x4, 7x6 und Ähnlichem ein Parallelogramm. Mit `E` = Höhe über dem Boden (Tabelle) hat sie diese Ecken im Bild: oben `(h x 64, E)`, rechts `((w + h) x 64, E + w x 32)`, unten `(w x 64, E + (w + h) x 32)`, links `(0, E + h x 32)`. Ihre untere Spitze liegt immer auf der unteren Bildkante, aber nur bei quadratischen Gebäuden in der Mitte.
- Wände beginnen an den Kanten der Grundfläche. Dächer dürfen nach oben ragen, aber nie über die Bildränder.
- **Fertige Vorlagen** für jede Datei liegen in `docs/vorlagen/` (siehe dort die `README.md`).
- Nicht quadratische Gebäude (3x4, 7x6, 6x5, 6x7, 8x6) liefere nur in **einer** Ausrichtung. Gedrehte Gebäude entstehen im Spiel durch Spiegeln.

## 3. Die Liste

### Gelände

Jede Kachel ist eine **nahtlose Raute** (128 x 64 px), außerhalb der Raute transparent. Die Varianten sollen sich nur im Detail unterscheiden, damit das Muster nicht auffällt. Wasser besteht aus 8 Bildern einer nahtlosen Wellen-Schleife. Wald: Bäume bleiben innerhalb der Raute.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `water_1` | `terrain/water_1.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 1 of 8 |
| `water_2` | `terrain/water_2.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 2 of 8 |
| `water_3` | `terrain/water_3.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 3 of 8 |
| `water_4` | `terrain/water_4.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 4 of 8 |
| `water_5` | `terrain/water_5.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 5 of 8 |
| `water_6` | `terrain/water_6.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 6 of 8 |
| `water_7` | `terrain/water_7.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 7 of 8 |
| `water_8` | `terrain/water_8.png` | 128x64 | 1x1 Kachel | calm blue sea water surface with gentle light ripples, tileable, variant 8 of 8 |
| `beach_1` | `terrain/beach_1.png` | 128x64 | 1x1 Kachel | pale sand with a few pebbles and shells, tileable, variant 1 of 3 |
| `beach_2` | `terrain/beach_2.png` | 128x64 | 1x1 Kachel | pale sand with a few pebbles and shells, tileable, variant 2 of 3 |
| `beach_3` | `terrain/beach_3.png` | 128x64 | 1x1 Kachel | pale sand with a few pebbles and shells, tileable, variant 3 of 3 |
| `grass_1` | `terrain/grass_1.png` | 128x64 | 1x1 Kachel | lush green meadow with small flowers and tufts, tileable, variant 1 of 4 |
| `grass_2` | `terrain/grass_2.png` | 128x64 | 1x1 Kachel | lush green meadow with small flowers and tufts, tileable, variant 2 of 4 |
| `grass_3` | `terrain/grass_3.png` | 128x64 | 1x1 Kachel | lush green meadow with small flowers and tufts, tileable, variant 3 of 4 |
| `grass_4` | `terrain/grass_4.png` | 128x64 | 1x1 Kachel | lush green meadow with small flowers and tufts, tileable, variant 4 of 4 |
| `forest_1` | `terrain/forest_1.png` | 128x64 | 1x1 Kachel | dense green forest floor with 3 to 5 round-crowned trees, tileable, trees stay inside the tile diamond, variant 1 of 4 |
| `forest_2` | `terrain/forest_2.png` | 128x64 | 1x1 Kachel | dense green forest floor with 3 to 5 round-crowned trees, tileable, trees stay inside the tile diamond, variant 2 of 4 |
| `forest_3` | `terrain/forest_3.png` | 128x64 | 1x1 Kachel | dense green forest floor with 3 to 5 round-crowned trees, tileable, trees stay inside the tile diamond, variant 3 of 4 |
| `forest_4` | `terrain/forest_4.png` | 128x64 | 1x1 Kachel | dense green forest floor with 3 to 5 round-crowned trees, tileable, trees stay inside the tile diamond, variant 4 of 4 |
| `mountain_1` | `terrain/mountain_1.png` | 128x64 | 1x1 Kachel | grey rocky mountain tile with jagged cliffs and a few snow-free peaks, tileable, variant 1 of 4 |
| `mountain_2` | `terrain/mountain_2.png` | 128x64 | 1x1 Kachel | grey rocky mountain tile with jagged cliffs and a few snow-free peaks, tileable, variant 2 of 4 |
| `mountain_3` | `terrain/mountain_3.png` | 128x64 | 1x1 Kachel | grey rocky mountain tile with jagged cliffs and a few snow-free peaks, tileable, variant 3 of 4 |
| `mountain_4` | `terrain/mountain_4.png` | 128x64 | 1x1 Kachel | grey rocky mountain tile with jagged cliffs and a few snow-free peaks, tileable, variant 4 of 4 |

### Straßen

16 Kacheln für alle Verbindungen. Die Namen zeigen die Richtungen, in die die Straße weitergeht: n = oben rechts, e = unten rechts, s = unten links, w = oben links (auf dem Bildschirm). Die Arme enden genau in der Mitte der Rautenkante, damit sie an Nachbarkacheln anschließen.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `road_none` | `roads/road_none.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, a small isolated patch of path in the middle, no connections |
| `road_n` | `roads/road_n.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen) |
| `road_e` | `roads/road_e.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-right (south-east on screen) |
| `road_ne` | `roads/road_ne.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-right (south-east on screen) |
| `road_s` | `roads/road_s.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-left (south-west on screen) |
| `road_ns` | `roads/road_ns.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-left (south-west on screen) |
| `road_es` | `roads/road_es.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-right (south-east on screen), down-left (south-west on screen) |
| `road_nes` | `roads/road_nes.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-right (south-east on screen), down-left (south-west on screen) |
| `road_w` | `roads/road_w.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-left (north-west on screen) |
| `road_nw` | `roads/road_nw.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), up-left (north-west on screen) |
| `road_ew` | `roads/road_ew.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-right (south-east on screen), up-left (north-west on screen) |
| `road_new` | `roads/road_new.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-right (south-east on screen), up-left (north-west on screen) |
| `road_sw` | `roads/road_sw.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-left (south-west on screen), up-left (north-west on screen) |
| `road_nsw` | `roads/road_nsw.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-left (south-west on screen), up-left (north-west on screen) |
| `road_esw` | `roads/road_esw.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards down-right (south-east on screen), down-left (south-west on screen), up-left (north-west on screen) |
| `road_nesw` | `roads/road_nesw.png` | 128x64 | 1x1 Kachel | cobblestone path tile with brown packed earth edges, path arms leave the tile centre towards up-right (north-east on screen), down-right (south-east on screen), down-left (south-west on screen), up-left (north-west on screen) |

### Wohnhäuser

Alle Wohnhäuser stehen auf 2x2 Kacheln. Die fünf Stufen sollen sich klar in Größe und Pracht unterscheiden, so dass man sie am Handy auf einen Blick erkennt. Dazu kommt die Ruine.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `house_pioneers` | `buildings/house_pioneers.png` | 256x224 | 2x2 | small simple wooden settler hut with a thatched roof, rough timber walls, one door, tiny chimney |
| `house_settlers` | `buildings/house_settlers.png` | 256x240 | 2x2 | timber-framed cottage with whitewashed plaster walls, wooden shingle roof, small fenced garden |
| `house_citizens` | `buildings/house_citizens.png` | 256x272 | 2x2 | two-storey half-timbered townhouse with red clay tile roof and shuttered windows |
| `house_merchants` | `buildings/house_merchants.png` | 256x288 | 2x2 | stately three-storey merchant house with stone ground floor, gabled tile roof, balcony and a trade sign |
| `house_aristocrats` | `buildings/house_aristocrats.png` | 256x304 | 2x2 | elegant manor house of cream-coloured stone with a slate mansard roof, columns and ornamental dormers |
| `house_ruin` | `buildings/house_ruin.png` | 256x192 | 2x2 | collapsed, burnt-out ruin of a stately house with broken walls and charred beams, no roof, a little smoke |

### Marktstände

Stände sind 1x1 Kachel groß und klein. Sie sollen sich durch die Ware und die Farbe der Markise deutlich unterscheiden.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `food_salt_stand` | `buildings/food_salt_stand.png` | 128x128 | 1x1 | small market stall with a striped awning, baskets of bread, fish and sacks of salt |
| `cloth_stand` | `buildings/cloth_stand.png` | 128x128 | 1x1 | small market stall with striped awning, rolls of cloth, leather hides and bolts of silk |
| `drink_stand` | `buildings/drink_stand.png` | 128x128 | 1x1 | small market stall with barrels, bottles of spirits and wine, striped awning |
| `tobacco_spice_stand` | `buildings/tobacco_spice_stand.png` | 128x128 | 1x1 | small market stall with bundles of tobacco leaves and bowls of colourful spices, striped awning |
| `lamp_oil_stand` | `buildings/lamp_oil_stand.png` | 128x128 | 1x1 | small market stall with oil lamps and clay oil jugs, striped awning |
| `jewelry_stand` | `buildings/jewelry_stand.png` | 128x128 | 1x1 | small elegant market stall with a velvet display of necklaces, rings and gems, fine awning |

### Öffentliche Gebäude

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `chapel` | `buildings/chapel.png` | 448x384 | 3x4 | small stone chapel with a slate roof and a little bell tower |
| `tavern` | `buildings/tavern.png` | 448x384 | 3x4 | large timber inn with a hanging tankard sign, warm lit windows and barrels by the door |
| `church` | `buildings/church.png` | 832x640 | 7x6 | large stone church with a tall steeple, long nave, buttresses and a round rose window |
| `bathhouse` | `buildings/bathhouse.png` | 704x512 | 6x5 | bathhouse in classical style with a domed roof, columns, steam rising and a pool courtyard |
| `theater` | `buildings/theater.png` | 832x608 | 6x7 | renaissance theatre with a half-round arena building, decorated facade, banners and stairs |
| `cathedral` | `buildings/cathedral.png` | 896x736 | 8x6 | grand gothic cathedral with two tall towers, flying buttresses, stained glass windows |

### Produktionsbetriebe

Alle Betriebe stehen auf 2x2 Kacheln. Felder und Plantagen sollen den Boden der Raute **ausfüllen**, damit sie wie ein bepflanztes Feld mit kleinem Gebäude wirken. Steinbruch, Minen und Goldmine stehen auf Bergkacheln. Fischerei und Walfänger stehen an der Küste.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `forester` | `buildings/forester.png` | 256x224 | 2x2 | forester's lodge: log cabin with stacked firewood, a saw and an axe in a stump |
| `quarry` | `buildings/quarry.png` | 256x240 | 2x2 | stone quarry cut into a rocky slope with stone blocks and a wooden crane |
| `ore_mine` | `buildings/ore_mine.png` | 256x224 | 2x2 | mine entrance with timber supports, an ore cart on rails and a heap of rubble |
| `weaver` | `buildings/weaver.png` | 256x240 | 2x2 | weaver's workshop with a big wooden loom visible, cloth drying on frames |
| `sheep_farm` | `buildings/sheep_farm.png` | 256x208 | 2x2 | flat green pasture filling the whole ground with a low wooden fence around it, a few woolly sheep and a small red barn at the back corner |
| `cotton_plantation` | `buildings/cotton_plantation.png` | 256x208 | 2x2 | flat cotton field filling the whole ground: neat rows of cotton plants with white cotton bolls, a small wooden storage shed at the back corner |
| `fishery` | `buildings/fishery.png` | 256x224 | 2x2 | fisherman's hut on the shore with drying racks of fish, nets and a small rowing boat |
| `grain_farm` | `buildings/grain_farm.png` | 256x208 | 2x2 | flat golden wheat field filling the whole ground with a few haystacks and a small farmhouse at the back corner |
| `mill` | `buildings/mill.png` | 256x272 | 2x2 | windmill with a timber tower, four sails and flour sacks at the door |
| `bakery` | `buildings/bakery.png` | 256x240 | 2x2 | bakery with a brick oven, chimney with smoke, loaves of bread in the window |
| `stonemason` | `buildings/stonemason.png` | 256x224 | 2x2 | stonemason's yard with cut stone blocks, chisels and a small workshop |
| `smelter` | `buildings/smelter.png` | 256x272 | 2x2 | ironworks smelter with a brick furnace, tall chimney with smoke and glowing molten metal |
| `toolmaker` | `buildings/toolmaker.png` | 256x240 | 2x2 | tool smithy with an anvil, hammers and tools hanging on the wall, forge glow |
| `salt_mine` | `buildings/salt_mine.png` | 256x224 | 2x2 | salt mine with piles of white crystals, a wooden hoist and barrels |
| `potato_farm` | `buildings/potato_farm.png` | 256x208 | 2x2 | flat ploughed potato field filling the whole ground: ridged brown soil with green potato plants in rows, a small barn at the back corner |
| `distillery` | `buildings/distillery.png` | 256x240 | 2x2 | distillery with a copper still, oak barrels and a brick building |
| `hops_farm` | `buildings/hops_farm.png` | 256x208 | 2x2 | flat hop yard filling the whole ground: rows of tall poles with green hop vines, a small drying barn at the back corner |
| `sugar_plantation` | `buildings/sugar_plantation.png` | 256x208 | 2x2 | flat sugar cane plantation filling the whole ground with rows of tall green cane and a small press shed at the back corner |
| `cattle_farm` | `buildings/cattle_farm.png` | 256x208 | 2x2 | flat green paddock filling the whole ground with a low wooden fence, a few brown cows and a small barn at the back corner |
| `tannery` | `buildings/tannery.png` | 256x224 | 2x2 | tannery with hides stretched on frames and wooden tanning vats |
| `tobacco_plantation` | `buildings/tobacco_plantation.png` | 256x208 | 2x2 | flat tobacco field filling the whole ground: rows of broad-leaf tobacco plants, a small wooden drying barn at the back corner |
| `tobacco_factory` | `buildings/tobacco_factory.png` | 256x240 | 2x2 | tobacco manufactory: workshop with hanging leaves and rolling tables |
| `spice_plantation` | `buildings/spice_plantation.png` | 256x208 | 2x2 | flat spice plantation filling the whole ground: rows of pepper vines on short poles and colourful sacks of spices, a small hut at the back corner |
| `silk_plantation` | `buildings/silk_plantation.png` | 256x208 | 2x2 | flat silk farm filling the whole ground: rows of mulberry bushes, white cocoons on racks and a small silkworm shed at the back corner |
| `indigo_farm` | `buildings/indigo_farm.png` | 256x208 | 2x2 | flat indigo field filling the whole ground: rows of blue-green indigo plants, a small dye shed at the back corner |
| `dyer` | `buildings/dyer.png` | 256x240 | 2x2 | dyer's workshop with colourful blue and purple cloths drying on lines and dye vats |
| `whaler` | `buildings/whaler.png` | 256x240 | 2x2 | whaling station on a cold shore with a whale-bone arch, boiling barrels and a harpoon boat |
| `oil_boiler` | `buildings/oil_boiler.png` | 256x240 | 2x2 | oil boilery with big iron cauldrons, barrels, dark brick walls and smoke |
| `vineyard` | `buildings/vineyard.png` | 256x208 | 2x2 | flat vineyard filling the whole ground: rows of grape vines on wires, a small press house at the back corner |
| `winery` | `buildings/winery.png` | 256x240 | 2x2 | winery with big wooden presses and wine barrels in a stone building |
| `gold_mine` | `buildings/gold_mine.png` | 256x224 | 2x2 | gold mine entrance with timber supports, carts full of gold ore and gleaming nuggets |
| `gem_mine` | `buildings/gem_mine.png` | 256x224 | 2x2 | gemstone mine with blue and red crystals and a timber entrance |
| `goldsmith` | `buildings/goldsmith.png` | 256x240 | 2x2 | goldsmith's workshop with a display of gold jewellery and a small furnace |

### Infrastruktur

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `kontor` | `buildings/kontor.png` | 256x256 | 2x2 | harbour trading post: wooden warehouse on a short pier with crates, barrels and a flag |
| `market_house` | `buildings/market_house.png` | 256x240 | 2x2 | market house: open-sided hall with arches, goods on tables and a flag |
| `shipyard` | `buildings/shipyard.png` | 384x352 | 3x3 | shipyard with a slipway, a half-built wooden ship hull and a crane |

### Warensymbole

Alle Symbole 128 x 128 px, später im Spiel etwa 32 bis 48 px groß: einfache, kräftige Formen, die auch klein erkennbar sind.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `good_tools` | `icons/goods/tools.png` | 128x128 | - | pile of hammer, saw and pickaxe (Werkzeug) |
| `good_wood` | `icons/goods/wood.png` | 128x128 | - | stack of cut logs (Holz) |
| `good_bricks` | `icons/goods/bricks.png` | 128x128 | - | stack of red clay bricks (Ziegel) |
| `good_marble` | `icons/goods/marble.png` | 128x128 | - | block of white marble with grey veins (Marmor) |
| `good_stone` | `icons/goods/stone.png` | 128x128 | - | heap of rough grey stone blocks (Naturstein) |
| `good_ore` | `icons/goods/ore.png` | 128x128 | - | chunk of dark iron ore with reddish streaks (Eisenerz) |
| `good_iron` | `icons/goods/iron.png` | 128x128 | - | three iron ingots (Eisen) |
| `good_wool` | `icons/goods/wool.png` | 128x128 | - | bundle of fluffy white wool (Wolle) |
| `good_cotton` | `icons/goods/cotton.png` | 128x128 | - | branch with white cotton bolls (Baumwolle) |
| `good_cloth` | `icons/goods/cloth.png` | 128x128 | - | folded roll of plain woven cloth (Stoffe) |
| `good_leather` | `icons/goods/leather.png` | 128x128 | - | folded brown leather hide (Leder) |
| `good_hides` | `icons/goods/hides.png` | 128x128 | - | raw animal hide, stretched (Häute) |
| `good_grain` | `icons/goods/grain.png` | 128x128 | - | sheaf of golden wheat ears (Getreide) |
| `good_flour` | `icons/goods/flour.png` | 128x128 | - | open sack of white flour (Mehl) |
| `good_food` | `icons/goods/food.png` | 128x128 | - | loaf of bread and a fish on a board (Nahrung) |
| `good_potatoes` | `icons/goods/potatoes.png` | 128x128 | - | few brown potatoes (Kartoffeln) |
| `good_hops` | `icons/goods/hops.png` | 128x128 | - | cluster of green hop cones (Hopfen) |
| `good_sugar` | `icons/goods/sugar.png` | 128x128 | - | bundle of sugar cane stalks (Zuckerrohr) |
| `good_alcohol` | `icons/goods/alcohol.png` | 128x128 | - | clay bottle and a small keg of spirits (Alkohol) |
| `good_salt` | `icons/goods/salt.png` | 128x128 | - | small white pile of salt in a sack (Salz) |
| `good_tobacco_leaf` | `icons/goods/tobacco_leaf.png` | 128x128 | - | bundle of dried brown tobacco leaves (Tabakblätter) |
| `good_tobacco` | `icons/goods/tobacco.png` | 128x128 | - | rolled cigars and a clay pipe (Tabak) |
| `good_spices` | `icons/goods/spices.png` | 128x128 | - | wooden bowl with red, yellow and green spices (Gewürze) |
| `good_raw_silk` | `icons/goods/raw_silk.png` | 128x128 | - | white silk cocoons and a thread (Rohseide) |
| `good_indigo` | `icons/goods/indigo.png` | 128x128 | - | blue indigo dye lump and a blue-leaved plant (Indigo) |
| `good_silk` | `icons/goods/silk.png` | 128x128 | - | folded bolt of shiny purple silk (Seidenstoffe) |
| `good_blubber` | `icons/goods/blubber.png` | 128x128 | - | wooden barrel of whale blubber, yellowish (Tran) |
| `good_lamp_oil` | `icons/goods/lamp_oil.png` | 128x128 | - | brass oil lamp with a flame (Lampenöl) |
| `good_grapes` | `icons/goods/grapes.png` | 128x128 | - | bunch of purple grapes with leaves (Trauben) |
| `good_wine` | `icons/goods/wine.png` | 128x128 | - | dark green wine bottle with a glass of red wine (Wein) |
| `good_gold` | `icons/goods/gold.png` | 128x128 | - | pile of gold nuggets (Gold) |
| `good_gems` | `icons/goods/gems.png` | 128x128 | - | three cut gemstones, red, blue and green (Edelsteine) |
| `good_jewelry` | `icons/goods/jewelry.png` | 128x128 | - | gold necklace with a big red gem (Schmuck) |

### Stufensymbole

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `tier_pioneers` | `icons/tiers/pioneers.png` | 128x128 | - | simple settler figure with a straw hat and a bundle |
| `tier_settlers` | `icons/tiers/settlers.png` | 128x128 | - | farmer figure with a hat and a hoe |
| `tier_citizens` | `icons/tiers/citizens.png` | 128x128 | - | townsman in a doublet and cap |
| `tier_merchants` | `icons/tiers/merchants.png` | 128x128 | - | merchant in a fine coat with a money pouch |
| `tier_aristocrats` | `icons/tiers/aristocrats.png` | 128x128 | - | noble in a velvet coat and plumed hat |

### Oberfläche

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `cat_housing` | `icons/ui/cat_housing.png` | 128x128 | - | Kategorie Wohnen: small house with a heart-shaped window |
| `cat_public` | `icons/ui/cat_public.png` | 128x128 | - | Kategorie Öffentlich: chapel with bell tower |
| `cat_production` | `icons/ui/cat_production.png` | 128x128 | - | Kategorie Produktion: gear wheel with a hammer |
| `cat_infrastructure` | `icons/ui/cat_infrastructure.png` | 128x128 | - | Kategorie Infrastruktur: paved road with an anchor |
| `cat_demolish` | `icons/ui/cat_demolish.png` | 128x128 | - | Abriss: pickaxe breaking a wall |
| `cat_statistics` | `icons/ui/cat_statistics.png` | 128x128 | - | Statistik: scroll with a bar chart |
| `cat_worldmap` | `icons/ui/cat_worldmap.png` | 128x128 | - | Weltkarte: old compass rose over a map |
| `cat_trade` | `icons/ui/cat_trade.png` | 128x128 | - | Handel: sailing ship with a coin |
| `status_producing` | `icons/ui/status_producing.png` | 128x128 | - | Status produziert: green gear wheel |
| `status_waiting` | `icons/ui/status_waiting.png` | 128x128 | - | Status wartet: yellow hourglass |
| `status_full` | `icons/ui/status_full.png` | 128x128 | - | Status Lager voll: orange full crate |
| `status_noroad` | `icons/ui/status_noroad.png` | 128x128 | - | Status keine Straße: red broken road sign |
| `status_nohub` | `icons/ui/status_nohub.png` | 128x128 | - | Status außer Reichweite: red house with a cross |
| `status_inactive` | `icons/ui/status_inactive.png` | 128x128 | - | Status stillgelegt: grey pause symbol |
| `coin` | `icons/ui/coin.png` | 128x128 | - | Münze: shiny gold coin with an anchor emblem |
| `population` | `icons/ui/population.png` | 128x128 | - | Einwohner: two simple human silhouettes |
| `balance_up` | `icons/ui/balance_up.png` | 128x128 | - | Bilanz plus: green arrow up with a coin |
| `balance_down` | `icons/ui/balance_down.png` | 128x128 | - | Bilanz minus: red arrow down with a coin |
| `warning` | `icons/ui/warning.png` | 128x128 | - | Warnung: yellow triangle with an exclamation mark, no text letters other than the exclamation mark |

### Schiffe

Das Schiff wird derzeit nur auf der Weltkarte gezeigt (von oben). Die isometrischen Ansichten sind für später gedacht und können zuerst weggelassen werden. Weitere Richtungen entstehen durch Spiegeln.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `ship_top` | `ships/ship_top.png` | 128x128 | - | wooden three-masted trading ship seen from straight above (top-down), bow pointing up, white square sails, simple shapes |
| `ship_iso_s` | `ships/ship_iso_s.png` | 256x256 | - | wooden trading ship in isometric view, bow pointing to the bottom-right (south-east), white square sails with a red cross-less pennant |
| `ship_iso_e` | `ships/ship_iso_e.png` | 256x256 | - | same ship, bow pointing to the right (east) |
| `ship_iso_n` | `ships/ship_iso_n.png` | 256x256 | - | same ship, bow pointing to the top-right (north-east) |
| `ship_iso_nw` | `ships/ship_iso_nw.png` | 256x256 | - | same ship, bow pointing to the top-left (north-west) |
| `ship_iso_sw` | `ships/ship_iso_sw.png` | 256x256 | - | same ship, bow pointing to the bottom-left (south-west) |

### Effekte

Rauch gehört zu Gebäuden mit Schornstein (Bäckerei, Erzschmelze, Brennerei, Trankocherei, Werkzeugmacher). Das Gerüst wird beim Bauen gezeigt.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `smoke_1` | `effects/smoke_1.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 1 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_2` | `effects/smoke_2.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 2 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_3` | `effects/smoke_3.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 3 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_4` | `effects/smoke_4.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 4 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_5` | `effects/smoke_5.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 5 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_6` | `effects/smoke_6.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 6 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_7` | `effects/smoke_7.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 7 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_8` | `effects/smoke_8.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 8 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_9` | `effects/smoke_9.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 9 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_10` | `effects/smoke_10.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 10 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_11` | `effects/smoke_11.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 11 of 12, soft cartoon smoke, loops seamlessly |
| `smoke_12` | `effects/smoke_12.png` | 128x192 | - | column of grey chimney smoke rising, animation frame 12 of 12, soft cartoon smoke, loops seamlessly |
| `scaffold_2x2` | `effects/scaffold_2x2.png` | 256x224 | 2x2 | wooden construction scaffold around an empty building plot with planks and a rope |
| `island_icon` | `effects/island_icon.png` | 256x256 | - | small top-down island with a palm tree and a tiny harbour, for a map marker |

### App

Für die Installation als App auf dem Startbildschirm und den Startbildschirm des Spiels.

| ID | Datei | Größe (px) | Raster | Beschreibung (englisch, für den Prompt) |
|---|---|---|---|---|
| `icon_512` | `app/icon-512.png` | 512x512 | - | app icon: a small green island with a red-roofed house and a sailing ship, bold simple shapes, centred, fills the whole square, no transparent corners |
| `icon_maskable_512` | `app/icon-maskable-512.png` | 512x512 | - | same motif but smaller, kept inside the central 80 percent, island-green background filling the whole square |
| `icon_192` | `app/icon-192.png` | 192x192 | - | same as icon_512, downscaled |
| `splash` | `app/splash.png` | 1920x1080 | - | landscape key art of a harbour town on an island with a trading ship, warm morning light, no text, leave the top third calm for a title |
| `logo` | `app/logo.png` | 1024x256 | - | title logo reading Inselwirtschaft in a bold carved wooden sign style with a small anchor, transparent background, the only picture that may contain text |

## 4. Prompts

### Stilbild zuerst
Bevor du die ganze Liste erzeugst, erzeuge **ein** Stilbild mit Haus, Gelände und einem Symbol nebeneinander, das dir gefällt. Dieses Bild gibst du bei allen weiteren Bildern als Stilreferenz mit (bei Midjourney `--sref`, bei anderen Werkzeugen "style reference" oder "image prompt"). So bleiben die 200 Bilder einheitlich.

### Basis-Prompt für Gebäude, Gelände, Straßen, Schiffe
Die Spalte `prompt_komplett` in `docs/grafiken.csv` enthält je Zeile den fertigen Prompt. Er besteht aus der Beschreibung der Zeile plus diesem Basis-Teil:

```
isometric 2D video game asset, true 2:1 dimetric view (looking down at 30 degrees), hand-painted cel-shaded look with clean dark-brown outlines and soft saturated colours, light coming from the top left, no cast shadow on the ground, one single object centred, plain flat magenta background (#FF00FF) with nothing else in the picture, no text, no watermark, no frame, setting: European colonial trading settlement around the year 1500
```

### Negativ-Prompt (wenn dein Werkzeug einen hat)
```
text, letters, logo, watermark, frame, border, multiple objects, people in the foreground, perspective distortion, fisheye, photo realism, 3D render, cast shadow, gradient background, cropped object, blurry
```

### Beispiele
- **Pionierhaus:** `small simple wooden settler hut with a thatched roof, rough timber walls, one door, tiny chimney. isometric 2D video game asset, true 2:1 dimetric view (looking down at 30 degrees), hand-painted cel-shaded look with clean dark-brown outlines and soft saturated colours, light coming from the top left, no cast shadow on the ground, one single object centred, plain flat magenta background (#FF00FF) with nothing else in the picture, no text, no watermark, no frame, setting: European colonial trading settlement around the year 1500`
- **Grasfläche 1:** `lush green meadow with small flowers and tufts, tileable, variant 1 of 4. isometric 2D video game asset, true 2:1 dimetric view (looking down at 30 degrees), hand-painted cel-shaded look with clean dark-brown outlines and soft saturated colours, light coming from the top left, no cast shadow on the ground, one single object centred, plain flat magenta background (#FF00FF) with nothing else in the picture, no text, no watermark, no frame, setting: European colonial trading settlement around the year 1500`
- **Symbol Holz:** `stack of cut logs, game UI icon, centred, simple bold shapes, thick dark-brown outline, saturated flat colours, plain flat magenta background (#FF00FF), no text, no frame, no watermark, hand-painted cel-shaded`

### Tipps gegen typische KI-Fehler
- Die Raute stimmt nicht: Gib eine **Rautenvorlage** als Bild mit (ControlNet / "structure reference"). Die Vorlagen für jede Datei liegen in `docs/vorlagen/` (erzeugt mit `scripts/make-templates.py`).
- Zwei Gebäude im Bild: im Prompt `one single object` betonen, Negativ-Prompt nutzen.
- Der Hintergrund ist nicht einfarbig: nochmal erzeugen oder mit einem Hintergrundentferner (zum Beispiel rembg) freistellen.
- Die Stile weichen ab: immer dieselbe Stilreferenz und dieselben Basis-Wörter nutzen. Gleiche Farbpalette je Kategorie (Wohnen warm, Betriebe erdig, öffentlich hell).
- Erzeuge zuerst in **1024 x 1024** oder größer und skaliere danach auf die Zielgröße. Das Seitenverhältnis des Zielbilds ist wichtig: Bei Gebäuden lieber etwas Rand lassen, der Zuschnitt auf die Zielgröße geschieht später per Skript.

## 5. Ablage und Lieferung
Lege die Dateien in diese Ordner (Namen genau wie in der Tabelle):

```
art/
  terrain/   water_1..4, beach_1..3, grass_1..4, forest_1..4, mountain_1..4
  roads/     road_none, road_n, road_e, ... road_nesw (16 Dateien)
  buildings/ alle Gebäude, die Ruine und die Marktstände
  icons/
    goods/   eine Datei je Ware
    tiers/   fünf Stufensymbole
    ui/      Kategorien, Status und sonstige Symbole
  ships/     ship_top und die optionalen Ansichten
  effects/   smoke_1..6, scaffold_2x2, island_icon
  app/       Icons, Startbild, Logo
```

Aus den Dateien wird per Skript ein Sprite-Atlas gebaut (eine große Datei plus Positionsliste), mit Ankern und gespiegelten Varianten für gedrehte Gebäude. Die Platzhalterformen bleiben als Ersatz, falls eine Datei fehlt. Es kann also Stück für Stück geliefert werden.

## 6. Reihenfolge, wenn du nicht alles auf einmal machen willst
1. **Gelände und Straßen** (22 + 16 Dateien): verändern das Gesamtbild am meisten.
2. **Wohnhäuser, Marktstände, Kapelle, Markthaus, Kontor**: sieht man ständig.
3. **Warensymbole und Oberflächensymbole**: verbessern die Bedienung.
4. **Produktionsbetriebe**: nach Wichtigkeit: Forsthaus, Fischerei, Weberei, Schaffarm, Getreidefarm, Mühle, Bäckerei, Steinbruch, Steinmetz, Erzmine, Erzschmelze, Werkzeugmacher.
5. **Rest, Effekte, App-Grafiken.**

## 7. Rechtliches
Nur Bilder verwenden, an denen du die Rechte zur privaten Nutzung hast. Bei KI-Werkzeugen die Nutzungsbedingungen prüfen. Keine Grafiken, Namen oder Stile aus Anno verwenden.
