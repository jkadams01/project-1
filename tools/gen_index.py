#!/usr/bin/env python3
"""Regenerates the map <script> tag list in index.html from js/data/maps/*.js."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
MAPS = os.path.join(ROOT, 'js', 'data', 'maps')
INDEX = os.path.join(ROOT, 'index.html')

files = sorted(f for f in os.listdir(MAPS) if f.endswith('.js'))
tags = '\n'.join('<script src="js/data/maps/%s"></script>' % f for f in files)

html = open(INDEX, encoding='utf-8').read()
html = re.sub(
    r'(<!-- MAPS-START[^>]*-->).*?(<!-- MAPS-END -->)',
    lambda m: m.group(1) + '\n' + tags + '\n' + m.group(2),
    html, flags=re.S)
open(INDEX, 'w', encoding='utf-8').write(html)
print('index.html updated with %d map scripts' % len(files))
