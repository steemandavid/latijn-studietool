# -*- coding: utf-8 -*-
"""Maakt een emblema uit een foto van het échte mozaïek.

    python3 importeer.py cave-canem              # -> proef-cave-canem.png
    python3 importeer.py cave-canem --bevries    # ... en in rasters.py schrijven

Waarom niet gewoon de foto verkleinen: een vloer in Pompeii is beschadigd, scheef
gefotografeerd, ongelijk belicht en de ondergrond ligt vol losse ruitjes. Op 96 x 64
levert dat een vage vlek op. Wat wél werkt is de foto als MAATVOERING gebruiken: het
beeld rechttrekken, de belichting vlak maken, en er één schone silhouet uit halen.
Die silhouet heeft de verhoudingen van het origineel — daar is geen tekening tegen
opgewassen — en de rest (grond, halsband, opschrift) zetten we er zelf bij.
"""
import os, sys
from collections import deque
from PIL import Image, ImageFilter, ImageOps
import rasters as R
import schets

HIER = os.path.dirname(os.path.abspath(__file__))

BRONNEN = {
    "cave-canem": dict(
        bestand="bron/kandidaat-a.jpg",
        herkomst="Wikimedia Commons, 'Cave Canem Poeta Trágico 02.jpg', CC BY-SA 4.0",
        # De vier hoeken van het vlak in de foto: LB, LO, RO, RB. Zo strak gesneden dat
        # de zwarte banden van de vloer zelf er net buiten vallen.
        quad=(430, 150, 300, 1120, 1640, 1030, 1520, 150),
        drempel=112, mediaan=13, minvlek=6,
        opschrift="CAVE CANEM",
        halsband=True,
    ),
}

def silhouet(cfg):
    """Foto -> raster van 'o' (figuur) en 'l' (grond)."""
    im = Image.open(os.path.join(HIER, cfg["bestand"])).convert("RGB")
    im = im.transform((R.EBREED * 14, R.EHOOG * 14), Image.QUAD, cfg["quad"], Image.BICUBIC)

    # Belichting vlak trekken: delen door een sterk vervaagde versie van zichzelf.
    grijs = im.convert("L")
    vaag = grijs.filter(ImageFilter.GaussianBlur(radius=im.width / 14))
    pg, pv = grijs.load(), vaag.load()
    vlak = Image.new("L", im.size); pu = vlak.load()
    for y in range(im.height):
        for x in range(im.width):
            pu[x, y] = max(0, min(255, int(pg[x, y] * 160 / (pv[x, y] or 1))))
    vlak = ImageOps.autocontrast(vlak, cutoff=2).filter(ImageFilter.MedianFilter(size=cfg["mediaan"]))

    masker = vlak.point(lambda v: 255 if v < cfg["drempel"] else 0)
    masker = masker.filter(ImageFilter.MedianFilter(size=9))
    klein = masker.resize((R.EBREED, R.EHOOG), Image.BOX)
    g = [[1 if klein.getpixel((x, y)) > 118 else 0 for x in range(R.EBREED)] for y in range(R.EHOOG)]
    return g, im.resize((R.EBREED, R.EHOOG), Image.BOX)

def schoon(g, minvlek):
    """Losse vlekjes weg: kleiner dan `minvlek` steentjes is vuil, geen tekening."""
    for waarde, vervang in ((1, 0), (0, 1)):
        gezien = [[False] * R.EBREED for _ in range(R.EHOOG)]
        for y in range(R.EHOOG):
            for x in range(R.EBREED):
                if gezien[y][x] or g[y][x] != waarde: continue
                vlek, rij = [], deque([(x, y)]); gezien[y][x] = True
                while rij:
                    cx, cy = rij.popleft(); vlek.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if (0 <= nx < R.EBREED and 0 <= ny < R.EHOOG
                                and not gezien[ny][nx] and g[ny][nx] == waarde):
                            gezien[ny][nx] = True; rij.append((nx, ny))
                if len(vlek) < minvlek:
                    for cx, cy in vlek: g[cy][cx] = vervang
    return g

def bouwEmblema(sleutel):
    cfg = BRONNEN[sleutel]
    g, kleur = silhouet(cfg)
    g = schoon(g, cfg["minvlek"])

    # Een rand van twee steentjes grond rondom: de foto heeft daar schaduw en resten
    # van de vloerband staan, en die horen niet bij de tekening.
    for y in range(R.EHOOG):
        for x in range(R.EBREED):
            if x < 2 or x >= R.EBREED - 2 or y < 2 or y >= R.EHOOG - 8:
                pass
    doek = schets.Doek(grond="l")
    for y in range(R.EHOOG):
        for x in range(R.EBREED):
            if 2 <= x < R.EBREED - 2 and 2 <= y < R.EHOOG - 9 and g[y][x]:
                doek.zet(x, y, "o")

    # De halsband is het enige kleuraccent van het origineel: terughalen uit de
    # kleurenfoto, daar waar rood duidelijk overheerst binnen de figuur.
    if cfg.get("halsband"):
        for y in range(R.EHOOG):
            for x in range(R.EBREED):
                if doek.g[y][x] != "o": continue
                r, gr, b = kleur.getpixel((x, y))
                if r > gr + 18 and r > b + 24: doek.zet(x, y, "r")

    if cfg.get("opschrift"):
        breedte = len(cfg["opschrift"]) * 6 - 1
        doek.rechthoek(0, R.EHOOG - 9, R.EBREED - 1, R.EHOOG - 9, "o")     # grondlijn
        doek.tekst(cfg["opschrift"], (R.EBREED - breedte) // 2, R.EHOOG - 7, "o", groot=True)
    return doek.regels()

def proef(sleutel, rijen, pal):
    SC = 10
    img = Image.new("RGB", (R.EBREED * SC, R.EHOOG * SC), (26, 23, 19))
    for y, rij in enumerate(rijen):
        for x, ch in enumerate(rij):
            k = pal.get(ch, "#dddddd")
            img.paste(Image.new("RGB", (SC - 1, SC - 1),
                      tuple(int(k[i:i+2], 16) for i in (1, 3, 5))), (x * SC, y * SC))
    pad = os.path.join(HIER, f"proef-{sleutel}.png"); img.save(pad); return pad

if __name__ == "__main__":
    sleutel = sys.argv[1] if len(sys.argv) > 1 else "cave-canem"
    rijen = bouwEmblema(sleutel)
    print("geschreven:", proef(sleutel, rijen, R.M[sleutel]["pal"]))
    if "--bevries" in sys.argv:
        import pathlib
        pad = pathlib.Path(HIER) / "rasters.py"
        s = pad.read_text(encoding="utf-8")
        start = s.index(f'M["{sleutel}"]'); eind = s.index("])", start) + 2
        kop = s[start:s.index("    em=[", start)]
        blok = "    em=[\n" + "\n".join(f'        "{r}",' for r in rijen) + "\n    ])"
        pad.write_text(s[:start] + kop + blok + s[eind:], encoding="utf-8")
        print(f"{sleutel}: raster uit de foto bevroren in rasters.py")
        print("herkomst:", BRONNEN[sleutel]["herkomst"])
