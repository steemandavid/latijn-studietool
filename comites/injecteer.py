# -*- coding: utf-8 -*-
"""Schrijft de comites uit figuren.py in sjabloon.html (§9.6).

    python3 contactblad.py     # eerst kijken
    python3 injecteer.py       # dan injecteren
    cd .. && python3 bouw.py   # en bouwen

De vervanging blijft strikt tussen /*__COMITES_BEGIN__*/ en /*__COMITES_EINDE__*/.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import figuren

HIER = os.path.dirname(os.path.abspath(__file__))
pad = os.path.join(HIER, "..", "sjabloon.html")
s = open(pad, encoding="utf-8").read()
BEGIN, EINDE = "/*__COMITES_BEGIN__*/", "/*__COMITES_EINDE__*/"
a = s.index(BEGIN) + len(BEGIN)
b = s.index(EINDE, a)

regels = []
for fid, f in figuren.F.items():
    assert "w" in "".join(f["px"]) and "k" in f["pal"], f"{fid}: geen ogen om mee te knipperen"
    pal = ",".join(f'{k}:"{v}"' for k, v in f["pal"].items())
    px = ",\n       ".join(json.dumps(r) for r in f["px"])
    regels.append('  {id:%s, naam:%s, wie:%s,\n   pal:{%s},\n   px:[%s]}'
                  % (json.dumps(fid), json.dumps(f["naam"], ensure_ascii=False),
                     json.dumps(f["wie"], ensure_ascii=False), pal, px))
blok = "\nconst COMES_W = %d;\nconst COMITES = [\n%s\n];\n" % (figuren.W, ",\n".join(regels))
open(pad, "w", encoding="utf-8").write(s[:a] + blok + s[b:])
print("sjabloon.html bijgewerkt —", len(figuren.F), "comites")
