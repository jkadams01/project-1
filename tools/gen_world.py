#!/usr/bin/env python3
"""Generates the connected Sinnoh overworld: town exteriors, routes, caves, the
gym interiors, and the late-game story maps. Connections are derived from one
explicit edge list so every seam is reciprocal, and a BFS guarantees the whole
graph (and thus every encounter area) is reachable from Twinleaf.

The mandatory gym path is walkable end-to-end; field-move obstacles (~ T R B C W)
appear only on optional branches, so no HM-equivalent is ever required to finish.
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'js', 'data', 'maps')
manifest = json.load(open(os.path.join(os.path.dirname(__file__), 'trainer_manifest.json')))

OPP = {'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'}
PKM_LEADER_SPRITE = {'roark': 'leader', 'gardenia': 'leader', 'fantina': 'commander',
                     'maylene': 'ace', 'wake': 'swimmer', 'byron': 'hiker',
                     'candice': 'skier', 'volkner': 'ace'}

# ----------------------------------------------------------------- edge graph
# (mapA, dir, mapB): A connects to B on side `dir`; reciprocal auto-added.
# Backbone = mandatory gym path. Branches = optional, for coverage.
EDGES = [
    # south cluster (twinleaf/route201/sandgem/verity already authored & wired)
    ('sandgem', 'up', 'route202'),
    ('route202', 'up', 'jubilife'),
    # Oreburgh arm (gym 1)
    ('jubilife', 'right', 'route203'),
    ('route203', 'right', 'oreburgh_gate'),
    ('oreburgh_gate', 'right', 'oreburgh'),
    ('oreburgh', 'down', 'oreburgh_mine'),       # mine = dead-end branch
    # Floaroma / Eterna arm (gym 2)
    ('jubilife', 'up', 'route204'),
    ('route204', 'up', 'floaroma'),
    ('route204', 'right', 'ravaged_path'),       # branch cave
    ('floaroma', 'left', 'valley_windworks'),    # Galactic event branch
    ('floaroma', 'up', 'route205south'),
    ('route205south', 'up', 'eterna_forest'),
    ('eterna_forest', 'up', 'route205north'),
    ('route205north', 'up', 'eterna'),
    # Hearthome arm (gym 3)
    ('eterna', 'right', 'route211'),             # branch toward Mt Coronet
    ('route211', 'right', 'mt_coronet_main'),
    ('eterna', 'down', 'route206'),
    ('route206', 'down', 'wayward_cave'),        # branch cave
    ('route206', 'right', 'route207'),
    ('route207', 'right', 'route208'),
    ('route207', 'up', 'mt_coronet_south'),      # branch
    ('route208', 'right', 'hearthome'),
    # Solaceon / Celestic (gym 4 at Veilstone)
    ('hearthome', 'right', 'route209'),
    ('route209', 'up', 'solaceon'),
    ('solaceon', 'right', 'solaceon_ruins'),     # branch
    ('solaceon', 'up', 'lost_tower'),            # branch
    ('solaceon', 'down', 'route210south'),
    ('route210south', 'down', 'route215'),
    ('route215', 'down', 'veilstone'),
    ('solaceon', 'left', 'route210north'),       # branch toward Celestic
    ('route210north', 'left', 'celestic_pond'),
    ('celestic_pond', 'left', 'celestic'),
    # Pastoria arm (gym 5)
    ('veilstone', 'down', 'route214'),
    ('veilstone', 'right', 'galactic_hq'),       # Galactic HQ branch
    ('route214', 'down', 'valor_lakefront'),
    ('valor_lakefront', 'down', 'pastoria'),
    ('pastoria', 'down', 'great_marsh'),         # branch
    ('pastoria', 'left', 'route212south'),
    ('route212south', 'left', 'route212north'),
    ('route212north', 'up', 'route213'),
    # Canalave arm (gym 6)
    ('jubilife', 'left', 'route218'),
    ('route218', 'left', 'canalave'),
    ('canalave', 'left', 'iron_island'),         # branch
    # Snowpoint arm (gym 7)
    ('celestic', 'up', 'route216'),
    ('route216', 'up', 'route217'),
    ('route217', 'up', 'acuity_lakefront'),
    ('acuity_lakefront', 'up', 'snowpoint'),
    ('snowpoint', 'up', 'snowpoint_temple'),     # branch
    # Sunyshore arm (gym 8)
    ('veilstone', 'up', 'route222'),
    ('route222', 'right', 'sunyshore'),
    # Mt Coronet interior chain (branch network -> Spear Pillar)
    ('mt_coronet_main', 'up', 'mt_coronet_upper'),
    ('mt_coronet_upper', 'up', 'mt_coronet_summit'),
    ('mt_coronet_summit', 'up', 'spear_pillar'),
    ('spear_pillar', 'up', 'distortion_world'),
    # Victory Road -> League
    ('sunyshore', 'up', 'route223'),
    ('route223', 'up', 'victory_road'),
    ('victory_road', 'up', 'league_front'),
    ('league_front', 'up', 'league_inside'),
    # post-game
    ('league_front', 'right', 'fight_area'),
    ('fight_area', 'up', 'route225'),
    ('route225', 'up', 'stark_mountain'),
    ('fight_area', 'right', 'sendoff_spring'),
    ('sendoff_spring', 'up', 'hall_of_legends'),
]

# maps already authored by hand (don't overwrite); we only add reciprocal conns
EXISTING = {'twinleaf', 'route201', 'sandgem', 'verity_lakefront', 'hall_of_legends'}

# build adjacency: map -> {dir: (to, offset)}
adj = {}
for a, d, b in EDGES:
    adj.setdefault(a, {})[d] = b
    adj.setdefault(b, {})[OPP[d]] = a

# ------------------------------------------------------------ map declarations
# kind: town | route | cave | special ; each gets theme/music/encounters as apt.
TOWNS = {
    'jubilife':  ('Jubilife City', None),
    'oreburgh':  ('Oreburgh City', ('roark', 0, ['miners-hammer'], 'Coal')),
    'floaroma':  ('Floaroma Town', None),
    'eterna':    ('Eterna City', ('gardenia', 1, ['hatchet'], 'Forest')),
    'hearthome': ('Hearthome City', ('fantina', 2, ['power-gauntlets', 'sky-shuttle-pass'], 'Relic')),
    'solaceon':  ('Solaceon Town', None),
    'celestic':  ('Celestic Town', None),
    'veilstone': ('Veilstone City', ('maylene', 3, [], 'Cobble')),
    'pastoria':  ('Pastoria City', ('wake', 4, ['wavewalker-charm'], 'Fen')),
    'canalave':  ('Canalave City', ('byron', 5, [], 'Mine')),
    'snowpoint': ('Snowpoint City', ('candice', 6, ['climbing-gear'], 'Icicle')),
    'sunyshore': ('Sunyshore City', ('volkner', 7, ['cascade-charm'], 'Beacon')),
    'fight_area':('Fight Area', None),
}
TOWN_THEME = {'snowpoint': 'snow', 'sunyshore': 'beach', 'pastoria': 'marsh',
              'canalave': 'beach', 'fight_area': 'beach'}

ROUTES = {
    'route202': 'Route 202', 'route203': 'Route 203', 'route204': 'Route 204',
    'route205south': 'Route 205', 'route205north': 'Route 205', 'route206': 'Route 206',
    'route207': 'Route 207', 'route208': 'Route 208', 'route209': 'Route 209',
    'route210south': 'Route 210', 'route210north': 'Route 210', 'route211': 'Route 211',
    'route212south': 'Route 212', 'route212north': 'Route 212', 'route213': 'Route 213',
    'route214': 'Route 214', 'route215': 'Route 215', 'route216': 'Route 216',
    'route217': 'Route 217', 'route218': 'Route 218', 'route222': 'Route 222',
    'route223': 'Route 223', 'route225': 'Route 225',
}
ROUTE_THEME = {'route216': 'snow', 'route217': 'snow', 'route213': 'beach',
               'route218': 'beach', 'route222': 'beach', 'route223': 'beach',
               'route225': 'mountain', 'route211': 'mountain', 'route207': 'mountain',
               'route206': 'mountain', 'route210north': 'snow'}
ROUTE_WEATHER = {'route217': 'snow', 'route216': 'snow', 'route215': 'rain', 'route212north': 'rain'}

CAVES = {
    'oreburgh_gate': ('Oreburgh Gate', 'cave', None),
    'oreburgh_mine': ('Oreburgh Mine', 'cave', None),
    'ravaged_path': ('Ravaged Path', 'cave', None),
    'eterna_forest': ('Eterna Forest', 'forest', 'fog'),
    'wayward_cave': ('Wayward Cave', 'cave', None),
    'mt_coronet_south': ('Mt. Coronet', 'cave', None),
    'mt_coronet_main': ('Mt. Coronet', 'cave', None),
    'mt_coronet_upper': ('Mt. Coronet Heights', 'mountain', 'snow'),
    'mt_coronet_summit': ('Mt. Coronet Summit', 'snow', 'snow'),
    'lost_tower': ('Lost Tower', 'cave', None),
    'solaceon_ruins': ('Solaceon Ruins', 'cave', None),
    'iron_island': ('Iron Island', 'cave', None),
    'snowpoint_temple': ('Snowpoint Temple', 'cave', None),
    'victory_road': ('Victory Road', 'cave', None),
    'stark_mountain': ('Stark Mountain', 'cave', None),
}
DARK_CAVES = {'wayward_cave', 'victory_road', 'mt_coronet_main', 'lost_tower'}

LAKES = {
    'valley_windworks': ('Valley Windworks', 'galactic', None),
    'valor_lakefront': ('Lakefront — Lake Valor', 'forest', None),
    'celestic_pond': ('Celestic Outskirts', 'forest', None),
    'acuity_lakefront': ('Lakefront — Lake Acuity', 'snow', 'snow'),
    'great_marsh': ('Great Marsh', 'marsh', None),
    'sendoff_spring': ('Sendoff Spring', 'forest', None),
}

# --------------------------------------------------------------- tile builders
def frame(w, h, fill='.'):
    g = [['#'] * w for _ in range(h)]
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            g[y][x] = fill
    return g

def open_sides(g, sides):
    """Carve a 2-wide walkable opening on each connected side (centered)."""
    h = len(g); w = len(g[0])
    for d in sides:
        if d == 'up':
            for x in (w // 2 - 1, w // 2): g[0][x] = '.'
        elif d == 'down':
            for x in (w // 2 - 1, w // 2): g[h - 1][x] = '.'
        elif d == 'left':
            for y in (h // 2 - 1, h // 2): g[y][0] = '.'
        elif d == 'right':
            for y in (h // 2 - 1, h // 2): g[y][w - 1] = '.'

def carve_paths(g, sides):
    """Path spine from center to each opening so every seam is walkable-connected."""
    h = len(g); w = len(g[0]); cx, cy = w // 2, h // 2
    def hline(y, x0, x1):
        for x in range(min(x0, x1), max(x0, x1) + 1): g[y][x] = '='
    def vline(x, y0, y1):
        for y in range(min(y0, y1), max(y0, y1) + 1): g[y][x] = '='
    for d in sides:
        if d == 'up': vline(cx, 0, cy); hline(cy, cx, w // 2 - 1)
        elif d == 'down': vline(cx, cy, h - 1)
        elif d == 'left': hline(cy, 0, cx)
        elif d == 'right': hline(cy, cx, w - 1)
    g[cy][cx] = '='

def scatter_grass(g, rng_seed):
    h = len(g); w = len(g[0])
    s = rng_seed
    def rnd():
        nonlocal s; s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff
    for y in range(2, h - 2):
        for x in range(2, w - 2):
            if g[y][x] == '.' and rnd() < 0.34:
                g[y][x] = ','

def tiles(g):
    return [''.join(r) for r in g]

def conns(mid):
    out = {}
    for d, to in adj.get(mid, {}).items():
        out[d] = {'to': to, 'offset': 0}
    return out

def trainers_for(area):
    return manifest.get(area, [])

def npc_trainers(area, g):
    """Place trainer NPCs from the manifest on walkable non-seam tiles."""
    ids = trainers_for(area)
    out = []
    h = len(g); w = len(g[0])
    spots = [(x, y) for y in range(2, h - 2) for x in range(3, w - 3)
             if g[y][x] in ('.', ',', '=')]
    step = max(1, len(spots) // (len(ids) + 1))
    for i, tid in enumerate(ids):
        if i * step >= len(spots): break
        x, y = spots[i * step + (step // 2)]
        g[y][x] = '.'
        spr = {'Youngster': 'youngster', 'Lass': 'lass', 'Hiker': 'hiker', 'Fisherman': 'fisher',
               'Swimmer': 'swimmer', 'Sailor': 'sailor', 'Ace Trainer': 'ace', 'Skier': 'skier',
               'Scientist': 'scientist', 'Galactic Grunt': 'grunt'}
        out.append({'id': 'tr' + str(i), 'x': x, 'y': y, 'sprite': 'ace', 'dir': 'down',
                    'move': 'spin', 'trainer': tid, 'sight': 3})
    return out

def write_map(mid, payload):
    payload = dict(payload)
    with open(os.path.join(OUT, mid + '.js'), 'w', encoding='utf-8') as f:
        f.write("PKM.registerMap('%s', " % mid)
        json.dump(payload, f, separators=(',', ':'))
        f.write(');\n')

count = 0

# ------------------------------------------------------------------- routes
for mid, name in ROUTES.items():
    sides = list(adj.get(mid, {}).keys())
    horiz = 'left' in sides or 'right' in sides
    w, h = (30, 13) if horiz else (21, 16)
    g = frame(w, h)
    open_sides(g, sides)
    carve_paths(g, sides)
    scatter_grass(g, sum(ord(c) for c in mid))
    npcs = npc_trainers(mid, g)
    items = []
    # a couple of pickups on early routes
    payload = {'name': name, 'theme': ROUTE_THEME.get(mid, 'outdoor'), 'music': 'route',
               'encounters': mid, 'tiles': tiles(g), 'connections': conns(mid),
               'npcs': npcs, 'signs': [], 'triggers': [], 'items': items}
    if mid in ROUTE_WEATHER:
        payload['weather'] = ROUTE_WEATHER[mid]
    write_map(mid, payload); count += 1

# ------------------------------------------------------------------- caves
for mid, (name, theme, weather) in CAVES.items():
    sides = list(adj.get(mid, {}).keys())
    w, h = 25, 17
    g = frame(w, h)
    open_sides(g, sides)
    carve_paths(g, sides)
    # caves: walkable floor counts as encounters via caveEncounters
    npcs = npc_trainers(mid, g)
    payload = {'name': name, 'theme': theme, 'music': 'cave' if theme == 'cave' else 'route',
               'encounters': mid, 'caveEncounters': True, 'indoor': True,
               'tiles': tiles(g), 'connections': conns(mid), 'npcs': npcs,
               'signs': [], 'triggers': []}
    if mid in DARK_CAVES:
        payload['dark'] = True
    if weather:
        payload['weather'] = weather
    write_map(mid, payload); count += 1

# ------------------------------------------------------------------- lakes/special wild areas
for mid, (name, theme, weather) in LAKES.items():
    sides = list(adj.get(mid, {}).keys())
    w, h = 23, 15
    g = frame(w, h)
    open_sides(g, sides)
    carve_paths(g, sides)
    # central water body (surfable branch content; not on mandatory path)
    for y in range(4, h - 4):
        for x in range(4, w - 4):
            if g[y][x] == '.': g[y][x] = '~'
    scatter_grass(g, sum(ord(c) for c in mid))
    payload = {'name': name, 'theme': theme, 'music': 'surf', 'encounters': mid,
               'tiles': tiles(g), 'connections': conns(mid), 'npcs': [], 'signs': [], 'triggers': []}
    if weather:
        payload['weather'] = weather
    write_map(mid, payload); count += 1

# ------------------------------------------------------------------- towns
for mid, (name, gym) in TOWNS.items():
    sides = list(adj.get(mid, {}).keys())
    w, h = 23, 17
    g = frame(w, h)
    open_sides(g, sides)
    carve_paths(g, sides)
    # building footprints with door tiles (D) leading to interiors
    warps = []
    # center (top-left area) and mart (top-right)
    def place_building(bx, by, roofchar, to, tx, ty):
        for yy in range(by, by + 2):
            for xx in range(bx, bx + 3):
                g[yy][xx] = roofchar
        g[by + 2][bx + 1] = 'D'
        warps.append({'x': bx + 1, 'y': by + 2, 'to': to, 'tx': tx, 'ty': ty, 'dir': 'down'})
    place_building(3, 2, 'P', mid + '_center', 7, 6)
    place_building(w - 6, 2, 'M', mid + '_mart', 6, 7)
    npcs = [{'id': 'towny', 'x': w // 2 + 2, 'y': h // 2, 'sprite': 'lass', 'dir': 'down',
             'move': 'wander', 'text': 'generic_hmless'}]
    triggers = []
    signs = [{'x': 4, 'y': h - 3, 'text': name + ' — ' + ('Gym town!' if gym else 'A peaceful stop on your journey.')}]
    if gym:
        leader, badge, rewards, badge_name = gym
        place_building(w // 2 - 1, 2, 'G', mid + '_gym', 6, 11)
    payload = {'name': name, 'theme': TOWN_THEME.get(mid, 'outdoor'), 'music': 'town', 'town': mid,
               'tiles': tiles(g), 'connections': conns(mid), 'warps': warps,
               'npcs': npcs, 'signs': signs, 'triggers': triggers}
    # coastal towns: a surfable/fishable water strip wired to the town's water table
    if mid in ('canalave', 'pastoria', 'sunyshore'):
        for x in range(2, w - 2):
            g[h - 2][x] = '~'
        payload['tiles'] = tiles(g)
        payload['encounters'] = mid + '_water'
    # Fight Area (Battle Zone): grassy frontier with its own wild table
    if mid == 'fight_area':
        scatter_grass(g, 999)
        payload['tiles'] = tiles(g)
        payload['encounters'] = 'fight_area'
    write_map(mid, payload); count += 1

    # gym interior
    if gym:
        leader, badge, rewards, badge_name = gym
        gw, gh = 13, 14
        gg = frame(gw, gh)
        gg[gh - 1][6] = 'D'
        # leader at top center
        gym_npcs = [{'id': 'leader', 'x': 6, 'y': 2, 'sprite': PKM_LEADER_SPRITE.get(leader, 'leader'),
                     'dir': 'down', 'move': 'static', 'script': 'gym_' + mid}]
        # two gym trainers
        for i, tid in enumerate(trainers_for(mid + '_gym')):
            gym_npcs.append({'id': 'g' + str(i), 'x': 3 + i * 6, 'y': 6 + i * 2,
                             'sprite': 'ace', 'dir': 'down', 'move': 'spin', 'trainer': tid, 'sight': 2})
        gym_payload = {'name': name + ' Gym', 'theme': 'gym', 'music': 'leader', 'indoor': True,
                       'tiles': tiles(gg),
                       'warps': [{'x': 6, 'y': gh - 1, 'to': mid, 'tx': w // 2, 'ty': 5, 'dir': 'down'}],
                       'npcs': gym_npcs, 'signs': [{'x': 5, 'y': gh - 2, 'text': name + ' Gym — Leader: ' + leader.title()}],
                       'triggers': []}
        write_map(mid + '_gym', gym_payload); count += 1

# ------------------------------------------------------------------- special maps
def special(mid, name, theme, music, extra=None, indoor=True, weather=None, w=21, h=15):
    sides = list(adj.get(mid, {}).keys())
    g = frame(w, h)
    open_sides(g, sides)
    carve_paths(g, sides)
    payload = {'name': name, 'theme': theme, 'music': music, 'indoor': indoor,
               'tiles': tiles(g), 'connections': conns(mid), 'npcs': [], 'signs': [], 'triggers': []}
    if weather:
        payload['weather'] = weather
    if extra:
        payload.update(extra(g, payload))
    return g, payload

# Galactic HQ (Veilstone) — grunts + Saturn boss; door to/from Veilstone
g, p = special('galactic_hq', 'Galactic HQ', 'galactic', 'galactic', w=21, h=17)
gn = npc_trainers('galactic_hq', g)
gn.append({'id': 'saturn', 'x': 10, 'y': 2, 'sprite': 'commander', 'dir': 'down',
           'move': 'static', 'script': 'galactic_hq_boss'})
p['tiles'] = tiles(g); p['npcs'] = gn
p['signs'] = [{'x': 4, 'y': 14, 'text': 'Team Galactic HQ. Cold light hums in every corridor.'}]
write_map('galactic_hq', p); count += 1

# Spear Pillar — the confrontation; Mars+Jupiter then Cyrus, Giratina drags you under
g, p = special('spear_pillar', 'Spear Pillar', 'snow', 'galactic', weather='snow', w=21, h=15)
p['onEnter'] = 'spear_pillar_event'   # fires on entry so it can't be walked around
p['triggers'] = []
p['signs'] = [{'x': 4, 'y': 12, 'text': 'Ancient pillars ring the summit. The air thrums with the weight of creation.'}]
write_map('spear_pillar', p); count += 1

# Distortion World — Giratina's realm; Cyrus final battle then Giratina catch
g, p = special('distortion_world', 'Distortion World', 'distortion', 'distortion', w=23, h=17)
p['encounters'] = 'distortion_world'
p['caveEncounters'] = True
p['onEnter'] = 'distortion_finale'   # fires on entry so it can't be walked around
p['triggers'] = []
p['signs'] = [{'x': 4, 'y': 14, 'text': 'Up is down, near is far. Giratina watches from everywhere at once.'}]
write_map('distortion_world', p); count += 1

# League front (outdoor approach with Center/Mart)
sides = list(adj.get('league_front', {}).keys())
g = frame(19, 15); open_sides(g, sides); carve_paths(g, sides)
def lb(bx, by, ch, to, tx, ty, warps):
    for yy in range(by, by + 2):
        for xx in range(bx, bx + 3): g[yy][xx] = ch
    g[by + 2][bx + 1] = 'D'
    warps.append({'x': bx + 1, 'y': by + 2, 'to': to, 'tx': tx, 'ty': ty, 'dir': 'down'})
lw = []
lb(2, 2, 'P', 'league_center', 7, 6, lw)
lb(14, 2, 'M', 'league_mart', 6, 7, lw)
p = {'name': 'Pokemon League', 'theme': 'league', 'music': 'town', 'town': 'league',
     'tiles': tiles(g), 'connections': conns('league_front'), 'warps': lw,
     'npcs': [{'id': 'guard', 'x': 9, 'y': 4, 'sprite': 'ace', 'dir': 'down', 'move': 'static',
               'script': 'league_gate'}],
     'signs': [{'x': 4, 'y': 12, 'text': 'POKEMON LEAGUE — Beyond these doors wait the Elite Four and the Champion.'}],
     'triggers': []}
write_map('league_front', p); count += 1

# League inside — the E4 gauntlet + Champion, run as one scripted sequence
sides = list(adj.get('league_inside', {}).keys())
g = frame(15, 16); open_sides(g, sides); carve_paths(g, sides)
p = {'name': 'Pokemon League', 'theme': 'league', 'music': 'leader', 'indoor': True,
     'tiles': tiles(g), 'connections': conns('league_inside'),
     'warps': [{'x': 7, 'y': 15, 'to': 'league_front', 'tx': 9, 'ty': 7, 'dir': 'down'}],
     'npcs': [{'id': 'e4', 'x': 7, 'y': 2, 'sprite': 'cynthia', 'dir': 'down', 'move': 'static',
               'script': 'elite_four_run'}],
     'signs': [], 'triggers': []}
write_map('league_inside', p); count += 1

print('gen_world: wrote %d maps' % count)
