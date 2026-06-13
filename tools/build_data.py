#!/usr/bin/env python3
"""Builds compact game data files from the PokeAPI CSV dump in tools/cache/.

Outputs browser-loadable JS files into js/data/, each of the form:
    PKM.registerData('<key>', <pure JSON literal>);
so they work over file:// (classic script tags) and remain machine-parseable.
"""
import csv, json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(HERE, '..', 'js', 'data')
EN = '9'  # English language id

def rows(name):
    with open(os.path.join(CACHE, name), newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            yield r

def write_data(key, payload, fname):
    path = os.path.join(OUT, fname)
    with open(path, 'w', encoding='utf-8') as f:
        f.write("PKM.registerData('%s', " % key)
        json.dump(payload, f, separators=(',', ':'), ensure_ascii=False)
        f.write(');\n')
    print('wrote %s (%d KB)' % (fname, os.path.getsize(path) // 1024))

# ---------------------------------------------------------------- base tables
TYPE_BY_ID = {r['id']: r['identifier'] for r in rows('types.csv') if int(r['id']) < 100}
ITEM_BY_ID = {r['id']: r['identifier'] for r in rows('items.csv')}
MOVE_NAME = {r['move_id']: r['name'] for r in rows('move_names.csv') if r['local_language_id'] == EN}
ABIL_NAME = {r['ability_id']: r['name'] for r in rows('ability_names.csv') if r['local_language_id'] == EN}
ABIL_IDENT = {r['id']: r['identifier'] for r in rows('abilities.csv')}

SPECIES_NAME, SPECIES_GENUS = {}, {}
for r in rows('pokemon_species_names.csv'):
    if r['local_language_id'] == EN:
        SPECIES_NAME[r['pokemon_species_id']] = r['name']
        SPECIES_GENUS[r['pokemon_species_id']] = r['genus']

SPECIES = {r['id']: r for r in rows('pokemon_species.csv')}
POKEMON = {r['id']: r for r in rows('pokemon.csv')}

VG_ORDER = {r['id']: int(r['order'] or 0) for r in rows('version_groups.csv')}

STATS = defaultdict(lambda: [0] * 6)
for r in rows('pokemon_stats.csv'):
    sid = int(r['stat_id'])
    if 1 <= sid <= 6:
        STATS[r['pokemon_id']][sid - 1] = int(r['base_stat'])

PTYPES = defaultdict(dict)
for r in rows('pokemon_types.csv'):
    PTYPES[r['pokemon_id']][int(r['slot'])] = TYPE_BY_ID.get(r['type_id'])

PABIL = defaultdict(dict)
for r in rows('pokemon_abilities.csv'):
    PABIL[r['pokemon_id']][(int(r['is_hidden']), int(r['slot']))] = ABIL_IDENT.get(r['ability_id'])

# ------------------------------------------------------------ form inclusion
REGIONAL = ('-alola', '-galar', '-hisui', '-paldea')
EXTRA_FORMS = {
    'deoxys-attack', 'deoxys-defense', 'deoxys-speed',
    'wormadam-sandy', 'wormadam-trash', 'shaymin-sky', 'giratina-origin',
    'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow',
    'basculin-blue-striped', 'basculin-white-striped',
    'tornadus-therian', 'thundurus-therian', 'landorus-therian', 'enamorus-therian',
    'kyurem-black', 'kyurem-white', 'keldeo-resolute', 'hoopa-unbound',
    'pumpkaboo-small', 'pumpkaboo-large', 'pumpkaboo-super',
    'gourgeist-small', 'gourgeist-large', 'gourgeist-super',
    'zygarde-10', 'oricorio-pom-pom', 'oricorio-pau', 'oricorio-sensu',
    'lycanroc-midnight', 'lycanroc-dusk', 'toxtricity-low-key',
    'indeedee-female', 'urshifu-rapid-strike', 'basculegion-female',
    'oinkologne-female', 'dudunsparce-three-segment', 'maushold-family-of-three',
    'ogerpon-wellspring-mask', 'ogerpon-hearthflame-mask', 'ogerpon-cornerstone-mask',
    'ursaluna-bloodmoon',
}
EXCLUDE_SUBSTR = ('-totem', '-zen', '-cap', '-cosplay', '-belle', '-libre',
                  '-phd', '-pop-star', '-rock-star', '-starter', '-battle-bond',
                  '-ash', '-eternal', '-gmax', '-mega')

def include_pokemon(p):
    if p['is_default'] == '1':
        return True
    ident = p['identifier']
    if any(s in ident for s in EXCLUDE_SUBSTR):
        return False
    if any(s in ident for s in REGIONAL):
        return True
    return ident in EXTRA_FORMS

def pretty_form_name(ident, base_name):
    """raichu-alola -> Alolan Raichu; rotom-heat -> Heat Rotom; etc."""
    suffix = ident.split('-', 1)[1] if '-' in ident else ''
    low = '-' + suffix
    for tag, adj in (('-alola', 'Alolan'), ('-galar', 'Galarian'),
                     ('-hisui', 'Hisuian'), ('-paldea', 'Paldean')):
        if tag in low:
            extra = low.replace(tag, '').strip('-').replace('-breed', '').replace('-', ' ').title()
            return ('%s %s (%s)' % (adj, base_name, extra)) if extra else ('%s %s' % (adj, base_name))
    words = suffix.replace('-', ' ').title()
    return '%s (%s)' % (base_name, words)

DEX = {}           # pokemon_id(int) -> entry
DEFAULT_OF = {}    # species_id(str) -> default pokemon_id(int)
FORMS_OF = defaultdict(list)  # species_id -> [pokemon_id,...] (non-default included)
for pid, p in POKEMON.items():
    if not include_pokemon(p):
        continue
    sp = SPECIES[p['species_id']]
    nid = int(pid)
    base_name = SPECIES_NAME.get(p['species_id'], sp['identifier'].title())
    name = base_name if p['is_default'] == '1' else pretty_form_name(p['identifier'], base_name)
    ab = PABIL[pid]
    abilities = [a for a in (ab.get((0, 1)), ab.get((0, 2)), ab.get((1, 3))) if a]
    types = [PTYPES[pid][s] for s in sorted(PTYPES[pid])]
    DEX[nid] = {
        'id': nid, 'species': int(p['species_id']), 'ident': p['identifier'],
        'name': name, 'types': types, 'stats': STATS[pid], 'abilities': abilities,
        'catch': int(sp['capture_rate'] or 45), 'baseExp': int(p['base_experience'] or 64),
        'happy': int(sp['base_happiness'] or 50), 'growth': int(sp['growth_rate_id'] or 2),
        'gender': int(sp['gender_rate']), 'gen': int(sp['generation_id']),
        'legend': 1 if sp['is_legendary'] == '1' else (2 if sp['is_mythical'] == '1' else 0),
        'height': int(p['height'] or 10), 'weight': int(p['weight'] or 100),
        'genus': SPECIES_GENUS.get(p['species_id'], ''),
        'evFrom': int(sp['evolves_from_species_id']) if sp['evolves_from_species_id'] else 0,
    }
    if p['is_default'] == '1':
        DEFAULT_OF[p['species_id']] = nid
    else:
        FORMS_OF[p['species_id']].append(nid)

print('dex entries:', len(DEX), '(default species:', len(DEFAULT_OF), ')')

# ----------------------------------------------------------------- moves
MOVES = {}
META = {r['move_id']: r for r in rows('move_meta.csv')}
MSC = defaultdict(list)
for r in rows('move_meta_stat_changes.csv'):
    MSC[r['move_id']].append([int(r['stat_id']), int(r['change'])])

for r in rows('moves.csv'):
    mid = int(r['id'])
    if mid >= 10000:
        continue
    ident = r['identifier']
    if ident.startswith('max-') or ident.startswith('g-max'):
        continue
    m = META.get(r['id'], {})
    def gi(d, k):
        v = d.get(k) if isinstance(d, dict) else None
        return int(v) if v not in (None, '') else 0
    MOVES[mid] = {
        'id': mid, 'ident': ident, 'name': MOVE_NAME.get(r['id'], ident.title()),
        'type': TYPE_BY_ID.get(r['type_id'], 'normal'),
        'cls': {'1': 'status', '2': 'physical', '3': 'special'}.get(r['damage_class_id'], 'status'),
        'power': int(r['power']) if r['power'] else 0,
        'pp': int(r['pp']) if r['pp'] else 5,
        'acc': int(r['accuracy']) if r['accuracy'] else 0,  # 0 = never misses
        'prio': int(r['priority'] or 0),
        'effect': int(r['effect_id'] or 1), 'effectChance': int(r['effect_chance']) if r['effect_chance'] else 0,
        'cat': gi(m, 'meta_category_id'), 'ailment': gi(m, 'meta_ailment_id'),
        'ailChance': gi(m, 'ailment_chance'), 'flinch': gi(m, 'flinch_chance'),
        'drain': gi(m, 'drain'), 'heal': gi(m, 'healing'), 'crit': gi(m, 'crit_rate'),
        'hitsMin': gi(m, 'min_hits'), 'hitsMax': gi(m, 'max_hits'),
        'statChance': gi(m, 'stat_chance'), 'statChanges': MSC.get(r['id'], []),
    }
print('moves:', len(MOVES))

# -------------------------------------------------------------- learnsets
# pokemon_id -> version_group -> [(level, move_id)]
raw_ls = defaultdict(lambda: defaultdict(list))
with open(os.path.join(CACHE, 'pokemon_moves.csv'), newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        if r['pokemon_move_method_id'] != '1':
            continue
        pid = int(r['pokemon_id'])
        if pid not in DEX:
            continue
        mid = int(r['move_id'])
        if mid not in MOVES:
            continue
        raw_ls[pid][r['version_group_id']].append((int(r['level']), mid))

LEARN = {}
for pid, by_vg in raw_ls.items():
    vg = max(by_vg, key=lambda v: VG_ORDER.get(v, 0))
    pairs = sorted(set((max(lv, 1), mv) for lv, mv in by_vg[vg]))
    flat = []
    for lv, mv in pairs:
        flat += [lv, mv]
    LEARN[pid] = flat

# fallback: forms with no learnset inherit their species default's
for pid, e in DEX.items():
    if pid not in LEARN:
        d = DEFAULT_OF.get(str(e['species']))
        if d in LEARN:
            LEARN[pid] = LEARN[d]
        else:
            LEARN[pid] = [1, 33]  # tackle, last resort
print('learnsets:', len(LEARN))

# -------------------------------------------------------------- evolutions
# Species-level rows -> per-pokemon(form) edges with playable conditions.
TRIGGER = {'1': 'level', '2': 'trade', '3': 'item', '4': 'shed', '5': 'spin',
           '6': 'tower-dark', '7': 'tower-water', '8': 'crits', '9': 'damage',
           '10': 'other', '11': 'agile', '12': 'strong', '13': 'recoil'}

raw_evo = defaultdict(list)  # evolved_species_id -> [row]
for r in rows('pokemon_evolution.csv'):
    raw_evo[r['evolved_species_id']].append(r)

# explicit overrides: evolved species ident -> condition dict list
OVERRIDE = {
    'sirfetchd': [{'level': 30}],
    'runerigus': [{'level': 34}],
    'urshifu-single-strike': [{'level': 40}],
    'wyrdeer': [{'level': 31}],
    'overqwil': [{'level': 28}],
    'basculegion': [{'level': 36}],
    'annihilape': [{'level': 35}],
    'kingambit': [{'level': 52}],
    'gholdengo': [{'level': 35}],
    'sneasler': [{'item': 'razor-claw'}],
    'weavile': [{'item': 'razor-claw'}],
    'kleavor': [{'item': 'black-augurite'}],
    'ursaluna': [{'item': 'peat-block'}],
    'alcremie': [{'item': 'strawberry-sweet'}],
    'milotic': [{'item': 'prism-scale'}],
    'magnezone': [{'item': 'thunder-stone'}],
    'probopass': [{'item': 'thunder-stone'}],
    'vikavolt': [{'item': 'thunder-stone'}],
    'leafeon': [{'item': 'leaf-stone'}],
    'glaceon': [{'item': 'ice-stone'}],
    'crabominable': [{'item': 'ice-stone'}],
    'lycanroc-dusk': [{'item': 'dusk-stone'}],
    'malamar': [{'level': 30}],
    'rabsca': [{'level': 29}],
    'pawmot': [{'level': 32}],
    'brambleghast': [{'level': 32}],
    'maushold': [{'level': 25}],
    'palafin': [{'level': 38}],
    'wugtrio': [{'level': 26}],
    'armarouge': [{'item': 'auspicious-armor'}],
    'ceruledge': [{'item': 'malicious-armor'}],
    'hydrapple': [{'item': 'syrupy-apple'}],
    'dipplin': [{'item': 'syrupy-apple'}],
    'sinistcha': [{'item': 'unremarkable-teacup'}],
    'poltchageist': [],  # base form, not an evolution target fix
}

def conv_row(r):
    """Convert one pokemon_evolution row into a playable condition dict."""
    trig = TRIGGER.get(r['evolution_trigger_id'], 'level')
    c = {}
    if r['minimum_level']:
        c['level'] = int(r['minimum_level'])
    if r['gender_id']:
        c['gender'] = 'f' if r['gender_id'] == '1' else 'm'
    if r['time_of_day']:
        c['time'] = r['time_of_day']
    if r['minimum_happiness'] or r['minimum_affection']:
        c['happy'] = 160
    if r['known_move_id']:
        c['knownMove'] = int(r['known_move_id'])
    if r['known_move_type_id']:
        c['knownMoveType'] = TYPE_BY_ID.get(r['known_move_type_id'])
    if r['party_species_id']:
        c['partySpecies'] = int(r['party_species_id'])
    if r['party_type_id']:
        c['partyType'] = TYPE_BY_ID.get(r['party_type_id'])
    if r['relative_physical_stats']:
        c['atkDef'] = int(r['relative_physical_stats'])  # 1 atk>def, -1 atk<def, 0 equal
    if r['needs_overworld_rain'] == '1':
        c['rain'] = 1
    if trig == 'item' and r['trigger_item_id']:
        c['item'] = ITEM_BY_ID.get(r['trigger_item_id'])
        c.pop('level', None)
    elif trig == 'trade':
        if r['held_item_id']:
            c['item'] = ITEM_BY_ID.get(r['held_item_id'])
        elif r['trade_species_id']:
            c['item'] = 'linking-cord'
        else:
            c['item'] = 'linking-cord'
    elif trig == 'shed':
        c['level'] = c.get('level', 20)
        c['shed'] = 1
    elif trig in ('spin', 'tower-dark', 'tower-water', 'crits', 'damage', 'other',
                  'agile', 'strong', 'recoil'):
        c.setdefault('level', 30)
    else:  # plain level-up
        if r['held_item_id']:  # held-item level-ups become use-item
            c['item'] = ITEM_BY_ID.get(r['held_item_id'])
            c.pop('level', None)
        if 'level' not in c and 'happy' not in c and 'item' not in c \
           and 'knownMove' not in c and 'knownMoveType' not in c:
            c['level'] = 30
    if 'beauty' in c:
        del c['beauty']
    if r['minimum_beauty']:
        c = {'item': 'prism-scale'}
    return c

EVOS = defaultdict(list)  # base pokemon id -> [{to:pokemonId, ...cond}]
for sp_id, rws in raw_evo.items():
    sp = SPECIES.get(sp_id)
    if not sp or not sp['evolves_from_species_id']:
        continue
    base_sp = sp['evolves_from_species_id']
    target_default = DEFAULT_OF.get(sp_id)
    if target_default is None:
        continue
    ident = sp['identifier']
    # gather conditions: prefer use-item rows when both location-rows and item rows exist
    conds = []
    item_rows = [r for r in rws if r['evolution_trigger_id'] == '3' and r['trigger_item_id']]
    use = item_rows if item_rows else rws
    seen = set()
    for r in use:
        c = conv_row(r)
        if r['location_id'] and 'item' not in c and 'level' not in c:
            c['level'] = 30  # location-based fallback
        key = json.dumps(c, sort_keys=True)
        if key not in seen:
            seen.add(key)
            conds.append((r, c))
    # apply overrides by evolved-species identifier or per-form identifier
    for base_pid in [DEFAULT_OF.get(base_sp)] + FORMS_OF.get(base_sp, []):
        if base_pid is None:
            continue
        base_e = DEX[base_pid]
        base_regional = next((t for t in REGIONAL if t in base_e['ident']), None)
        # choose target form: regional base -> matching regional target if it exists
        target = target_default
        t_forms = FORMS_OF.get(sp_id, [])
        if base_regional:
            match = [f for f in t_forms if base_regional in DEX[f]['ident']]
            if match:
                target = match[0]
            else:
                # regional base with no regional target: allow only when species
                # has explicit cross-region evo (e.g. exeggcute? n/a) - default ok
                target = target_default
        targets = [target]
        # gender-split / special multi-form targets (e.g. meowstic, basculegion,
        # indeedee, oinkologne, urshifu...) handled via per-form conditions below.
        for tform in t_forms:
            tident = DEX[tform]['ident']
            if tident in OVERRIDE and tform not in targets and not base_regional:
                # forms like lycanroc-midnight/dusk, urshifu-rapid: separate edges
                if OVERRIDE[tident]:
                    for oc in OVERRIDE[tident]:
                        EVOS[base_pid].append(dict({'to': tform}, **oc))
        ov = OVERRIDE.get(ident)
        if ov is not None:
            base_only = {
                'overqwil': '-hisui', 'sneasler': '-hisui', 'basculegion': 'white-striped',
            }.get(ident)
            if base_only and base_only not in base_e['ident']:
                continue
            for oc in ov:
                EVOS[base_pid].append(dict({'to': target}, **oc))
            continue
        for r, c in conds:
            # respect explicit base_form_id when present
            if r.get('base_form_id'):
                bf = r['base_form_id']
                if SPECIES.get(bf) and DEFAULT_OF.get(bf) != base_pid and \
                   all(DEX[f]['species'] != int(bf) for f in [base_pid]):
                    pass  # base_form refers to species table in some dumps; skip strict check
            EVOS[base_pid].append(dict({'to': target}, **c))

# pure-trade edges also get a level fallback so nothing is gated on one item
for pid, edges in EVOS.items():
    extra = []
    for e in edges:
        if e.get('item') == 'linking-cord':
            extra.append({'to': e['to'], 'level': 36})
    edges += extra

# gender-form targets: route female players... (handled in engine: if target
# species has gendered forms, engine picks form by mon gender)
GENDER_FORM_TARGETS = {}
for sp_id, forms in FORMS_OF.items():
    for f in forms:
        if DEX[f]['ident'].endswith('-female'):
            GENDER_FORM_TARGETS[DEFAULT_OF[sp_id]] = f

# special: nature-based toxtricity
TOX_AMPED = DEFAULT_OF.get('849')
print('evolution bases:', len(EVOS))

# unreachable-evo audit: every non-base included form should be wild-able or evolvable
targets = set()
for edges in EVOS.values():
    targets.update(e['to'] for e in edges)

# --------------------------------------------------------------- exp curves
CURVES = defaultdict(list)
for r in rows('experience.csv'):
    CURVES[r['growth_rate_id']].append((int(r['level']), int(r['experience'])))
EXP = {g: [e for _, e in sorted(v)] for g, v in CURVES.items()}

# ------------------------------------------------------------------- output
os.makedirs(OUT, exist_ok=True)
write_data('species', {'list': [DEX[k] for k in sorted(DEX)]}, 'species.js')
write_data('moves', {'list': [MOVES[k] for k in sorted(MOVES)]}, 'moves.js')
write_data('learnsets', LEARN, 'learnsets.js')
write_data('evolutions', {'edges': EVOS, 'genderForms': GENDER_FORM_TARGETS}, 'evolutions.js')
write_data('expcurves', EXP, 'expcurves.js')
write_data('abilityNames', {ABIL_IDENT[i]: ABIL_NAME.get(i, ABIL_IDENT[i].title())
                            for i in ABIL_IDENT if i in ABIL_NAME}, 'abilitynames.js')
print('done.')
