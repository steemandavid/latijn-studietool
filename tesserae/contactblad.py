# -*- coding: utf-8 -*-
"""Rendert alle tesserae naast elkaar naar contactblad.png. Vereist Pillow.

    python3 contactblad.py && xdg-open contactblad.png

Kijk er echt naar: op 16x16 is het verschil tussen een adelaar en een palmboom
klein, en dat zie je niet aan de tekens in rasters.py.
"""
from PIL import Image, ImageDraw
import rasters

SC, PAD, COLS, LBL = 8, 10, 5, 16
CELL = rasters.W * SC + PAD * 2
namen = list(rasters.S)
rijen = (len(namen) + COLS - 1) // COLS
img = Image.new("RGB", (COLS * CELL, rijen * (CELL + LBL)), (18, 17, 26))
d = ImageDraw.Draw(img)
for i, n in enumerate(namen):
    sp = rasters.S[n]; cx = (i % COLS) * CELL; cy = (i // COLS) * (CELL + LBL)
    d.rectangle([cx+2, cy+2, cx+CELL-3, cy+CELL-3], outline=(51, 47, 66))
    for y, rij in enumerate(sp["px"]):
        for x, ch in enumerate(rij):
            kleur = sp["pal"].get(ch)
            if ch != "." and kleur:
                X, Y = cx + PAD + x*SC, cy + PAD + y*SC
                d.rectangle([X, Y, X+SC-1, Y+SC-1], fill=kleur)
    d.text((cx + PAD, cy + CELL - 2), n, fill=(200, 196, 220))
img.save("contactblad.png")
print("contactblad.png geschreven —", len(namen), "tesserae")
