# -*- coding: utf-8 -*-
"""Snel kijken naar één emblema tijdens het tekenen (zonder rasters.py aan te raken)."""
import sys
from PIL import Image, ImageDraw
import rasters as R, schets

SC, VOEG = 10, 1
def render(doek, pal, pad="preview.png", titel=""):
    regels = doek.regels()
    b, h = doek.b, doek.h
    img = Image.new("RGB", (b * (SC + VOEG) + 20, h * (SC + VOEG) + 34), (18, 17, 26))
    d = ImageDraw.Draw(img)
    for y in range(h):
        for x in range(b):
            ch = regels[y][x]
            d.rectangle([10 + x * (SC + VOEG), 10 + y * (SC + VOEG),
                         10 + x * (SC + VOEG) + SC - 1, 10 + y * (SC + VOEG) + SC - 1],
                        fill=pal.get(ch, pal.get(".", "#d9cbb0")))
    d.text((10, h * (SC + VOEG) + 16), titel or "emblema", fill=(200, 196, 220))
    img.save(pad)
    print(pad, "geschreven")

if __name__ == "__main__":
    naam = sys.argv[1] if len(sys.argv) > 1 else "cave_canem"
    pal = dict(R.M["cave-canem"]["pal"]); pal["."] = pal["l"]
    render(getattr(schets, naam)(), pal, "preview.png", naam)
