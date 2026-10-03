# -*- coding: utf-8 -*-
"""De comites (§9.6): zeven figuurtjes uit de Romeinse wereld, 32x32 pixels.

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

# ---------------------------------------------------------------- hulp: borstbeeld
def gezicht(r, cx=16, cy=15, rx=5.5, ry=6.5, baard=None):
    """Een gezicht met ogen (w/e), neus en mond. Geeft de oogrij terug."""
    r.ellips(cx, cy, rx, ry, "f")
    r.schaduw("f", "g", lambda x, y: x >= cx + 3)            # licht van linksboven
    oy = round(cy - 0.5)
    r.rect(cx - 4, oy, cx - 3, oy + 1, "w"); r.rect(cx + 2, oy, cx + 3, oy + 1, "w")
    r.px(cx - 3, oy + 1, "e"); r.px(cx + 2, oy + 1, "e")
    r.px(cx, oy + 2, "g"); r.px(cx, oy + 3, "g")             # neus
    if baard is None:
        r.lijn(cx - 1, oy + 5, cx + 1, oy + 5, "m")          # mond
    return oy


# ---------------------------------------------------------------- gladiator
# Een murmillo: bronzen helm met brede rand, traliewerk voor het gezicht en een hoge kam;
# blote borst, manica om de arm, gladius omhoog.
r = Raster()
r.veelhoek([(9, 6), (14, 1), (22, 1), (24, 6)], "a")         # hoge kam
for x in range(12, 23, 2):
    r.lijn(x, 2, x - 1, 6, "c")
r.ellips(16, 12, 8.5, 7, "b")                                # helmkalot
r.schaduw("b", "h", lambda x, y: x <= 11 and y <= 10)
r.rect(4, 16, 28, 17, "b"); r.rect(4, 17, 28, 17, "s")       # brede rand
r.rect(9, 9, 23, 19, "d")                                    # vizier (donker)
for x in (9, 16, 23):                                        # tralies, met de ogen
    r.lijn(x, 9, x, 19, "b")                                 # telkens in een vak
for x in (12, 20):
    r.lijn(x, 15, x, 19, "b")
for y in (9, 15, 19):
    r.lijn(9, y, 23, y, "b")
r.rect(11, 11, 13, 12, "w"); r.rect(19, 11, 21, 12, "w")     # ogen achter de tralies
r.px(12, 12, "e"); r.px(20, 12, "e")
r.rect(8, 20, 24, 31, "f")                                   # blote borst
r.schaduw("f", "g", lambda x, y: x >= 20)
r.lijn(16, 23, 16, 27, "g"); r.lijn(12, 24, 14, 24, "g"); r.lijn(18, 24, 20, 24, "g")
r.rect(5, 21, 8, 31, "x")                                    # manica (gestreepte armbeschermer)
for y in range(22, 31, 2):
    r.lijn(5, y, 8, y, "s")
r.rect(8, 28, 24, 31, "t")                                   # subligāculum + riem
r.lijn(8, 28, 24, 28, "a")
r.rect(25, 22, 28, 31, "f")                                  # zwaardarm
r.rect(25, 19, 28, 21, "s")                                  # gevest
r.veelhoek([(25.5, 19), (27.5, 19), (27.5, 5), (26.5, 3), (25.5, 5)], "z")   # gladius
r.lijn(26, 6, 26, 18, "h")
r.omtrek()
r.schaduw("x", "b", lambda x, y: True)
r.schaduw("d", "o", lambda x, y: True)
F["gladiator"] = dict(
    naam="Gladiātor", wie="een murmillo uit de arena",
    pal=dict(o="#1e1a1c", s="#8a5a1c", b="#c99a3c", h="#f0d48a", a="#c04a5c",
             c="#8a2e3e", f="#d9a07a", g="#a8704c", t="#e8e0cc", z="#b8bccb",
             m="#7a3a2c", w="#ffffff", e="#14141c", k="#8a5a1c"),
    px=r.rijen())

# ---------------------------------------------------------------- augur
# Een augur: de toga over het hoofd getrokken (capite vēlātō), de lituus in de hand —
# de gekrulde staf waarmee hij de hemel in vakken verdeelde.
r = Raster()
r.ellips(15, 15, 9, 10, "t")                                 # kap van de toga
r.veelhoek([(3, 31), (6, 20), (24, 20), (28, 31)], "t")      # toga
r.schaduw("t", "u", lambda x, y: x >= 21 or (y >= 26 and (x + y) % 5 == 0))
r.lijn(9, 21, 13, 31, "a"); r.lijn(10, 21, 14, 31, "a")      # purperen band
oy = gezicht(r, 15, 16, 5, 6)
r.lijn(11, oy - 2, 13, oy - 2, "g"); r.lijn(17, oy - 2, 19, oy - 2, "g")   # fronsende wenkbrauwen
r.lijn(12, 20, 13, 21, "g"); r.lijn(18, 20, 17, 21, "g")     # rimpels
r.lijn(26, 31, 26, 9, "l")                                   # lituus
for x, y in ((26, 8), (26, 7), (26, 6), (27, 5), (28, 5), (29, 6), (29, 7), (28, 8), (27, 8)):
    r.px(x, y, "l")
r.rect(23, 23, 26, 25, "f")                                  # hand om de staf
r.omtrek()
F["augur"] = dict(
    naam="Augur", wie="de priester die de vogels las",
    pal=dict(o="#1e1a24", t="#ece6d6", u="#b9b0a0", a="#8d5aa6", f="#d9a682",
             g="#a8704c", m="#7a3a2c", l="#c07f3c", w="#ffffff", e="#14141c", k="#b8805e"),
    px=r.rijen())

# ---------------------------------------------------------------- vestalis
# Een Vestaalse maagd: witte sluier (suffībulum), rood-witte wollen band (īnfula) om het
# hoofd, en het heilige vuur van Vesta dat nooit mocht doven.
r = Raster()
r.veelhoek([(5, 31), (7, 10), (16, 4), (25, 10), (27, 31)], "t")   # sluier
r.ellips(16, 11, 9, 7, "t")
r.schaduw("t", "u", lambda x, y: x >= 22 or x <= 8)
oy = gezicht(r, 16, 15, 5, 6)
for x in range(10, 23):                                      # īnfula
    r.px(x, 9, "a" if x % 2 else "t"); r.px(x, 10, "t" if x % 2 else "a")
r.rect(10, 22, 22, 31, "x")                                  # stola
r.lijn(16, 22, 16, 31, "u")
r.veelhoek([(8, 27), (24, 27), (21, 31), (11, 31)], "l")     # vuurschaal
r.lijn(9, 27, 23, 27, "c")
r.veelhoek([(12, 27), (14, 21), (16, 24), (18, 18), (20, 23), (21, 27)], "v")   # vlam
r.veelhoek([(14, 27), (16, 23), (18, 27)], "y")
r.omtrek()
r.schaduw("x", "t", lambda x, y: True)
F["vestalis"] = dict(
    naam="Vestālis", wie="een priesteres van Vesta",
    pal=dict(o="#1e1a24", t="#f2eee4", u="#c4bdb0", a="#c04a5c", f="#e8c0a0",
             g="#b8826a", m="#a04a4c", l="#8a5a2c", c="#c07f3c", v="#e2664a",
             y="#ffd76a", w="#ffffff", e="#14141c", k="#c99a82"),
    px=r.rijen())

# ---------------------------------------------------------------- iuppiter
# Iuppiter, de oppergod: witte baard en krullen, purperen mantel, de bliksem in de hand.
r = Raster()
r.veelhoek([(3, 31), (7, 22), (25, 22), (29, 31)], "p")       # mantel
r.schaduw("p", "q", lambda x, y: x >= 22)
r.veelhoek([(8, 22), (14, 22), (20, 31), (9, 31)], "f")       # blote schouder
r.ellips(15, 9, 8, 6, "h")                                   # krullen
for x, y in ((8, 8), (11, 4), (15, 3), (19, 4), (22, 8)):
    r.ellips(x, y, 2, 2, "h")
oy = gezicht(r, 15, 13, 5, 5.5, baard=True)
r.lijn(11, oy - 2, 13, oy - 2, "s"); r.lijn(17, oy - 2, 19, oy - 2, "s")
r.ellips(15, 20, 6.5, 5.5, "h")                              # baard
r.ellips(15, 17.5, 3, 1.2, "h")                              # snor
r.lijn(14, 19, 16, 19, "m")                                  # mond in de baard
r.schaduw("h", "s", lambda x, y: x >= 19 and y >= 14)
r.lijn(10, 22, 13, 25, "s"); r.lijn(19, 23, 16, 25, "s")
r.veelhoek([(26, 3), (31, 3), (28, 11), (31, 11), (24, 22), (26, 13), (23, 13)], "y")   # bliksem
r.veelhoek([(22, 21), (27, 21), (27, 25), (22, 25)], "f")     # vuist
r.omtrek()
F["iuppiter"] = dict(
    naam="Iuppiter", wie="de oppergod, heer van de bliksem",
    pal=dict(o="#1a1626", h="#eeeef4", s="#a8a8bc", p="#8d5aa6", q="#5e3a72",
             f="#d9a07a", g="#a8704c", m="#7a3a2c", y="#ffd76a",
             w="#ffffff", e="#14141c", k="#b8805e"),
    px=r.rijen())

# ---------------------------------------------------------------- mercurius
# Mercurius, de bode van de goden: gevleugelde hoed (petasus), de caduceus met twee
# slangen, een korte rode mantel.
r = Raster()
r.veelhoek([(5, 31), (8, 23), (24, 23), (27, 31)], "c")       # chlamys
r.schaduw("c", "d", lambda x, y: x >= 21)
r.rect(14, 22, 18, 31, "f")                                  # hals en borst
oy = gezicht(r, 16, 15, 5, 6)
r.rect(10, 11, 11, 16, "r"); r.rect(21, 11, 22, 16, "r")    # krullen onder de hoed
r.px(12, 12, "r"); r.px(20, 12, "r")
r.ellips(16, 9, 7, 3.5, "b")                                 # hoed
r.rect(6, 10, 26, 11, "b"); r.rect(6, 11, 26, 11, "s")
r.veelhoek([(8, 9), (1, 2), (3, 6), (1, 7), (4, 9)], "h")    # vleugeltjes
r.veelhoek([(24, 9), (31, 2), (29, 6), (31, 7), (28, 9)], "h")
r.lijn(2, 5, 6, 8, "u"); r.lijn(30, 5, 26, 8, "u")
r.lijn(27, 31, 27, 17, "y")                                  # caduceus
r.ellips(27, 15.5, 1.6, 1.6, "y")
r.px(25, 14, "h"); r.px(24, 13, "h"); r.px(29, 14, "h"); r.px(30, 13, "h")   # vleugeltjes op de staf
for y in range(18, 30, 4):                                   # twee slangen
    r.px(26, y, "n"); r.px(28, y + 2, "n"); r.px(28, y, "n"); r.px(26, y + 2, "n")
    r.px(25, y + 1, "n"); r.px(29, y + 1, "n")
r.omtrek()
F["mercurius"] = dict(
    naam="Mercurius", wie="de bode van de goden",
    pal=dict(o="#1a1626", b="#8a8f9e", s="#5c6070", h="#eeeef4", u="#a8a8bc",
             c="#e2664a", d="#a8402e", f="#e3b08a", g="#b07a58", m="#8a4a3a",
             y="#ffd76a", n="#5fa86a", r="#6b4422", w="#ffffff", e="#14141c", k="#c0906c"),
    px=r.rijen())


for k, f in F.items():
    assert len(f["px"]) == W and all(len(r) == W for r in f["px"]), k
    for rij in f["px"]:
        for ch in rij:
            assert ch == "." or ch in f["pal"], (k, ch)
