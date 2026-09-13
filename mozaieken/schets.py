# -*- coding: utf-8 -*-
"""Tekengereedschap voor de emblemata: vormen in code -> raster van tekens.

Met de hand 40x24 tekens intypen levert een berg op waar een hond hoort te staan.
Hier teken je met polygonen, ellipsen en lijnen, en komt er een raster uit dat
letterlijk in rasters.py past. De bron van waarheid blijft dus het raster.

    python3 schets.py > /dev/null && python3 contactblad.py
"""
import rasters as R

class Doek:
    def __init__(self, b=R.EBREED, h=R.EHOOG, grond="."):
        self.b, self.h = b, h
        self.g = [[grond] * b for _ in range(h)]

    def zet(self, x, y, ch):
        if 0 <= x < self.b and 0 <= y < self.h:
            self.g[y][x] = ch

    def rechthoek(self, x0, y0, x1, y1, ch):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.zet(x, y, ch)

    def ellips(self, cx, cy, rx, ry, ch):
        for y in range(self.h):
            for x in range(self.b):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.zet(x, y, ch)

    def veelhoek(self, punten, ch):
        """Scanlijn-vulling; punten als [(x, y), ...]."""
        ys = [p[1] for p in punten]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            snij = []
            for i in range(len(punten)):
                x0, y0 = punten[i]
                x1, y1 = punten[(i + 1) % len(punten)]
                if y0 == y1:
                    continue
                if min(y0, y1) <= y < max(y0, y1):
                    snij.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
            snij.sort()
            for i in range(0, len(snij) - 1, 2):
                for x in range(int(round(snij[i])), int(round(snij[i + 1])) + 1):
                    self.zet(x, y, ch)

    def vorm(self, punten, vul, rand="o"):
        """Veelhoek met een omtrek: eerst de rand, dan de vulling naar binnen.

        Romeinse mozaïeken zetten altijd een donkere contourlijn rond een figuur;
        zonder die lijn vloeit huidkleur op zand in elkaar over en zie je niets.
        """
        self.veelhoek(punten, rand)
        cx = sum(p[0] for p in punten) / len(punten)
        cy = sum(p[1] for p in punten) / len(punten)
        krimp = [(x + (cx - x) * 0.16, y + (cy - y) * 0.16) for x, y in punten]
        self.veelhoek(krimp, vul)

    def pad(self, punten, dikte, ch, rand=None):
        """Dikke, vloeiende lijn (voor een dolfijnrug of een slangenlijf)."""
        for i in range(len(punten) - 1):
            (x0, y0), (x1, y1) = punten[i], punten[i + 1]
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) or 1
            for k in range(n + 1):
                x = x0 + (x1 - x0) * k / n
                y = y0 + (y1 - y0) * k / n
                dd = dikte[i] + (dikte[i + 1] - dikte[i]) * k / n
                if rand:
                    self.ellips(x, y, dd + 1, dd + 1, rand)
        for i in range(len(punten) - 1):
            (x0, y0), (x1, y1) = punten[i], punten[i + 1]
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) or 1
            for k in range(n + 1):
                x = x0 + (x1 - x0) * k / n
                y = y0 + (y1 - y0) * k / n
                dd = dikte[i] + (dikte[i + 1] - dikte[i]) * k / n
                self.ellips(x, y, dd, dd, ch)

    def lijn(self, x0, y0, x1, y1, ch, dik=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            y = y0 + (y1 - y0) * i / n
            for dy in range(dik):
                for dx in range(dik):
                    self.zet(int(round(x)) + dx, int(round(y)) + dy, ch)

    def tekst(self, s, x, y, ch, groot=False):
        """Mozaïekletters; groot=True geeft 5x7 (leesbaar op 84 breed)."""
        tabel, breedte = (FONT_GROOT, 6) if groot else (FONT, 4)
        for i, letter in enumerate(s.upper()):
            vorm = tabel.get(letter)
            if vorm is None:
                continue
            for ry, rij in enumerate(vorm):
                for rx, c in enumerate(rij):
                    if c == "#":
                        self.zet(x + i * breedte + rx, y + ry, ch)

    def regels(self):
        return ["".join(rij) for rij in self.g]

    def toon(self):
        return "\n".join(f'        "{r}",' for r in self.regels())


# 5x7 mozaïekletters: dikke schreven, zoals de opschriften in echte vloeren
FONT_GROOT = {
    "A": ["#####", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"],
    "C": ["#####", "##...", "##...", "##...", "##...", "##...", "#####"],
    "E": ["#####", "##...", "##...", "####.", "##...", "##...", "#####"],
    "M": ["##.##", "#####", "#####", "##.##", "##.##", "##.##", "##.##"],
    "N": ["##..#", "###.#", "#####", "#####", "#.###", "#..##", "#..##"],
    "V": ["##.##", "##.##", "##.##", "##.##", "##.##", ".###.", "..#.."],
    " ": ["     "] * 7,
}

FONT = {
    "A": ["###", "# #", "###", "# #", "# #"],
    "B": ["## ", "# #", "## ", "# #", "## "],
    "C": ["###", "#  ", "#  ", "#  ", "###"],
    "D": ["## ", "# #", "# #", "# #", "## "],
    "E": ["###", "#  ", "## ", "#  ", "###"],
    "H": ["# #", "# #", "###", "# #", "# #"],
    "I": ["###", " # ", " # ", " # ", "###"],
    "L": ["#  ", "#  ", "#  ", "#  ", "###"],
    "M": ["# #", "###", "###", "# #", "# #"],
    "N": ["# #", "###", "###", "###", "# #"],
    "O": ["###", "# #", "# #", "# #", "###"],
    "R": ["## ", "# #", "## ", "# #", "# #"],
    "S": ["###", "#  ", "###", "  #", "###"],
    "T": ["###", " # ", " # ", " # ", " # "],
    "U": ["# #", "# #", "# #", "# #", "###"],
    "V": ["# #", "# #", "# #", "# #", " # "],
    " ": ["   ", "   ", "   ", "   ", "   "],
}

# ---------------------------------------------------------------- caput 1
def cave_canem():
    """Waakhond aan de ketting, grommend naar links. Pompeii, zwart op kalk.

    Het gaat om de SILHOUET. Twee maten bepalen alles: de buiklijn op rij 22 en de
    grond op rij 40 — daartussen moet daglicht staan, anders leest de hond als een
    zwijn, hoe veel detail er verder ook in zit. Vandaar vier smalle poten met brede
    tussenruimte, en tien tesserae open ruimte onder de buik.
    """
    d = Doek()
    o, w, r, g, t = "o", "w", "r", "g", "t"
    RUG, BUIK, GROND = 11, 22, 40

    d.ellips(46, 42, 32, 2, g)                                   # schaduw

    # ---- romp: rug kaarsrecht, buik hoog, borst iets dieper
    d.veelhoek([(30, RUG), (60, RUG - 1), (68, 13), (70, 18), (67, BUIK),
                (34, BUIK), (27, 18), (28, 13)], o)
    # ---- hals naar de kop
    d.veelhoek([(20, 9), (32, 8), (33, 21), (25, 22)], o)
    # ---- kop en snuit
    d.veelhoek([(7, 12), (17, 4), (25, 6), (28, 12), (27, 19), (17, 22), (9, 19)], o)
    d.veelhoek([(0, 13), (11, 11), (12, 19), (0, 20)], o)
    d.veelhoek([(12, 6), (13, 0), (21, 8)], o)                   # oor
    d.veelhoek([(22, 7), (28, 0), (29, 10)], o)                  # oor
    # ---- muil met tanden
    d.veelhoek([(0, 15), (12, 14), (12, 17), (0, 18)], w)
    for x in range(1, 12, 3):
        d.zet(x, 14, o); d.zet(x + 1, 18, o)
    d.ellips(18, 10, 2.6, 2.0, w); d.ellips(18, 10, 1.2, 1.0, o); d.zet(17, 9, w)
    # ---- halsband en ketting die vrij naar de grond loopt
    d.veelhoek([(26, 8), (32, 7), (33, 22), (27, 23)], r)
    d.ellips(31, 22, 2.0, 1.6, o)              # de ring aan de halsband
    # ---- vier poten: smal, met brede lucht ertussen
    for x0, kort in ((30, 0), (41, 0), (56, 1), (66, 1)):
        d.rechthoek(x0, BUIK - kort, x0 + 5, GROND - 1, o)
        d.rechthoek(x0 - 2, GROND - 1, x0 + 7, GROND, o)         # poot op de grond
    # ---- staart omhoog met krul
    d.lijn(68, 14, 78, 6, o, dik=4)
    d.veelhoek([(76, 8), (83, 2), (82, 10), (78, 12)], o)
    d.rechthoek(0, 43, 83, 43, o)                                # grondlijn
    d.tekst("CAVE CANEM", 12, 45, t, groot=True)
    return d

if __name__ == "__main__":
    d = cave_canem()
    print(d.toon())

def bevries(naam_functie, sleutel):
    """Schrijft het getekende raster in rasters.py, tussen de em=[ ] van dat mozaïek.

    De schets is het gereedschap, rasters.py blijft de bron van waarheid: daar staat
    wat de app te zien krijgt, en dat is leesbaar zonder dit script te draaien.
    """
    import re, pathlib
    doek = globals()[naam_functie]()
    regels = doek.regels()
    assert len(regels) == R.EHOOG and all(len(r) == R.EBREED for r in regels), "verkeerd formaat"
    blok = "    em=[\n" + "\n".join(f'        "{r}",' for r in regels) + "\n    ])"
    pad = pathlib.Path(__file__).parent / "rasters.py"
    s = pad.read_text(encoding="utf-8")
    start = s.index(f'M["{sleutel}"]')
    eind = s.index("])", start) + 2
    kop = s[start:s.index("    em=[", start)]
    pad.write_text(s[:start] + kop + blok + s[eind:], encoding="utf-8")
    print(f"{sleutel}: raster bevroren in rasters.py ({len(regels)} regels)")

# ---------------------------------------------------------------- caput 2
def amor_dolfijn():
    """Amor rijdt op een dolfijn door de golven.

    De dolfijn is een PAD met wisselende dikte, geen veelhoek: een veelhoek van
    rug- en buiklijn vult het hele vlak op en levert een blauwe klont op.
    """
    import math
    d = Doek(grond="l")
    o, w, b, z, h, r, g = "o", "w", "b", "z", "h", "r", "g"

    # ---- zee onderaan, met schuimkoppen
    d.rechthoek(0, 41, 83, 51, b)
    for x in range(0, 88, 8):
        d.ellips(x, 41, 4.0, 1.8, z)

    # ---- dolfijn: boog van linksonder naar rechtsboven en terug omlaag
    punten = [(7, 36), (18, 28), (32, 23), (46, 23), (58, 27), (68, 33)]
    dikte = [2.5, 5.5, 7.0, 7.0, 6.0, 4.0]
    d.pad(punten, dikte, z, rand=o)
    d.vorm([(0, 34), (10, 31), (11, 37), (0, 38)], z, o)           # snuit
    d.rechthoek(1, 35, 8, 35, o)                                    # bek
    d.ellips(13, 31, 2.0, 1.8, w); d.ellips(13, 31, 1.0, 1.0, o)    # oog
    d.vorm([(36, 18), (44, 9), (48, 20)], z, o)                     # rugvin
    d.vorm([(30, 30), (34, 40), (42, 33)], z, o)                    # borstvin
    d.vorm([(66, 30), (82, 22), (76, 34), (83, 43), (66, 37)], z, o)  # staartvin

    # ---- Amor op de rug
    d.vorm([(36, 12), (47, 12), (49, 22), (34, 22)], h, o)          # romp
    d.vorm([(33, 20), (50, 20), (51, 25), (32, 25)], r, o)          # lendendoek
    d.ellips(41, 7, 5.0, 5.0, h); d.ellips(41, 7, 4.0, 4.0, h)
    d.veelhoek([(36, 2), (46, 1), (47, 5), (35, 6)], g)             # krullen
    d.zet(39, 7, o); d.zet(43, 7, o); d.rechthoek(40, 9, 42, 9, r)  # gezichtje
    d.pad([(36, 14), (26, 20), (16, 28)], [2.2, 2.0, 1.8], h, rand=o)   # arm aan de teugel
    d.pad([(48, 14), (56, 18)], [2.2, 1.8], h, rand=o)
    d.vorm([(46, 6), (60, 0), (57, 13)], w, o)                      # vleugel
    d.lijn(16, 28, 8, 33, o)                                        # teugel
    return d

# ---------------------------------------------------------------- caput 3
def gladiatoren():
    """Retiarius (net en drietand) tegen secutor (schild en zwaard), Zliten.

    Alles krijgt een donkere contour: zonder die lijn lopen huid, zand en brons in
    elkaar over en staan er twee beige vlekken in het zand.
    """
    d = Doek(grond="l")
    o, w, h, r, b, g, z = "o", "w", "h", "r", "b", "g", "z"

    d.rechthoek(0, 45, 83, 51, h)                                   # arenazand
    d.rechthoek(0, 44, 83, 44, o)

    # ---- links: retiarius
    d.vorm([(12, 18), (26, 18), (28, 32), (10, 32)], h, o)          # romp
    d.vorm([(10, 30), (28, 30), (29, 36), (9, 36)], r, o)           # gordel
    d.ellips(19, 11, 5.0, 5.4, o); d.ellips(19, 11, 4.2, 4.6, h)
    d.rechthoek(14, 6, 24, 8, b)                                     # haarband
    d.rechthoek(16, 10, 17, 11, o); d.rechthoek(21, 10, 22, 11, o)   # ogen
    d.rechthoek(18, 14, 20, 14, o)                                   # mond
    d.vorm([(9, 36), (17, 36), (16, 45), (8, 45)], h, o)            # been
    d.vorm([(20, 36), (28, 36), (31, 45), (23, 45)], h, o)          # been
    d.vorm([(24, 19), (36, 16), (37, 21), (25, 24)], b, o)          # schouderstuk
    d.pad([(26, 22), (34, 16), (40, 11)], [2.4, 2.2, 2.0], h, rand=o)  # arm
    d.pad([(12, 22), (6, 28), (3, 34)], [2.4, 2.2, 2.0], h, rand=o)
    d.lijn(41, 4, 45, 30, o, dik=2)                                  # drietand
    for dx in (-4, 0, 4):
        d.lijn(41 + dx, 0, 41 + dx, 6, o, dik=2)
    d.lijn(36, 5, 46, 5, o, dik=2)
    for i in range(7):                                               # net
        d.lijn(0, 26 + i * 2, 8, 22 + i * 2, z)
        d.lijn(i, 26, i, 40, z)

    # ---- rechts: secutor, gesloten helm en groot schild
    d.vorm([(58, 20), (72, 20), (73, 33), (56, 33)], h, o)          # romp
    d.vorm([(56, 31), (73, 31), (74, 37), (55, 37)], r, o)
    d.ellips(65, 12, 5.6, 6.0, z); d.ellips(65, 12, 4.6, 5.0, z)    # helm
    d.vorm([(59, 5), (71, 5), (72, 9), (58, 9)], b, o)              # helmkam
    d.rechthoek(62, 11, 63, 12, o); d.rechthoek(67, 11, 68, 12, o)  # kijkgaten
    d.vorm([(55, 37), (63, 37), (62, 45), (54, 45)], h, o)          # been
    d.vorm([(66, 37), (74, 37), (76, 45), (68, 45)], h, o)          # been
    d.vorm([(42, 17), (55, 15), (56, 38), (43, 40)], b, o)          # schild
    d.vorm([(45, 20), (52, 19), (53, 35), (46, 36)], g, o)
    d.ellips(49, 27, 2.6, 3.2, z)                                    # schildknop
    d.pad([(71, 22), (77, 14), (79, 8)], [2.4, 2.2, 2.0], h, rand=o)   # zwaardarm
    d.lijn(79, 9, 79, 0, o, dik=2)                                   # gladius
    d.rechthoek(77, 8, 81, 9, b)

    d.tekst("VERVS", 8, 0, o)
    d.tekst("PRISCVS", 56, 0, o)
    return d

# ---------------------------------------------------------------- caput 4
def medusa():
    """Afweermasker: rond gezicht, slangenhaar dat naar buiten straalt.

    Het masker moet de hele hoogte vullen — een kleine Medusa in een groot vlak
    leest als een smiley.
    """
    import math
    d = Doek(grond="d")
    o, w, h, g, z, r, b = "o", "w", "h", "g", "z", "r", "b"

    cx, cy = 42, 26
    # ---- slangen: twaalf gekromde staarten rond het hoofd
    for i in range(12):
        a = i * math.pi / 6 + 0.26
        for stap in range(9):
            t_ = stap / 8
            straal = 15 + stap * 1.6
            kronkel = math.sin(stap * 1.1 + i) * 0.22
            x = cx + math.cos(a + kronkel) * straal * 1.35
            y = cy + math.sin(a + kronkel) * straal
            d.ellips(x, y, 2.2 - t_ * 0.8, 2.0 - t_ * 0.7, g if stap % 2 else z)
    # ---- gezicht
    d.ellips(cx, cy, 15, 14, h)
    d.ellips(cx, cy, 15, 14, h)
    for i in range(14):                                        # haarlijn
        a = math.pi + i * math.pi / 13
        d.ellips(cx + math.cos(a) * 14, cy + math.sin(a) * 13.5, 2.2, 2.2, g)
    # ---- ogen: groot en strak vooruit
    for dx in (-6, 6):
        d.ellips(cx + dx, cy - 3, 4.0, 3.0, w)
        d.ellips(cx + dx, cy - 3, 1.8, 1.8, o)
        d.lijn(cx + dx - 5, cy - 7, cx + dx + 5, cy - 7, o, dik=2)   # wenkbrauw
    # ---- neus en mond
    d.veelhoek([(cx, cy - 1), (cx + 2, cy + 5), (cx - 2, cy + 5)], b)
    d.veelhoek([(cx - 6, cy + 8), (cx + 6, cy + 8), (cx + 4, cy + 11), (cx - 4, cy + 11)], r)
    d.lijn(cx - 6, cy + 9, cx + 6, cy + 9, o)
    return d

# ---------------------------------------------------------------- caput 5
def skelet():
    """Het skelet met twee wijnkruiken, Pompeii. Zwart op kalk, frontaal.

    Het origineel is een spotprent op de dood: memento mori als bediende die nog
    altijd inschenkt. Ribben en oogkassen zijn wat het leesbaar maakt.
    """
    d = Doek(grond="l")
    o, w, h, r, g = "o", "w", "h", "r", "g"
    cx = 42
    d.ellips(cx, 47, 26, 2.5, g)                                  # schaduw

    d.ellips(cx, 9, 7.5, 8.0, o); d.ellips(cx, 10, 6.0, 6.5, w)   # schedel
    d.ellips(cx - 3, 9, 2.0, 2.2, o); d.ellips(cx + 3, 9, 2.0, 2.2, o)   # oogkassen
    d.veelhoek([(cx, 12), (cx + 1.5, 15), (cx - 1.5, 15)], o)     # neusholte
    for i in range(5):                                            # tanden
        d.zet(cx - 4 + i * 2, 17, o)
    d.rechthoek(cx - 5, 16, cx + 5, 16, o)

    d.rechthoek(cx - 1, 19, cx + 1, 40, o)                        # wervelkolom
    for i, breed in enumerate((11, 12, 12, 11, 9)):               # ribben
        y = 21 + i * 3
        d.rechthoek(cx - breed, y, cx + breed, y + 1, o)
    d.vorm([(cx - 9, 38), (cx + 9, 38), (cx + 7, 44), (cx - 7, 44)], w, o)   # bekken

    for kant in (-1, 1):                                          # armen met kruiken
        d.pad([(cx + kant * 8, 22), (cx + kant * 20, 26), (cx + kant * 28, 32)],
              [2.0, 1.8, 1.6], o)
        kx = cx + kant * 31
        d.vorm([(kx - 5, 32), (kx + 5, 32), (kx + 6, 44), (kx - 6, 44)], r, o)  # kruik
        d.rechthoek(kx - 3, 29, kx + 3, 31, o)                    # hals van de kruik
        d.pad([(kx - 6, 34), (kx - 9, 38), (kx - 6, 42)], [1.2, 1.2, 1.2], o)  # oor

    for kant in (-1, 1):                                          # benen
        d.pad([(cx + kant * 4, 44), (cx + kant * 7, 50)], [2.0, 1.8], o)
    return d

# ---------------------------------------------------------------- caput 6
def nijlscene():
    """Krokodil tegen nijlpaard tussen de papyrus, naar het Nijlmozaïek van Palestrina."""
    d = Doek(grond="b")
    o, w, h, g, z, r, p, l = "o", "w", "h", "g", "z", "r", "p", "l"

    d.rechthoek(0, 0, 83, 14, l)                                  # oever bovenaan
    d.rechthoek(0, 14, 83, 15, o)
    for x in range(0, 84, 6):                                     # golfstrepen
        d.ellips(x, 26, 4.0, 1.2, z); d.ellips(x + 3, 40, 4.0, 1.2, z)

    for x in (6, 16, 70, 78):                                     # papyrus op de oever
        d.pad([(x, 14), (x + 1, 4)], [1.2, 1.0], g)
        for dx, dy in ((-4, -3), (4, -3), (0, -5), (-3, -6), (3, -6)):
            d.ellips(x + dx, 5 + dy, 2.0, 1.2, z)

    # ---- krokodil: lange romp, zaagrug, opengesperde bek naar links
    d.pad([(14, 34), (30, 31), (48, 31), (62, 34)], [4.5, 5.5, 5.0, 3.5], g, rand=o)
    for x in range(20, 60, 5):                                    # zaagrug
        d.vorm([(x, 27), (x + 2, 23), (x + 4, 27)], g, o)
    d.vorm([(2, 30), (16, 29), (16, 33), (2, 34)], g, o)          # bovenkaak
    d.vorm([(2, 36), (16, 35), (16, 38), (2, 39)], g, o)          # onderkaak
    for x in range(3, 15, 3):                                     # tanden
        d.zet(x, 34, w); d.zet(x + 1, 35, w)
    d.ellips(18, 28, 2.0, 1.8, w); d.ellips(18, 28, 1.0, 1.0, o)  # oog
    d.pad([(62, 34), (74, 38), (82, 44)], [3.0, 2.2, 1.4], g, rand=o)   # staart
    for x0 in (24, 40, 52):                                       # pootjes
        d.pad([(x0, 36), (x0 + 3, 42)], [1.8, 1.6], g, rand=o)

    # ---- nijlpaard: bolle rug rechtsboven, open muil
    d.vorm([(52, 16), (72, 14), (80, 20), (78, 28), (56, 28), (50, 22)], p, o)
    d.vorm([(46, 18), (58, 17), (58, 24), (46, 24)], p, o)        # kop
    d.vorm([(44, 19), (57, 18), (57, 21), (44, 22)], r, o)        # open muil
    d.zet(46, 20, w); d.zet(49, 20, w)                            # slagtanden
    d.ellips(53, 16, 1.6, 1.4, o); d.ellips(60, 15, 1.6, 1.4, o)  # oortjes
    d.ellips(56, 19, 1.4, 1.2, w); d.ellips(56, 19, 0.7, 0.7, o)  # oog
    return d

# ---------------------------------------------------------------- caput 7
def alexander():
    """Alexander te paard, lans vooruit, naar het mozaïek uit het Huis van de Faun.

    Het origineel leeft van de sarissen: een woud van schuine lansen achter de ruiter.
    Die diagonalen doen hier het meeste werk.
    """
    d = Doek(grond="l")
    o, w, h, r, b, z, g = "o", "w", "h", "r", "b", "z", "g"

    for i in range(9):                                            # woud van sarissen
        x = 4 + i * 9
        d.lijn(x, 2, x + 13, 30, z, dik=2)
    d.rechthoek(0, 44, 83, 51, h)                                 # grond
    d.rechthoek(0, 43, 83, 43, o)

    # ---- paard naar rechts: borst, hals, gestrekte benen
    d.vorm([(18, 26), (44, 24), (54, 27), (56, 34), (46, 38), (22, 38), (14, 32)], b, o)
    d.pad([(50, 27), (62, 18), (68, 12)], [5.0, 4.0, 3.2], b, rand=o)   # hals
    d.vorm([(64, 8), (76, 10), (74, 18), (62, 16)], b, o)         # kop
    d.vorm([(72, 5), (76, 9), (70, 10)], b, o)                    # oor
    d.ellips(70, 12, 1.4, 1.2, w); d.ellips(70, 12, 0.7, 0.7, o)  # oog
    d.pad([(58, 14), (52, 8), (44, 6)], [2.2, 2.0, 1.6], o)       # manen
    for x0, kant in ((20, -1), (28, -1), (44, 1), (52, 1)):       # benen
        d.pad([(x0, 36), (x0 + kant * 4, 44)], [2.6, 2.2], b, rand=o)
    d.pad([(16, 30), (6, 34), (2, 42)], [2.4, 2.0, 1.6], o)       # staart

    # ---- Alexander: harnas, mantel, lans
    d.vorm([(30, 12), (42, 12), (44, 26), (28, 26)], r, o)        # mantel
    d.vorm([(31, 14), (41, 14), (42, 24), (30, 24)], b, o)        # harnas
    d.ellips(36, 7, 4.6, 5.0, o); d.ellips(36, 8, 3.6, 4.0, h)    # hoofd
    d.veelhoek([(31, 3), (41, 3), (42, 6), (30, 6)], g)           # haarband
    d.pad([(42, 16), (56, 12), (68, 6)], [2.4, 2.2, 1.8], h, rand=o)   # lansarm
    d.lijn(40, 22, 82, 2, o, dik=2)                               # sarissa van Alexander
    d.vorm([(78, 0), (83, 3), (78, 6)], z, o)                     # lanspunt
    d.pad([(30, 16), (22, 22)], [2.2, 2.0], h, rand=o)            # teugelarm
    return d

# ---------------------------------------------------------------- slotpaneel
def lupa():
    """De wolvin met Romulus en Remus — het paneel dat pas verschijnt als alles af is."""
    d = Doek(grond="l")
    o, w, h, r, g = "o", "w", "h", "r", "g"

    d.ellips(42, 44, 30, 2.5, g)                                  # schaduw
    # ---- wolvin: romp op vier poten, kop naar de kijker gedraaid
    d.vorm([(22, 14), (58, 13), (66, 17), (68, 24), (60, 28), (26, 28), (18, 22)], h, o)
    for x in range(26, 58, 6):                                    # ruige rug
        d.vorm([(x, 13), (x + 2, 9), (x + 4, 13)], h, o)
    d.pad([(24, 20), (16, 14), (12, 9)], [4.0, 3.6, 3.0], h, rand=o)   # hals
    d.ellips(11, 8, 6.0, 5.4, o); d.ellips(11, 8, 5.0, 4.4, h)    # kop
    d.vorm([(5, 4), (7, 0), (11, 5)], h, o); d.vorm([(12, 4), (16, 0), (17, 6)], h, o)
    d.rechthoek(7, 8, 8, 9, o); d.rechthoek(13, 8, 14, 9, o)      # ogen
    d.vorm([(0, 8), (7, 7), (7, 12), (0, 13)], h, o)              # snuit
    d.rechthoek(1, 10, 6, 10, o)
    for x0 in (24, 34, 52, 62):                                   # poten
        d.rechthoek(x0, 26, x0 + 5, 41, h); d.rechthoek(x0, 26, x0, 41, o)
        d.rechthoek(x0 + 5, 26, x0 + 5, 41, o); d.rechthoek(x0 - 2, 40, x0 + 7, 42, o)
    d.pad([(66, 20), (76, 14), (82, 16)], [3.0, 2.4, 2.0], h, rand=o)  # staart

    # ---- twee kinderen onder de buik
    for i, cx in enumerate((36, 48)):
        d.ellips(cx, 36, 3.4, 3.4, o); d.ellips(cx, 36, 2.6, 2.6, r)
        d.vorm([(cx - 4, 39), (cx + 4, 39), (cx + 5, 45), (cx - 5, 45)], r, o)
        d.pad([(cx - 3, 40), (cx - 7, 34)], [1.4, 1.2], r, rand=o)     # armpje omhoog
    return d
