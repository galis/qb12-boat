#!/bin/bash
source "$(dirname "$0")/../../tools/kicad_env.sh"
f=$1; o=${f%.kicad_pcb}_drc.json
"$KCLI" pcb drc --severity-all --format json --all-track-errors -o "$o" "$f" > /dev/null 2>&1
python3 - "$o" <<'PY'
import json, sys
from collections import Counter
d = json.load(open(sys.argv[1]))
v = d['violations']
print('violations:', dict(Counter((x['severity'], x['type']) for x in v)))
print('unconnected:', len(d.get('unconnected_items', [])))
for u in d.get('unconnected_items', [])[:15]:
    print('   UNCONN', ' | '.join(i['description'][:70] for i in u['items']))
for x in v:
    if x['severity'] == 'error' and x['type'] not in ('silk_overlap',):
        print('   ERR', x['type'], ' | '.join(i['description'][:70] for i in x['items'])[:200])
PY
