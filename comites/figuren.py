# -*- coding: utf-8 -*-
"""De comites (§9.6): zes figuurtjes uit de Romeinse wereld, 32x32 pixels.

Bron van waarheid voor de figuren in de app. Elk figuur wordt opgebouwd uit
eenvoudige vormen op een raster van letters; de omtrek komt er daarna vanzelf
omheen (elke lege pixel die aan een gevulde grenst, wordt `o`).

Palet per figuur: o=omtrek  s=schaduw  b=basis  h=hoogsel  a=accent  c=accent 2,
                  eventueel nog eigen letters (f=gezicht bij de legionair, ...),
                  w=oogwit  e=pupil  k=ooglid (alleen in het knipperbeeld)  .=leeg
De app knippert door `w` en `e` te vervangen door `k`; teken ogen dus met w/e.

Na een wijziging:  python3 contactblad.py   (kijk ernaar!)  en dan  python3 injecteer.py
"""
import math

W = 32


class Raster:
    def __init__(self):
        self.g = [["."] * W for _ in range(W)]

    def px(self, x, y, c):
        if 0 <= x < W and 0 <= y < W:
            self.g[y][x] = c

    def ellips(self, cx, cy, rx, ry, c):
        for y in range(W):
            for x in range(W):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1:
                    self.g[y][x] = c

    def veelhoek(self, pts, c):
        for y in range(W):
            for x in range(W):
                if _binnen(x + .5, y + .5, pts):
                    self.g[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c)

    def lijn(self, x0, y0, x1, y1, c):
        n = max(abs(x1 - x0), abs(y1 - y0)) or 1
        for i in range(n + 1):
            self.px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)

    def schaduw(self, c_van, c_naar, test):
        """Kleurt pixels van c_van om naar c_naar waar test(x, y) waar is."""
        for y in range(W):
            for x in range(W):
                if self.g[y][x] == c_van and test(x, y):
                    self.g[y][x] = c_naar

    def omtrek(self):
        nieuw = [r[:] for r in self.g]
        for y in range(W):
            for x in range(W):
                if self.g[y][x] != ".":
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X, Y = x + dx, y + dy
                    if 0 <= X < W and 0 <= Y < W and self.g[Y][X] not in ".o":
                        nieuw[y][x] = "o"
                        break
        self.g = nieuw

    def rijen(self):
        return ["".join(r) for r in self.g]


def _binnen(x, y, pts):
    n, j, ok = len(pts), len(pts) - 1, False
    for i in range(n):
        xi, yi = pts[i]; xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ok = not ok
        j = i
    return ok


F = {}

# ---------------------------------------------------------------- noctua
# Het uiltje van Minerva, op een olijftak. Het figuur dat het vaakst komt.
r = Raster()
r.ellips(16, 19.5, 9.5, 10.5, "b")                       # lijf
r.ellips(16, 12, 9, 7.5, "b")                            # kop
r.veelhoek([(7, 4), (11, 8.5), (7.5, 10)], "b")          # oorpluimen
r.veelhoek([(25, 4), (24.5, 10), (21, 8.5)], "b")
r.ellips(16, 22, 6, 7, "h")                              # lichte buik
for y, x0 in ((18, 13), (21, 12), (24, 13)):              # veertjes op de buik
    for x in range(x0, 32 - x0, 3):
        r.px(x, y, "s"); r.px(x + 1, y + 1, "s")
r.schaduw("b", "s", lambda x, y: x >= 22 and y >= 14)      # licht van linksboven
r.ellips(11.5, 12.5, 4, 4, "a")                          # ogen: gele ring
r.ellips(20.5, 12.5, 4, 4, "a")
r.ellips(11.5, 12.5, 2.6, 2.6, "w")
r.ellips(20.5, 12.5, 2.6, 2.6, "w")
r.rect(11, 12, 12, 13, "e"); r.rect(20, 12, 21, 13, "e")
r.veelhoek([(15, 15), (17, 15), (16, 18)], "c")          # snavel
r.rect(13, 29, 14, 29, "c"); r.rect(18, 29, 19, 29, "c") # klauwtjes
r.lijn(1, 30, 30, 30, "s"); r.lijn(1, 31, 30, 31, "s")   # tak
r.ellips(4, 28.5, 2, 1.2, "a")                         # olijfblaadje
r.omtrek()
F["noctua"] = dict(
    naam="Noctua", wie="het uiltje van Minerva",
    pal=dict(o="#2a1a10", s="#6e4a2c", b="#9a6b40", h="#e3c79a", a="#e0aa46",
             c="#c07f3c", w="#fff6dc", e="#14141c", k="#6e4a2c"),
    px=r.rijen())

# ---------------------------------------------------------------- anser
# De ganzen van het Capitool: ze sloegen alarm toen de Galliërs 's nachts klommen.
r = Raster()
r.ellips(17, 22, 11, 7, "b")                             # lijf
r.veelhoek([(26, 18), (31, 15), (30, 21), (26, 23)], "b")  # staart
r.rect(8, 8, 11, 20, "b")                                # hals
r.ellips(10.5, 7.5, 4.5, 4, "b")                         # kop
r.veelhoek([(4, 6.5), (1, 9), (4, 10)], "a")             # snavel
r.veelhoek([(6, 6), (3, 7.5), (6, 9)], "a")
r.ellips(18, 21, 7, 4, "h")                              # vleugel
r.lijn(13, 23, 24, 21, "s"); r.lijn(15, 24, 25, 22, "s")
r.schaduw("b", "s", lambda x, y: y >= 26)
r.rect(9, 6, 10, 7, "w"); r.px(9, 7, "e")
r.lijn(13, 29, 13, 31, "a"); r.lijn(20, 29, 20, 31, "a")  # poten
r.lijn(11, 31, 15, 31, "a"); r.lijn(18, 31, 22, 31, "a")
r.omtrek()
F["anser"] = dict(
    naam="Ānser", wie="een gans van het Capitool",
    pal=dict(o="#2f2f38", s="#b9bccb", b="#eef0f6", h="#ffffff", a="#e2664a",
             c="#c04a5c", w="#ffffff", e="#14141c", k="#b9bccb"),
    px=r.rijen())

# ---------------------------------------------------------------- miles
# Een legionair: ijzeren galea met dwarse rode kam, wangkleppen, scūtum in de hand.
r = Raster()
r.rect(7, 2, 25, 6, "a")                                 # kam van borstelharen
r.ellips(16, 3, 9.5, 2.5, "a")
for x in range(8, 25, 2):
    r.lijn(x, 3, x, 6, "c")
r.rect(14, 6, 18, 7, "s")                                # houder van de kam
r.ellips(16, 13, 8.5, 6, "b")                            # helmkalot
r.schaduw("b", "h", lambda x, y: x <= 12 and y <= 11)
r.rect(6, 14, 26, 15, "s")                               # wenkbrauwrand
r.rect(5, 16, 27, 17, "b"); r.rect(5, 17, 7, 19, "s")    # nekscherm
r.rect(25, 17, 27, 19, "s")
r.ellips(16, 20, 5.5, 4.8, "f")                          # gezicht
r.rect(9, 16, 11, 24, "b"); r.rect(21, 16, 23, 24, "b")  # wangkleppen
r.rect(9, 22, 11, 24, "s"); r.rect(21, 22, 23, 24, "s")
r.rect(13, 18, 14, 19, "w"); r.rect(18, 18, 19, 19, "w")
r.px(14, 19, "e"); r.px(18, 19, "e")
r.lijn(15, 22, 17, 22, "g")                              # mond
r.rect(8, 25, 24, 31, "t")                               # tuniek
r.rect(8, 25, 24, 27, "b")                               # lōrīca
r.lijn(8, 29, 24, 29, "s")
r.veelhoek([(21, 20), (31, 20), (31, 31), (21, 31)], "a")  # scūtum
r.rect(25, 24, 27, 27, "x")                              # umbo
r.lijn(26, 21, 26, 23, "x"); r.lijn(26, 28, 26, 30, "x")
r.omtrek()
r.schaduw("x", "y", lambda x, y: True)
F["miles"] = dict(
    naam="Mīles", wie="een legionair",
    pal=dict(o="#1e1a1c", s="#5c6276", b="#9aa0b5", h="#d7dbe6", a="#c04a5c",
             c="#8a2e3e", f="#e8c39e", g="#9a5a3c", t="#8a4526", y="#e0aa46",
             w="#ffffff", e="#14141c", k="#c99a78"),
    px=r.rijen())

# ---------------------------------------------------------------- lupa
# De wolvin die Romulus en Remus zoogde, hier als kop.
r = Raster()
r.veelhoek([(5, 2), (12, 9), (6, 13)], "b")              # oren
r.veelhoek([(27, 2), (26, 13), (20, 9)], "b")
r.veelhoek([(7, 4.5), (10, 9), (7, 10)], "a")
r.veelhoek([(25, 4.5), (25, 10), (22, 9)], "a")
r.ellips(16, 15, 11, 9, "b")                             # schedel
r.veelhoek([(10, 16), (22, 16), (20, 27), (12, 27)], "b")  # snuit
r.veelhoek([(3, 18), (10, 15), (12, 26)], "b")           # wangen
r.veelhoek([(29, 18), (22, 15), (20, 26)], "b")
r.veelhoek([(12, 18), (20, 18), (19, 27), (13, 27)], "h")
r.rect(14, 23, 18, 25, "e")                              # neus
r.rect(15, 23, 15, 23, "c")
r.veelhoek([(9, 13), (14, 13), (13, 16), (9, 15)], "w")  # ogen
r.veelhoek([(23, 13), (18, 13), (19, 16), (23, 15)], "w")
r.rect(11, 14, 12, 15, "e"); r.rect(20, 14, 21, 15, "e")
r.schaduw("b", "s", lambda x, y: y >= 20 and (x < 12 or x > 20))
r.lijn(16, 27, 16, 28, "s")
r.omtrek()
F["lupa"] = dict(
    naam="Lupa", wie="de wolvin van Romulus en Remus",
    pal=dict(o="#1e1d26", s="#5c5f72", b="#8b8fa3", h="#d7d9e3", a="#c07f3c",
             c="#9aa0b5", w="#e0aa46", e="#14141c", k="#5c5f72"),
    px=r.rijen())

# ---------------------------------------------------------------- delphinus
# Een dolfijn, zoals op honderden Romeinse vloermozaïeken, springend boven de golven.
# Ronde meloenkop, korte snuit en een kleine gebogen rugvin: anders wordt het een haai.
r = Raster()
r.veelhoek([(5, 18), (8, 13), (13, 10), (19, 9.5), (24, 11), (27.5, 14.5), (29, 19),
            (26, 18), (21, 17.5), (15, 19), (10, 20.5), (6, 21)], "b")      # gebogen lijf
r.ellips(9.5, 15.5, 5.5, 5, "b")                                           # meloen
r.veelhoek([(1, 19), (5, 17), (6, 21), (1.5, 20.5)], "b")                  # korte snuit
r.veelhoek([(15, 10), (17, 6), (20, 4.5), (19, 7), (21, 10)], "s")         # rugvin, naar achter
r.veelhoek([(28, 18), (31, 15), (30, 20)], "s")                            # staartvin
r.veelhoek([(28, 18), (31, 23), (27, 21)], "s")
r.schaduw("b", "h", lambda x, y: y >= 18 or (y >= 17 and x <= 12))         # lichte buik
r.veelhoek([(13, 18), (17, 18), (13, 23)], "s")                            # borstvin
r.lijn(2, 20, 6, 19, "s")                                                  # glimlach
r.rect(8, 14, 9, 15, "w"); r.px(9, 15, "e")
r.omtrek()
import math as _m
for x in range(0, 32):                                                     # golven
    for y0, ch in ((27, "a"), (30, "c")):
        y = y0 + round(_m.sin((x + (3 if ch == "c" else 0)) / 2.0))
        if r.g[y][x] == ".":
            r.g[y][x] = ch
F["delphinus"] = dict(
    naam="Delphīnus", wie="de dolfijn uit de vloermozaïeken",
    pal=dict(o="#14223a", s="#2e5a80", b="#5b89ae", h="#bcd6ea", a="#5b89ae",
             c="#2e5a80", w="#ffffff", e="#14141c", k="#2e5a80"),
    px=r.rijen())

# ---------------------------------------------------------------- pullus
# Een heilige kip: vóór een veldslag keken de Romeinen of ze gretig at.
r = Raster()
r.ellips(15, 21, 10, 8, "b")                             # lijf
r.veelhoek([(22, 14), (30, 7), (31, 15), (24, 22)], "s")  # staartveren
r.veelhoek([(23, 16), (28, 10), (28, 17)], "a")
r.ellips(11, 11, 5.5, 5.5, "b")                          # kop
r.ellips(11, 5.5, 3.5, 2, "a")                           # kam
r.rect(9, 3, 9, 4, "a"); r.rect(12, 3, 12, 4, "a")
r.veelhoek([(5.5, 10), (2, 12), (5.5, 13)], "c")         # snavel
r.ellips(6.5, 15.5, 1.6, 2.2, "a")                       # lel
r.ellips(16, 21, 6, 4.5, "h")                            # vleugel
r.lijn(12, 22, 20, 21, "s"); r.lijn(13, 24, 20, 23, "s")
r.rect(8, 9, 9, 10, "w"); r.px(8, 10, "e")
r.lijn(12, 28, 12, 31, "c"); r.lijn(18, 28, 18, 31, "c")
r.lijn(10, 31, 14, 31, "c"); r.lijn(16, 31, 20, 31, "c")
r.omtrek()
# graankorrels
for x in (3, 6, 24, 27):
    if r.g[31][x] == ".": r.g[31][x] = "c"
F["pullus"] = dict(
    naam="Pullus", wie="een heilige kip van de augurs",
    pal=dict(o="#2a1a10", s="#a87a28", b="#d9a441", h="#f6dfa0", a="#c04a5c",
             c="#e0aa46", w="#ffffff", e="#14141c", k="#a87a28"),
    px=r.rijen())

for k, f in F.items():
    assert len(f["px"]) == W and all(len(r) == W for r in f["px"]), k
    for rij in f["px"]:
        for ch in rij:
            assert ch == "." or ch in f["pal"], (k, ch)
