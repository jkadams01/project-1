#!/usr/bin/env python3
"""Generates js/data/trainers.js: bosses (hand-tuned, Platinum-faithful) and
themed route/gym/Galactic trainers sampled from species data."""
import json, os, random
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
random.seed(4)  # deterministic

def load_payload(path):
    s = open(path, encoding='utf-8').read()
    return json.loads(s[s.index(', ') + 2:s.rindex(');')])

species = load_payload(os.path.join(ROOT, 'js/data/species.js'))['list']
by_id = {e['id']: e for e in species}

def bst(e): return sum(e['stats'])

T = {}

def trainer(tid, name, cls, sprite, mons, money, music=None, ai='good', intro=None, lose=None):
    T[tid] = {k: v for k, v in {
        'name': name, 'class': cls, 'sprite': sprite, 'music': music, 'ai': ai,
        'money': money, 'mons': mons, 'introText': intro, 'loseText': lose
    }.items() if v is not None}

def m(pid, lv, item=None):
    d = {'id': pid, 'level': lv}
    if item: d['item'] = item
    return d

# --------------------------------- bosses ---------------------------------
trainer('roark', 'Roark', 'Leader', 'leader', [m(74, 12), m(95, 12), m(408, 14, 'oran-berry')], 120, 'leader',
        intro='Roark: I\'m Roark, and these fossils aren\'t the only hard-headed things in this Gym. Show me what you\'ve got!',
        lose='W-what? My Cranidos! ...You\'ve earned this, fair and square.')
trainer('gardenia', 'Gardenia', 'Leader', 'leader', [m(387, 20), m(421, 20), m(407, 22, 'sitrus-berry')], 120, 'leader',
        intro='Gardenia: The Eterna Gym is one big garden - and everything in it bites! Let\'s dance!',
        lose='Amazing! You and your Pokemon move like you share one mind.')
trainer('fantina', 'Fantina', 'Leader', 'commander', [m(355, 24), m(93, 24), m(429, 26, 'sitrus-berry')], 120, 'leader',
        intro='Fantina: Bienvenue! In this Gym, what you cannot see CAN hurt you. Magnifique, non?',
        lose='Merveilleux! Your style, your courage - I am charmed!')
trainer('maylene', 'Maylene', 'Leader', 'ace', [m(307, 28), m(67, 29), m(448, 32, 'sitrus-berry')], 120, 'leader',
        intro='Maylene: I train barefoot so I never forget the basics. Footwork first - now, fight!',
        lose='...A clean hit. My Lucario respects you. So do I.')
trainer('wake', 'Crasher Wake', 'Leader', 'swimmer', [m(130, 33), m(195, 34), m(419, 37, 'sitrus-berry')], 120, 'leader',
        intro='Crasher Wake: WAVES CRASH! So do I! CRASHER WAKE makes landfall!',
        lose='GWAHAHA! Beaten like a drum! You\'re a tidal wave yourself, kid!')
trainer('byron', 'Byron', 'Leader', 'hiker', [m(82, 37), m(208, 38), m(411, 41, 'sitrus-berry')], 120, 'leader',
        intro='Byron: Steel! It shelters us, it arms us, it OUTLASTS us! Can you dent it?',
        lose='A fine swing! My son chose a good rival in you.')
trainer('candice', 'Candice', 'Leader', 'skier', [m(215, 40), m(221, 40), m(460, 42), m(478, 44, 'sitrus-berry')], 120, 'leader',
        intro='Candice: I\'m Candice, and my focus is razor sharp! Hope you don\'t get cold feet!',
        lose='Brrr-illiant! You melted my whole strategy!')
trainer('volkner', 'Volkner', 'Leader', 'ace', [m(135, 46), m(26, 46), m(405, 48), m(466, 50, 'sitrus-berry')], 120, 'leader',
        intro='Volkner: ...You\'re the one everyone\'s talking about? Fine. Recharge my passion for battle - full voltage!',
        lose='Ha... haha! THERE it is! That spark! Thank you for this.')
trainer('aaron', 'Aaron', 'Elite Four', 'ace', [m(469, 49), m(212, 49), m(416, 50), m(214, 51), m(452, 53, 'sitrus-berry')], 200, 'leader',
        intro='Aaron: Bug Pokemon are beautiful - efficient, elegant, utterly ruthless. Like me!',
        lose='So strong... and so beautiful a battle.')
trainer('bertha', 'Bertha', 'Elite Four', 'elder', [m(340, 50), m(472, 53), m(450, 52), m(76, 52), m(464, 55, 'sitrus-berry')], 200, 'leader',
        intro='Bertha: Oh my, what a youthful aura. Let this old lady show you how the ground itself fights back.',
        lose='Hohoho! Splendid! You hit harder than time itself.')
trainer('flint', 'Flint', 'Elite Four', 'ace', [m(229, 52), m(136, 55), m(78, 53), m(392, 55), m(467, 57, 'sitrus-berry')], 200, 'leader',
        intro='Flint: My buddy Volkner sent word about you! Let\'s burn this place down - figuratively! Mostly!',
        lose='BURNT OUT! That fire of yours is the real deal.')
trainer('lucian', 'Lucian', 'Elite Four', 'scientist', [m(122, 53), m(196, 55), m(437, 54), m(65, 56), m(475, 59, 'sitrus-berry')], 200, 'leader',
        intro='Lucian: I was just at the best part of my book... but a mind is sharpened by interruption. En garde.',
        lose='...Checkmate, and not in my favor. Masterfully played.')
trainer('cynthia', 'Cynthia', 'Champion', 'cynthia', [m(442, 58), m(407, 58), m(468, 60), m(448, 60, 'sitrus-berry'), m(350, 58), m(445, 62, 'sitrus-berry')], 300, 'champion',
        intro='Cynthia: Every Trainer who stands here has a story. Lakes, legends, a team that tried to unmake the world... Show me how yours ends - with everything you have!',
        lose='...Magnificent. The title of Champion is yours. Wear it the way you earned it - kindly.')

trainer('mars1', 'Mars', 'Galactic Commander', 'commander', [m(41, 15), m(432, 17, 'oran-berry')], 160, 'galactic', ai='good',
        intro='Mars: Team Galactic is building a better universe. You\'re standing in the construction zone, kid.',
        lose='Tch. Noted. You\'re a variable now.')
trainer('jupiter1', 'Jupiter', 'Galactic Commander', 'commander', [m(41, 18), m(435, 20, 'oran-berry')], 160, 'galactic', ai='good',
        intro='Jupiter: The bikes, the building, the whole city - all of it is fuel for something greater. Move along... or don\'t.',
        lose='Hmph. Enjoy the small victory. It changes nothing.')
trainer('saturn1', 'Saturn', 'Galactic Commander', 'commander', [m(42, 38), m(436, 38), m(454, 40, 'sitrus-berry')], 160, 'galactic', ai='good',
        intro='Saturn: You walked INTO our headquarters? I almost respect that. Almost.',
        lose='...The boss won\'t care. He\'s already past the point of caring about anything.')
trainer('cyrus1', 'Cyrus', 'Galactic Boss', 'boss', [m(215, 34), m(169, 34), m(198, 34)], 200, 'galactic', ai='good',
        intro='Cyrus: Spirit. Emotion. Strife. I will delete them all and build a world of pure order. You are... noise.',
        lose='Noise... but persistent noise. Remember this mercy; I will not extend it twice.')
trainer('mars2', 'Mars', 'Galactic Commander', 'commander', [m(436, 41), m(42, 42), m(432, 45, 'sitrus-berry')], 180, 'galactic', ai='good',
        intro='Mars: This is the summit of everything! You don\'t get to ruin it!', lose='No... not when we\'re this close!')
trainer('jupiter2', 'Jupiter', 'Galactic Commander', 'commander', [m(436, 41), m(42, 42), m(435, 45, 'sitrus-berry')], 180, 'galactic', ai='good',
        intro='Jupiter: The new world is a hallway away. You stop HERE.', lose='Impossible... Mars, we...')
trainer('cyrus2', 'Cyrus', 'Galactic Boss', 'boss', [m(229, 45), m(430, 47), m(169, 46), m(130, 46), m(461, 48, 'sitrus-berry')], 250, 'distortion', ai='good',
        intro='Cyrus: Look at this place - emotion given gravity, spirit given fangs. Giratina\'s world... and proof that mine is necessary. Final obstacle: removed.',
        lose='...I will not yield. But this world... it does not yield either...')
trainer('looker_ally', 'Looker', 'International Police', 'looker', [m(441, 30)], 80, None, ai='basic')

# --------------------------- generated trainers ----------------------------
CLASS_INFO = {
    'youngster': ('Youngster', 'youngster', 16, ['normal', 'bug', 'flying'], 'Hey! My shorts are comfy and my Pokemon are tough!', 'Aw, man...'),
    'lass': ('Lass', 'lass', 16, ['fairy', 'normal', 'grass'], 'My Pokemon and I practice every single day!', 'Oh! You\'re strong!'),
    'hiker': ('Hiker', 'hiker', 32, ['rock', 'ground', 'fighting'], 'Hah! The mountain made me tough - my Pokemon, tougher!', 'Solid as a rock, you are!'),
    'fisher': ('Fisherman', 'fisher', 24, ['water'], 'Watch the line, watch the line... oh! A Trainer bite!', 'You reeled me right in.'),
    'swimmer': ('Swimmer', 'swimmer', 16, ['water'], 'The current\'s great today! Race you - battle first!', 'Glub... you win!'),
    'sailor': ('Sailor', 'sailor', 32, ['water', 'fighting'], 'A sailor never backs down from a squall or a scrap!', 'Blown clean out of the water!'),
    'ace': ('Ace Trainer', 'ace', 60, None, 'I\'ve trained for this exact moment. Don\'t blink.', 'A flawless read... incredible.'),
    'skier': ('Skier', 'skier', 32, ['ice'], 'Fresh powder and a fresh challenger - perfect day!', 'Cool. Genuinely cool.'),
    'scientist': ('Scientist', 'scientist', 48, ['psychic', 'electric', 'poison'], 'Hypothesis: my team is optimal. Commencing trial!', 'Fascinating result...'),
    'grunt': ('Galactic Grunt', 'grunt', 40, ['poison', 'dark', 'normal'], 'Team Galactic business! Scram or scrap!', 'The Commander won\'t like this...'),
}

# pools: base-ish species by type for generated teams
def pool_for(types, level):
    lo, hi = 180 + level * 6, 330 + level * 7
    out = []
    for e in species:
        if e['legend'] or e['id'] >= 10000: continue
        if types and not any(t in e['types'] for t in types): continue
        b = bst(e)
        if lo <= b <= hi: out.append(e['id'])
    return out or [399]

PLACEMENTS = {
    'route202': [('youngster', 4), ('lass', 4)],
    'route203': [('youngster', 6), ('lass', 6), ('youngster', 7)],
    'route204': [('lass', 7), ('youngster', 8)],
    'route205south': [('fisher', 11), ('lass', 11)],
    'eterna_forest': [('lass', 12), ('youngster', 13)],
    'route205north': [('hiker', 13)],
    'route206': [('hiker', 16), ('hiker', 17)],
    'route207': [('hiker', 15), ('youngster', 15)],
    'route208': [('hiker', 17), ('fisher', 17), ('ace', 18)],
    'route209': [('youngster', 17), ('lass', 17), ('fisher', 18)],
    'route210south': [('youngster', 19), ('lass', 19), ('ace', 20)],
    'route215': [('ace', 21), ('ace', 22), ('youngster', 20)],
    'route214': [('youngster', 21), ('lass', 21), ('scientist', 22)],
    'route213': [('swimmer', 22), ('fisher', 22), ('sailor', 23)],
    'route212south': [('lass', 21), ('scientist', 22)],
    'route212north': [('fisher', 23), ('scientist', 24)],
    'route210north': [('ace', 26), ('ace', 27)],
    'route211': [('hiker', 13), ('youngster', 12)],
    'route218': [('fisher', 12), ('sailor', 13)],
    'route216': [('skier', 30), ('ace', 31)],
    'route217': [('skier', 32), ('skier', 33), ('ace', 34)],
    'route222': [('swimmer', 38), ('fisher', 38), ('ace', 39)],
    'route223': [('swimmer', 42), ('swimmer', 43)],
    'victory_road': [('ace', 45), ('ace', 46), ('ace', 47)],
    'iron_island': [('hiker', 30), ('ace', 31)],
    'route225': [('ace', 52), ('hiker', 52)],
    'stark_mountain': [('ace', 56), ('hiker', 56)],
    'oreburgh_gym': [('youngster', 10), ('hiker', 11)],
    'eterna_gym': [('lass', 17), ('lass', 18)],
    'hearthome_gym': [('lass', 22), ('scientist', 23)],
    'veilstone_gym': [('ace', 27), ('ace', 28)],
    'pastoria_gym': [('swimmer', 31), ('sailor', 32)],
    'canalave_gym': [('sailor', 35), ('hiker', 36)],
    'snowpoint_gym': [('skier', 38), ('skier', 39)],
    'sunyshore_gym': [('scientist', 44), ('ace', 45)],
    'windworks': [('grunt', 13), ('grunt', 14)],
    'eterna_bldg': [('grunt', 17), ('grunt', 18), ('scientist', 19)],
    'galactic_hq': [('grunt', 36), ('grunt', 37), ('grunt', 37), ('scientist', 38)],
    'coronet_climb': [('grunt', 40), ('grunt', 41)],
    'lake_valor_ev': [('grunt', 35), ('grunt', 36)],
    'lake_verity_ev': [('grunt', 36), ('grunt', 36)],
}

NAMES = ['Joey', 'Mina', 'Tomas', 'Edith', 'Koji', 'Petra', 'Sven', 'Lila', 'Bruno', 'Wren',
         'Aldo', 'Nessa', 'Theo', 'Iris', 'Hugo', 'Zara', 'Felix', 'Mona', 'Remy', 'Sage',
         'Otto', 'Vera', 'Nils', 'Cleo', 'Ivan', 'Tara', 'Drew', 'Echo', 'Gus', 'Faye']
ni = 0
for area, lst in PLACEMENTS.items():
    for i, (cls, lv) in enumerate(lst):
        cname, sprite, money, types, intro, lose = CLASS_INFO[cls]
        nmons = 2 if lv < 14 else (2 if random.random() < .5 else 3)
        if cls == 'grunt': nmons = 2
        pool = pool_for(types, lv)
        ids = random.sample(pool, min(nmons, len(pool)))
        mons = [m(pid, lv + random.randint(-1, 1)) for pid in ids]
        name = 'Grunt' if cls == 'grunt' else NAMES[ni % len(NAMES)]; ni += 1
        tid = '%s_t%d' % (area, i + 1)
        trainer(tid, name, cname, sprite, mons, money,
                'galactic' if cls == 'grunt' else None,
                'good' if lv > 25 else 'basic', intro, lose)

out = os.path.join(ROOT, 'js/data/trainers.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write("PKM.registerData('trainers', ")
    json.dump(T, f, separators=(',', ':'))
    f.write(');\n')
print('trainers written:', len(T))

manifest = defaultdict(list)
for area, lst in PLACEMENTS.items():
    for i in range(len(lst)):
        manifest[area].append('%s_t%d' % (area, i + 1))
with open(os.path.join(HERE, 'trainer_manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=1)
print('manifest written')
