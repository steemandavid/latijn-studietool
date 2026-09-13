# -*- coding: utf-8 -*-
"""Rendert de mozaïeken naar contactblad.png — compleet én halverwege.

    python3 contactblad.py && xdg-open contactblad.png

Kijk er echt naar. Op deze korrel is het verschil tussen een waakhond en een zwijn
klein, en dat zie je niet aan de tekens in rasters.py. De panelen rechts laten zien
hoe het eruitziet terwijl de klas nog bezig is: de steentjes vallen VERSPREID neer
(§13.10.3), niet in blokken, zodat het beeld opkomt zoals een echte vloer gelegd wordt.
"""
from PIL import Image, ImageDraw
import rasters as R

SC, VOEG, PAD, LBL = 4, 1, 14, 22
# De lege voeg is middengrijs, niet zwart: anders verdwijnt een zwart onderwerp
# erin en zie je de eerste weken alleen losse lichte stipjes.
GROUT = (68, 64, 58)
STANDEN = [(1.0, "compleet"), (0.55, "55 % gelegd"), (0.2, "20 % gelegd")]

def samenstel(m):
    """Rand (gegenereerd) + emblema (met de hand) -> 64 regels van 96 tekens."""
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

def volgorde(sleutel):
    """Vaste, verspreide legvolgorde van alle 6144 steentjes.

    Deterministisch per mozaïek (iedereen in de klas ziet dus hetzelfde beeld), maar
    verspreid over het vlak. Het midden gaat wél iets sneller dan de rand: zo is het
    onderwerp eerder herkenbaar zonder dat er ergens een aaneengesloten blok ontstaat.
    """
    import random
    r = random.Random(sum(ord(c) for c in sleutel) * 7919)
    mx, my = R.BREED / 2, R.HOOG / 2
    punten = []
    for y in range(R.HOOG):
        for x in range(R.BREED):
            afstand = (((x - mx) / mx) ** 2 + ((y - my) / my) ** 2) ** 0.5
            punten.append((r.random() + afstand * 0.55, x, y))
    punten.sort()
    return [(x, y) for _, x, y in punten]

def teken(d, m, sleutel, ox, oy, deel=1.0):
    raster = samenstel(m)
    orde = volgorde(sleutel)
    vrij = set(orde[:int(len(orde) * deel)])
    for y in range(R.HOOG):
        for x in range(R.BREED):
            X, Y = ox + x * (SC + VOEG), oy + y * (SC + VOEG)
            if (x, y) not in vrij:
                d.rectangle([X, Y, X + SC - 1, Y + SC - 1], fill=GROUT)
                continue
            ch = raster[y][x]
            d.rectangle([X, Y, X + SC - 1, Y + SC - 1],
                        fill=m["pal"].get(ch, m["pal"].get("l", "#d9cbb0")))

BM, HM = R.BREED * (SC + VOEG), R.HOOG * (SC + VOEG)
namen = [n for n in R.M if R.M[n]["em"]]   # nog niet getekende panelen overslaan
img = Image.new("RGB", (PAD * (len(STANDEN) + 1) + BM * len(STANDEN),
                        len(namen) * (HM + LBL) + PAD), (18, 17, 26))
d = ImageDraw.Draw(img)
for i, n in enumerate(namen):
    m = R.M[n]
    oy = PAD + i * (HM + LBL)
    for j, (deel, label) in enumerate(STANDEN):
        ox = PAD * (j + 1) + BM * j
        teken(d, m, n, ox, oy, deel)
        d.text((ox, oy + HM + 4),
               f'{m["naam"]} · caput {m["caput"]} — {label}' if j == 0 else label,
               fill=(200, 196, 220) if j == 0 else (140, 136, 160))
img.save("contactblad.png")
print(f"contactblad.png geschreven — {len(namen)} mozaïek(en) x {len(STANDEN)} standen")
