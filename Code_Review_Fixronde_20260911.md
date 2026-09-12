# Code-Review — latijn-studietool (VERBA) — 2026-09-11

**Object:** fixronde 2026-09-11 (claim: alle bevindingen uit `Code_Review_Phase1_20260910_2217.md` gefixt, spec v1.4).
**Methode:** vier parallelle verifications-tracks (spec v1.4 · data/buildpijplijn · app/sjabloon.html · tests/artifact), elkeen read-only, met exacte bewijslocaties. Onafhankelijke herhaling: alle 5 smoke-suites uitgevoerd, artifact herbouwd en `cmp`'d, `maak-data.py` volledig gerepliceerd tegen `latijn.json`.
**Bewijsstandaard:** elke status is aangelegd op een gecontroleerde `file:line` of een uitgevoerd commando. Niets is overgenomen op claim.

---

## Executive summary

De fixronde is **overweldigend geslaagd**. Alle zes MAJOR-bevindingen uit fase 1 zijn opgelost (één, M1, deels — zie NF-1), de 20 MINORs zijn opgelost of expliciet aan de spec toegeschreven, de elf INFO-punten zijn afgehandeld. De smoke-tests zijn nu echte tests: 5 suites, 62 `check()`-calls, correcte exit-logica (rood = 1, groen = 0 — beide uitgevoerd gecontroleerd), en elke suite draait groen met 0 console/page-errors. Het artifact `verba/index.html` is **vers, deterministisch en idempotent** opgebouwd: een herbuild in een scratch-copie is byte-identiek, en de data is byte-consistent met een volledige replicatie van de huidige `maak-data.py` (0/1051 afwijkingen).

Wat overblijft: **één MAJOR-residu** in de data (dezelfde bugklasse als M1: haakjes die deel van het woord zijn verliezen hun natuurlijkste vertaling, ~25 woorden), twee badge-predicaten die **ruimer zijn dan de letterlijke spec** (vlekkeloos, nachtbraker), een aantal LAAG-bevindingen (level-up breekt de stilte van verover/examen; statistiekentegels missen de "Totaal juist/fout"-tellers die spec §6.7 eist; dagdoelbalk toont niet de dagdoel-progressie), en één **spec-bug** (§5.7 regel 330 zegt nog 12×12 terwijl wijzigingstafel, §11.25, changelog en code 16×16 zeggen). De 6 van de 8 bekende §11-testgaten staan nog open.

**Verdict: MAYBE — voorwaardelijk go.** De app is bruikbaar en de fixronde is van hoog niveau; de resterende MAJOR (NF-1) en de spec/code-discrepanties zijn klein en goed lokaliseerbaar, maar NF-1 hoort gefixt te worden vóór oplevering op de USB-stick, omdat een correct antwoord daar nog steeds FOUT kan worden gejureerd.

---

## 1. Status van de fase-1-bevindingen

### 1.1 MAJOR (6)

| ID | Bevinding | Status | Bewijs |
|----|-----------|--------|--------|
| M1 | Haakjestoeslichtingen in geaccepteerde antwoorden (42 woorden) | **DEELSGELOST** | `maak-data.py:74,76-95,123-133`: `HAAKJES`-regexp + `onderdelen()`; nr 26 `forum` → `ta` bevat `"het forum"` én de volledige gedrukte vorm; nr 162 `wie/wat/welke` aanwezig. **Maar:** optionele prefixes (`(op)wachten`, `wel(iswaar)`) verliezen hun volvorm — zie NF-1. |
| M2 | Importvalidatie te oppervlakkig; FLUO-backup geaccepteerd; corrupte save crash-loop | **OPGELOST** | `sjabloon.html:2578` marker-check bij import (`"app":"verba"`, anders alert); `:1317` `zetSave` type-checkt `items`-keys, `:1330-1333` boxes geclamp 0–5; `:1308` corrupte save → reset, geen loop; bestaande markerloze saves laden wél bij start (`laad()`). |
| M3 | Pakketselector klapte na elke tick | **OPGELOST** | `sjabloon.html:1793-1794,1797,1851-1856`: `pakOpen` Set + `pakFocus` + `scrollTop` capture/restore in `renderPakket()`; `pakFocus`-query null-gecheckt (geen focus op verwijderde node). |
| M4 | Blitz-due-tak was dode code | **OPGELOST** | `sjabloon.html:2047-2050`: `wasDue` vóór `tikVragen()`/reset berekend; `:2063` geconsumeerd in blitz; box-1-wachtregel intact (`WACHT_V[1]=2`, `:1420`). |
| M5 | Blitz-timer liep door na navigatie | **OPGELOST** | `sjabloon.html:1694-1701`: timer+combo gestopt in `toon()`; abandon roept `eindBlitz` nooit aan; `:2098-2099` 800 ms reveal guarded door `B && B.id === bid`; auto-advance getoken via `zelfdeRonde` (`:1918`). |
| M6 | 5 smoke-tests zonder asserts | **OPGELOST** | Alle 5 suites: `check()`-hulper + `process.exit(mis?1:0)`; 62/62 checks groen; rood-pad empirisch bewezen (geforceerde failure → `EXIT=1`); 0 console/page-errors per run. |

### 1.2 MINOR (20)

| ID | Status | Bewijs (file:line) |
|----|--------|--------------------|
| m1 komma-deelbetekenissen | OPGELOST | `maak-data.py:93` split; 17 woorden, 0 ontbrekende fragmenten in `ta` (incl. nr 126 `"deze"`, `"dit"`). |
| m2 `;` telt als `,`; `1,5 m` | OPGELOST | Data: 399 `;`-woorden, elk deel in `ta` én `tc`; digit-guard `re.sub(r"(\d), (\d)"…)` (`maak-data.py:19,31`; `sjabloon.html:1381,1388`); nr 442 intact. |
| m3 user input in innerHTML | OPGELOST | `sjabloon.html:2124` `escapeHTML(ctx.gegeven)`; `:1390` definie; "fout"-tak (`:2128-2133`) echo't input niet. |
| m4 verover/examen stil | **DEELSGELOST** | sfx/flits/shake/XP-zweef/combo allen `stil`-gated (`:2047,2065-2070,2077,2082,2088,2093`); **maar** `geefXP()` (`:2096`) niet → level-up in verover/examen maakt geluid+confetti+modal (NF-2). |
| m5 800 ms niet gerondeerd | OPGELOST | `sjabloon.html:2098-2099` `B && B.id === bid`; blitz slaat `toonFeedback` over. |
| m6 intro bookkeeping off-by-one | OPGELOST | `sjabloon.html:1978-1980`: `tikVragen()` eerst, dan `vragenSindsdien = 0`. |
| m7 leeg pakket hersteld bij reload | OPGELOST | `sjabloon.html:1765-1772,2597,2672`: leeg `pakket`-array overleeft `zetSave` (`:1359-1360`) én reload. |
| m8 level-drempels vs spec | OPGELOST | `sjabloon.html:804,1552,2361`: formule 100·n·(n+1)/2, level 2 op 100; examen +1000. |
| m9 bijna telt niet voor 100 %/badge | OPGELOST | `sjabloon.html:2162` bonus-guard, `:819` badge, `:2081` missers, `:2394` drill, `:2117` "Ook juist:". |
| m10 lege pakketflow: geen knop | OPGELOST | `sjabloon.html:1765-1772`: "Je leerpakket is leeg — er start geen ronde" + knop "Kies secties ↓" (scrollt met `magBewegen()`-kill-switch). |
| m11 parsing zonder validatie | OPGELOST | `maak-data.py:139-151`: §3.3-tellingen (1051; 245/165/345/296) + `sys.exit(1)`; doorlopende nrs met `ontbreekt`/`dubbel`-melding; rij vóór eerste Caput hard afgewezen (`:104-105`). |
| m12 meander in modals | OPGELOST | `sjabloon.html:1911,1652`: `.meander dun` in woordkaart- énvangstmodal, hergebruik van `--meander`. |
| m13 badge-voorwaarden te ruim | **SPEC-TEGENSPEL** | `sjabloon.html:819` vlekkeloos `aantal>=15` (spec: "ronde **van** 15 vragen"); `:831-833` nacht `nacht(c.startUur) || nacht(c.uur)` (spec: "afgewerkt tussen 23:00 en 05:00"). Zie NF-3/NF-4. |
| m14 combo-chip na Stoppen | OPGELOST | `sjabloon.html:2609-2614`: `qStop` én `bStop` doen `combo=0; updateCombo()`; ook bij abandon via `toon()` (`:1699`). |
| m15 stats L2N/L2V + "delen" | OPGELOST | `sjabloon.html:2507,2525,2531`: accurate L2N/L2V-accuratesse; "delen veroverd" telt 59. (Maar: "Totaal juist/fout"-tellers ontbreken — NF-5.) |
| m16 ronde-overzicht + dagdoel | OPGELOST | `sjabloon.html:2166-2185` overzicht compleet; `:1783-1788` voortgangsbalk op home. (Nuance NF-6: balk toont goud-totaal, niet dagdoel.) |
| m17 modals botsen | OPGELOST | `sjabloon.html:1706-1717`: `modalWachtrij`; `:1644-1661` tessera is functievorm-modal die bij drain `#mbox` met canvas vult. |
| m18 Blitz Esc zonder bevestiging | OPGELOST | `sjabloon.html:2650` `confirm("Blitz afbreken?…")`; quiz Esc via `qStop` (`:2609`, ook met confirm); verover/examen via `qStop`. |
| m19 cwd-relatieve paden | OPGELOST | `maak-data.py:8` `HIER = os.path.dirname(os.path.abspath(__file__))`, gebruikt `:98,154`; zelfde patroon `bouw.py:9`. |
| m20 kale traceback + KB-karakters | OPGELOST | `bouw.py:11-25`: vriendelijke `sys.exit`-meldingen; `:35-36` echte bytes via `os.path.getsize`; screenshotpad → `test/shots`; smoke-5 heeft L2V-monotonie. |

### 1.3 INFO / bewust-niet-veranderd (11)

| Item | Status | Bewijs |
|------|--------|--------|
| Streak-reset mild gemeld | OPGELOST | `sjabloon.html:1596`: toast "Je dagstreak is opnieuw begonnen" — maar alleen bij `oudeStreak > 1` (NF-7). |
| `scrollIntoView` smooth vs kill-switches | OPGELOST | `sjabloon.html:1771,2592,1567`: `behavior` = `magBewegen() ? "smooth" : "auto"` — respecteert html.geenanim én prefers-reduced-motion. |
| Dode code `vorigScherm` / `\|\| PAK` | OPGELOST | Grep: 0 hits in `sjabloon.html`. |
| Examen +1000 XP ontbrak in §5.1-tabel | OPGELOST (spec v1.4) | Spec §5.1 tabel heeft examen +1000; code `sjabloon.html:804,1552,2361` consistent. |
| Tessera-ontgrendeling na verovering | OPGELOST (spec v1.4) | Spec §5.7 expliciet toegestaan; code conform. |
| `item()` pre-materiaaliseert 1806 items | GEACCEPTEERD | `sjabloon.html:1411,1755`; spec §8.2 verbiedt het niet; bewust in changelog. |
| `Ontdek` cap 400 rijen | GEACCEPTEERD | Bewuste ontwerpkeuze; niet aangevallen. |
| `bouw.py` melde karakters i.p.v. bytes | OPGELOST | Zie m20. |
| §4.3-speccontradictie (én/óf) | OPGELOST (spec v1.4) | Spec §4.3 nu eenduidig "én"; code `sjabloon.html:2047-2050,2063` consistent. |
| Compact header "Caput I · 259 woorden" | OPGELOST | `sjabloon.html:1740-1745`: compacte vorm bij exact één caput. |
| Feedback "Ook juist:" i.p.v. "Volledig:" | OPGELOST | `sjabloon.html:2117` exact conform spec §7.4. |

---

## 2. Nieuwe bevindingen (deze ronde)

### NF-1 — MAJOR — M1-residu: optionele haakjes-prefixes verliezen hun volvorm
**Waar:** `maak-data.py:74` (`HAAKJES`), `:91` (`HAAKJES.sub("", d)`) — `latijn.json` (t/veld, ~25 woorden).
**Feit:** `HAAKJES` haalt zowel de label-gloss **als** de optionele-prefix-inhoud weg. Bij `wel(iswaar)` (nr 626) blijft alleen `"wel"` over in `ta`; de natuurlijkste vertaling **"weliswaar"** wordt FOUT gejureerd — en ook niet als "bijna" (Levenshtein-afstand te groot). Zelfde klasse bij: `exspectāre` (265) `opwachten` · `capere` (305) `innemen` · `tenēre` (843) `vasthouden` · `rīdēre` (729) `uitlachen` · `agere` (844) `voordrijven` · `vertere` (893) `omkeren` · `cōgitāre` (185) `nadenken` · `ut + conj.` (755) `om te`, `zodat` · `nē` (754) `om niet te` · `quantus` (570) `zo groot als` · `quantum`/`quot` (469/680) `zoveel als` · `quālis` (584) `zodanig als` · `līber + abl.` (614) `vrij van` · `contentus + abl.` (703) `tevreden met` · `(mihi) opus est` (830) `ik heb nodig` · `maximē` (352) `zeer veel` · `sacerdōs` (384) `priester(es)` · `aliquis`/`quīdam` (183/184) `sommige(n)`.
**Effect:** voor ~2,5 % van de woorden (25/1051) kan een correct, natuurlijk Nederlands antwoord worden afgeweerd en zakt het item een box. Milder dan vóór de fix (één kortere vorm blijft geaccepteerd), maar hetzelfde type fout als M1.
**Fix (suggestie):** onderscheid label-glosses (`(z.)`, `(b.)`, `(wordt niet vertaald)`) van inline prefixes; bij prefixen **beide** lezingen accepteren — `is` → basis én basis+prefix (`wel`, `weliswaar`; `wachten`, `opwachten`). Ongeveer 10–20 regels in `onderdelen()`.

### NF-2 — MINOR — level-up breekt de stilte van verover/examen
**Waar:** `sjabloon.html:2096` (`geefXP()` niet `stil`-gated) → level-up-modal (`:1577,1587`: sfx "level", confetti, modal) tijdens een stille veroveringstoets of het examen.
**Effect:** de changelog-claim "truly silent" is op dit punt onwaar; een modal blokkeert de toets in de hand.
**Fix:** `geefXP` of de level-up-presentatie `stil`-gaten (XP mag wel tellen).

### NF-3 — MINOR — badge "Vlekkeloos" ruimer dan spec
**Waar:** `sjabloon.html:819` `c.aantal>=15` vs spec §5.5 "Een ronde **van 15** vragen 100 % juist" (spec-lijn 304). Met de instelbare rondelengte (§6.8) telt ook een 20-vragenronde mee.
**Fix:** `aantal===15` — of de spec expliciet "minstens 15" maken. Kies ééntje.

### NF-4 — MINOR — badge "Nachtbraker" ruimer dan spec
**Waar:** `sjabloon.html:831-833` `nacht(c.startUur) || nacht(c.uur)` (commentaar: "begin- of eindtijdstip volstaat") vs spec §5.5 "Een ronde **afgewerkt** tussen 23:00 en 05:00" (spec-lijn 312). Ronde 04:30→05:15: spec nee, code ja.
**Fix:** alleen `c.uur` — of de spec "aangevinkt óf afgewerkt" maken.

### NF-5 — MINOR — statistiekentegels missen "Totaal juist/fout"
**Waar:** `sjabloon.html:2506-2531` toont alleen percentages; spec §6.7 vereist expliciet totaal-tellers.

### NF-6 — MINOR — dagdoelbalk toont niet de dagdoel-progressie
**Waar:** `sjabloon.html:1783-1788` — de balk toont goud-totaal/pakket; spec §5.6 zegt "Vandaag N woorden … met voortgangsbalk" (vandaag-progressie). De tekst *is* dagdoel-gebaseerd, de balk niet.

### NF-7 — LAAG — streak-reset 1→0 wordt niet gemeld
**Waar:** `sjabloon.html:1596` toast alleen bij `oudeStreak > 1`; spec §5.3 "terug naar 0, mild gemeld".

### NF-8 — LAAG — level-up-modal tijdens Blitz
**Waar:** `sjabloon.html:1605,2106` — `geefXP → levelUp` kan mid-Blitz de modal openen terwijl de timer draait; modal blokkeert de volgende vraag. Randgeval, maar wel een.

### NF-9 — LAAG — data-hygiëne: label-fragmenten blijven geaccepteerde antwoorden
**Waar:** `maak-data.py:92-94` → `latijn.json` nr 162/183/687: `"(z.) wie"`, `"(b.) een"`, `"(wordt niet vertaald)"` staan in `ta` als standalone geaccepteerde antwoorden. Onschadelijk (geen fout-jurering), maar slordig — filter labels bij `onderdelen()`.

### NF-10 — LAAG — import copy-unknown-keys
**Waar:** `sjabloon.html:1319` `Object.assign(leeg, d)` kopieert onbekende top-level keys in `S`; die worden mee bewaard én mee geëxporteerd. Filter op bekende keys.

### NF-11 — LAAG — modal-wachtrij: wedge op exception
**Waar:** `sjabloon.html:1715-1716` — `sluitModal` zet `modalOpen = true` vóór de queued call; een werpende queued modal blokkeert het modal-systeem permanent. Wrap in try/finally.

### NF-12 — LAAG — geïmporteerde `vragenSindsdien` niet geclamp
**Waar:** `sjabloon.html:1332` — alleen finiteness-check; een groot getal maakt items onmiddellijk due. Cosmetisch; clamp op de box-consistente waarde.

### NF-13 — INFO — XP-bar "win"-sweep in stille modi
**Waar:** `sjabloon.html:1560-1564` — alleen animatie-instelling-gegate, niet `stil`-gegate.

### NF-14 — INFO — "KB" is KiB
**Waar:** `bouw.py` en het artifact (404 199 bytes = 394,73 KiB ≈ 404,2 KB decimal). Niet misleidend, maar units-mengeling; noem "KiB" of "KB (1024)".

### NF-15 — INFO — `beantwoord >= 5`-guard overbodig
**Waar:** `sjabloon.html:2162` — rondes zijn minstens 10 vragen; de guard is dode code maar onschadelijk.

### NF-16 — INFO — geen validatie op niet-leeg vertaalveld
**Waar:** `maak-data.py:101-103` — een rij met leeg 4e kolom zou de build laten doorgaan met lege `ta`. Komt niet voor in `woordenlijst.md`; een `assert t` kost 1 regel.


