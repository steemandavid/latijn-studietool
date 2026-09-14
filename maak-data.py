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

rows, cap, sec = [], None, None
for line in open(os.path.join(HIER, "woordenlijst.md"), encoding="utf-8"):
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
        e["vol"] = vol
        # Het geslacht hoort bij de leerstof (§7.2a): staat het gedrukt, dan moet hij het
        # meegeven. Het wordt apart nagekeken, dus de aanvaarde VORMEN staan er altijd
        # zonder. Het boek drukt het alleen waar het niet uit de verbuiging volgt; bij
        # `avus, avi` staat het nergens in het boek (ook niet in het register) en dan
        # vraagt de app er ook niet naar.
        gm = GENDER.search(vol) or GENDER.search(vorm)
        if e["soort"] == "znw" and gm:
            e["g"] = gm.group(1)
        acc = {soepel(GENDER.sub("", vorm)), soepel(GENDER.sub("", vol))}
        e["a"]  = sorted(x for x in acc if x)
        e["ac"] = sorted({norm(vorm), norm(vol)} - {""})              # streng: alleen zoals gedrukt
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
