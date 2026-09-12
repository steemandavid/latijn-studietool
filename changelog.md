# Changelog — latijn-studietool (VERBA)

## 2026-09-12 — Minder meerkeuze, minder herhaling (feedback van de gebruiker)

### Aanleiding
Twee klachten uit het echte gebruik van "Verder leren" en "Zwakke plekken":
hij kreeg bijna alleen meerkeuzevragen en zelden zelf typen, en binnen één sessie
kwam hetzelfde woord opvallend vaak terug.

### Wat er mis was
- **Vorm hing enkel aan de box** (box 1–2 meerkeuze, box 3+ typen). Box 2 heeft een
  wachttijd van tien minuten, dus binnen één sessie komt bijna alleen box 1 terug — en
  een fout zet een item ook weer op box 1. Gevolg: een gemeten **27 % typvragen**, en in
  "Zwakke plekken" nagenoeg nul, want zwakke items zitten per definitie in een lage box.
- **Herhaling**: het enige venster was "niet twee keer na elkaar hetzelfde woord". Met
  hoogstens tien items in de lucht kwam in een ronde van vijftien vragen hetzelfde woord
  tot **vijf keer** terug; de gemeten minimale afstand tussen twee beurten was **1** —
  de vormvraag van een woord volgde soms meteen op zijn betekenisvraag, want
  `volgendeIntro()` keek niet naar wat er net gesteld was.

### Wat er veranderd is (§4.3, §4.5, §4.6, §6.8 van de spec)
1. **Vraagvorm (§4.6).** Typen vanaf box 2 in plaats van box 3. Binnen box 1 geldt: eerste
   vraag na de introductiekaart blijft meerkeuze, meerkeuze blijft ook de steun direct na
   een misser, maar een item krijgt hoogstens *mc-max* meerkeuzes op rij (teller `mcSinds`
   per item, gereset bij introductie en bij elke fout), en zolang het typ-aandeel van de
   ronde onder de ondergrens ligt wordt er getypt.
2. **Nieuwe instelling "Hoeveel zelf typen"** (weinig / gemiddeld / veel, standaard
   gemiddeld) zet ondergrens (25/50/75 %), mc-max (3/2/1) en typdrempel (box 3/2/2).
   Oude saves krijgen automatisch "gemiddeld"; een onbekende waarde wordt gecorrigeerd.
3. **Herhalingsvenster van 5 woorden en een rondecap van 2** (§4.5). De vraagkeuze werkt
   nu in lagen: eerst echt vers materiaal (due → introductie → onderhoud → *vervroegd*),
   dan pas herhaling met krimpend venster, dan liever nog een introductie boven het
   plafond dan een derde beurt. `volgendeIntro()` respecteert het venster.
4. **"Vervroegd" (§4.3)**: een item dat de vragendrempel haalt maar de tijdgrens nog niet,
   mag ingezet worden wanneer het alternatief een herhaling in dezelfde ronde is. Dat vult
   de sessie met box-2-items — en dus met typvragen — in plaats van met dezelfde woorden.
5. **Wachttijden** iets ruimer: box 1 van 2 naar 4 tussenliggende vragen, box 2 van 5 naar 6.
6. **Blitz** respecteert hetzelfde herhalingsvenster.

### Gemeten effect (simulatie van 6 sessies × 2 rondes, virtuele klok, 80 % juist)
| | vroeger | nu |
|---|---|---|
| aandeel getypte vragen | 27 % | 60–64 % |
| zelfde woord per ronde | tot 5 × | max 2 × |
| kleinste afstand tussen twee beurten | 1 vraag | 5 vragen |
| instelling "weinig" vs "veel" | n.v.t. | 30 % vs 59 % getypt |

### Combo loopt door over rondes (§5.2)
De combo werd bij het einde **en** het begin van elke ronde op 0 gezet, dus een reeks
van tien juiste antwoorden was bij de rondegrens altijd weg. De combo hoort bij de
leerling, niet bij de ronde: hij staat nu in de save (`profiel.combo`), loopt door naar
de volgende ronde en over het afsluiten van de app heen, en breekt alleen op een fout
antwoord. Een ronde afbreken breekt hem niet. Blitz en de veroveringstoets tellen hun
eigen combo op 0 en laten de leercombo met rust.

### Tests
- Nieuw: `test/smoke-6-vraagmix-en-herhaling.js` — legt de mix en de herhalingsgrenzen vast
  met een virtuele klok (zonder tijdsverloop is box 2 nooit due en lijkt elke ronde
  terecht één meerkeuzetoets), plus drie checks op de doorlopende combo. 9 checks.
- Alle bestaande suites blijven groen: 37 + 13 + 4 + 3 + 5 + 9 = 71 checks.
- Draaien met een playwright die elders staat: `NODE_PATH=/home/john/automaker/node_modules
  node test/smoke-6-vraagmix-en-herhaling.js` (deze map heeft zelf geen `node_modules`).

### Documentatie bijgewerkt
| Bestand | Wat |
|---|---|
| `FUNCTIONELE-SPECIFICATIE.md` | §4.3 (wachttijden + "vervroegd"), §4.5 (venster, rondecap, gelaagde keuze), §4.6 (volledig herschreven, met de parametertabel), §5.2 (doorlopende combo), §6.8 (nieuwe instelling), aanvaardingscriteria 6a, 6b en 14a |
| `verba/LEESMIJ.txt` | twee regels voor de gebruiker: waar "Hoeveel zelf typen" staat, en dat de combo over rondes doorloopt |
| `test/LEESMIJ.txt` | wat smoke-6 bewaakt en waarom de klok daar virtueel vooruit moet |
| `test/shots/7-instellingen.png` | nieuwe screenshot van het instellingenscherm met de typ-instelling |

### Aandachtspunten
- Een **vervroegd** gesteld item promoveert bij een juist antwoord gewoon naar de volgende
  box, ook al was de tijdgrens nog niet verstreken. Dat versnelt de planning licht; de
  tijdgrenzen van box 3–5 (1, 3 en 7 dagen) vangen dat weer op. Bewust zo gelaten om de
  lijstmodi (Zwakke plekken, Verover) niet te breken, waar items zelden due zijn.
- Stap 5 van §4.5 mag boven het plafond van tien items in de lucht introduceren. Dat gebeurt
  alleen wanneer het alternatief een derde beurt voor hetzelfde woord is.
- `profiel.combo` is nieuw in de save; oude backups zonder dat veld krijgen 0 via
  `leegProfiel()` en worden geklemd op ≥ 0 in `zetSave`.

## 2026-09-11 — Alle reviewbevindingen gefixt (6 MAJOR, 20 MINOR, INFO)

### Doel
Alle bevindingen uit `Code_Review_Phase1_20260910_2217.md` verwerken — de majors, de minors
én de uitvoerbare info-punten. Daarna herbouwd en de volledige smoketestsuite groen.

### MAJOR-fixes
1. **Haakjestoeslicht in antwoorden (42 woorden).** `maak-data.py` bouwt `ta` nu uit
   "onderdelen": elke deelbetekenis na `;`, dezelfde zonder haakjes (`(z.)`, `(b.)`,
   `(romeins marktplein)`), én elk kommadeel apart (niet tussen cijfers, want `1,5 m` is
   geen opsomming). `het forum` voor `forum (…)`, `wie` voor `(z.) wie?, wat?`, `deze` voor
   `deze, dit` — allemaal juist nu.
2. **Importvalidatie.** Save krijgt een top-level `"app":"verba"`-marker; een backup zonder
   die marker (lees: een FLUO-backup, die ook `version:1` gebruikt) wordt geweigerd. `zetSave`
   valideert nu elk veldstype: `items` als string kon de app in een crash-lus bij elke start
   drijven; items worden gekoppeld aan geldige sleutels `<nr>:<richting>` en bekende woordnrs,
   boxen geklemd op 0–5. Bestaande localStorage-saves (zonder marker) blijven geldig — de
   marker wordt alleen geëist bij import uit een bestand.
3. **Pakketselector klapt niet meer dicht.** Uitgeklapte caputs (`pakOpen`-set), de
   scrollpositie van de lijst en de toetsenbordfocus op de aangevinkte checkbox overleven
   de re-render na elke wijziging.
4. **Blitz "due"-tak leefde niet meer.** `verwerk()` berekende `isDue()` ná het resetten van
   `vragenSindsdien`/`laatstGezien` — per definitie altijd onwaar. Nu wordt `wasDue` vóór de
   tellers bepaald: een juist Blitz-antwoord op een due item op box 2 zet het weer op box 3.
5. **Blitz-timer lekt niet meer door.** `toon()` stopt de timer (en reset de combo) zodra
   het blitzscherm via header/andere navigatie verlaten wordt; een verlaten blitz telt niet
   als afgewerkt. De 800 ms-onthulling na een fout antwoord is bovendien getokend (`B.id`),
   zodat Esc+herstart binnen 800 ms de nieuwe vraag niet meer wegspoelt.
6. **Tests zijn nu tests.** Alle vijf de suites hebben echte asserts en een exit-code
   (groen = exit 0, rood = exit 1) — 62 checks totaal, inclusief nieuwe voor de
   reviewfixes (haakjes/`;`-als-`,`/FLUO-weigering/blitz-timer/monotonie in de L2V-richting).

### MINOR-fixes (selectie)
- `;` telt nu echt als `,` in beide normalisatoren (soepele modus), en `?` hoeft niet
  getypt; `1,5 m` wordt niet meer uit elkaar getrokken. Strenge modus vergelijkt zoals
  gedrukt via een aparte `normStreng`.
- Veroveringstoets/examen zijn nu echt stil: geen geluid, flits, XP-zwever, schudden of
  combo-chip tijdens de toets; bijna-antwoorden komen wél in de misserslijst ("Niet juist")
  en in "Oefen deze nu" — ze halen de 100 % evenmin.
- Intro-boekhouding: `vragenSindsdien` staat na "Begrepen" op 0 i.p.v. 1 (§4.3, minstens
  2 tussenliggende vragen).
- Bewust leeg pakket blijft leeg over een herlaad; het thuisscherm meldt "geen ronde" mét
  knop naar de selector (§4.2). Header toont het compacte "Caput I · 259 woorden" als het
  pakket precies één caput is.
- Level-up-modal en tessera-onthulling queueën elkaar af (wie tweede is, wacht; de
  canvas-tessera overleeft dat nu ook). Meander toegevoegd in de woordkaart- en
  vangstmodal (§9.2.1).
- Combo-chip verdwijnt bij "Stoppen" (ronde én blitz); Blitz-Esc vraagt bevestiging (§9.3).
- Vlekkeloos-badge: ronde van ≥ 15 vragen, zonder fout én zonder bijna; "+50 100 % juist"
  idem. Nachtbraker kijkt naar begin- of eindtijdstip van de ronde.
- Rondoverzicht: omhoog-woorden komen na elkaar op met sterretjes + dagdoelstatus;
  dagdoel op het thuisscherm heeft een voortgangsbalk (§5.6/§6.2).
- Statistieken: accuratesse apart voor L2N en L2V; tegel heet "delen veroverd" (59) i.p.v.
  "secties". Feedback bij juist zegt "Ook juist: …" zoals §7.4 voorschrijft; gebruikersinvoer
  in de bijna-feedback wordt ge-escaped.
- `maak-data.py`: paden ankeren op `__file__` (werkt vanuit elke map), build-valideert de
  controletellingen uit §3.3 (1051; 245/165/345/296; doorlopende nummers). `bouw.py` geeft
  vriendelijke fouten en rapporteert bytes. Screenshotpad van smoke-3 → `test/shots/`.

### INFO-fixes
Streak-reset meldt zich mild (§5.3); `scrollIntoView` respecteert de animation-kill-switches;
dode code weg (`vorigScherm`, `|| PAK`-fallback). **Bewust niet veranderd:** `item()` legt
alle 1806 items bij eerste render in de save aan — de schema staat dat toe (§8.2) en de
opslag blijft klein; examen-XP en tessera-na-verover zijn nu in de spec vastgelegd i.p.v.
uit de code gesloopt.

### Spec v1.4
Wijzigingen: §4.3 due-criteria eenduidig **én** (was tegenstrijdig "of"/"beide");
§5.1 levelformule verduidelijkt (level 2 op 100 XP) + examen +1000 in de tabel;
§5.7 ontgrendeling ook na veroveringstoets, en modal-queue-regel; §6.6 missers inclusief
bijna; §7.4 haakjes/kommadelen/`?`-regels; §8.2/§8.3 `app`-marker en typevalidatie.

### Eindstand van de tests
Alle vijf suites groen met exit 0: **smoke-1 37/37 · smoke-2 13/13 · smoke-3 4/4 ·
smoke-4 3/3 · smoke-5 5/5** (62 checks). Invariant soepel én streng: 0 afwijkingen over
1806 items. Daarnaast afzonderlijk geverifieerd in-page: blitz-due-boxgang (2→3, niet-due
blijft), intro-teller op 0, selector-status/focus over re-render, modal-queue met
canvas-tessera, leeg-pakket-melding en -persistentie. `verba/index.html` herbouwd
(395 KB) en vers tegen de huidige bronnen.

## 2026-09-11 — Eerste codereview (hele project, "fase 1")

### Doel
`/codereviewer` over het volledige project — er is geen fasering, dus de review dekt
de hele codebase tegen `FUNCTIONELE-SPECIFICATIE.md` v1.3. Het reviewrapport staat in
**`Code_Review_Phase1_20260910_2217.md`** (verdict: **MAYBE** — voorwaardelijk go).

### Aanpak
Drie parallelle reviewagents (leermotor/data, gamificatie/presentatie,
buildpijplijn/tests), daarna synthesed; de zes MAJOR-bevindingen zijn alle zes door de
hoofdreviewer opnieuw in de bron geverifieerd.

### Bevindingen in het kort
- **6 MAJOR**, waarvan de zwaarste: `maak-data.py` zet haakjestoeslichtingen ongefilterd
  in de aanvaarde antwoorden (42 woorden, o.a. `forum (romeins marktplein)`) zodat correct
  getypte antwoorden als *fout* juren. Verder: ondiepe importvalidatie (crash-lus bij
  verkeerd getypeerde velden; FLUO-backup wordt stil aanvaard), pakketselector klapt dicht
  bij elke vink, Blitz "due"-tak is dode code (`vragenSindsdien` wordt gereset vóór de
  `isDue()`-check), Blitz-timer overleeft headernavigatie, en de vijf smoketests hebben
  nul asserts (altijd exit 0 — "groen" is een menselijke lees-claim).
- **20 MINOR, 11 INFO** — zie het rapport voor de volledige lijst met regelnummers.
- **Expliciet geverifieerd en schoon:** sterformule (3 eigenschappen), veroveringssplitsing
  (59 delen ≤ 25), soort-tellingen, tilde-expansie, L2V-gate, offline/single-file
  (lucht-dicht), deterministische buildpijplijn met byte-identieke artefacten.

### Beslist vóór levering op de USB-stick te fixen
M1 (haakjes in `ta`), M2 (importvalidatie + `"app":"verba"`-marker), M5 + m5
(blitz-timer/handler-tokens), M3 (selector-status behouden), M6 (`process.exit`-codes in
de testsuite).

### Side-effect van de review — artefact herschreven
Een reviewsubagent heeft per abuis `python3 bouw.py` gedraaid, waarbij
`verba/index.html` herschreven werd (22:22) in wat een lees-only review moest zijn.
Na afloop door de hoofdreviewer geverifieerd: het huidige artefact is **byte-identiek**
aan een verse build van de huidige bronnen. De subagent rapporteerde het artefact ervoor
als stalé (build 20:40 vs. laatste `sjabloon.html`-wijziging 20:46); achteraf niet meer
te reconstrueren. Les: **bouw expliciet vóór elke levering** — dit staat ook in de
aanbeveling van het reviewrapport.

### Openstaand (nieuw)
- De zes MAJOR-fixes uit het reviewrapport (§2 daarvan) zijn nog niet uitgevoerd —
  geen enkele codewijziging is deze sessie gedaan, de review was lees-only op één
  herbouwd artefact na.

## 2026-09-10 — Woordenlijst uit scans + studietool gebouwd

### Doel
Uit een reeks ingescande boekpagina's (per e-mail toegekomen) de volledige Latijnse
woordenlijst van 1051 woorden extraheren, en daarrond een studietool bouwen in de stijl
van het zusterproject `periodiek_systeem` (FLUO).

### Projectstaat (voor volgende sessies)
Geen git-repository — gewone map.

| Pad | Wat |
| --- | --- |
| `woordenlijst.md` | **Bron van waarheid.** 1051 woorden, per caput/sectie, met de conventies van het boek. |
| `latijn.json` | Afgeleide data. Genereren met `maak-data.py`, nooit met de hand bewerken. |
| `maak-data.py` | `woordenlijst.md` → `latijn.json` (klassering, tilde-uitschrijving, antwoordlijsten). |
| `sjabloon.html` | De app zonder data, met een `/*__DATA__*/` placeholder. **Hier bewerk je de app.** |
| `bouw.py` | `sjabloon.html` + `latijn.json` → `verba/index.html`. |
| `verba/index.html` | Build-artefact: de volledige app, ~407 KB, dubbelklikbaar. |
| `FUNCTIONELE-SPECIFICATIE.md` | Bindende specificatie **v1.3**. Bron van waarheid voor gedrag én vormgeving. |
| `test/smoke-1..5-*.js` | Smoketests (Playwright, headless Chromium over `file://`). Zie `test/LEESMIJ.txt`. |
| `tesserae/rasters.py` | De 20 pixelfiguren als 16×16 rasters. Bron van waarheid. |
| `tesserae/contactblad.py` | Rendert ze naast elkaar naar PNG — **kijk ernaar** voor je injecteert. |
| `tesserae/injecteer.py` | Schrijft de rasters in `sjabloon.html` (strikt binnen het TESSERAE-blok). |

Bouwen — twee bronnen, één artefact:

| Wat je wijzigt | Wat je draait |
| --- | --- |
| een woord in `woordenlijst.md` | `python3 maak-data.py && python3 bouw.py` |
| een pixelfiguur in `tesserae/rasters.py` | `cd tesserae && python3 contactblad.py` (kijk ernaar!) `&& python3 injecteer.py`, dan `cd .. && python3 bouw.py` |
| de app zelf in `sjabloon.html` | `python3 bouw.py` |

`verba/index.html` is een build-artefact maar hoort er wel bij te staan: dat is het bestand
dat op de USB-stick moet.

Harde randvoorwaarden (§2 van de spec): werkt over `file://` met een dubbelklik,
**nul** netwerkrequests, nul afhankelijkheden, geen ES-modules, bruikbaar op 360 px.

### 1. Woordenlijst geëxtraheerd
- 30 `.msg`-bestanden uit `/storage/fileshare/latijn/`; bijlagen uitgepakt met `extract_msg`.
- 30 A3-scans (spreads), geen tekstlaag. Geen OCR gebruikt: de pagina's zijn per halve
  bladzijde op 200 dpi gerenderd en visueel gelezen. Macrons blijven zo intact.
- Twee scans bleken duplicaten van dezelfde spread (pagina 10/11).
- Resultaat: 1051 woorden, ononderbroken genummerd, 7 caputs, 35 secties.

### 2. Gecontroleerd tegen het alfabetisch register (p. 70-84)
De 1044 nummerverwijzingen uit het register zijn apart overgetypt en machinaal
gedift tegen de woordenlijst. Uitkomst:

- **1 echte fout in de lijst**, rechtgezet: 918 stond als `āla/ālae`, het boek drukt `ala/alae`.
- **2 schijnbare fouten** waren boekinconsistenties (lijst is correct): 155 `inferus`
  (register zet er een macron op), 614 `līber` (register laat de macron weg).
- **6 drukfouten in het register zelf**, genoteerd in de kop van `woordenlijst.md`:
  `cōnfīdere` als 913 i.p.v. 213, `hīc` 346→347, `quod` 378→376, `regiō` 876→878,
  `laetus` 960→961, en `contingere` (1012) gespeld als *continuere*.

### 3. De app (VERBA)
Zelfde architectuur als FLUO: Leitner-boxen 0-5, XP/levels/combo/dagstreak, badges,
een collectie pixelfiguren, veroveringstoetsen, blitz, statistieken, backup.

Wat bewust anders is dan FLUO, en waarom:

- **Leerpakket.** 1051 woorden zijn geen 59 elementen. De leermotor werkt binnen een
  selectie van secties (§4.2). Voortgang is globaal per item, selectie niet — van pakket
  wisselen verliest dus niets.
- **Richtingen.** `L2N` (vertaling, 1051 items) en `L2V` (tweede vorm, 755 items) =
  **1806 leeritems**. NL→Latijn is bewust weggelaten; de itemsleutel `<nr>:<richting>`
  laat toe die later toe te voegen zonder de save te breken.
- **Geen vormvraag zonder vorm.** 296 woorden hebben alleen een woordsoortlabel
  (`(bijwoord)`, `(voorzetsel)`, …) in kolom 3; die krijgen nooit een `L2V`-vraag.
- **Macrons nooit verplicht** bij het typen. Ze staan wel altijd in de weergave.
- **Kernvisual** is een mozaïek van 1051 cellen (één per woord, gekleurd per caput)
  in plaats van het periodiek systeem.

### 4. Getest (headless Chromium, `file://`)
- **Invariant, 1806 items × 2 varianten, in soepele én strenge modus: 0 afwijkingen** —
  het antwoord dat de app zelf toont wordt altijd aanvaard, ook macronloos.
- Beoordeling: macronloos, met/zonder lidwoord, deelbetekenis, geslacht optioneel,
  tildevorm én uitgeschreven vorm, stamtijden, typfout → "bijna", onzin → fout.
- Afleiders over 300 trekkingen: geen duplicaten, nooit het juiste antwoord ertussen,
  altijd 3 stuks, bij `L2V` altijd dezelfde woordsoort.
- Ronde spelen, box-verloop, XP, badge- en tessera-ontgrendeling, persistentie over
  reload, sectie veroveren, blitz, flashcards, backup-roundtrip, corrupte save.
- **0 console-fouten, 0 netwerkrequests**, geen horizontale scroll op 360 px.

### 5. Bugs gevonden en gefixt tijdens het testen
1. **Volledige vertaling werd fout gerekend.** Bij `altus` — "hoog; diep" — werden alleen
   de losse betekenissen aanvaard, niet de volledige gedrukte string die de app zelf als
   modelantwoord toont. Opgelost in `maak-data.py`; afgedekt door de invariant-test.
2. **Strenge modus deed niets extra.** Die viel terug op dezelfde soepele antwoordlijst.
   Er zijn nu aparte canonieke lijsten (`tc`/`ac`); streng = zoals gedrukt, geen
   optioneel lidwoord, geen "bijna".
3. **Verlopen timer uit een afgebroken ronde spoelde de volgende ronde door.** Rondes
   hebben nu een token; geplande overgangen controleren dat ze nog bij de actieve ronde horen.
4. Collectie toonde tellers als "8/7" bij nog-vergrendelde steentjes; nu geklemd.

### 6. Visuele uitwerking (op vraag "maak het visueel aantrekkelijk")
De eerste versie was correct maar vlak. Volledige herwerking van de stylesheet, met
`FUNCTIONELE-SPECIFICATIE.md` §9.2 als vastlegging van wat er nu staat:

- Thema "Romeins mozaïek bij nacht": warme diepe ondergrond met drie radiale wassingen,
  gelaagde oppervlakken (verloop + rand + binnenrand), zachte slagschaduwen, hover-lift.
- Eén caputkleur per hoofdstuk, doorgetrokken naar het **accent van de vraag** (`--acc`).
- Goud alleen voor wat verdiend is: gouden mozaïekcellen met lichtpunt en gloed, XP-balk,
  streakbolletjes, behaalde badges.
- De vraag is nu de baas: 3,1 rem serif, optisch gecentreerd tussen balk en opties
  (`#scr-quiz` is een flexkolom met `margin:auto` rond het vraagblok).
- Meerkeuze-opties met genummerde badge; juist/fout krijgen een gekleurde gloed.
- Modal met achtergrondblur en scale-in, resultaatscherm met goudverloop op de score,
  dunne scrollbars, gouden focusring, `prefers-reduced-motion` gerespecteerd.

### 7. Verover opgeknipt in delen
Bij het nakijken van de schermen bleek sectie 1.0 **153 woorden** te tellen (het is de
herhalingslijst van vorige jaren) en 2.0 er 119. Een veroveringstoets van 153 getypte
vragen op 100 % is onhaalbaar; die twee secties waren daarmee dode content.

Secties worden nu geknipt in **delen van maximaal 25 woorden**, elk apart te veroveren:
**59 toetsen** over de 35 secties, grootste toets 25 vragen. Sleutel `"1.0/3"`.
Caput veroverd = alle delen van dat caput. Examen ontgrendelt op 59/59.

### 8. Romeins thema doorgetrokken, en de tool tot leven gebracht
Op de vraag om het thema over de hele tool door te trekken en er beweging in te brengen:

**Ornament** (§9.2.1 van de spec, alles zonder extern bestand): een meanderband als
data-URI-SVG onder de header en tussen de secties; caputs krijgen een **Romeins cijfer in een
medaillon** in hun eigen kleur; elk badge-icoon zit in een **lauwerkrans** die in JS als SVG
wordt opgebouwd; de introductiekaart wordt geflankeerd door zuilen; grote vlakken kregen een
mozaïekvloer-textuur van 2 %.

**Beweging** (§9.5): woord dat uit een blur opkomt, gestaffelde opties, groene rimpeling bij
juist, schudden bij fout, een gouden flits op de cel van een woord dat net goud werd, glans
over de XP-balk, ademend combovlammetje, tikkende blitzklok onder 10 s, level-up met
draaiende stralenkrans en confetti, en confetti bij een episch of legendarisch steentje.

**Twee uitknoppen.** De instelling *Animaties* zet alles stil via `html.geenanim`; daarnaast
zet `@media (prefers-reduced-motion: reduce)` élke duur op 1 ms, en `magBewegen()` kijkt in JS
naar beide. Getest: met de systeemvoorkeur aan is `animation-duration` 0.001s en wordt er geen
confetti-canvas meer aangemaakt.

### 9. Pixelfiguren opnieuw getekend
De 20 tesserae stonden op 12×12 en de helft was onherkenbaar. Werkwijze: alle rasters in een
Python-bestand, een contactblad naar PNG renderen en **er echt naar kijken**, dan bijtekenen.

- Raster van **12×12 naar 16×16**. Op 12 pixels werd de amphora een vlek en de adelaar een
  palmboom; op 16 lukt het wel.
- Drie ronden nodig. Na ronde 1 waren aquila, toga, lupa, phoenix en theatrum onbruikbaar;
  na ronde 2 nog toga (las als een parfumfles) en serpens (als een pijl). De toga werd
  uiteindelijk een staande figuur met een huidskleurig hoofd tegen wollen wit, met de rode
  clavus als band.
- Validator op elk raster: exact 16 rijen van 16 tekens, alleen tekens die in het palet staan.

### 10. Twee stille fouten die hierbij bovenkwamen
1. **Elk caput toonde dezelfde accentkleur.** De patch die `CAP_VAN` moest vullen had een
   verkeerde inspringing en matchte niet, dus de tabel bleef leeg en `capKleur()` viel altijd
   terug op terracotta. Zichtbaar geworden toen het Romeinse cijfer `undefined` toonde.
2. **De Tessera droeg het M-sprite.** De injectie van de nieuwe rasters zocht op `id:"mille"`,
   maar die id bestaat óók in de badgelijst, die eerder in het bestand staat; de regex liep
   van daar door tot het eerste `px:[…]` en schreef in het verkeerde vak. De injectie werkt nu
   strikt binnen het `TESSERAE`-blok.

Beide waren onzichtbaar in de tests en zijn gevonden door de schermen te bekijken.

### 11. Twee fouten waardoor het mozaïek voortgang verzweeg
Gemeld: "ik heb net een blitz gedaan van Caput 1.0 en er is maar één tegeltje gekleurd,
terwijl ik een aantal juist en een paar fout had." Nagespeeld in een test: het waren er
zelfs **nul**. Twee onafhankelijke oorzaken.

1. **De sterformule rondde naar beneden af.** `floor((box_L2N + box_L2V) / 2)` gaf voor een
   woord met `L2N=1` en `L2V=0` nul sterren. Omdat `L2V` pas meedoet als `L2N` box 2 haalt,
   stond élk woord waar hij net aan begonnen was in het mozaïek als "nooit gezien". Alleen
   woorden zonder tweede vorm (bijwoorden, voorzetsels) kleurden wel — vandaar dat ene tegeltje.
   Nu: goud blijft streng (alle richtingen op 5), 0 blijft voorbehouden aan "nog niets gedaan",
   en daartussen wordt naar boven afgerond met een deksel op 4. Getest over alle 36
   box-combinaties op strengheid van goud, op 0, en op monotonie.
2. **Juist antwoorden in Blitz deden niets op een ongezien woord.** De regel was "juist → box
   +1 alleen als het item due was", maar een item in box 0 is nooit due. Fout antwoorden zetten
   het item wél op box 1. Een blitz over verse leerstof strafte dus wel maar beloonde niet.
   Nu zet een eerste juist antwoord het item ook op box 1.

Na de fix kleuren alle 20 aangeraakte woorden uit de testblitz. Dat juist en fout er in het
mozaïek hetzelfde uitzien is wél correct: beide zetten het woord in box 1, dat is Leitner.

### 12. Afsluiting: documentatie nagelopen
Bij het afsluiten de spec tegen de werkelijke code gelegd en drie gaten gedicht die deze
sessie waren ontstaan:

- **Veldentabel §3.2** miste `tc` en `ac` — de canonieke antwoordlijsten die bij het
  invoeren van de strenge modus zijn toegevoegd.
- **Bouwproces §2.2** beschreef alleen `maak-data.py` → `bouw.py`; de sprite-stap via
  `tesserae/injecteer.py` ontbrak. Nu een tabel met "wat je wijzigt → wat je draait".
- **Grootte §2** stond nog op "~250 KB inline"; het is ~410 KB totaal, ~330 KB data.

Geen `README.md` of `CLAUDE.md` in dit project — de spec vervult die rol.

### Eindstand van de tests
Alle suites groen op de definitieve build:

| Test | Uitkomst |
| --- | --- |
| Invariant over 1806 items × macron/macronloos × soepel/streng | 0 afwijkingen |
| Afleiders, 300 trekkingen | geen duplicaten, nooit het juiste antwoord, altijd 3, soort klopt |
| Ronde, verover, blitz, flashcards, backup-roundtrip, corrupte save | OK |
| Mozaïekkleuring na blitz op vers pakket (smoke-4) | 20 van 20 woorden gekleurd |
| Sterformule over 36 box-combinaties (smoke-5) | goud alleen bij 5+5, 0 alleen bij 0+0, monotoon |
| Mozaïek van 1051 cellen renderen | 6-8 ms |
| Animaties uit / `prefers-reduced-motion` | alle duren 1 ms, geen confetti-canvas |
| Console-fouten · netwerkrequests · horizontale scroll op 360 px | 0 · 0 · geen |

### Openstaand
- De superscript ³ die in de scans bij veel woorden staat is niet overgenomen — betekenis
  onbekend. Zie §12 van de spec voor hoe je er een filter van maakt.
- De meanderband is een benadering van de Griekse sleutel, geen exacte klassieke meander.
