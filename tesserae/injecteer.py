# -*- coding: utf-8 -*-
"""Schrijft de rasters uit rasters.py in sjabloon.html.

    python3 contactblad.py     # eerst kijken
    python3 injecteer.py       # dan injecteren
    cd .. && python3 bouw.py   # en bouwen

Let op: de vervanging blijft strikt binnen het TESSERAE-blok. De badgelijst bevat
een badge met dezelfde id ("mille"), en een zoekactie over het hele bestand schreef
die sprite eerder in het verkeerde vak.
"""
import re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rasters

HIER = os.path.dirname(os.path.abspath(__file__))
pad = os.path.join(HIER, "..", "sjabloon.html")
s = open(pad, encoding="utf-8").read()

start = s.index("const TESSERAE = [")
eind = s.index("/* ======================= OPSLAG", start)
blok = s[start:eind]

for sid, sp in rasters.S.items():
    assert len(sp["px"]) == rasters.W, sid
    for r in sp["px"]:
        assert len(r) == rasters.W, (sid, r)
        for c in r:
            assert c in set(sp["pal"]) | {"."}, (sid, c)
    pal = ",".join(f'{k}:"{v}"' for k, v in sp["pal"].items())
    px = ",\n       ".join('"%s"' % r for r in sp["px"])
    m = re.search(r'\{id:"%s",.*?px:\[.*?\]\}' % re.escape(sid), blok, re.S)
    assert m, f"{sid} niet gevonden in het TESSERAE-blok"
    b = m.group(0)
    nb = re.sub(r"pal:\{[^}]*\}", "pal:{%s}" % pal, b, count=1)
    nb = re.sub(r"px:\[.*?\]", "px:[%s]" % px, nb, count=1, flags=re.S)
    blok = blok.replace(b, nb, 1)

open(pad, "w", encoding="utf-8").write(s[:start] + blok + s[eind:])
print("sjabloon.html bijgewerkt —", len(rasters.S), "tesserae")
