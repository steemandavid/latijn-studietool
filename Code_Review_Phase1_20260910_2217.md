# Phase 1 Code Review — Volledige eerste build (woordenlijst + studietool)

**Document ID:** LATIJN-REVIEW-P1-001
**Reviewer:** Code Review Agent
**Date:** 10 september 2026
**Scope:** "Fase 1" = het hele project — dit project kent geen fasering; het is in één sessie (2026-09-10) opgeleverd. De review dekt daarom de volledige codebase.
**FSD Reference:** FUNCTIONELE-SPECIFICATIE.md v1.3 (bindend)
**Commit Reviewed:** n.v.t. — geen git-repository (gewone map, bevestigd in changelog.md)

---

## Verdict: MAYBE

De kern is degelijk en grotendeels spec-conform: de Leitner-motor, de L2V-gate, de sterformule (§5.4, alle drie de eigenschappen wiskundig geverifieerd), de veroveringssplitsing (59 delen, max 25 woorden — exact conform §6.6, opnieuw berekend tegen de echte data), de volledig offline single-file build (in de lucht-tight; geen enkel extern referentie) en een deterministische, idempotente build-pijplijn waarvan alle artefacten byte-identiek aan verse builds zijn. Er zijn echter **zes MAJOR-bevindingen** die de leerervaring of robuustheid raken — waarvan de zwaarste dat 42 woorden correct getypte antwoorden als *fout* beoordelen omdat haakjestoeslichtingen in de aanvaarde antwoorden zitten — die opgelost moeten worden voordat de tool op de USB-stick gaat. Geen CRITICAL: niets vernietigt gegevens onherroepelijk of maakt de app onbruikbaar.

---

## Table of Contents

1. [Coverage Analysis](#1-coverage-analysis)
2. [Deviation Report](#2-deviation-report)
3. [Plan vs. Implementation](#3-plan-vs-implementation)
4. [Edge Cases & Safety](#4-edge-cases--safety)
5. [Concurrency & Platform Issues](#5-concurrency--platform-issues)
6. [Error Handling](#6-error-handling)
7. [Code Quality](#7-code-quality)
8. [Summary](#8-summary)
9. [Recommendation](#9-recommendation)

---

## Files Reviewed

| Bestand | Rol |
|------|---------|
| `sjabloon.html` | De volledige app (alle CSS/JS, `/*__DATA__*/`-placeholder) — primaire reviewtarget |
| `maak-data.py` | `woordenlijst.md` → `latijn.json` |
| `bouw.py` | `sjabloon.html` + `latijn.json` → `verba/index.html` |
| `tesserae/rasters.py` | Bron van waarheid: 20 sprites als 16×16-rasters |
| `tesserae/injecteer.py` | Spuit rasters in `sjabloon.html` |
| `tesserae/contactblad.py` / `contactblad.png` | Contactvlak-render (artefact) |
| `test/smoke-1..5*.js` + `test/LEESMIJ.txt` | Playwright-smoketests |
| `latijn.json`, `verba/index.html`, `verba/LEESMIJ.txt` | Gegenereerde artefacten (consistentie gecontroleerd) |
| `FUNCTIONELE-SPECIFICATIE.md` v1.3, `changelog.md`, `woordenlijst.md` | Contextdocumenten (niet zelf gereviewd op code) |

**Procesnotitie (transparantie):** één reviewsubagent heeft tijdens de review `python3 bouw.py` gedraaid, waarbij `verba/index.html` herschreven werd (22:22) — een schrijfactie in een verder lees-only review. Impact is goedaardig: na afloop is door de hoofdreviewer geverifieerd dat het huidige artefact **byte-identiek** is aan een verse build van de huidige bronnen (`sjabloon.html` 20:46 + `latijn.json`), dus het project staat nu consistent en correct op schijf. De subagent rapporteerde dat het artefact voor die herschrijving stalé was (build 20:40 vs. laatste sjabloonwijziging 20:46); een andere subagent concludeerde eerder "vers". De pre-schrijf-status is achteraf niet meer te reconstrueren; de huidige status is in elk geval correct. Advies hieronder: Bouw vóór levering altijd expliciet.

---

## 1. Coverage Analysis

Per spec-paragraaf de implementatiestatus. Detailtabellen per subagent zijn samengevoegd; "PARTIAL" = functioneel aanwezig maar met aantekening (zie §2).

| Spec-eis | Status |
|---|---|
| §2.1 single file, `file://`, geen fetch/XHR/SW/modules, nul dependencies | **DONE** — geverifieerd: geen enkel extern referentie in het artefact (enige `http://` is de SVG-namespace, nooit opgehaald) |
| §2.1 responsief tot 360 px, mozaïek scrolt in eigen container | **DONE** |
| §2.1 volledig toetsenbordbedienbaar | **DONE** in code (1–4, Enter, Space, Esc, pijlen, focus-visible) — **geen test** (§11.21) |
| §2.2 buildpijplijn + sprites | **DONE** — deterministisch en idempotent; alle artefacten regenereren byte-identiek |
| §3.2 alle velden incl. `a`/`ac`/`ta`/`tc` | **DONE** in structuur — maar `ta` bevat onbewerkte haakjestoeslichtingen (bevinding M1) |
| §3.3 soort-afleiding + controletellingen 245/165/345/296 | **DONE** — tellingen exact gereproduceerd; 1051 woorden, nrs 1–1051 zonder gaten/duplicaten |
| §3.3 `geen` krijgt nooit L2V | **DONE** |
| §3.4 tilde-expansie + uitzonderingen 1015/1016; gedrukte én geschreven vorm aanvaard | **DONE** |
| §4.1 twee richtingen, 1806 items, eigen voortgang; L2V pas bij L2N-box ≥ 2 | **DONE** — op drie call-sites gecontroleerd |
| §4.2 pakket in instellingen, globale voortgang, default Caput 1 | **PARTIAL** — leeg pakket wordt bij herladen stil gereset; melding-met-knop naar selector ontbreekt (bevinding m7/m10) |
| §4.3 Leitner-boxen, wachttijden, +1/→1, bijna behoudt box | **DONE** — met off-by-one in intro-boekhouding (m6) |
| §4.4 max 10 in de lucht, intro op nr, L2N voor L2V | **DONE** |
| §4.5 selectie-algoritme, nooit zelfde woord 2× na elkaar | **DONE** — "niet in laatste 2 vragen" geïnterpreteerd als "niet herhalen binnen de ronde" (strenger, aanvaardbare lezing) |
| §4.6 vorm per box; blitz MC; verover typen | **DONE** |
| §5.1 XP-tabel, 20 levels met namen, level-up | **DONE** — leveldrempel-lezing wijkt af van letterlijke specformule (m8); examen +1000 XP ongespecificeerd |
| §5.2 combo-tiers, bijna breekt combo niet | **DONE** |
| §5.3 dagstreak | **PARTIAL** — reset functioneel equivalent, maar "mild gemeld" ontbreekt |
| §5.4 sterformule incl. 3 eigenschappen | **DONE** — alle drie wiskundig geverifieerd (ook L2N- én L2V-richting) |
| §5.5 20 badges, grijs met voorwaarde | **DONE** — twee voorwaarden lossen dan spec (m13) |
| §5.6 toetsdatum/dagdoel | **PARTIAL** — geen voortgangsbalk bij dagdoel; aftelling verbergt verleden-datum ✓ |
| §5.7 20 tesserae, 16×16, zeldzaamheid, onthulling, per ronde, collectiegrid, in save | **DONE** — alle 20 rasters gecontroleerd op exact 16×16; rendering defensief |
| §6.0 header + thuisscherm, alle modi bereikbaar | **DONE** (leeg-pakket-affordance, zie m10) |
| §6.1 mozaïek (1051 cellen, sterren, dimming, woordkaart, tellers) | **DONE** |
| §6.2 ronde-flow + overzicht | **PARTIAL** — overzicht toont geen dagdoelstatus en geen sterretjes-animatie |
| §6.3 Ontdek (filters, sortering, macronongevoelig zoeken, flitskaarten) | **DONE** |
| §6.4 Zwakke plekken-algoritme | **DONE** — matcht de 4 stappen uit de spec exact |
| §6.5 Blitz (60 s, MC, −2 s, 800 ms, combo, record) | **PARTIAL** — due-tak is dode code (M4); timer lekt door bij headernavigatie (M5) |
| §6.5 Blitz fout antwoord → ongezien item naar box 1 (v1.3-fix) | **DONE** — correct geïmplementeerd |
| §6.6 verover in delen van max 25; typen; 100 %; +200/+500; oefen-locker; examen | **DONE** — 59 delen geverifieerd tegen data (incl. 1.0 → 7×22); zie m4/m9 voor feedbacklekkage en bijna-missers |
| §6.7 statistieken | **PARTIAL** — nauwkeurigheid niet gesplitst L2N vs. L2V (m15) |
| §6.8 instellingen incl. backup, dubbele bevestiging | **DONE** — importvalidatie te ondiep (M2) |
| §7.1 introkaart → box 1, komt terug als MC | **DONE** |
| §7.2 MC met 4 opties, afleider-prioriteiten, geen duplicaatantwoorden | **PARTIAL** — prioriteit 3 (gelijkaardige uitgang) vereenvoudigd tot soort-filter; harde regel (genitief nooit bij werkwoord) wel gewaarborgd |
| §7.3 typen: leeg niet bevestigbaar, "Ik weet het niet" | **DONE** |
| §7.4 normalisatie, macrons nooit verplicht, lidwoord optioneel, één betekenis volstaat | **PARTIAL** — M1 (haakjes in aanvaarde antwoorden), m1 (komma-opsommingen), m2 (`;`→`,` niet in normalisator) |
| §7.4 strenge modus; bijna = afstand 1 bij ≥ 5 tekens | **DONE** |
| §7.5 feedback-timing en -gedrag | **DONE** — met m3 (HTML-injectie) en m5 (blitz-kruislekkage) |
| §8.1 sleutel `verba.save.v1` | **DONE** |
| §8.2 schema | **DONE** — superset (typStreak-velden), toegestaan |
| §8.3 export via Blob/download; import valideert `version` + bevestiging | **PARTIAL** — M2: validatie checkt alleen `version === 1` |
| §8.4 try/catch rond opslag, fallback + waarschuwingsbalk, corrupt → leeg profiel, schrijven per antwoord | **DONE** |
| §9.2 donker thema, materiaalpalet, per-caput-accenten, goud gereserveerd, serif voor Latijn | **DONE** |
| §9.2.1 ornamentlaag | **PARTIAL** — meander ontbreekt in de meeste modals (m12); overige zes motieven conform, incl. lauwerkrans open boven en zuilen < 700 px verborgen |
| §9.5 bewegingscatalogus (13 momenten) + dubbele kill-switch, systeemvoorkeur wint | **DONE** — incl. `geenanim` en `prefers-reduced-motion`; één uitzondering: JS `scrollIntoView({behavior:"smooth"})` negeert beide (i7) |
| §10 op te leveren | **DONE** — alle genoemde bestanden aanwezig |
| §11 aanvaardingscriteria | Zie §2-deviaties en de testdekkingstabel onder "Plan vs. Implementation" |

**Testdekking §11 (door agent 3 gegenereerd):** gedekt door smoketests: criteria 1, 2, 3, 6, 8, 9, 10, 11, 12, 13, 15, 17, 20, 22, 25, 28, 29. Deels: 4, 14, 18, 24. **Gat (geen test):** 5 (pakketwissel behoudt voortgang), 7 (L2V pas bij box ≥ 2), 16 (59 toetsen / max 25 / examen), 19 (toetsdatum-aftelling + dagdoel), 21 (toetsenbordbediening), 23 (alle UI-Nederlands, onvermijdelijk visueel), 26 en 27 (reduced-motion en mozaïek-<50 ms zijn ad hoc getest maar de testscripts zijn niet bewaard).

---

## 2. Deviation Report

### MAJOR

**M1. Correcte antwoorden worden fout gejureerd: haakjestoeslichtingen en labels staan in de aanvaarde antwoorden (42 woorden)**
`maak-data.py:80–92` (`ta`-opbouw) → `sjabloon.html` `beoordeel()` (~r. 1458). Spec §7.4 ("één correcte betekenis volstaat", lidwoord optioneel), §3.2, aanvaardingscriteria 10/11.
Geverifieerd in `latijn.json`: woord 26 `forum` → `ta = ["forum (romeins marktplein)", "het forum (romeins marktplein)"]` — leerling typt `het forum` → **fout** (afstand te groot voor "bijna"), box → 1, combo weg. Woord 162 `quis?` → aanvaard bevat letterlijk `"(z.) wie?, wat?"`. Zelfde klasse: nr 174 `de ander(e)`, nr 442 `de pas (…1,5 m)`.
Fix-richting: in `maak-data.py` per deelbetekenis `\s*\([^)]*\)` strippen vóór variantenbouw (de volledige letterlijke tekst als één extra variant houden) én deze woorden ook op `,` splitsen.

**M2. Importvalidatie te ondiep — verkeerd-getypeerde velden crashen de app bij elke start; FLUO-backup wordt stil aanvaard**
`sjabloon.html` `zetSave()` r. 1304–1313, `importeer()` r. 2435–2452, `item()` r. 1365. Spec §8.3, §8.4.
Geverifieerd: r. 1309 doet `S.items = d.items || {}` — een `items: "x"` (string) komt door; `item()` doet daar `S.items[k] = {...}` op → TypeError, `renderHome()` sterft, en de kapotte save is al gepersisteerd door `bewaar()` → crash bij elke start (herstel mogelijk via Instellingen → Alles wijzen, maar de app opent kapot). Daarnaast: het zusterproject FLUO gebruikt eveneens `version:1` met dezelfde `<nr>:<richting>`-itemsleutels — een FLUO-backup wordt klakkeloos geladen en kruisbesmet de Latijnse boxstatus.
Fix-richting: in `zetSave` `typeof d.items === "object"` eisen (idem voor `profiel`/`settings`/`secties`/`badges`/`tesserae`) en een app-marker (`"app":"verba"`) in de save opnemen en bij import controleren.

**M3. Pakketselector klapt na elke vink in**
`sjabloon.html` r. 1716–1721 (caput-checkbox) en r. 1733–1738 (sectie-checkbox): `onchange` → `renderHome()`, dat de selector volledig herbouwt; `.secs` default `display:none` (r. 156). Geverifieerd.
Scenario: leerling vouwt Caput 3 open, vinkt 3.1 aan → lijst klapt dicht en focus valt terug op `<body>`; voor 3.2 en 3.3 opnieuw openvouwen. Spec §4.2/§6.0 — de selector is hét primaire scope-besturingselement.

**M4. Blitz "due"-tak (§6.5) is dode code**
`sjabloon.html` `verwerk()` r. 1935–1948 met `isDue()` r. 1374–1379. Geverifieerd: r. 1935 zet `it.vragenSindsdien = 0` vóór de blitzcheck op r. 1948; `isDue` eist `vragenSindsdien ≥ WACHT_V[box]` (box ≥ 1 → ≥ 2), dus een item met box ≥ 1 is op dat moment nooit due. Alleen de box-0-tak vuurt.
Scenario: item L2N op box 2 en due; juist beantwoord in Blitz → box blijft 2 in plaats van 3. De v1.3-revisie werkt dus, maar de oorspronkelijke "due → +1"-regel nooit.

**M5. Blitz-timer loopt door bij verlaten via de header**
`startBlitz()` r. 2103 (`B.timer = setInterval(blitzTik, 100)`), header-handlers r. 2455–2457 (`#btnMerk`, `#btnInst`, `#hPak`) — geen van allen wissen `B.timer`; alleen `#bStop` en Esc doen dat. Geverifieerd.
Scenario: Blitz gestart, na 5 s op ⚙ geklikt, instelling gewijzigd → op T+60 s schiet `eindBlitz()` de gebruiker van het instellingenscherm naar het blitzresultaat, plus een "afgeronde" blitz die verlaten werd wordt bijgeschreven/gemuteerd.

**M6. De vijf smoketests zijn meet-harnesses, geen tests: nul asserts, altijd exit 0**
`test/smoke-1..5*.js` (alle). Geverifieerd: geen enkel `assert`/`expect`/non-zero exit in de suite; er wordt alleen `console.log`'d. Spec §11 doorlopend.
Scenario: een regressie die het invariant-aantal op 47 zet of `FOUTEN 12` geeft, levert alsnog een "groene" run; het "alle suites groen" uit de changelog is een menselijke lees-claim, geen machine-claim. Goedkoopste fix: `process.exit(failures ? 1 : 0)` op de kern-tellers.

### MINOR

| # | Bevinding | Locatie | Spec |
|---|---|---|---|
| m1 | Komma-gescheiden deelbetekenissen (18 woorden, o.a. nr 126 `deze, dit`) worden niet individueel aanvaard — `deze` alleen is zelfs geen "bijna" | `maak-data.py:80` | §7.4 |
| m2 | "`;` telt als `,`" (§7.4 stap 4) ontbreekt in beide normalisatoren; `~a, ~um, nullius` (komma) wordt voor nr 45 niet aanvaard, `nulla, nullum, nullius` wel; zij-effect: `1,5 m` → `1, 5 m` | `maak-data.py:7`, `sjabloon.html:1339` | §7.4 |
| m3 | Gebruikersinpt ontsnapt in `innerHTML` ("Je schreef …") — self-XSS én lay-outbreuk bij `<`/`&` | `sjabloon.html` `toonFeedback()` r. 1999 | §7.5 |
| m4 | "Stille" veroveringstoets lekt correctheid: fout antwoord → foutsound + rode flits; juist → "+20 XP"-zwever | `verwerk()` r. 1960–1977 | §6.6 |
| m5 | `toonFeedback()` is niet blitz-bewust: bij een Blitz-foutantwoord leeft een verborgen `#fbNext` waarmee Enter/Space `volgendeVraag()` in het verborgen quizzescherm triggert (verstoort `laatsteNr`/`Q.gezien`); ook de 800 ms-Blitz-timeout is niet ronde-getokend (Esc + herstart binnen 800 ms wisselt de vraag) | r. 1982–2015, r. 2146, keydown r. 2520–2527 | §6.5/§7.5 |
| m6 | Intro-boekhouding off-by-one: `vragenSindsdien = 0` vóór `tikVragen()` → box-1-item al due na 1 tussenliggende vraag i.p.v. ≥ 2 | `toonIntro().ga` r. 1867–1872 | §4.3 |
| m7 | Bewust leeg pakket wordt bij herladen stil naar Caput 1 gereset | startup r. 2532–2533 | §4.2 |
| m8 | Leveldrempel: code haalt level n bij `100·(n−1)·n/2`, letterlijke specformule `100·n·(n+1)/2` geeft andere drempels — één van beide is fout | `xpVoorLevel()` r. 799 / `levelVan()` r. 1506 | §5.1 |
| m9 | "Bijna" telt mee als "100 % juist" (+50-bonus) én voor de Vlekkeloos-badge; bijna-missers ontbreken in de misserslijst van een veroveringstoets (niet gehaald, maar niets om te heroefenen) | r. 2037, r. 814, r. 1973/2256–2270 | §5.1/§5.5/§6.6 |
| m10 | Leeg-pakket-flow: toast zonder knop naar de selector / knop disabled i.p.v. spec's melding met knop | `startRonde()` r. 1816, r. 1686–1687 | §4.2 |
| m11 | `maak-data.py` parseert zonder validatie — duplicaat-nr overschrijft stil, rij met te weinig kolommen valt stil weg, rij vóór eerste `## Caput` krijgt `c/s = null`; geen assert op 1051/continuïteit | `maak-data.py:54–63` | §2.2/§3 |
| m12 | Meander ontbreekt in woordkaart-modal en tessera-reveal (wel in level-up); spec noemt modals expliciet | `toonWoord()` r. 1789, `toonVangst()` r. 1595 | §9.2.1 |
| m13 | Twee badge-voorwaarden lossen dan spec: `vlekkeloos` aanvaardt elke ronde ≥ 10 i.p.v. 15 vragen; `nacht` kijkt naar eind-tijdstip | r. 814, r. 827 | §5.5 |
| m14 | Combo-chip blijft zweven na "Stoppen" (`#qStop`/`#bStop` resetten `combo`/`#combo` niet) | r. 2473/2475 | §6 |
| m15 | Statistieken: nauwkeurigheid niet gesplitst L2N vs. L2V; tegel "secties veroverd" telt delen (59) i.p.v. secties (35) | `renderStats()` r. 2371–2374, r. 2397 | §6.7 |
| m16 | Rondoverzicht toont geen dagdoelstatus en geen "sterretjes-animatie" bij omhoog-woorden | `eindRonde()` r. 2044–2059 | §6.2 |
| m17 | Level-up-modal en tessera-reveal botsen in `#mbox` (reveal overschrijft na 500 ms de level-up) | r. 2063/2274 | §5.7 |
| m18 | Blitz-Esc breekt af zonder bevestiging (quiz heeft wél `confirm()`) | keydown r. 2512 | §9.3 |
| m19 | `maak-data.py` werkt cwd-relatief (de andere scripts ankeren op `__file__`): vanaf elders gedraaid schrijft het een stray `latijn.json` elders of crasht; `bouw.py` (correct geankerd) bouwt dan stil tegen oude data | `maak-data.py:55–96` | §2.2 |
| m20 | `bouw.py`: ontbrekende/malformed invoer → kale traceback i.p.v. het vriendelijke `sys.exit`-patroon dat elders wél gebruikt wordt; testscripts hardcoderen een session-GUID-`/tmp`-pad voor screenshots; smoke-5 mist de L2V-monotoniciteitssweep | `bouw.py:10–11`, `test/smoke-3:3`, `test/smoke-5:22–25` | §2.2/§10/§11.29 |

### INFO

- Streak-reset zet op de eerstvolgende dag 1 i.p.v. 0 + "mild gemeld" (net-effect equivalent, melding ontbreekt) — §5.3.
- `item()` materialiseert bij eerste render alle 1806 items in `S.items` (schema staat het toe; elke save wordt groter).
- `scrollIntoView({behavior:"smooth"})` negeert `prefers-reduced-motion` en `geenanim` (JS-optie valt buiten de CSS-media-query).
- Examen geeft +1000 XP — staat niet in de §5.1-tabel.
- Tessera-ontgrendeling vuurt ook na verover/examen (spec: "ronde of blitz") — extra, ongevaarlijk.
- Ontdek kappt de lijst op 400 rijen met melding — niet gespecificeerd, verstandig.
- `vorigScherm` (r. 1638) is dode code; `kies(PAK.filter(...) || PAK)` — `[]` is truthy, fallback dood.
- `bouw.py` rapporteert `len/1024` (tekens, niet bytes) — cosmetisch; §2-budget ruim gehaald (416 573 bytes ≈ 407 KiB).
- §4.3 spreekt zichzelf tegen ("of" in de tabel vs. "beide criteria gelden" in de bullet); `isDue` implementeert EN — specsduidelijking gewenst, geen codewijziging.
- Header toont nooit de compacte "Caput 1 · 259 woorden"-vorm uit §4.2.
- Feedback zegt "Volledig: …" i.p.v. letterlijke "Ook juist: de gelegenheid." (§7.4) — zelfde intentie.

### Expliciet geverifieerd en schoon (geen bevinding)

- Buildpijplijn deterministisch en idempotent op alle vier trappen; `injecteer.py`'s TESSERAE-scoping voorkomt de gedocumenteerde "mille"-badge-kruislekkage; `bouw.py` bewaakt tegen `</script>` in de data.
- Alle artefacten (`latijn.json`, `verba/index.html`, `contactblad.png`, sprites in `sjabloon.html`) byte-identiek aan verse regeneratie (na de hierboven genoemde herschrijving opnieuw door de hoofdreviewer bevestigd).
- Offline/single-file lucht-dicht: nul `fetch`, `XMLHttpRequest`, `@import`, externe `<link>`/webfonts/niet-`data:`-`url()`.
- Sterformule: alle drie de §5.4-eigenschappen wiskundig geverifieerd over de volledige data.
- Veroveringssplitsing: 35 secties → exact 59 delen, max 25 per deel, incl. het eigen voorbeeld van de spec (caput 1 → 7 delen, 6×22+21).
- 20 tesserae exact 16×16, rendering tolerante tegenoverschrijdingen.
- L2V-gate, 10-in-de-lucht-plafond, gewogen vraagselectie, bijna-afstand-1 — alle conform.

---

## 3. Plan vs. Implementation

No implementation plan found — section skipped. (Er is geen `Implementation_Plan_*.md` in het project of in `docs/`; de changelog bevestigt dat de single-file-aanpak en de spec de enige leidraden waren. De rol van het plan wordt deels ingevuld door spec §10/§11 en de "Projectstaat"-tabel in de changelog; de §10-deliverables zijn volledig aanwezig.)

---

## 4. Edge Cases & Safety

| Geval | Risico | Bevinding |
|---|---|---|
| Correct antwoord met achtergebleven haakjeshulp | **Hoog voor leerproces**: 42 woorden juren goed als fout, box-straf en combo-verlies | M1 |
| Import van malformed JSON met `version:1` | **Hoog**: crash-lus bij elke start (save is al gepersisteerd vóór de crash) | M2 |
| Import van FLUO-backup (zusterproject, zelfde versie/sleutels) | **Middel**: stille kruisbesmetting van boxstatus | M2 |
| Blitz verlaten via header; Esc+herstart binnen 800 ms | **Middel**: timers/handlers uit vorige modus grijpen in op het huidige scherm | M5, m5 |
| localStorage onbeschikbaar (file:// private mode) | **Laag**: afgevangen met fallback + waarschuwingsbalk (§8.4 conform) | — |
| Eén-woord-pakket in Blitz | **Laag**: zelfde woord herhaalt (onbereikbaar in de praktijk) | INFO |
| Macrons / NFC-NFD-normalisatie | **Laag**: normalisatie dekt accenten en macrons; invariant-test over alle 1806 items bevestigt | — |
| Geen gevaarlijke/hazerdous states | De app is een offline studiedom applicatie; geen data-verliespaden gevonden behalve M2's crash-lus (herstelbaar via Alles wissen) | — |

---

## 5. Concurrency & Platform Issues

Volledige concurrency-analyse is N/A (client-side, single-threaded, geen workers). Wel event-ordering- en platformbevindingen:

- **M5** — Blitz-interval overleeft headernavigatie (enige echte "lopende timer ontsnapt aan schermwissel"-lekkage).
- **m5** — `#fbNext`-handler en 800 ms-timeout uit een andere modus blijven vuren; de bestaande ronde-token-guard (`zelfdeRonde()`) dekt deze paden niet — `B` heeft geen token zoals `Q` die wel heeft.
- **i7** — JS `scrollIntoView({behavior:"smooth"})` omzeilt beide animation-kill-switches.
- Verder: correct platformgebruik — localStorage volledig bewaakt, `file://`-compatibele Blob-download en FileReader-import, geen modules/workers (conform §2).

---

## 6. Error Handling

- **Sterk**: opslaglaag volledig try/catch met fallback-profiel en waarschuwingsbalk; corrupt JSON bij opstart → leeg profiel (§8.4-conform); onbekende woord-nrs in saves worden getolereerd; onbekende sectiesleutels vallen stil (r. 1312).
- **M2**: de import-knop is de zwakke schakel — alleen `version`-check, geen type-checks, geen app-marker.
- **m11/m19/m20**: de Python-pijplijn rapporteert kale tracebacks bij ontbrekende/malformed invoer en `maak-data.py` kan stil desyncen (cwd-relatief); geen build-time assert op de controletellingen die §3.3 wél vastlegt (245/165/345/296, nrs 1–1051) — een assert daar zou transcribeerfouten direct vangen.
- **M6**: de testsuite zelf kan geen fouten signaleren (altijd exit 0) — foutafhandeling van de suite bestaat niet.

---

## 7. Code Quality

Substantieel:

- **Eén 115 KB-bestand** is hier een bewuste, door de spec voorgeschreven keuze (§2 single file) — geen verwijt, maar het betekent dat alle toekomstige wijzigingen door de bouwpijplijn moeten (`maak-data.py` → `bouw.py`), en M1 laat zien dat één onbewaakte regel in `maak-data.py` 42 woorden raakt. De aanbevolen build-asserts (§6) zijn daarmee quality-critical, niet cosmetisch.
- Consistentie is goed: ronde-tokens voor timers (`zelfdeRonde()`), `__file__`-ankering in 3 van 4 scripts, `sys.exit`-patroon in `bouw.py` — de uitzonderingen (m19, m20) zijn afwijkend t.o.v. eigen norm.
- Dode code (INFO): `vorigScherm`, `|| PAK`-fallback.
- Naamgeving en structuur van het JS zijn helder (modus-objecten `Q`/`B`, gescheiden render/start/eind-functies); geen onnodige complexiteit gevonden.

---

## 8. Summary

| Categorie | Critical | Major | Minor | Info |
|----------|----------|-------|-------|------|
| Spec-conformiteit (§2–§9) | 0 | 4 (M1, M3, M4, m-cluster) | 12 | 6 |
| Correctheid | 0 | 1 (M1 deels, M4) | 5 | 3 |
| Veiligheid & robustheid | 0 | 1 (M2) | 3 | 1 |
| Concurrency/event-ordering | 0 | 1 (M5) | 2 | 1 |
| Foutafhandeling | 0 | 1 (M6) | 3 | 1 |
| Codekwaliteit | 0 | 0 | 1 | 4 |

*(Kruisclassificatie is indicatief; de canonieke lijst staat in §2. Totaal: 6 MAJOR, 20 MINOR, 11 INFO.)*

**Wat uitdrukkelijk goed is:** de leermotor en datapijplijn zijn foutloos op de moeilijke, datagedele delen — sterformule, veroveringssplitsing, soort-tellingen, tilde-expansie en L2V-gate zijn tot op het woord geverifieerd conform; de offline-constraint is volledig gewaarborgd; de build is deterministisch en alle artefacten vers.

---

## 9. Recommendation

**Voorwaardelijk go (MAYBE): niet direct op de USB-stick zetten.** De fundamentele architectuur en het zware datwerk zijn solide en verdienen vertrouwen, maar eerst:

1. **Verplicht vóór levering:** M1 (één wijziging in `maak-data.py` + herbouw lost alle 42 woorden op), M2 (type-checks + `"app":"verba"`-marker), M5 + m5 (blitz-timer/handler-tokens), M3 (selector-status behouden bij re-render), M6 (`process.exit`-codes in de testsuite — daarna pas is "groen" een bewering).
2. **Kort daarna (eerste patchronde):** m2, m6, m8 (spec of code — één van beide rechtzetten), m9, m12, m19/m20.
3. **Proces:** bouw expliciet vóór elke levering (de review toonde een mogelijk stalé `verba/index.html` vóór 22:22), voeg de controletellingen als asserts toe aan `maak-data.py`, en bewaar voortaan de ad hoc-tests van §11.26/27 (reduced-motion, mozaïek-perf) als regressiescripts.

Geen van de bevindingen rechtvaardigt een herontwerp; alles is lokaal fixbaar binnen de bestaande structuur.
