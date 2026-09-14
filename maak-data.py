# -*- coding: utf-8 -*-
"""Bouwt latijn.json uit woordenlijst.md (bron van waarheid).

Vanuit elke willekeurige map te draaien: paden ankeren op __file__.
"""
import re, json, os, sys, unicodedata, collections

HIER = os.path.dirname(os.path.abspath(__file__))

MAC = str.maketrans("āēīōūĀĒĪŌŪăĕĭŏŭ", "aeiouAEIOUaeiou")
def deMacron(s): return s.translate(MAC)

def _basisnorm(s):
    s = deMacron(s).lower().strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("…", "...")
    s = re.sub(r"\s*,\s*", ", ", s)
    s = re.sub(r"(\d), (\d)", r"\1,\2", s)          # "1,5 m" blijft "1,5 m"
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def norm(s):
    """Streng: zoals gedrukt, alleen getrimd en macronloos."""
    return _basisnorm(s)

def soepel(s):
    """Zoals de soepele modus vergelijkt: ';' telt als ',' en '?' mag weg (§7.4)."""
    s = _basisnorm(s).replace(";", ", ")
    s = re.sub(r"\s*,\s*", ", ", s).replace("?", "")
    s = re.sub(r"(\d), (\d)", r"\1,\2", s)          # "1,5 m" blijft "1,5 m"
    return re.sub(r"\s+", " ", s).strip()

VERB_TAIL = re.compile(r",\s*~(ō|eō|iō|or|ior|eor|ferō|sum|it|et|t)\b")
IRREG = {"esse","posse","ferre","īre","velle","nōlle","mālle","fierī","inquit","ait",
         "coepisse","meminisse","nōvisse","ōdisse"}
GENDER = re.compile(r",\s*(m\./v\.|m\. en v\.|m\. mv\.|v\. mv\.|o\. mv\.|m\.|v\.|o\.)\s*$")

def soortVan(woord, vorm):
    kop = woord.split(",")[0].split(" +")[0].strip()
    if VERB_TAIL.search(woord) or kop in IRREG or woord.startswith(("abesse","adesse","dēesse","praeesse","superesse","prōdesse")):
        return "ww"
    if re.match(r"^~(a|ae|um|,)", vorm) or re.match(r"^\w+a, \w+um$", deMacron(vorm)) \
       or re.search(r";\s*\w+is$", vorm) or vorm.endswith(("~a, ~um","~ae, ~a")):
        return "adj"
    return "znw"

def stamVan(kop):
    """Stam waar '~' voor staat: lemma minus zijn uitgang."""
    for uit in ("us","er","um","ī","is","a"):
        if kop.endswith(uit) and len(kop) > len(uit) + 1:
            return kop[:-len(uit)]
    return kop

# Uitzonderingen waar de tilde-regel niet werkt (afwijkende drukwijze in het boek).
OVERRIDE = {
    1015: ("adj", "ūnus, ūna, ūnum; ūnīus"),   # boek drukt "~ūnius"; genitief is ūnīus
    1016: ("adj", "duae, duo"),                # stam "du", niet "duo"
}

def expandeer(vorm, kop):
    """'~a, ~um' -> 'bona, bonum'; losse '~' -> het lemma zelf."""
    if "~" not in vorm: return vorm
    stam = stamVan(kop)
    out = []
    for stuk in re.split(r"(\s*[,;]\s*)", vorm):
        if stuk.strip() == "~": out.append(kop)
        elif stuk.startswith("~"): out.append(stam + stuk[1:])
        else: out.append(stuk)
    return "".join(out)

# Haakjestoeslicht en labels — bv. "forum (romeins marktplein)", "(z.) wie?" — horen
# niet in een aanvaard antwoord thuis: wie "forum" of "wie" typt, is correct.
HAAKJES = re.compile(r"\s*\([^)]*\)")

def onderdelen(vert):
    """Aanvaardbare vertaalvarianten:
    - elke deelbetekenis na ';' apart,
    - dezelfde zonder haakjestoeslicht,
    - elk kommadeel apart (niet tussen cijfers, want "1,5 m" is geen opsomming).
    De volledige gedrukte vertaling komt er apart bij (zie ta-opbouw)."""
    uit, gezien = [], set()
    def voeg(x):
        x = x.strip()
        if len(x) >= 2 and x not in gezien:
            gezien.add(x); uit.append(x)
    for d in re.split(r"\s*;\s*", vert):
        d = d.strip()
        if not d: continue
        voeg(d)
        zonder = HAAKJES.sub("", d).strip()
        for basis in ([d, zonder] if zonder and zonder != d else [d]):
            for stuk in re.split(r"(?<!\d),\s*(?!\d)", basis):
                voeg(stuk)
    return uit

# --- afgeleide geslachten (zie de gelijknamige sectie achteraan woordenlijst.md) ---
# Het boek drukt het geslacht alleen waar het niet uit de verbuiging volgt. Voor de app is
# het bij elk zelfstandig naamwoord leerstof (§7.2a), dus de rest wordt hier bijgezet —
# afgeleid uit de verbuiging, met de regel erbij, en gemarkeerd als afgeleid (`ga`).
GEEN_GESLACHT = {174, 247}          # alter, plērīque: voornaamwoordelijke adjectieven
# De regelcode zegt uit welke verbuiging het geslacht volgt; ze wordt gevalideerd zodat een
# verkeerd label (rēs pūblica stond ooit als '1 v' i.p.v. '5 v') niet blijft staan.
REGELS = {"1 v": ("I", "v."), "1 v mv": ("I", "v. mv."), "2 m": ("II", "m."),
          "2 o": ("II", "o."), "2 m mv": ("II", "m. mv."), "2 o mv": ("II", "o. mv."),
          "4 m": ("IV", "m."), "5 v": ("V", "v.")}
def verbuiging_uit(kop, gen):
    """De verbuiging zoals nominatief én genitief samen ze verraden. Zo kan een regelcode
    niet naast de werkelijke verbuiging staan, ook niet als het geslacht toevallig
    hetzelfde is — `rēs pūblica` stond ooit als `1 v` genoteerd terwijl `reī` de 5e is.
    De genitief alléén volstaat niet: `deī` (van `deus`, 2e) en `reī` (van `rēs`, 5e)
    eindigen allebei op -ei."""
    n = deMacron(kop).lower().split()[0]
    g = deMacron(gen).lower().split()[0]
    if n.endswith("es") and g.endswith("ei"):                        return "V"
    if n.endswith("ae") and g.endswith("arum"):                      return "I"
    if n.endswith(("i", "a")) and g.endswith("orum"):                return "II"
    if n.endswith("a") and g.endswith("ae"):                         return "I"
    if n.endswith("us") and g.endswith("us"):                        return "IV"
    if n.endswith(("us", "er", "ir", "um")) and g.endswith("i"):     return "II"
    return None

AFGELEID, AFG_REGEL = {}, {}
_in_tabel = False
for line in open(os.path.join(HIER, "woordenlijst.md"), encoding="utf-8"):
    if line.startswith("## Afgeleide geslachten"): _in_tabel = True; continue
    if _in_tabel and line.startswith("## "):       _in_tabel = False
    if not _in_tabel: continue
    m = re.match(r"^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|\s*`([^`]+)`\s*\|", line)
    if m:
        AFGELEID[int(m.group(1))] = m.group(4).strip()
        AFG_REGEL[int(m.group(1))] = m.group(5).strip()

rows, cap, sec = [], None, None
_na_tabel = False
for line in open(os.path.join(HIER, "woordenlijst.md"), encoding="utf-8"):
    if line.startswith("## Afgeleide geslachten"): _na_tabel = True
    if _na_tabel: continue           # die tabel is geen woordenlijst
    if line.startswith("## Caput"): cap = line[3:].strip()
    elif line.startswith("### "):   sec = line[4:].strip()
    m = re.match(r"^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|", line)
    if not m: continue
    nr, woord, vorm, vert = int(m.group(1)), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
    if not cap or not sec:
        sys.exit(f"woordenlijst.md: rij {nr} staat boven de eerste '## Caput'/'### ' kop")
    kop = woord.split(",")[0].split(" +")[0].strip()
    drilbaar = bool(vorm) and not vorm.startswith("(")
    e = {"nr": nr, "w": woord, "kop": kop, "v": vorm, "t": vert, "c": cap, "s": sec}
    if drilbaar:
        e["soort"] = soortVan(woord, vorm)
        if nr in OVERRIDE:
            e["soort"], vol = OVERRIDE[nr]
        else:
            vol = expandeer(vorm, kop)
        # Het geslacht hoort bij de leerstof (§7.2a) en wordt apart nagekeken, dus de
        # aanvaarde VORMEN staan er altijd zonder. Drukt het boek het niet, dan komt het
        # uit de afgeleide tabel en schuift het alsnog in `vol`, want dat is het antwoord
        # dat de app toont en verwacht. `v` blijft de letterlijke transcriptie.
        gm = GENDER.search(vol) or GENDER.search(vorm)
        if e["soort"] == "znw" and nr not in GEEN_GESLACHT:
            if gm:
                e["g"] = gm.group(1)
            elif nr in AFGELEID:
                e["g"] = AFGELEID[nr]
                e["ga"] = 1                                   # geslacht afgeleid
                vol = vol + ", " + e["g"]
            else:
                sys.exit(f"woordenlijst.md: {nr} ({kop}) is een znw zonder geslacht — "
                         f"zet het in de tabel 'Afgeleide geslachten' of in GEEN_GESLACHT")
        e["vol"] = vol
        acc = {soepel(GENDER.sub("", vorm)), soepel(GENDER.sub("", vol))}
        e["a"]  = sorted(x for x in acc if x)
        # Streng: alleen de canonieke vormen — mét het geslacht, anders zou de strenge
        # modus soepeler zijn dan de soepele (§7.2a).
        def metG(x):
            return x if not e.get("g") or GENDER.search(x) else x + ", " + e["g"]
        e["ac"] = sorted({norm(metG(vorm)), norm(metG(vol))} - {""})
    else:
        e["soort"] = "geen"
    # vertalingen: alle onderdelen apart aanvaarden, lidwoord overal optioneel
    delen = onderdelen(vert)
    tv = set()
    for d in delen:
        tv.add(soepel(d))
        tv.add(soepel(re.sub(r"^(de|het|een)\s+", "", d)))            # lidwoord optioneel
    # ook de VOLLEDIGE vertaling zoals gedrukt aanvaarden: dat is het antwoord dat de
    # app zelf toont, en wie alles opsomt hoort niet fout gerekend te worden.
    tv.add(soepel(vert))
    tv.add(soepel(re.sub(r"^(de|het|een)\s+", "", vert)))
    e["ta"] = sorted(x for x in tv if x)
    # streng: de volledige vertaling zoals gedrukt, of één volledige deelbetekenis
    sdelen = [d.strip() for d in re.split(r"\s*;\s*", vert) if d.strip()]
    e["tc"] = sorted(({norm(vert)} | {norm(d) for d in sdelen}) - {""})
    rows.append(e)

# --- validatie: controletellingen uit de spec §3.3 hard maken (vangt transcribeerfouten) ---
VERWACHT = {"ww": 245, "adj": 165, "znw": 345, "geen": 296}
VERWACHT_TOTAAL = 1051
c = collections.Counter(r["soort"] for r in rows)
if len(rows) != VERWACHT_TOTAAL or dict(c) != VERWACHT:
    sys.exit(f"woordenlijst.md: tellingen kloppen niet — got {len(rows)} woorden, {dict(c)}; "
             f"verwacht {VERWACHT_TOTAAL}, {VERWACHT}")
# --- validatie: de afgeleide tabel moet kloppen met de woordenlijst ---
bekend = {r["nr"]: r for r in rows}
for nr in sorted(AFGELEID):
    r = bekend.get(nr)
    if r is None:
        sys.exit(f"Afgeleide geslachten: {nr} bestaat niet in de woordenlijst")
    if r["soort"] != "znw":
        sys.exit(f"Afgeleide geslachten: {nr} ({r['kop']}) is geen znw maar {r['soort']}")
    if GENDER.search(r["v"]):
        sys.exit(f"Afgeleide geslachten: {nr} ({r['kop']}) heeft al een gedrukt geslacht — "
                 f"haal de rij uit de tabel")
    regel = AFG_REGEL.get(nr)
    if regel not in REGELS:
        sys.exit(f"Afgeleide geslachten: {nr} ({r['kop']}) heeft een onbekende regel {regel!r}")
    if AFGELEID[nr] != REGELS[regel][1]:
        sys.exit(f"Afgeleide geslachten: {nr} ({r['kop']}) staat als {AFGELEID[nr]!r} maar "
                 f"regel {regel!r} geeft {REGELS[regel][1]!r}")
    echt = verbuiging_uit(r["kop"], r["v"])
    if echt != REGELS[regel][0]:
        sys.exit(f"Afgeleide geslachten: {nr} ({r['kop']}, gen. {r['v']}) staat onder regel "
                 f"{regel!r} (verbuiging {REGELS[regel][0]}), maar de genitief wijst op {echt}")
zonder_g = [r["nr"] for r in rows
            if r["soort"] == "znw" and "g" not in r and r["nr"] not in GEEN_GESLACHT]
if zonder_g:
    sys.exit(f"znw zonder geslacht: {zonder_g[:10]}")

nrs = [r["nr"] for r in rows]
if nrs != list(range(1, VERWACHT_TOTAAL + 1)):
    ontbrekt = sorted(set(range(1, VERWACHT_TOTAAL + 1)) - set(nrs))
    dubbel = [n for n, k in collections.Counter(nrs).items() if k > 1]
    sys.exit(f"woordenlijst.md: nummers niet doorlopend 1..{VERWACHT_TOTAAL} "
             f"(ontbreekt: {ontbrekt[:10]}, dubbel: {dubbel[:10]})")

json.dump({"versie": 1, "bron": "woordenlijst.md", "woorden": rows},
          open(os.path.join(HIER, "latijn.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=0)

print("totaal", len(rows), dict(c))
print("drilbare vormen:", sum(1 for r in rows if r["soort"] != "geen"))
print("validatie OK — nummers doorlopend, tellingen conform spec §3.3")
