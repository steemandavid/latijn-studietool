# -*- coding: utf-8 -*-
"""Rendert de comites naar contactblad.png: elk figuur open en knipperend, op de
achtergrond van de app. Vereist Pillow.

    python3 contactblad.py && xdg-open contactblad.png

Kijk er echt naar: of een figuur herkenbaar is, zie je niet aan de letters.
"""
from PIL import Image, ImageDraw
import figuren

SC, PAD, LBL = 6, 12, 18
CELL = figuren.W * SC + PAD * 2
namen = list(figuren.F)
img = Image.new("RGB", (len(namen) * CELL, 2 * (CELL + LBL)), (14, 13, 20))
d = ImageDraw.Draw(img)


def teken(f, cx, cy, dicht):
    for y, rij in enumerate(f["px"]):
        for x, ch in enumerate(rij):
            if ch == ".":
                continue
            if dicht and ch in "we":
                ch = "k"
            X, Y = cx + PAD + x * SC, cy + PAD + y * SC
            d.rectangle([X, Y, X + SC - 1, Y + SC - 1], fill=f["pal"][ch])


for i, n in enumerate(namen):
    f = figuren.F[n]
    for rij, dicht in ((0, False), (1, True)):
        cx, cy = i * CELL, rij * (CELL + LBL)
        d.rectangle([cx + 2, cy + 2, cx + CELL - 3, cy + CELL - 3], outline=(51, 47, 66))
        teken(f, cx, cy, dicht)
        d.text((cx + PAD, cy + CELL - 2), n + (" (knip)" if dicht else ""), fill=(200, 196, 220))
img.save("contactblad.png")
print("contactblad.png geschreven —", len(namen), "comites")
