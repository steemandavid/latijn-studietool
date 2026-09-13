# -*- coding: utf-8 -*-
"""Schrijft de mozaïeken uit rasters.py in sjabloon.html.

    python3 contactblad.py     # eerst kijken
    python3 injecteer.py       # dan injecteren
    cd .. && python3 bouw.py   # en bouwen

De rand wordt hier al samengevoegd met het emblema, zodat de app alleen nog een
raster van 96 x 64 tekens hoeft te tekenen en niets meer hoeft uit te rekenen.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rasters as R

HIER = os.path.dirname(os.path.abspath(__file__))

def samenstel(m):
    rand = R.rand_raster()
    uit = []
    for y in range(R.HOOG):
        rij = list(rand[y])
        if R.RAND <= y < R.HOOG - R.RAND:
            em = m["em"][y - R.RAND]
            for x in range(R.EBREED):
                rij[R.RAND + x] = em[x]
        uit.append("".join(rij))
    return uit

data = []
for sleutel, m in R.M.items():
    if not m["em"]:
        sys.exit(f"{sleutel} is nog niet getekend")
    assert len(m["em"]) == R.EHOOG and all(len(r) == R.EBREED for r in m["em"]), sleutel
    pal = dict(m["pal"])
    pal.setdefault("l", "#d9cbb0")
    data.append(dict(id=sleutel, caput=m["caput"], naam=m["naam"], bij=m["bij"],
                     flavour=m["flavour"], pal=pal, px=samenstel(m)))

js = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
assert "</script" not in js.lower()

pad = os.path.join(HIER, "..", "sjabloon.html")
s = open(pad, encoding="utf-8").read()
merk = "/*__MOZAIEKEN__*/"
if merk not in s:
    sys.exit("sjabloon.html mist de /*__MOZAIEKEN__*/ plaats")
start = s.index("const MOZAIEKEN = ")
eind = s.index(merk) + len(merk)
s = s[:start] + "const MOZAIEKEN = " + js + ";" + merk + s[eind:]
open(pad, "w", encoding="utf-8").write(s)
print(f"{len(data)} mozaïeken in sjabloon.html geschreven — {len(js)/1024:.0f} KB")
