#!/usr/bin/env python3
"""Writes docs/ton.md and docs/ton.csv: all sounds and music the game needs, with prompts for AI sound tools.

Run from the project root:  python3 scripts/make-sound-list.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
buildings = {b["id"]: b for b in json.loads((ROOT / "src/data/buildings.json").read_text())}

STYLE_SFX = "clean game sound effect, close microphone, no music, no speech, no background noise, no reverb tail"
STYLE_LOOP = "seamless loop, steady and unobtrusive, no melody, no speech, no sudden sounds, even volume from start to end"
STYLE_MUSIC = (
    "instrumental video game music, warm and relaxed, acoustic instruments (lute, flute, light strings, soft hand drum, harp), "
    "historical European trading town around 1500 mood, gentle and optimistic, no vocals, no electronic drums, loops seamlessly"
)

# id, group, kind, seconds, priority, trigger (German), prompt (English)
# kind: sfx = once, loop = repeats while the thing exists, music = background track
rows = []

def add(i, group, kind, seconds, prio, trigger, prompt):
    rows.append((i, group, kind, seconds, prio, trigger, prompt))

# --- Oberfläche -------------------------------------------------------------------------------------
add("ui_tap", "Oberfläche", "sfx", 0.2, 1, "Jeder Tipp auf einen Knopf", f"short soft wooden click, small button press, {STYLE_SFX}")
add("ui_open", "Oberfläche", "sfx", 0.5, 1, "Fenster oder Menü öffnet sich", f"soft parchment scroll unrolling with a light wooden knock, {STYLE_SFX}")
add("ui_close", "Oberfläche", "sfx", 0.4, 1, "Fenster schließt sich", f"soft parchment rolling up quickly, quiet, {STYLE_SFX}")
add("ui_confirm", "Oberfläche", "sfx", 0.5, 1, "Bauen bestätigt, Speichern erfolgreich", f"short positive two-note wooden marimba chime, rising, {STYLE_SFX}")
add("ui_denied", "Oberfläche", "sfx", 0.4, 1, "Aktion nicht möglich (rotes Gebäude, zu wenig Geld)", f"short dull low wooden thud with a muted descending tone, gentle, not harsh, {STYLE_SFX}")
add("ui_speed", "Oberfläche", "sfx", 0.3, 3, "Geschwindigkeit geändert", f"quick soft clockwork tick, {STYLE_SFX}")
add("ui_warning", "Oberfläche", "sfx", 1.2, 1, "Warnung: Ware geht aus, Münzen im Minus", f"two soft warning bell tones, calm but attention-getting, small brass hand bell, {STYLE_SFX}")
add("ui_coin", "Oberfläche", "sfx", 0.6, 2, "Einnahme am Marktstand oder beim Handel", f"a few gold coins dropping into a leather pouch, jingle, {STYLE_SFX}")
add("ui_save", "Oberfläche", "sfx", 0.6, 3, "Spielstand gespeichert", f"quill pen scratching once and a soft stamp on paper, {STYLE_SFX}")

# --- Bauen ------------------------------------------------------------------------------------------
add("build_place", "Bauen", "sfx", 1.2, 1, "Gebäude wird gebaut", f"wooden building frame being raised: hammer on nails, a plank dropped, short and satisfying, {STYLE_SFX}")
add("build_road", "Bauen", "sfx", 0.35, 1, "Pro Straßenstück beim Ziehen", f"single stone paving step: a cobblestone set into gravel, short, {STYLE_SFX}")
add("build_demolish", "Bauen", "sfx", 1.4, 1, "Abriss", f"wooden hut collapsing: timber cracking and falling, dust and small debris, {STYLE_SFX}")
add("build_rotate", "Bauen", "sfx", 0.3, 3, "Gebäude drehen", f"short wooden swivel creak, {STYLE_SFX}")
add("build_clear_trees", "Bauen", "sfx", 0.9, 3, "Wald wird für Straße oder Gebäude gerodet", f"a few quick axe chops and a small tree falling with rustling leaves, {STYLE_SFX}")
add("build_ruin", "Bauen", "sfx", 2.0, 1, "Aristokratenhaus wird zur Ruine", f"stone house collapsing: rumble, falling bricks, a beam breaking, final dust settling, dramatic but short, {STYLE_SFX}")

# --- Bevölkerung ------------------------------------------------------------------------------------
add("pop_tier_up", "Bevölkerung", "sfx", 1.8, 1, "Haus steigt eine Stufe auf", f"cheerful short fanfare on two natural trumpets and a lute strum, achievement feeling, {STYLE_SFX}")
add("pop_tier_down", "Bevölkerung", "sfx", 1.4, 2, "Haus fällt eine Stufe zurück", f"sad short descending two-note lute pluck, gentle, {STYLE_SFX}")
add("pop_new_tier_unlocked", "Bevölkerung", "sfx", 3.0, 2, "Neue Bevölkerungsstufe zum ersten Mal erreicht", f"festive medieval fanfare with horns, bells and a drum roll ending, victorious, {STYLE_SFX}")
add("pop_move_in", "Bevölkerung", "sfx", 0.8, 3, "Neue Bewohner ziehen ein", f"small group of people cheering softly with a door closing, distant, {STYLE_SFX}")
add("pop_unrest", "Bevölkerung", "sfx", 2.0, 3, "Bewohner in Mangel (Hunger)", f"murmuring crowd, discontented, low voices without words, distant, {STYLE_SFX}")

# --- Handel und Schiffe -----------------------------------------------------------------------------
add("trade_ship_horn", "Handel", "sfx", 2.0, 1, "Schiff legt an oder fährt los", f"old wooden ship horn blast, one deep note, harbour atmosphere, {STYLE_SFX}")
add("trade_anchor", "Handel", "sfx", 1.8, 2, "Schiff ankert", f"heavy iron anchor chain rattling and a splash into water, {STYLE_SFX}")
add("trade_load", "Handel", "sfx", 1.6, 2, "Ware wird geladen oder entladen", f"wooden crates and barrels being loaded onto a ship deck, ropes creaking, {STYLE_SFX}")
add("trade_colony", "Handel", "sfx", 3.0, 1, "Kolonie gegründet", f"triumphant short fanfare with a drum, a flag unfurling and a cannon salute far away, {STYLE_SFX}")
add("trade_ship_built", "Handel", "sfx", 2.0, 2, "Schiff fertiggestellt", f"ship launching from a slipway: wooden hull sliding, big splash, a bell, {STYLE_SFX}")
add("trade_deal", "Handel", "sfx", 0.9, 3, "Händler kauft oder verkauft", f"a handshake and a coin purse put on a wooden table, {STYLE_SFX}")

# --- Ambiente ---------------------------------------------------------------------------------------
add("amb_sea", "Ambiente", "loop", 12, 1, "Immer, in Küstennähe lauter", f"calm sea waves lapping softly on a sandy shore, gentle wind, a few distant seagull calls far apart, {STYLE_LOOP}")
add("amb_forest", "Ambiente", "loop", 12, 1, "Über Waldflächen", f"quiet forest atmosphere: soft wind in leaves, a few songbirds far apart, a woodpecker once, {STYLE_LOOP}")
add("amb_meadow", "Ambiente", "loop", 12, 2, "Über Grasflächen", f"summer meadow atmosphere: light breeze in grass, bees and crickets, a distant bird, {STYLE_LOOP}")
add("amb_mountain", "Ambiente", "loop", 12, 2, "Über Bergen", f"high mountain wind, hollow and airy, an occasional small rockfall far away, {STYLE_LOOP}")
add("amb_town_small", "Ambiente", "loop", 12, 1, "Siedlung bis etwa 100 Einwohner", f"small medieval village atmosphere: a few distant voices, a hen, a dog barking once, a bucket at a well, {STYLE_LOOP}")
add("amb_town_medium", "Ambiente", "loop", 12, 2, "Stadt mit mehreren hundert Einwohnern", f"busy medieval town atmosphere: market chatter without words, cart wheels on cobblestone, hammering in the distance, church bell once far away, {STYLE_LOOP}")
add("amb_town_large", "Ambiente", "loop", 12, 3, "Große Stadt, über 1000 Einwohner", f"large medieval city atmosphere: dense crowd murmur without words, many carts, hooves, distant bells, harbour sounds, {STYLE_LOOP}")
add("amb_harbour", "Ambiente", "loop", 12, 2, "Am Kontor und an der Werft", f"harbour atmosphere: wooden ships creaking, ropes, water slapping against a pier, gulls, {STYLE_LOOP}")
add("amb_ship_sail", "Ambiente", "loop", 10, 3, "Schiff auf der Weltkarte unterwegs", f"wooden sailing ship at sea: sails flapping, hull creaking, water rushing along the side, {STYLE_LOOP}")
add("amb_cold", "Ambiente", "loop", 12, 3, "Polar- und Tundra-Inseln", f"cold arctic wind with soft icy gusts, very sparse, no animals, {STYLE_LOOP}")
add("amb_jungle", "Ambiente", "loop", 12, 3, "Dschungel-Inseln", f"tropical jungle atmosphere: insects, exotic birds far apart, dripping leaves, {STYLE_LOOP}")

# --- Betriebe (Schleifen, leise, nur nahe der Kamera) ------------------------------------------------
work = {
    "forester": "lumberjack chopping logs with an axe every two seconds, wood chips falling, a saw once",
    "quarry": "hammer and chisel on stone, steady tapping, small stones rolling",
    "ore_mine": "pickaxe on rock in a mine, distant echo, a mine cart rattling once",
    "salt_mine": "scraping and shovelling of crystals, light rattling, echo",
    "gold_mine": "pickaxe on rock in a mine with a faint metallic ring, echo",
    "gem_mine": "small pickaxe taps on crystalline rock with a faint glassy ring, echo",
    "weaver": "wooden loom: shuttle clacking back and forth with a soft rhythm",
    "sheep_farm": "a few sheep bleating softly, a bell, grass rustling",
    "cattle_farm": "a cow mooing once, cattle chewing, a fence creaking, a bell",
    "fishery": "water lapping at a small boat, nets being pulled, gulls",
    "grain_farm": "wind in a wheat field, scythe swishing, a rooster in the distance",
    "mill": "windmill turning: wooden gears creaking, sails swishing, grain pouring",
    "bakery": "dough being kneaded, an oven door, crackling fire, wooden peel on stone",
    "stonemason": "chisel tapping on stone, stone dust, a mallet",
    "smelter": "furnace roaring, bellows breathing, hot metal crackling",
    "toolmaker": "blacksmith hammer on an anvil, steady rhythm, quenching hiss once",
    "distillery": "bubbling copper kettle, dripping liquid, wooden barrel knocked",
    "tannery": "wet leather being scraped and slapped, splashing in a vat",
    "tobacco_factory": "leaves being rolled and pressed, light rustling, a wooden press",
    "dyer": "stirring a big dye vat with a wooden paddle, bubbling and splashing",
    "oil_boiler": "large cauldron boiling thickly, bubbling, a ladle",
    "winery": "grapes being pressed, juice dripping into a barrel, wooden press creaking",
    "goldsmith": "tiny hammer tapping on metal, a small bellows, delicate ringing",
    "market_house": "light market chatter without words, coins, crates being set down",
    "shipyard": "hammering and sawing on a large wooden ship hull, rope creaking",
}
for bid, text in work.items():
    name = buildings[bid]["name"]
    add(f"work_{bid}", "Betriebe", "loop", 6, 2 if bid in ("forester", "quarry", "smelter", "mill", "toolmaker") else 3, f"{name} arbeitet (leise, nur wenn die Kamera nah ist)", f"{text}, {STYLE_LOOP}, quiet")
add("work_chapel_bell", "Betriebe", "sfx", 4.0, 2, "Kapelle läutet zu jeder vollen Spielminute", f"single church bell tolling 3 times, warm, distant, {STYLE_SFX}")
add("work_tavern", "Betriebe", "loop", 8, 3, "Wirtshaus in der Nähe", f"inside a medieval tavern: low laughter and murmur without words, tankards clinking, a lute playing a few quiet notes, {STYLE_LOOP}")

# --- Musik ------------------------------------------------------------------------------------------
add("music_menu", "Musik", "music", 120, 1, "Startbildschirm", f"{STYLE_MUSIC}, inviting main menu theme, adventurous with a sense of discovery, slow rolling rhythm, 80 bpm")
add("music_build_1", "Musik", "music", 150, 1, "Aufbau am Tag, Titel 1", f"{STYLE_MUSIC}, peaceful town building, light flute melody over fingerpicked lute, 90 bpm")
add("music_build_2", "Musik", "music", 150, 1, "Aufbau, Titel 2", f"{STYLE_MUSIC}, productive and cheerful, soft hand drum with plucked strings, bright, 100 bpm")
add("music_build_3", "Musik", "music", 150, 2, "Aufbau, Titel 3", f"{STYLE_MUSIC}, dreamy and slow, harp arpeggios with a warm string pad, 70 bpm")
add("music_sea", "Musik", "music", 150, 2, "Weltkarte, Schiffe unterwegs", f"{STYLE_MUSIC}, open sea voyage, swelling strings and a gentle shanty-like rhythm, a feeling of distance, 85 bpm")
add("music_trouble", "Musik", "music", 90, 3, "Münzen im Minus oder Mangel in der Stadt", f"{STYLE_MUSIC}, tense but quiet, low sustained strings and sparse plucked notes, uneasy, no drums, 70 bpm")
add("music_stinger_win", "Musik", "sfx", 6.0, 3, "Große Meilenstein-Melodie (zum Beispiel erste Aristokraten)", f"short triumphant orchestral-folk fanfare with horns, strings and a bright finish, {STYLE_SFX}")

groups_order = ["Oberfläche", "Bauen", "Bevölkerung", "Handel", "Ambiente", "Betriebe", "Musik"]
FOLDER = {"sfx": "sfx", "loop": "loops", "music": "music"}

with (ROOT / "docs" / "ton.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["id", "gruppe", "art", "dateiname", "dauer_sekunden", "prioritaet", "wann_im_spiel", "prompt_en"])
    for i, group, kind, seconds, prio, trigger, prompt in rows:
        w.writerow([i, group, kind, f"audio/{FOLDER[kind]}/{i}.wav", seconds, prio, trigger, prompt])

md = []
count = {k: sum(1 for r in rows if r[2] == k) for k in ("sfx", "loop", "music")}
md.append("# Tonliste für Inselwirtschaft\n")
md.append(
    f"**{len(rows)} Töne**: {count['sfx']} Einzelgeräusche, {count['loop']} Schleifen und {count['music']} Musikstücke. "
    "Die Liste entsteht mit `python3 scripts/make-sound-list.py`, die Datei `docs/ton.csv` enthält dieselben Zeilen zum Stapelverarbeiten.\n"
)
md.append("""## 1. Wichtig vorab
- **Keine Anno-Bezüge:** Keine Musik, keine Geräusche und keine Stile aus Anno hochladen oder in Prompts nennen. Alles muss eigenes Material sein. In keinem Prompt steht ein Spielname oder Komponistenname, so soll es bleiben.
- **Rechte:** Nur Töne verwenden, deren Nutzung du privat darfst. Bei KI-Werkzeugen die Bedingungen prüfen (viele erlauben private Nutzung, manche verlangen einen bezahlten Tarif).
- **Priorität:** 1 = zuerst machen (ohne diese klingt das Spiel leer), 2 = danach, 3 = Feinschliff. Mit Priorität 1 sind es **{p1} Töne**.
- **Lautstärke im Spiel:** Ich baue drei Regler ein (Effekte, Umgebung, Musik) und eine Stummschaltung. Beim ersten Start bleibt alles an, aber leise.
""".format(p1=sum(1 for r in rows if r[4] == 1)))

md.append("""## 2. Dateiformat und Lieferung
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
""")

md.append("""## 3. Wie du die Prompts benutzt
- **Einzelgeräusche und Schleifen:** Werkzeuge wie ElevenLabs Sound Effects, Stable Audio oder AudioGen. Die Dauer aus der Tabelle in den Prompt oder die Einstellung übernehmen. Für Schleifen, falls das Werkzeug es kann, die Option „Loop“ einschalten.
- **Musik:** Werkzeuge wie Suno, Udio oder Stable Audio. Bei **Instrumental** bleiben (keine Stimme), die Dauer aus der Tabelle setzen. Pro Titel 3 bis 4 Versionen erzeugen und die beste nehmen. Alle Musikstücke sollen sich ähnlich anhören (gleiche Instrumente), damit sie zusammen ein Ganzes ergeben.
- **Wenn etwas nicht klappt:** Wiederhole mit einem Wort mehr, zum Beispiel „very quiet“ oder „no reverb“. Entferne Wörter, die Stimmen auslösen („crowd“ allein erzeugt oft Wörter, deshalb steht „without words“ im Prompt).
""")

def table(title, items, note=None):
    md.append(f"### {title}\n")
    if note:
        md.append(note + "\n")
    md.append("| ID | Dauer | Prio | Wann im Spiel | Prompt (englisch) |")
    md.append("|---|---|---|---|---|")
    for i, group, kind, seconds, prio, trigger, prompt in items:
        secs = f"{seconds:g} s" if seconds < 60 else f"{seconds // 60:g} min {seconds % 60:g} s".replace(" 0 s", "")
        md.append(f"| `{i}` | {secs} | {prio} | {trigger} | {prompt} |")
    md.append("")

md.append("## 4. Die Liste\n")
notes = {
    "Oberfläche": "Kurze, weiche Geräusche aus Holz und Papier, nie schrill. Sie hört der Spieler hundertmal am Tag.",
    "Bauen": "Alle Bau-Geräusche sind handwerklich (Holz, Stein). Das Straßen-Geräusch läuft bei jedem Stück, deshalb sehr kurz.",
    "Bevölkerung": "Stimmen nur als Murmeln ohne Wörter.",
    "Ambiente": "Schleifen, die je nach Kameraposition ineinander überblenden: das Spiel mischt Meer, Wald, Wiese, Berg und Siedlung nach der Umgebung. Jede muss ruhig und gleichmäßig sein, ohne Einzelereignisse in den ersten und letzten 2 Sekunden.",
    "Betriebe": "Leise Schleifen von nur 6 Sekunden. Sie erklingen nur, wenn die Kamera nah an einem laufenden Betrieb ist. Alle sollen im Charakter ähnlich leise sein.",
    "Musik": "Alle Stücke instrumental, ruhig und warm, mit denselben Instrumenten. Sie laufen leise im Hintergrund und wechseln sich ab.",
}
for g in groups_order:
    table(g, [r for r in rows if r[1] == g], notes.get(g))

md.append("""## 5. Reihenfolge, wenn du nicht alles auf einmal machen willst
1. **Priorität 1:** Oberfläche (Tippen, Öffnen, Bestätigen, Fehler, Warnung, Münzen), Bauen (Bauen, Straße, Abriss, Ruine), Stufenaufstieg, Schiffshorn, Kolonie, Meer, Wald, kleine Siedlung, Hafen, Menümusik und zwei Aufbaustücke.
2. **Priorität 2:** weitere Ambiente-Schleifen, die wichtigsten Betriebe (Forsthaus, Steinbruch, Schmiede, Mühle, Erzschmelze), Seemusik.
3. **Priorität 3:** übrige Betriebe, Stadtgrößen, Kälte und Dschungel, Spannungsmusik und Feinschliff.

## 6. Was ich danach einbaue
Ein kleines Tonsystem: lädt die Dateien nur nach dem ersten Tippen (Android erlaubt vorher keinen Ton), mischt die Ambiente-Schleifen nach der Umgebung unter der Kamera, spielt Betriebsgeräusche nur nahe der Kamera, wechselt die Musikstücke mit Überblendung und bietet Regler und Stummschaltung in den Einstellungen. Fehlende Dateien werden einfach übersprungen, du kannst also Stück für Stück liefern.
""")
(ROOT / "docs" / "ton.md").write_text("\n".join(md), encoding="utf-8")
print(f"{len(rows)} Töne: {count}")
