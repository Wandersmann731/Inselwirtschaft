# Tonliste für Inselwirtschaft

**77 Töne**: 28 Einzelgeräusche, 43 Schleifen und 6 Musikstücke. Die Liste entsteht mit `python3 scripts/make-sound-list.py`, die Datei `docs/ton.csv` enthält dieselben Zeilen zum Stapelverarbeiten.

> **Stand:** Alle Töne sind bereits erzeugt und liegen als MP3 in `public/audio/` (Geräusche und Schleifen mit ElevenLabs Sound Effects, Musik mit Google Lyria 3 Pro über OpenRouter). Werkzeuge: `scripts/assets/sound.mjs` und `scripts/assets/music.mjs`, siehe `scripts/assets/README.md`. Die Tabellen unten sind die Vorgaben (Prompts), nach denen sie entstanden sind. Einzelne Töne neu erzeugen: `ELEVENLABS_API_KEY=... node scripts/assets/sound.mjs --only <id> --force`.

## 1. Wichtig vorab
- **Keine Anno-Bezüge:** Keine Musik, keine Geräusche und keine Stile aus Anno hochladen oder in Prompts nennen. Alles muss eigenes Material sein. In keinem Prompt steht ein Spielname oder Komponistenname, so soll es bleiben.
- **Rechte:** Nur Töne verwenden, deren Nutzung du privat darfst. Bei KI-Werkzeugen die Bedingungen prüfen (viele erlauben private Nutzung, manche verlangen einen bezahlten Tarif).
- **Priorität:** 1 = zuerst machen (ohne diese klingt das Spiel leer), 2 = danach, 3 = Feinschliff. Mit Priorität 1 sind es **19 Töne**.
- **Lautstärke im Spiel:** Ich baue drei Regler ein (Effekte, Umgebung, Musik) und eine Stummschaltung. Beim ersten Start bleibt alles an, aber leise.

## 2. Dateiformat und Lieferung
- **Format zum Liefern:** **WAV, 44,1 kHz, 16 Bit** (verlustfrei). Einzelgeräusche und Schleifen **mono**, Musik **stereo**. Ich wandle sie später selbst in kleine OGG- oder AAC-Dateien um, damit das Spiel schlank bleibt (Ziel: alle Töne zusammen unter etwa 12 MB).
- **Wenn dein Werkzeug nur MP3 liefert:** Das ist auch in Ordnung (mindestens 192 kbit/s), WAV ist nur besser.
- **Dateinamen:** genau die ID aus der Tabelle, zum Beispiel `ui_tap.wav`.
- **Ordner:**
```
audio/
  sfx/     Einzelgeräusche (kein Nachhall am Ende, Stille am Ende kürzen)
  loops/   Schleifen (Anfang und Ende müssen nahtlos zusammenpassen)
  music/   Musikstücke (nahtlose Schleife, ohne Fade am Ende)
```
- **Pegel:** Einzelgeräusche etwa bei -12 dBFS Spitze, Schleifen etwa bei -20 dBFS Spitze (sie laufen ständig, deshalb leiser), Musik etwa bei -16 LUFS. Alle Töne einer Gruppe sollen ähnlich laut sein.
- **Nahtlose Schleifen:** Die meisten KI-Werkzeuge liefern keine perfekten Schleifen. Dann so vorgehen: Das Stück erzeugen, das Ende mit dem Anfang über etwa 1 Sekunde überblenden (Crossfade) und die Länge auf die Tabelle kürzen. Ich kann das auch per Skript für dich übernehmen, sag Bescheid.

## 3. Wie du die Prompts benutzt
- **Einzelgeräusche und Schleifen:** Werkzeuge wie ElevenLabs Sound Effects, Stable Audio oder AudioGen. Die Dauer aus der Tabelle in den Prompt oder die Einstellung übernehmen. Für Schleifen, falls das Werkzeug es kann, die Option „Loop“ einschalten.
- **Musik:** Werkzeuge wie Suno, Udio oder Stable Audio. Bei **Instrumental** bleiben (keine Stimme), die Dauer aus der Tabelle setzen. Pro Titel 3 bis 4 Versionen erzeugen und die beste nehmen. Alle Musikstücke sollen sich ähnlich anhören (gleiche Instrumente), damit sie zusammen ein Ganzes ergeben.
- **Wenn etwas nicht klappt:** Wiederhole mit einem Wort mehr, zum Beispiel „very quiet“ oder „no reverb“. Entferne Wörter, die Stimmen auslösen („crowd“ allein erzeugt oft Wörter, deshalb steht „without words“ im Prompt).

## 4. Die Liste

### Oberfläche

Kurze, weiche Geräusche aus Holz und Papier, nie schrill. Sie hört der Spieler hundertmal am Tag.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `ui_tap` | 0.2 s | 1 | Jeder Tipp auf einen Knopf | short soft wooden click, small button press, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_open` | 0.5 s | 1 | Fenster oder Menü öffnet sich | soft parchment scroll unrolling with a light wooden knock, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_close` | 0.4 s | 1 | Fenster schließt sich | soft parchment rolling up quickly, quiet, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_confirm` | 0.5 s | 1 | Bauen bestätigt, Speichern erfolgreich | short positive two-note wooden marimba chime, rising, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_denied` | 0.4 s | 1 | Aktion nicht möglich (rotes Gebäude, zu wenig Geld) | short dull low wooden thud with a muted descending tone, gentle, not harsh, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_speed` | 0.3 s | 3 | Geschwindigkeit geändert | quick soft clockwork tick, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_warning` | 1.2 s | 1 | Warnung: Ware geht aus, Münzen im Minus | two soft warning bell tones, calm but attention-getting, small brass hand bell, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_coin` | 0.6 s | 2 | Einnahme am Marktstand oder beim Handel | a few gold coins dropping into a leather pouch, jingle, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `ui_save` | 0.6 s | 3 | Spielstand gespeichert | quill pen scratching once and a soft stamp on paper, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |

### Bauen

Alle Bau-Geräusche sind handwerklich (Holz, Stein). Das Straßen-Geräusch läuft bei jedem Stück, deshalb sehr kurz.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `build_place` | 1.2 s | 1 | Gebäude wird gebaut | wooden building frame being raised: hammer on nails, a plank dropped, short and satisfying, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `build_road` | 0.35 s | 1 | Pro Straßenstück beim Ziehen | single stone paving step: a cobblestone set into gravel, short, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `build_demolish` | 1.4 s | 1 | Abriss | wooden hut collapsing: timber cracking and falling, dust and small debris, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `build_rotate` | 0.3 s | 3 | Gebäude drehen | short wooden swivel creak, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `build_clear_trees` | 0.9 s | 3 | Wald wird für Straße oder Gebäude gerodet | a few quick axe chops and a small tree falling with rustling leaves, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `build_ruin` | 2 s | 1 | Aristokratenhaus wird zur Ruine | stone house collapsing: rumble, falling bricks, a beam breaking, final dust settling, dramatic but short, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |

### Bevölkerung

Stimmen nur als Murmeln ohne Wörter.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `pop_tier_up` | 1.8 s | 1 | Haus steigt eine Stufe auf | cheerful short fanfare on two natural trumpets and a lute strum, achievement feeling, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `pop_tier_down` | 1.4 s | 2 | Haus fällt eine Stufe zurück | sad short descending two-note lute pluck, gentle, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `pop_new_tier_unlocked` | 3 s | 2 | Neue Bevölkerungsstufe zum ersten Mal erreicht | festive medieval fanfare with horns, bells and a drum roll ending, victorious, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `pop_move_in` | 0.8 s | 3 | Neue Bewohner ziehen ein | small group of people cheering softly with a door closing, distant, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `pop_unrest` | 2 s | 3 | Bewohner in Mangel (Hunger) | murmuring crowd, discontented, low voices without words, distant, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |

### Handel

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `trade_ship_horn` | 2 s | 1 | Schiff legt an oder fährt los | old wooden ship horn blast, one deep note, harbour atmosphere, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `trade_anchor` | 1.8 s | 2 | Schiff ankert | heavy iron anchor chain rattling and a splash into water, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `trade_load` | 1.6 s | 2 | Ware wird geladen oder entladen | wooden crates and barrels being loaded onto a ship deck, ropes creaking, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `trade_colony` | 3 s | 1 | Kolonie gegründet | triumphant short fanfare with a drum, a flag unfurling and a cannon salute far away, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `trade_ship_built` | 2 s | 2 | Schiff fertiggestellt | ship launching from a slipway: wooden hull sliding, big splash, a bell, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `trade_deal` | 0.9 s | 3 | Händler kauft oder verkauft | a handshake and a coin purse put on a wooden table, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |

### Ambiente

Schleifen, die je nach Kameraposition ineinander überblenden: das Spiel mischt Meer, Wald, Wiese, Berg und Siedlung nach der Umgebung. Jede muss ruhig und gleichmäßig sein, ohne Einzelereignisse in den ersten und letzten 2 Sekunden.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `amb_sea` | 12 s | 1 | Immer, in Küstennähe lauter | calm sea waves lapping softly on a sandy shore, gentle wind, a few distant seagull calls far apart, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_forest` | 12 s | 1 | Über Waldflächen | quiet forest atmosphere: soft wind in leaves, a few songbirds far apart, a woodpecker once, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_meadow` | 12 s | 2 | Über Grasflächen | summer meadow atmosphere: light breeze in grass, bees and crickets, a distant bird, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_mountain` | 12 s | 2 | Über Bergen | high mountain wind, hollow and airy, an occasional small rockfall far away, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_town_small` | 12 s | 1 | Siedlung bis etwa 100 Einwohner | small medieval village atmosphere: a few distant voices, a hen, a dog barking once, a bucket at a well, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_town_medium` | 12 s | 2 | Stadt mit mehreren hundert Einwohnern | busy medieval town atmosphere: market chatter without words, cart wheels on cobblestone, hammering in the distance, church bell once far away, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_town_large` | 12 s | 3 | Große Stadt, über 1000 Einwohner | large medieval city atmosphere: dense crowd murmur without words, many carts, hooves, distant bells, harbour sounds, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_harbour` | 12 s | 2 | Am Kontor und an der Werft | harbour atmosphere: wooden ships creaking, ropes, water slapping against a pier, gulls, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_ship_sail` | 10 s | 3 | Schiff auf der Weltkarte unterwegs | wooden sailing ship at sea: sails flapping, hull creaking, water rushing along the side, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_cold` | 12 s | 3 | Polar- und Tundra-Inseln | cold arctic wind with soft icy gusts, very sparse, no animals, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |
| `amb_jungle` | 12 s | 3 | Dschungel-Inseln | tropical jungle atmosphere: insects, exotic birds far apart, dripping leaves, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |

### Betriebe

Leise Schleifen von nur 6 Sekunden. Sie erklingen nur, wenn die Kamera nah an einem laufenden Betrieb ist. Alle sollen im Charakter ähnlich leise sein.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `work_forester` | 6 s | 2 | Forsthaus arbeitet (leise, nur wenn die Kamera nah ist) | lumberjack chopping logs with an axe every two seconds, wood chips falling, a saw once, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_quarry` | 6 s | 2 | Steinbruch arbeitet (leise, nur wenn die Kamera nah ist) | hammer and chisel on stone, steady tapping, small stones rolling, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_ore_mine` | 6 s | 3 | Erzmine arbeitet (leise, nur wenn die Kamera nah ist) | pickaxe on rock in a mine, distant echo, a mine cart rattling once, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_salt_mine` | 6 s | 3 | Salzmine arbeitet (leise, nur wenn die Kamera nah ist) | scraping and shovelling of crystals, light rattling, echo, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_gold_mine` | 6 s | 3 | Goldmine arbeitet (leise, nur wenn die Kamera nah ist) | pickaxe on rock in a mine with a faint metallic ring, echo, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_gem_mine` | 6 s | 3 | Edelsteinmine arbeitet (leise, nur wenn die Kamera nah ist) | small pickaxe taps on crystalline rock with a faint glassy ring, echo, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_weaver` | 6 s | 3 | Weberei arbeitet (leise, nur wenn die Kamera nah ist) | wooden loom: shuttle clacking back and forth with a soft rhythm, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_sheep_farm` | 6 s | 3 | Schaffarm arbeitet (leise, nur wenn die Kamera nah ist) | a few sheep bleating softly, a bell, grass rustling, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_cattle_farm` | 6 s | 3 | Rinderfarm arbeitet (leise, nur wenn die Kamera nah ist) | a cow mooing once, cattle chewing, a fence creaking, a bell, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_fishery` | 6 s | 3 | Fischerei arbeitet (leise, nur wenn die Kamera nah ist) | water lapping at a small boat, nets being pulled, gulls, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_grain_farm` | 6 s | 3 | Getreidefarm arbeitet (leise, nur wenn die Kamera nah ist) | wind in a wheat field, scythe swishing, a rooster in the distance, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_mill` | 6 s | 2 | Mühle arbeitet (leise, nur wenn die Kamera nah ist) | windmill turning: wooden gears creaking, sails swishing, grain pouring, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_bakery` | 6 s | 3 | Bäckerei arbeitet (leise, nur wenn die Kamera nah ist) | dough being kneaded, an oven door, crackling fire, wooden peel on stone, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_stonemason` | 6 s | 3 | Steinmetz arbeitet (leise, nur wenn die Kamera nah ist) | chisel tapping on stone, stone dust, a mallet, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_smelter` | 6 s | 2 | Erzschmelze arbeitet (leise, nur wenn die Kamera nah ist) | furnace roaring, bellows breathing, hot metal crackling, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_toolmaker` | 6 s | 2 | Werkzeugmacher arbeitet (leise, nur wenn die Kamera nah ist) | blacksmith hammer on an anvil, steady rhythm, quenching hiss once, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_distillery` | 6 s | 3 | Rumbrennerei arbeitet (leise, nur wenn die Kamera nah ist) | bubbling copper kettle, dripping liquid, wooden barrel knocked, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_tannery` | 6 s | 3 | Gerberei arbeitet (leise, nur wenn die Kamera nah ist) | wet leather being scraped and slapped, splashing in a vat, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_tobacco_factory` | 6 s | 3 | Tabakmanufaktur arbeitet (leise, nur wenn die Kamera nah ist) | leaves being rolled and pressed, light rustling, a wooden press, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_dyer` | 6 s | 3 | Färberei arbeitet (leise, nur wenn die Kamera nah ist) | stirring a big dye vat with a wooden paddle, bubbling and splashing, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_oil_boiler` | 6 s | 3 | Trankocherei arbeitet (leise, nur wenn die Kamera nah ist) | large cauldron boiling thickly, bubbling, a ladle, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_vineyard` | 6 s | 3 | Weinberg arbeitet (leise, nur wenn die Kamera nah ist) | wind in vine leaves, a wooden press creaking, juice dripping into a barrel, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_goldsmith` | 6 s | 3 | Goldschmied arbeitet (leise, nur wenn die Kamera nah ist) | tiny hammer tapping on metal, a small bellows, delicate ringing, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_brewery` | 6 s | 3 | Brauerei arbeitet (leise, nur wenn die Kamera nah ist) | large wooden mash paddle stirring a bubbling copper kettle, barrels rolled, dripping liquid, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_saltworks` | 6 s | 3 | Saline arbeitet (leise, nur wenn die Kamera nah ist) | salt brine boiling gently in pans, crackling fire under it, wooden rake on crystals, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_butcher` | 6 s | 3 | Fleischerei arbeitet (leise, nur wenn die Kamera nah ist) | heavy cleaver chopping on a wooden block, meat slapped on a table, a hook creaking, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_hunting_lodge` | 6 s | 3 | Jagdhütte arbeitet (leise, nur wenn die Kamera nah ist) | forest hut: leather being scraped, a wooden door, distant bird calls and rustling leaves, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_marble_quarry` | 6 s | 3 | Marmorsteinbruch arbeitet (leise, nur wenn die Kamera nah ist) | stone saw grinding through marble, hammer taps on stone, echoing rock, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_marble_mason` | 6 s | 3 | Marmorsteinmetz arbeitet (leise, nur wenn die Kamera nah ist) | fine chisel tapping on marble, light stone dust sweeping, a polishing cloth, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_market_house` | 6 s | 3 | Markthaus arbeitet (leise, nur wenn die Kamera nah ist) | light market chatter without words, coins, crates being set down, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_shipyard` | 6 s | 3 | Werft arbeitet (leise, nur wenn die Kamera nah ist) | hammering and sawing on a large wooden ship hull, rope creaking, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end, quiet |
| `work_chapel_bell` | 4 s | 2 | Kapelle läutet zu jeder vollen Spielminute | single church bell tolling 3 times, warm, distant, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |
| `work_tavern` | 8 s | 3 | Wirtshaus in der Nähe | inside a medieval tavern: low laughter and murmur without words, tankards clinking, a lute playing a few quiet notes, seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end |

### Musik

Alle Stücke instrumental, ruhig und warm, mit denselben Instrumenten. Sie laufen leise im Hintergrund und wechseln sich ab.

| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |
|---|---|---|---|---|
| `music_menu` | 2 min | 1 | Startbildschirm | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, inviting main menu theme, adventurous with a sense of discovery, slow rolling rhythm, 80 bpm |
| `music_build_1` | 2 min 30 s | 1 | Aufbau am Tag, Titel 1 | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, peaceful town building, light flute melody over fingerpicked lute, 90 bpm |
| `music_build_2` | 2 min 30 s | 1 | Aufbau, Titel 2 | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, productive and cheerful, soft hand drum with plucked strings, bright, 100 bpm |
| `music_build_3` | 2 min 30 s | 2 | Aufbau, Titel 3 | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, dreamy and slow, harp arpeggios with a warm string pad, 70 bpm |
| `music_sea` | 2 min 30 s | 2 | Weltkarte, Schiffe unterwegs | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, open sea voyage, swelling strings and a gentle shanty-like rhythm, a feeling of distance, 85 bpm |
| `music_trouble` | 1 min 30 s | 3 | Münzen im Minus oder Mangel in der Stadt | instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly, tense but quiet, low sustained strings and sparse plucked notes, uneasy, no drums, 70 bpm |
| `music_stinger_win` | 6 s | 3 | Große Meilenstein-Melodie (zum Beispiel erste Aristokraten) | short triumphant orchestral-folk fanfare with horns, strings and a bright finish, clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail |

## 5. Reihenfolge, wenn du nicht alles auf einmal machen willst
1. **Priorität 1:** Oberfläche (Tippen, Öffnen, Bestätigen, Fehler, Warnung, Münzen), Bauen (Bauen, Straße, Abriss, Ruine), Stufenaufstieg, Schiffshorn, Kolonie, Meer, Wald, kleine Siedlung, Hafen, Menümusik und zwei Aufbaustücke.
2. **Priorität 2:** weitere Ambiente-Schleifen, die wichtigsten Betriebe (Forsthaus, Steinbruch, Schmiede, Mühle, Erzschmelze), Seemusik.
3. **Priorität 3:** übrige Betriebe, Stadtgrößen, Kälte und Dschungel, Spannungsmusik und Feinschliff.

## 6. Was ich danach einbaue
Ein kleines Tonsystem: lädt die Dateien nur nach dem ersten Tippen (Android erlaubt vorher keinen Ton), mischt die Ambiente-Schleifen nach der Umgebung unter der Kamera, spielt Betriebsgeräusche nur nahe der Kamera, wechselt die Musikstücke mit Überblendung und bietet Regler und Stummschaltung in den Einstellungen. Fehlende Dateien werden einfach übersprungen, du kannst also Stück für Stück liefern.
