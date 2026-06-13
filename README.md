# Pokémon Platinum — Fan Remake (Gens 1–9, No HMs)

A from-scratch, browser-playable remake of **Pokémon Platinum**, built in vanilla
JavaScript with no engine, no framework, and no build step. Two deliberate twists
on the original:

- **Every Pokémon from Generations 1 through 9 is obtainable** — all 1,025 species
  (plus a selection of regional and alternate forms) live somewhere across Sinnoh.
  A data validator proves every one is reachable from the starting town.
- **HMs are never required.** Cut, Rock Smash, Strength, Surf, Waterfall and Rock
  Climb are gone as moves. Instead each is unlocked by a **key item + the matching
  Gym Badge**, so you traverse the world yourself and never burn a move slot on a
  field chore. The mandatory path to the Champion is fully walkable.

The full Platinum arc is here: pick a starter from **any** of the nine regions,
collect eight badges, unravel Team Galactic's plot at the lakes and Spear Pillar,
fall into the Distortion World to face Giratina, beat the Elite Four and Champion
Cynthia, then hunt every legendary in the post-game Hall of Legends.

## Play it

No install. Serve the folder and open it in a browser:

```bash
# any static server works; this one disables caching and is dual-stack
py -3 tools/serve.py 8741
# then open http://localhost:8741/
```

(Opening `index.html` directly over `file://` also works — all assets are local
except optional Pokémon sprites, which fall back to procedural art offline.)

### Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move |
| Z / Space | Confirm, talk, advance text |
| X / Shift | Cancel, hold to run |
| Enter / Esc | Open menu |
| M | Mute / unmute |
| `` ` `` | Turbo (fast-forward) |

Hold X while walking to run; press it during text to speed it up. Your game
auto-saves at every Pokémon Center (and there's a manual Save in the menu).

## Highlights

- **Single-file-per-system engine**: overworld with grid movement, ledges, warps,
  connections, wild encounters and trainer sight-lines; a full singles battle
  engine (complete damage formula, 18-type chart, stat stages, status, weather,
  ~40 abilities, multi-hit/two-turn/recharge moves, hazards, screens, capture
  math and trainer AI); party/box (PC) management, bag, shops, summary screens and
  a 1,025-entry Pokédex.
- **Real species data**: stats, types, abilities, learnsets, evolution methods and
  experience curves are generated from the open **PokeAPI** dataset. Move effects
  are driven by that metadata plus a small set of named-move overrides.
- **Procedural everything-else**: tiles, overworld characters, trainer sprites and
  all UI are drawn at runtime — no image assets to ship. Music is an original
  WebAudio chiptune sequencer with a track per area type.
- **Evolutions that actually fire**: level, stone, trade-item (via a Linking Cord),
  friendship, time-of-day, known-move, party-member and stat-ratio conditions all
  work, including gendered and nature-based split evolutions.

## Project layout

```
index.html            # script load order (data → engine → story)
css/                  # one stylesheet
js/
  namespace.js        # the global PKM object + data registry
  engine/             # input, gfx, audio, mon, battle, overworld, menus, ...
  data/               # generated game data + hand-authored content
    maps/             # 110 map files (towns, routes, dungeons, interiors)
tools/                # Python generators + validator + dev server
```

Most of `js/data/` is **generated** — see `CLAUDE.md` for which files are produced
by which `tools/*.py` script and how to regenerate them. The Python pipeline:

```bash
py -3 tools/build_data.py      # species/moves/learnsets/evolutions from PokeAPI CSVs
py -3 tools/gen_encounters.py  # per-area wild tables (guarantees full dex coverage)
py -3 tools/gen_trainers.py    # gym leaders, E4, Champion, Galactic, route trainers
py -3 tools/gen_towns.py       # Pokémon Center / Mart interiors
py -3 tools/gen_world.py       # town exteriors, routes, dungeons, gyms, league
py -3 tools/gen_index.py       # refresh the map <script> list in index.html
py -3 tools/validate.py        # connectivity + dex-coverage integrity check
```

`tools/validate.py` is the source of truth for the two headline promises — it
fails the build if any map is unreachable or any of the 1,025 species can't be
obtained from a reachable area.

## Credits & notes

Pokémon is © Nintendo / Creatures Inc. / GAME FREAK. This is a non-commercial fan
project for personal and educational use. Names, stats and type relationships come
from the community-maintained [PokeAPI](https://pokeapi.co/) dataset; all engine
code, maps, dialogue, music and art in this repository are original.
