# -*- coding: utf-8 -*-
"""Bouwt beide builds uit sjabloon.html + latijn.json (§2.2).

    python3 maak-data.py     # woordenlijst.md -> latijn.json
    python3 bouw.py          # sjabloon.html + latijn.json -> verba/ en verba-online/

De offline build is het ding dat op de USB-stick gaat: daar wordt de synccode niet
uitgeschakeld maar **fysiek uitgeknipt**, zodat "nul netwerkrequests" een eigenschap van
het bestand is en niet van een if-je (§11.33).
"""
import datetime, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))

# Wat er in de offline build echt niet mag voorkomen (§11.2, §11.33).
VERBODEN_OFFLINE = [
    r"\bfetch\s*\(", r"\bXMLHttpRequest\b", r"navigator\.sendBeacon", r"\bWebSocket\b",
    r"\bEventSource\b", r"\bimport\s*\(",
]

def lees_versie(spec):
    """Het versienummer van de app is dat van de specificatie (§2).

    Eén ladder, geen twee: de spec is het bindende document, dus een release bumpen
    betekent de spec bumpen — en dan draagt de app dat nummer vanzelf in haar colofon.
    """
    m = re.search(r"^\|\s*Versie\s*\|\s*(\d+\.\d+)\s*\|", spec, flags=re.M)
    if not m:
        sys.exit("bouw.py: geen regel '| Versie | x.y |' in FUNCTIONELE-SPECIFICATIE.md")
    return m.group(1)

def lees(pad, wat):
    try:
        return open(pad, encoding="utf-8").read()
    except FileNotFoundError:
        sys.exit(f"bouw.py: {wat} ontbreekt — verwacht op {pad}")

def knip_online(html):
    """Haalt elk gemarkeerd blok weg — in JS/CSS én in de HTML."""
    html = re.sub(r"/\*__ONLINE_BEGIN__\*/.*?/\*__ONLINE_EINDE__\*/", "", html, flags=re.S)
    html = re.sub(r"<!--__ONLINE_BEGIN__-->.*?<!--__ONLINE_EINDE__-->", "", html, flags=re.S)
    return html

def houd_online(html):
    """Laat de blokken staan, maar haalt de markeringen zelf weg."""
    for marker in ("/*__ONLINE_BEGIN__*/", "/*__ONLINE_EINDE__*/",
                   "<!--__ONLINE_BEGIN__-->", "<!--__ONLINE_EINDE__-->"):
        html = html.replace(marker, "")
    return html

def schrijf(pad, inhoud):
    os.makedirs(os.path.dirname(pad), exist_ok=True)
    open(pad, "w", encoding="utf-8").write(inhoud)
    return os.path.getsize(pad) / 1024

sjabloon = lees(os.path.join(HIER, "sjabloon.html"), "sjabloon.html")
versie = lees_versie(lees(os.path.join(HIER, "FUNCTIONELE-SPECIFICATIE.md"), "de specificatie"))

if "/*__DATA__*/" not in sjabloon:
    sys.exit("sjabloon.html mist de /*__DATA__*/ placeholder")
if "/*__VERSIE__*/" not in sjabloon:
    sys.exit("sjabloon.html mist de /*__VERSIE__*/ placeholder")
if sjabloon.count("/*__ONLINE_BEGIN__*/") != sjabloon.count("/*__ONLINE_EINDE__*/") or \
   sjabloon.count("<!--__ONLINE_BEGIN__-->") != sjabloon.count("<!--__ONLINE_EINDE__-->"):
    sys.exit("sjabloon.html: een __ONLINE__-blok is niet netjes afgesloten")

try:
    data = json.loads(lees(os.path.join(HIER, "latijn.json"), "latijn.json"))
except json.JSONDecodeError as e:
    sys.exit(f"bouw.py: latijn.json is geen geldige JSON ({e}) — draai eerst maak-data.py")

# Compact: geen spaties, en </script> kan nooit in de data voorkomen.
js = json.dumps(data["woorden"], ensure_ascii=False, separators=(",", ":"))
assert "</script" not in js.lower(), "data bevat een script-tag"
# ---- offline: de data staat in het bestand, de synccode gaat eruit -------
offline = knip_online(sjabloon.replace("/*__DATA__*/", js)).replace("/*__STEMPEL__*/", "") \
                                                            .replace("/*__VERSIE__*/", versie)
for patroon in VERBODEN_OFFLINE:
    if re.search(patroon, offline):
        sys.exit(f"bouw.py: de offline build bevat {patroon} — dat mag niet (§11.33)")
kb_off = schrijf(os.path.join(HIER, "verba", "index.html"), offline)

# ---- online: GEEN data in de pagina --------------------------------------
# Wie de URL kent maar geen klascode heeft, mag de woordenlijst niet krijgen (§13.8,
# §11.36). De app haalt ze na het aanmelden op bij de API en bewaart ze lokaal.
# Een zichtbaar bouwstempel: zonder dat weet niemand of de bezoeker de nieuwe pagina
# ziet of een oude uit de cache van de hosting (§13.1).
stempel = datetime.datetime.now().strftime("%d-%m %H:%M")
online = houd_online(sjabloon.replace("/*__DATA__*/", "woordenUitCache()")
                             .replace("/*__STEMPEL__*/", stempel)
                             .replace("/*__VERSIE__*/", versie))
if js[:40] in online:
    sys.exit("bouw.py: er zit toch woorddata in de online build (§11.36)")
kb_on = schrijf(os.path.join(HIER, "verba-online", "index.html"), online)

# ---- de woorden voor de server -------------------------------------------
# Als PHP-bestand, niet als .json: een .json in de docroot is rechtstreeks op te vragen,
# een .php wordt uitgevoerd en geeft bij een directe aanvraag niets prijs.
woorden_php = os.path.join(HIER, "server", "woorden.php")
# De JSON wordt als tekst teruggegeven, niet als PHP-array: de API stuurt hem
# ongewijzigd door, zonder 300 KB te decoderen en opnieuw te coderen.
kb_w = schrijf(woorden_php,
               "<?php\n/* Gegenereerd door bouw.py — niet met de hand bewerken. */\n"
               "return <<<'VERBA_JSON'\n" + js + "\nVERBA_JSON;\n")

# ---- woordmeta voor de server: welk caput, hoeveel leerrichtingen -------
# De server moet kunnen zien of een woord "goud" is (alle richtingen op box 5) en bij
# welk caput het hoort, zonder 275 KB woorddata te parsen bij elke sync (§13.10.4).
meta, per_caput = {}, {}
for w in data["woorden"]:
    caput = int(str(w["c"]).split()[1])
    richtingen = 2 if w.get("t") else 1
    meta[str(w["nr"])] = [caput, richtingen]
    per_caput[caput] = per_caput.get(caput, 0) + 1
kb_m = schrijf(os.path.join(HIER, "server", "woordmeta.php"),
               "<?php\n/* Gegenereerd door bouw.py — nr => [caput, aantal richtingen]. */\n"
               "return " + json.dumps({"woorden": meta, "perCaput": per_caput},
                                      ensure_ascii=False, separators=(",", ":")).replace("{", "[")
                                                                               .replace("}", "]")
                                                                               .replace(":", "=>")
               + ";\n")

print(f"VERBA v{versie} (versienummer uit de specificatie)")
print(f"verba/index.html         gebouwd — {len(data['woorden'])} woorden, {kb_off:.0f} KB (offline)")
print(f"verba-online/index.html  gebouwd — {kb_on:.0f} KB (online, zonder woorddata, stempel {stempel})")
print(f"server/woorden.php       gebouwd — {kb_w:.0f} KB (alleen met geldig token op te vragen)")
print(f"server/woordmeta.php     gebouwd — {kb_m:.0f} KB ({len(per_caput)} caputs)")
