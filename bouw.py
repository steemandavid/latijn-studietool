# -*- coding: utf-8 -*-
"""Bouwt verba/index.html uit sjabloon.html + latijn.json.

    python3 maak-data.py     # woordenlijst.md -> latijn.json
    python3 bouw.py          # sjabloon.html + latijn.json -> verba/index.html
"""
import json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__))

def lees(pad, wat):
    try:
        return open(pad, encoding="utf-8").read()
    except FileNotFoundError:
        sys.exit(f"bouw.py: {wat} ontbreekt — verwacht op {pad}")

sjabloon = lees(os.path.join(HIER, "sjabloon.html"), "sjabloon.html")

if "/*__DATA__*/" not in sjabloon:
    sys.exit("sjabloon.html mist de /*__DATA__*/ placeholder")

try:
    data = json.loads(lees(os.path.join(HIER, "latijn.json"), "latijn.json"))
except json.JSONDecodeError as e:
    sys.exit(f"bouw.py: latijn.json is geen geldige JSON ({e}) — draai eerst maak-data.py")

# Compact: geen spaties, en </script> kan nooit in de data voorkomen.
js = json.dumps(data["woorden"], ensure_ascii=False, separators=(",", ":"))
assert "</script" not in js.lower(), "data bevat een script-tag"

uit = sjabloon.replace("/*__DATA__*/", js)
pad = os.path.join(HIER, "verba", "index.html")
os.makedirs(os.path.dirname(pad), exist_ok=True)
open(pad, "w", encoding="utf-8").write(uit)
print(f"verba/index.html gebouwd — {len(data['woorden'])} woorden, "
      f"{os.path.getsize(pad)/1024:.0f} KB")
