# Functionele specificatie — "VERBA"

**Een portable webapp om de Latijnse woordenschat te studeren**

| | |
|---|---|
| Versie | 1.5 |
| Datum | 13 september 2026 |
| Wijziging t.o.v. 1.4 | **Online modus** toegevoegd (nieuw hoofdstuk 13): centrale voortgang over meerdere toestellen, accounts met klascode + naam + PIN, meerdere klassen, een leesbaar logboek van alle spelers en hun acties. De app wordt vanaf nu in **twee builds** gemaakt uit hetzelfde `sjabloon.html` — offline (ongewijzigd, nul netwerkrequests) en online. Aangepast: §1.1, §2, §2.1, §2.2, §6.8, nieuw §8.5, §10, §11. Verantwoording en de meetresultaten op de echte hosting staan in `ONLINE-PLAN.md`. |
| Wijziging t.o.v. 1.3 | Codereview-fixes doorgevoerd (zie `Code_Review_Phase1_20260910_2217.md`). Normering §7.4 aangescherpt (haakjes, kommadelen, `?`). Save krijgt een `app`-marker (§8.2/§8.3). Due-criteria in §4.3 eenduidig gemaakt (**én**, niet óf). Levelformule §5.1 verduidelijkt, examen-XP in de tabel opgenomen, tessera-ontgrendeling na een veroveringstoets expliciet toegestaan (§5.7). |
| Wijziging t.o.v. 1.2 | Sterformule herzien (§5.4) en Blitz zet een ongezien item op box 1 (§6.5). Beide zorgden ervoor dat het mozaïek voortgang niet toonde. |
| Wijziging t.o.v. 1.1 | Romeinse ornamentlaag en beweging vastgelegd (§9.2, §9.5). Tesserae op 16×16 i.p.v. 12×12 (§5.7). |
| Wijziging t.o.v. 1.0 | Vormgeving uitgewerkt (§9.2). Veroveringstoetsen gaan per **deel** van max. 25 woorden i.p.v. per hele sectie (§6.6): sectie 1.0 telt 153 woorden. |
| Zusterproject | `periodiek_systeem` (FLUO). VERBA volgt bewust dezelfde architectuur, leermotor en gamification. Wie FLUO kent, kent VERBA. |
| Doelgroep app | Eén leerling, secundair onderwijs (België/Vlaanderen); in de online modus ook zijn klasgenoten (hoofdstuk 13) |
| Doelgroep dit document | Het implementatiemodel dat de app bouwt |
| Taal van de app | Nederlands |

---

## 0. Hoe dit document te lezen

Dit is een **volledige, uitvoerbare specificatie**. Alles wat hier staat is bindend, tenzij expliciet aangeduid als "optioneel" of "vrije invulling".

De woordenschat zelf staat **niet** in dit document maar in `woordenlijst.md` (bron van waarheid, mensleesbaar) en `latijn.json` (afgeleide, machineleesbaar). Zie §3.

---

## 1. Doel en context

Een leerling moet 1051 Latijnse woorden kennen uit zijn studieboek, verdeeld over 7 caputs en 35 secties. Per woord moet hij:

- de **Nederlandse vertaling** kunnen geven (`amīcus` → *de vriend*);
- de **tweede vorm** kunnen geven waar het boek er een opgeeft (`amīcus` → *amīcī*; `vidēre` → *vīdī, vīsum*; `bonus` → *bona, bonum*).

De woordenlijst is overgetypt uit scans van het boek en machinaal gecontroleerd tegen het alfabetisch register achteraan (zie de kop van `woordenlijst.md`).

De app moet:
- hem dit **aanleren**, niet alleen overhoren;
- **leuk en engagerend** zijn via gamification;
- **portable** zijn: draaien vanaf een USB-stick, in een browser, zonder installatie en zonder internet.

### 1.1 Wat de app expliciet **niet** doet

- Geen grammatica overhoren (naamvallen, tijden, zinsontleding).
- Geen woordsoort of geslacht apart overhoren (die worden wel getoond).
- Geen telemetrie, geen externe fonts, geen CDN's, geen trackers. In **geen enkele** build.
- Geen accounts, geen server en geen netwerk — dit geldt onverkort voor de **offline build**, die de standaard blijft. De **online build** (hoofdstuk 13) heeft wél accounts en een server, maar blijft offline-first: ze werkt volledig door zonder netwerk.
- Geen zinnen vertalen.

---

## 2. Technische randvoorwaarden (hard)

Identiek aan FLUO §2. De tabel hieronder geldt **onverkort voor de offline build**. De online build van hoofdstuk 13 wijkt op precies twee punten af — ze mag met haar eigen server praten (§13.4) en ze heeft een account (§13.2) — en is voor de rest hetzelfde bestand, uit dezelfde bron gebouwd (§2.2).

| Eis | Detail |
|---|---|
| **Deployment** | Eén map die op een USB-stick gekopieerd wordt. `index.html` dubbelklikken opent de app. |
| **Bestandsstructuur** | Eén enkel `index.html` met alle CSS, JS **en data** inline. |
| **Protocol** | Moet volledig werken over `file://`. Geen `fetch()`, geen `XMLHttpRequest`, geen service worker, geen ES-modules, geen dynamic `import()`. |
| **Afhankelijkheden** | Nul. Vanilla HTML/CSS/JS. Iconen als inline SVG of Unicode. Systeem-fontstack. |
| **Browsers** | Recente Chrome, Edge, Firefox. |
| **Grootte** | Richtwaarde < 1 MB. Nu ~410 KB, waarvan ~330 KB woorddata inline; dat is aanvaard. |
| **Responsive** | Laptop/desktop als referentie (1280×800), volledig bruikbaar op gsm in portret (360 px). Geen horizontale scroll van de pagina. |
| **Toetsenbord** | Volledig bedienbaar met toetsenbord (§9.3). |
| **Offline** | Absoluut alles offline. De offline build mag nooit een netwerkrequest doen; dat wordt afgedwongen met een test (§11.2 en §11.33), niet met een runtime-vlag. De online build praat uitsluitend met haar eigen API op `steeman.be` en met niets anders. |

### 2.1 Opslag

`localStorage`, één sleutel `verba.save.v1`, in **beide** builds. In de online build komt de server daar bovenop, niet in de plaats van (§13.5): eerst lokaal wegschrijven, dan pas synchroniseren. Werkt in de praktijk over `file://` in Chrome en Firefox maar is **niet gegarandeerd**. Daarom is de backup-export/import van §8.3 **verplicht**. De app moet correct blijven werken (met een waarschuwing) als `localStorage` gooit of leeg is.

### 2.2 Bouwproces

`index.html` wordt **gegenereerd**, niet met de hand onderhouden. `bouw.py` levert **twee** artefacten uit dezelfde bron:

```
woordenlijst.md  ──(maak-data.py)──▶  latijn.json  ──(bouw.py)──┬──▶ verba/index.html         (offline)
                                                   ▲            └──▶ verba-online/index.html  (online)
                                      sjabloon.html ┘   (alle CSS/JS, met /*__DATA__*/ placeholder)
                                                   ▲
             tesserae/rasters.py ──(tesserae/injecteer.py)──┘        (de 20 pixelfiguren)
```

De twee builds verschillen in één ding: de synccode van hoofdstuk 13. Die staat in `sjabloon.html` tussen de markers `/*__ONLINE_BEGIN__*/` en `/*__ONLINE_EINDE__*/` en wordt door `bouw.py` bij de offline build **fysiek uit het bestand geknipt**. Niet uitgeschakeld met een vlag — weggeknipt, zodat "nul netwerkrequests" een controleerbare eigenschap van het bestand blijft en niet van een `if` afhangt.

Twee bronnen, één artefact:

| Wat je wijzigt | Wat je draait |
|---|---|
| een woord in `woordenlijst.md` | `python3 maak-data.py && python3 bouw.py` |
| een pixelfiguur in `tesserae/rasters.py` | `cd tesserae && python3 contactblad.py` (kijken!) `&& python3 injecteer.py`, dan `cd .. && python3 bouw.py` |
| de app zelf in `sjabloon.html` | `python3 bouw.py` (bouwt beide builds) |

Beide artefacten worden mee ingecheckt. Reden: de 1051 woorden mogen maar op één plaats staan. Wie de woordenlijst corrigeert, draait de scripts opnieuw. `verba/index.html` is een build-artefact maar wordt **wel** mee ingecheckt, want dat is het ding dat op de stick moet staan.

---

## 3. Woorddata (bron van waarheid)

### 3.1 Bestanden

| Bestand | Rol |
|---|---|
| `woordenlijst.md` | **Bron van waarheid.** 1051 genummerde woorden in markdown-tabellen, gegroepeerd per caput (`## Caput n · Naam`) en sectie (`### n.m`). Mensleesbaar, met de conventies van het boek. |
| `latijn.json` | Afgeleide. Wordt gegenereerd door `maak-data.py`. Nooit met de hand bewerken. |
| `verba/index.html` | Afgeleide. De app, met `latijn.json` inline. |

### 3.2 Velden per woord in `latijn.json`

| Veld | Betekenis |
|---|---|
| `nr` | 1–1051, het nummer uit het boek. Uniek en stabiel; dit is de sleutel. |
| `w` | Het woord zoals het boek het drukt, inclusief `, ~ō` en `+ dat.` (bv. `crēdere, ~ō + dat.`) |
| `kop` | Het kale lemma zonder toevoegingen (bv. `crēdere`). Dit is wat als vraag getoond wordt. |
| `v` | De tweede kolom letterlijk zoals gedrukt (`avī`, `~a, ~um`, `ducis, m.`, `(bijwoord)`, of leeg) |
| `t` | De Nederlandse vertaling, letterlijk, met `;` tussen deelbetekenissen |
| `c` | Caput (bv. `Caput 1 · Geluk`) |
| `s` | Sectie (bv. `1.0 Deze woorden ken je zeker nog. (WV 1-13)`) |
| `soort` | `znw` · `adj` · `ww` · `geen` — zie §3.3 |
| `vol` | De tweede vorm met de tildes uitgeschreven (`~a, ~um` → `bona, bonum`). Alleen als `soort ≠ geen`. |
| `a` | Aanvaarde antwoorden voor de **vormvraag**, genormaliseerd — soepele modus |
| `ac` | Idem, maar alleen de canonieke vormen (gedrukt en uitgeschreven) — **strenge** modus |
| `ta` | Aanvaarde antwoorden voor de **vertaalvraag**, genormaliseerd — soepele modus |
| `tc` | Idem, canoniek: de volledige vertaling of één volledige deelbetekenis — **strenge** modus |

### 3.3 Woordsoort en drilbaarheid

`soort` wordt afgeleid uit `w` en `v`:

| soort | Herkenning | Aantal | Vraagzin |
|---|---|---:|---|
| `ww` | `w` bevat `, ~ō` / `~eō` / `~iō` / `~or` / `~ior` / `~eor` / `~ferō` / `~sum`, of is een onregelmatig werkwoord (`esse`, `posse`, `ferre`, `īre`, `velle`, `nōlle`, `mālle`, `fierī`, `coepisse`, `meminisse`, `nōvisse`, `ōdisse`, `inquit`, `ait`, en de samenstellingen van `esse`) | 245 | "Geef de stamtijden van …" |
| `adj` | `v` begint met `~a`/`~ae`/`~um`/`~,` of heeft de vorm `xxxa, xxxum`, of eindigt op `; …is` | 165 | "Geef de overige vormen van …" |
| `znw` | Al de rest met een echte vorm in `v` | 345 | "Geef de genitief van …" |
| `geen` | `v` is leeg **of** een woordsoortlabel tussen haakjes (`(bijwoord)`, `(voorzetsel)`, `(telwoord)`, …) | 296 | — geen vormvraag |

**Controle: 245 + 165 + 345 = 755 drilbare vormen; 755 + 296 = 1051.** ✔

Een `geen`-woord krijgt **nooit** een vormvraag. Het label uit `v` wordt wel getoond op de woordkaart en op de introductiekaart, want "(voorzetsel)" is nuttige informatie.

### 3.4 Tilde-uitschrijving

Het boek kort af met `~`: die staat voor het lemma minus zijn uitgang (`bonus` + `~a` → `bona`). Een **losse** `~` staat voor het hele lemma (`fortis` → `~, forte` → `fortis, forte`).

Twee gevallen volgen die regel niet en staan als expliciete uitzondering in `maak-data.py`:

| nr | Boek drukt | Uitgeschreven | Waarom |
|---|---|---|---|
| 1015 `ūnus` | `ūnus, ~a, ~um; ~ūnius` | `ūnus, ūna, ūnum; ūnīus` | De `~` voor `ūnius` is een drukfout in het boek; de genitief is `ūnīus`. |
| 1016 `duo` | `~ae, ~o` | `duae, duo` | De stam is `du`, niet `duo`. |

Bij het beoordelen wordt **zowel de gedrukte als de uitgeschreven vorm** aanvaard.

---

## 4. Kernconcept en leermotor

### 4.1 Twee leerrichtingen

- **`L2N`** (Latijn → Nederlands): "Wat betekent `amīcus`?" → *de vriend*. **1051 items.**
- **`L2V`** (Latijn → vorm): "Geef de genitief van `amīcus`" → *amīcī*. **755 items** (alleen waar `soort ≠ geen`).

**Totaal 1806 leeritems.** Beide richtingen hebben hun eigen voortgang.

`L2V` van een woord komt pas in aanmerking wanneer `L2N` van datzelfde woord **box ≥ 2** bereikt heeft: eerst weten wát het betekent, dan pas de vorm.

### 4.2 Leerpakket (scope) — het grote verschil met FLUO

1051 woorden zijn te veel om als één hoop te leren, en een schooltoets gaat altijd over een deel. Daarom werkt de leermotor **uitsluitend binnen het actieve leerpakket**.

- Het leerpakket is een **selectie van secties**. De leerling kiest die op het thuisscherm via een selector met de 7 caputs, elk uitklapbaar naar hun secties; per caput en per sectie een vinkje, plus "alles" en "niets".
- Het leerpakket zit in `settings.pakket` als lijst sectiesleutels.
- **De voortgang is globaal, de selectie niet.** Boxen worden per `nr:richting` bewaard, los van welk pakket actief was. Van pakket wisselen verliest dus nooit iets, en een woord dat in twee toetsen voorkomt hoeft maar één keer geleerd te worden.
- Standaard bij een leeg profiel: **de secties van Caput 1**.
- Is het pakket leeg, dan start er geen ronde en zegt de app dat, met een knop naar de selector.
- De header toont altijd compact wat actief is (bv. *"Caput 1 · 259 woorden"* of *"3 secties · 78 woorden"*).

### 4.3 Leitner-systeem (spaced repetition)

Identiek aan FLUO §4.2. Elk leeritem zit in box 0 t/m 5:

| Box | Betekenis | Wachttijd voor herhaling |
|---|---|---|
| 0 | Nog nooit gezien | n.v.t. (kandidaat om te introduceren) |
| 1 | Net geleerd / recent fout | direct herbruikbaar, minstens 4 andere vragen ertussen |
| 2 | Wankel | na ≥ 6 andere vragen **én** ≥ 10 minuten |
| 3 | Redelijk | na ≥ 20 andere vragen **én** ≥ 1 dag |
| 4 | Goed | na ≥ 40 andere vragen **én** ≥ 3 dagen |
| 5 | Beheerst ("goud") | na ≥ 70 andere vragen **én** ≥ 7 dagen |

- Juist → box + 1 (max 5).
- Fout → terug naar **box 1** (niet naar 0).
- "Bijna juist" (§7.4) → box blijft gelijk, telt niet als fout.
- Een item is **due** als de wachttijd verstreken is; er gelden **beide** criteria (aantal vragen én tijd). Box 1 kent geen tijdgrens, alleen de vier tussenliggende vragen.
- **Vervroegd** heet een item dat de vragendrempel wel haalt maar de tijdgrens nog niet. Zo'n item mag gesteld worden wanneer het alternatief een herhaling binnen dezelfde ronde is (§4.5), niet eerder.

### 4.4 Introductietempo — adaptief

Het tempo waarmee nieuwe woorden binnenkomen (en dus ook hoeveel er herhaald wordt) past
zich aan het antwoordgedrag aan. Wie vlot en juist antwoordt krijgt sneller nieuw
materiaal; wie worstelt krijgt minder nieuw en meer herhaling.

**Vlotheidsscore per antwoord** (`v`, tussen 0 en 1), alleen in de modus "Verder leren" /
"Zwakke plekken" en alleen op echte vragen (niet op de introductiekaart, niet in Blitz,
Verover of het examen):

| Uitkomst | `v` |
|---|---|
| Fout of "ik weet het niet" | `0` |
| Bijna (alleen in strenge modus) | `0,35` |
| Juist | `1` bij ≤ de snelgrens, `0,5` bij ≥ de traaggrens, lineair ertussen |
| Tikfout | als "juist", maal `0,9` |

De grenzen hangen af van de vraagvorm, want typen duurt nu eenmaal langer dan klikken:

- **Meerkeuze**: snelgrens 4 s, traaggrens 10 s.
- **Typen**: snelgrens `3 s + 0,22 s per teken` van het verwachte antwoord, traaggrens
  `2,2 ×` de snelgrens. (Zonder die lengtecorrectie wordt een lange vertaling altijd als
  "traag" gelezen.)
- Antwoordtijden boven 60 s tellen als 60 s: dat is geen traagheid meer maar een pauze.

**Tempo-index `T`**: een voortschrijdend gemiddelde van `v`, `T ← T + 0,15·(v − T)`,
startwaarde `0,5`. Dat is een geheugen van ruwweg de laatste twaalf antwoorden — traag
genoeg om niet op één misser te schrikken, snel genoeg om binnen een ronde te reageren.
`T` staat in het profiel en overleeft dus het afsluiten (§8.2).

**Wat `T` stuurt:**

| | Traag (`T` laag) | Gemiddeld | Vlot (`T` hoog) |
|---|---|---|---|
| Items tegelijk in de lucht | 5 | 10 | 14 |
| Herhalingsvenster (§4.5) | 4 woorden | 5 | 6 |

- Plafond: `L = afronden(5 + 9·T)`, geklemd op **5 … 14**.
- Venster: `T < 0,4` → 4; `0,4 ≤ T < 0,7` → 5; `T ≥ 0,7` → 6.
- Het plafond stuurt alleen hoeveel nieuw materiaal erbij mag. De herhaling volgt
  vanzelf: komt er minder nieuw bij, dan vult het algoritme (§4.5) de ronde met due- en
  onderhoudsvragen.

**Instelling** (§6.8) `tempo`: `auto` (standaard, het bovenstaande), of een vaste keuze
`rustig` (5), `normaal` (10), `snel` (14). Bij een vaste keuze blijft het venster 5 en
wordt `T` nog wel bijgehouden (alleen niet gebruikt), zodat terugzetten op `auto` meteen
een zinnig getal heeft.

- Maximaal **`L` items tegelijk in de lucht** (box 1 of 2), geteld **binnen het actieve pakket**.
- Nieuwe items worden geïntroduceerd op **woordnummer**, oplopend: dat is de volgorde van het boek en dus de volgorde waarin de leerkracht de leerstof gaf.
- Per woord altijd eerst `L2N`, daarna pas `L2V` (§4.1).

### 4.5 Vraagkeuze-algoritme (per vraag)

Twee begrippen sturen het geheel:

- **Herhalingsvenster**: een woord komt pas terug nadat er **`V` andere woorden** gesteld zijn; `V` is 4, 5 of 6 en volgt het tempo (§4.4).
- **Rondecap**: binnen één ronde komt hetzelfde woord **hoogstens 2 keer** aan bod, in welke richting ook.

```
1. Beperk alles tot items van woorden in het actieve pakket.
2. Verzamel per soort: due, vervroegd (§4.3), en onderhoud (box >= 4).
3. Probeer in deze volgorde, telkens alleen woorden die deze ronde nog niet
   gesteld zijn en buiten het herhalingsvenster liggen:
     a. een due item, gewogen willekeurig, gewicht = (6 - box);
     b. een introductie uit box 0 op woordnummer, als er < `L` items in de lucht zijn (§4.4);
     c. een onderhoudsvraag uit box 4 of 5;
     d. een vervroegd item, gewogen als in (a).
4. Pas als dat alles niets oplevert mag herhaald worden: opnieuw (a), (d), (c),
   nu met de rondecap en een venster dat krimpt van 3 naar 2 woorden.
5. Levert ook dat niets op, dan liever een nieuwe introductie — ook boven het
   plafond van tien — dan een derde beurt voor hetzelfde woord.
6. Laatste redmiddel: om het even welk item behalve dat van de vorige vraag.
```

Extra regels:
- **Nooit twee keer na elkaar hetzelfde woord**, ook niet in de andere richting; ook een introductie mag het herhalingsvenster niet doorbreken (de vormvraag van een woord volgt dus nooit meteen op zijn betekenisvraag).
- Binnen één ronde gaat vers materiaal voor; een item dat deze ronde fout ging blijft wel meteen in aanmerking komen.
- Blitz (§6.5) respecteert hetzelfde herhalingsvenster.

> Waarom zo streng: met hoogstens tien items in de lucht en een vensterregel van één
> vraag kwam hetzelfde woord in een ronde van vijftien vragen drie tot vijf keer terug.
> Dat voelt als vastzitten. Liever een nieuw woord of een vervroegde herhaling.

### 4.6 Vraagvorm: meerkeuze of typen

De vorm hangt niet alleen aan de box. Binnen één sessie is box 2 zelden due (tien
minuten wachttijd), dus wat terugkomt is bijna altijd box 1 — die alle meerkeuze
maken, maakte van elke ronde één grote meerkeuzetoets. Daarom drie regels samen:

| Situatie | Vorm |
|---|---|
| Box 0 (allereerste keer) | **Introductiekaart** — geen vraag (§7.1) |
| Eerste vraag na de introductiekaart | **Meerkeuze**, 4 opties |
| Box ≥ *typdrempel* | **Typen** |
| Box 1, direct na een misser in deze ronde | **Meerkeuze** (steun) |
| Box 1, na *mc-max* meerkeuzes op rij voor dat item | **Typen** |
| Box 1, overige gevallen | **Typen** zolang het typ-aandeel van de ronde onder de ondergrens ligt, anders meerkeuze |
| Blitz (§6.5) | altijd meerkeuze |
| Verover (§6.6) | altijd typen |

De instelling **"Hoeveel zelf typen"** (§6.8) zet de drie parameters:

| Instelling | Ondergrens typ-aandeel | mc-max per item | Typdrempel |
|---|---|---|---|
| Weinig | 25 % | 3 | box 3 |
| Gemiddeld (standaard) | 50 % | 2 | box 2 |
| Veel | 75 % | 1 | box 2 |

- De teller voor "meerkeuzes op rij" hoort bij het item en gaat terug naar nul bij een introductie en bij elke fout. Zo blijft de opbouw herkennen → produceren, zonder dat een woord er blijft in hangen.
- De ondergrens is een ondergrens, geen doel: getypte box-vragen tellen mee, dus in de praktijk ligt het aandeel hoger.
- Dit geldt evengoed in **Zwakke plekken** (§6.4), waar vroeger vrijwel alles meerkeuze was omdat zwakke items per definitie in een lage box zitten.

---

## 5. Gamification

### 5.1 XP en levels

| Gebeurtenis | XP |
|---|---|
| Juist, meerkeuze | 10 |
| Juist, getypt | 20 |
| Juist bij eerste poging na introductie | +5 bonus |
| Item bereikt box 5 voor het eerst | +50 |
| Combo-multiplier | §5.2 (vermenigvuldigt bovenstaande) |
| Ronde afgewerkt | +25 |
| Ronde 100 % juist | +50 extra |
| Sectie veroverd (§6.6) | +200 |
| Caput veroverd (alle secties) | +500 |
| Examen gehaald (§6.6, eerste keer) | +1000 |
| Dagstreak-bonus | +10 × streak (max +100), één keer per dag |
| Fout antwoord | 0 (nooit negatief) |

**Levels** — 20, genoemd naar Romeinse rangen die oplopen in gewicht. Level n+1 wordt
bereikt bij `100 × n × (n+1) / 2` XP: level 2 op 100 XP, level 3 op 300, level 4 op 600, …
("Ronde 100 % juist" betekent: geen fout **én** geen bijna-antwoorden.)

1. Discipulus · 2. Puer · 3. Scrība · 4. Mercātor · 5. Nauta · 6. Mīles · 7. Eques · 8. Centuriō · 9. Sacerdōs · 10. Magister · 11. Poēta · 12. Rhētor · 13. Senātor · 14. Praetor · 15. Cōnsul · 16. Prīnceps · 17. Imperātor · 18. Caesar · 19. Augustus · 20. Iuppiter

Level-up is een zichtbaar moment: overlay, animatie, geluid.

### 5.2 Combo

Zoals FLUO: 1–2 juist = ×1 · 3–5 = ×1,5 · 6–9 = ×2 · 10–14 = ×2,5 · 15+ = ×3. Eén fout → 0. Een "bijna" breekt de combo niet.

De combo hoort bij de leerling, niet bij de ronde: hij **loopt door** van de ene ronde naar de volgende — en over het afsluiten van de app heen — en breekt **alleen** op een fout antwoord (ook op "Ik weet het niet"). Een ronde afbreken breekt hem dus niet.

Blitz (§6.5) en de veroveringstoets (§6.6) tellen hun eigen combo, die op 0 begint en de leercombo ongemoeid laat.

### 5.3 Dagstreak

Kalenderdag, lokale tijd. Een dag telt zodra hij **één volledige ronde** afwerkt. Eén dag overslaan = terug naar 0, mild gemeld.

### 5.4 Mastery-sterren per woord

Per **woord** een score 0–5 over alle richtingen die dat woord heeft:

```
boxen = de box van elke richting van dit woord   (1 of 2 waarden)

alle boxen == 5      -> 5   (goud)
alle boxen == 0      -> 0   (nooit gezien)
anders               -> min(4, max(1, afronden_boven(gemiddelde(boxen))))
```

Drie eigenschappen die moeten gelden, en die getest worden:

1. **Goud is streng**: 5 sterren betekent dat élke richting van dat woord op box 5 staat.
   Een woord met `L2N=5` en `L2V=4` is 4 sterren, geen goud.
2. **0 is zeldzaam**: alleen een woord waar nog geen enkele richting van beantwoord is,
   staat op 0. Zodra hij één antwoord gaf, kleurt het woord.
3. **Monotoon**: een box die stijgt kan het sterrenaantal nooit doen dalen.

> Naar boven afronden en niet naar beneden. Met afronden naar beneden gaf een woord met
> `L2N=1` en `L2V=0` nul sterren, en stond een woord waar hij net mee bezig was in het
> mozaïek als "nooit gezien". Dat maakte de kernvisual onbetrouwbaar.

5 sterren = **goud**. Dit voedt de kleuring van het mozaïek (§6.1).

### 5.5 Badges

| Badge | Voorwaarde |
|---|---|
| **Prīmus gradus** | Eerste ronde afgewerkt |
| **Caput I** | Alle woorden van Caput 1 op goud |
| **Caput II** | Alle woorden van Caput 2 op goud |
| **Caput III** | Alle woorden van Caput 3 op goud |
| **Caput IV** | Alle woorden van Caput 4 op goud |
| **Caput V** | Alle woorden van Caput 5 op goud |
| **Caput VI** | Alle woorden van Caput 6 op goud |
| **Caput VII** | Alle woorden van Caput 7 op goud |
| **Centum** | 100 woorden op goud |
| **Quīngentī** | 500 woorden op goud |
| **Mīlle** | 1000 woorden op goud |
| **Vlekkeloos** | Een ronde van 15 vragen 100 % juist |
| **Sneltrein** | 10 juiste antwoorden binnen 60 s in Blitz |
| **Combo ×3** | Combo-multiplier ×3 bereikt |
| **Week vol** | Dagstreak van 7 |
| **Doorbijter** | Dagstreak van 21 |
| **Blindtypist** | 25 getypte antwoorden juist op rij |
| **Vormvast** | 200 vormvragen (`L2V`) juist |
| **Veroveraar** | Alle 59 veroveringstoetsen veroverd |
| **Nachtbraker** | Een ronde afgewerkt tussen 23:00 en 05:00 |

Zichtbaar in een eigen scherm; nog niet behaalde badges grijs maar mét hun voorwaarde.

### 5.6 Toetsdatum en dagdoel

Zoals FLUO §5.6, maar gerekend **binnen het actieve leerpakket**:

```
nog_te_leren = woorden in het pakket die nog niet op goud staan
dagen_over   = max(1, dagen tot toetsdatum)
dagdoel      = afronden_boven( nog_te_leren / dagen_over )
```

Header toont "nog 9 dagen". Dagdoel als *"Vandaag 24 woorden op goud krijgen om op tijd klaar te zijn."* met voortgangsbalk. Datum voorbij → aftelling stil verbergen.

### 5.7 Collectie — 20 mozaïeksteentjes

Naast badges verzamelt hij **20 pixelfiguren** in Romeinse stijl ("tesserae"), elk een **12×12 raster** getekend op een `<canvas>` (geen afbeeldingsbestanden), via `toDataURL()` als `<img>` in de pagina gezet.

- Elk steentje heeft een Latijnse naam, een **zeldzaamheid** (gewoon · zeldzaam · episch · legendarisch), een droog zinnetje flavourtekst en één ontgrendelvoorwaarde.
- Voorwaarden zijn resultaatgebonden en gespreid: woorden op goud (10, 50, 150, 300, 600, 1051), veroverde secties en caputs, level, combo, dagstreak, blitzrecord, aantal juiste vormvragen, totaal aantal juiste antwoorden.
- Ontgrendelen gebeurt bij het **einde van een ronde, blitz of veroveringstoets**, **hoogstens één per keer**. Zijn er twee kandidaten (bv. level-up én onthulling), dan wacht de tweede tot de eerste afgesloten is.
- Onthullingsscherm met het steentje groot, naam, zeldzaamheid en flavourtekst; confetti bij episch/legendarisch.
- Scherm **Collectie**: raster van 20, voortgangsbalk "x van 20". Niet-gevangen steentjes als donker silhouet met hun voorwaarde en, waar het een teller is, de stand (bv. "150 woorden op goud **88/150**").
- Zit in de save onder `tesserae` en dus in de backup.

---

## 6. Schermen en modi

### 6.0 Globale layout

- **Header** (altijd zichtbaar): levelnaam + XP-balk, dagstreak-vlam, actief pakket, aftelling naar toets (indien ingesteld), instellingen-icoon.
- **Thuisscherm**:
  - Grote primaire knop **"Verder leren"**;
  - De **pakketselector** (§4.2), compact;
  - Het **mozaïek** (§6.1) als centrale visual;
  - Kleinere ingangen naar Zwakke plekken, Ontdek, Blitz, Verover, Badges, Collectie, Statistieken.
- Alle modi zijn altijd toegankelijk, niets zit achter een slot.
- **Uitlegtekst bij aanwijzen** (`title`): elke klikbare ingang op het thuisscherm zegt in
  één zin wat ze doet — Verder leren, Zwakke plekken, het mozaïek, Verover, Blitz, Ontdek,
  Badges, Collectie en Statistieken. Bedoeld voor wie een knop niet herkent; de app blijft
  ook zonder die tekst te bedienen (geen informatie zit er *alleen* in).
- **Colofon** (voettekst, onder alle schermen, altijd zichtbaar): één regel in kleine,
  gedempte letters — `© 2026 Robbe en David Steeman`, de licentie **CC BY-NC-SA 4.0**
  met link naar de licentietekst, en een link naar de GitHub-repository. De links zijn
  gewone `<a href>`-verwijzingen: ze doen niets uit zichzelf en breken de
  nul-netwerkrequests-eis (§2) dus niet. De voettekst mag de inhoud nooit overlappen
  en verdwijnt niet op mobiel.

### 6.1 Het mozaïek (kernvisual)

Het equivalent van FLUO's periodiek systeem: **1051 kleine cellen**, gegroepeerd per caput met sectiekopjes, elk woord één cel.

| Sterren | Weergave |
|---|---|
| 0 | Donkere cel, doffe rand |
| 1–2 | Zwak gloeiende rand in de caputkleur |
| 3–4 | Volle caputkleur als achtergrond |
| 5 (goud) | Gouden achtergrond + subtiele glans |

- Woorden **buiten** het actieve pakket staan gedimd (lage opacity), zodat hij ziet waar hij nu aan werkt. Ze blijven wel klikbaar.
- Elk caput heeft zijn eigen accentkleur, zodat het mozaïek leesbaar blijft.
- Klikken op een cel opent de **woordkaart**: nummer, woord zoals gedrukt, tweede vorm (gedrukt én uitgeschreven), vertaling, caput/sectie, woordsoort, sterren, en de statistiek per richting (juist/fout).
- Onder het mozaïek: **"312 van 1051 op goud"** met voortgangsbalk, plus dezelfde teller voor het actieve pakket.
- Op smalle schermen schaalt de celgrootte mee; het mozaïek scrollt **binnen zijn eigen container**, nooit de pagina.

> Dit is de emotionele kern: hij ziet zijn hele woordenlijst langzaam goud worden.

### 6.2 Modus "Verder leren" (standaardmodus)

Eén **ronde = 15 vragen** (instelbaar 10/15/20), ~3–5 minuten. Vragen uit de leermotor van §4.

1. Vraagteller "3 / 15" en dunne voortgangsbalk.
2. Per vraag: zie §7.
3. Na afloop: **rondeoverzicht** — score, XP incl. bonussen, comborecord, welke woorden omhoog gingen (met sterretjes-animatie), nieuwe badges, dagdoelstatus.
4. Knoppen: **"Nog een ronde"** (primair) en "Terug naar menu".

Afbreken mag altijd; beantwoorde vragen blijven bewaard, rondebonussen niet.

### 6.3 Modus "Ontdek"

Vrij bladeren, geen scoring.

- Lijstweergave van de woorden in het actieve pakket (of alles, filterbaar), sorteerbaar op nummer, alfabetisch op Latijn, alfabetisch op vertaling, of op mastery (zwakste eerst).
- Filter: alle / alleen nog-niet-goud / alleen zelfstandige naamwoorden / bijvoeglijke / werkwoorden / zonder vorm.
- Zoekveld dat zowel Latijn als Nederlands doorzoekt, macron-ongevoelig.
- **"Overloop ze"**: flashcards door de gefilterde selectie (woord → tik → vertaling + vorm), met pijltjestoetsen. Voor de laatste 10 minuten voor de toets.

### 6.4 Modus "Zwakke plekken"

Zoals FLUO §6.4, binnen het actieve pakket. Vooraf opgebouwde lijst, **niet** de vraagkeuze van §4.5:

```
1. Rangschik alle items van woorden die nog niet op goud staan, op zwakte:
   box * 10 - fout * 3, laagste eerst. Items in box 0 vallen af.
2. Neem één item per woord, van zwak naar sterk, tot de rondelengte bereikt is.
3. Alleen als er te weinig zwakke woorden zijn, vul aan met de tweede richting.
4. Schud de lijst.
```

Staat alles op goud of is er nog niets geoefend, dan meldt de app dat en start er geen ronde.

### 6.5 Modus "Blitz" (60 seconden)

- 60 seconden, zoveel mogelijk juiste antwoorden, altijd **meerkeuze**, uit het actieve pakket, beide richtingen door elkaar.
- Juist: +1, onmiddellijk door. Fout: −2 seconden, rode flits, juiste antwoord 800 ms zichtbaar.
- Combo-multiplier werkt en is groot zichtbaar.
- Einde: score, **persoonlijk record**, "Nieuw record!"-animatie.
- Blitz beïnvloedt de boxen met **halve impact**:
  - juist → box +1 als het item **due** was **of als het nog in box 0 stond**;
  - fout → box naar max(1, box−1).

  De toevoeging "of box 0" is nodig: een item dat nog nooit gezien is, is per definitie niet
  due, dus zonder die regel leverde een juist antwoord in Blitz niets op terwijl een fout
  antwoord het item wél op box 1 zette. Een hele blitz over verse leerstof gaf dan geen
  enkele zichtbare voortgang.

### 6.6 Modus "Verover" (secties en caputs)

De secties lopen sterk uiteen in grootte: 1.0 telt 153 woorden, 2.0 telt er 119, terwijl
de mediaan op 20 ligt. Een toets van 153 vragen op 100 % is geen toets meer maar een straf.
Daarom wordt een sectie voor deze modus geknipt in **delen van maximaal 25 woorden**,
zo gelijk mogelijk verdeeld (153 → 7 delen van 22). Secties tot 25 woorden blijven één
geheel. Dat geeft **59 veroveringstoetsen** over de 35 secties.

De sleutel van een deel is `"1.0/3"`; van een ongedeelde sectie gewoon `"1.0"`.

Per **deel** een veroveringstoets:

- Alle woorden van het deel, richting **`L2N`**, willekeurige volgorde, altijd **typen**.
- Geen hints, geen tweede kansen, geen tussentijdse feedback.
- **Slaagdrempel: 100 %.** Alles juist = sectie **veroverd**, +200 XP, gouden rand op het overzicht.
- Niet gehaald: toon exact welke **niet juist** waren (fout én bijna — een bijna haalt de 100 % evenmin), met een knop "Oefen deze nu" die er een gerichte ronde van maakt.
- Een veroverd deel kan opnieuw gespeeld worden (geen extra XP).
- Alle delen van een caput veroverd → **caput veroverd**, +500 XP.
- Alle 59 toetsen veroverd → **EXAMEN** ontgrendelt: 60 willekeurige items uit de volledige leerstof, beide richtingen, typen, 100 % nodig. Resultaat als diploma-achtig scherm.

Het overzichtsscherm toont de 7 caputs, elk uitklapbaar naar hun secties, met per sectie de status (niet gespeeld / beste score / veroverd) en het aantal woorden.

### 6.7 Scherm "Statistieken"

- Aantal woorden per sterrenniveau (staafje).
- Totaal juist/fout, **accuraatheid** in %, apart voor `L2N` en `L2V`. (De term is bewust "accuraatheid", niet "accuratesse".)
- De 8 woorden waar hij het vaakst op struikelt ("jouw valkuilen"), met foutpercentage.
- Voortgang per caput als balkjes.
- Totale oefentijd, aantal rondes, langste combo, Blitz-record.
- Streakgeschiedenis van de laatste 30 dagen als bolletjes.

### 6.8 Scherm "Instellingen"

- Toetsdatum (leegmaakbaar).
- Geluid aan/uit (standaard aan).
- Animaties aan/uit (standaard aan; respecteert ook `prefers-reduced-motion`).
- Rondelengte: 10 / 15 / 20 (standaard 15).
- Strengheid bij typen: "soepel" (standaard) of "streng" (§7.4).
- Hoeveel zelf typen: "weinig" / "gemiddeld" (standaard) / "veel" (§4.6).
- **Leertempo**: `auto` / `rustig` / `normaal` / `snel` (§4.4), met de huidige stand eronder.
- **App downloaden**: bewaart de **offline build** (`verba-offline.html` naast de app, opgeslagen als `verba.html`) — niet de pagina zelf, want die draagt in de online modus geen woorddata (§13.2a). Alleen zichtbaar wanneer de app van een webserver komt — draait ze al over `file://`, dan valt er niets te downloaden en blijft het blok verborgen. Het is een gewone downloadlink naar het eigen bestand, dus geen achtergrondverkeer: er gebeurt alleen iets als hij klikt.
- **Leertempo**: het huidige plafond uit §4.4 als getal ("nieuwe woorden tegelijk"), zodat zichtbaar is dat de app meebeweegt.
- **Backup opslaan** / **Backup laden** (§8.3).
- **Account** — alleen in de online build (§13.2). Toont in welke klas je zit en onder welke naam, de stand van de synchronisatie ("alles bewaard" / "nog X te versturen" / "geen verbinding — wordt later verstuurd"), een knop **Nu synchroniseren**, en **Afmelden op dit toestel**. Afmelden wist het token en laat de lokale voortgang staan.
- **Alles wissen** met dubbele bevestiging. In de online build wist dit alleen dit toestel; het account op de server blijft. Wie zijn account écht wil laten verwijderen, vraagt dat aan de beheerder (§13.8).

---

## 7. De vraag-interactie in detail

### 7.1 Introductiekaart (box 0)

Geen vraag maar een leermoment:

```
        amīcus                  NIEUW
        amīcī                   (zelfstandig naamwoord)

        de vriend

        Caput 1 · 1.0    woord 2

     [ Begrepen → ]   (of spatiebalk)
```

Toont woord, tweede vorm (uitgeschreven), vertaling, caput/sectie en woordnummer. Na "Begrepen" gaat het item naar box 1 en komt het binnen dezelfde ronde terug als meerkeuze.

### 7.1.1 De vraagkop (bij elke vraag)

Boven het Latijnse woord staat de **vraagsoort als een duidelijk zichtbare badge**, niet
als klein bijschrift. De twee richtingen zijn op drie manieren uit elkaar te houden:

| Richting | Badge | Kleur |
|---|---|---|
| `L2N` | 📜-icoon (volumen, papyrusrol) + Wat **BETEKENT** | blauw (`#5b89ae`-familie) |
| `L2V` | zuil-icoon (Romeinse kolom) + Geef de **GENITIEF** van (resp. **OVERIGE VORMEN** / **STAMTIJDEN**) | goud (`--goud`) |

Het kernwoord van de vraag staat vet, in hoofdletters en onderstreept. Reden: met een klein
bijschrift in de caputkleur werd de vraag overgeslagen en antwoordde de leerling de
vertaling op een vormvraag. De badge mag nooit de caput-accentkleur overnemen — dan valt het
onderscheid tussen de richtingen weg.

De iconen zijn **inline SVG in de lijnstijl van de app** (`stroke:currentColor`, geen
emoji): emoji vallen buiten het Romeinse thema en renderen per platform anders. Ze erven
de kleur van de badge, dus ze hoeven niet apart gethematiseerd te worden.

### 7.2 Meerkeuzevraag

```
Wat betekent  amīcus ?

   [ de vriend ]  [ de vijand ]  [ de grootvader ]  [ het volk ]
```

- 4 opties, 1 juist, willekeurige volgorde, bedienbaar met **1–4** en met de muis.

**Morfologische afleiders bij een vormvraag (`L2V`)** — die komen *niet* van andere woorden, maar van het gevraagde woord zelf: dezelfde stam, andere maar plausibele uitgangen. Vormen van vreemde woorden maakten de vraag te makkelijk — bij `lītus` stond er één optie met de stam `lītor-` tussen drie vreemde stammen, en die herkende hij zonder de uitgang te kennen. Zo is de **uitgang** de leerstof en niet de stam.

```
Geef de genitief van      amīcus ?    [ amīcī ]  [ amīcae ]  [ amīcis ]  [ amīcūs ]
Geef de overige vormen van  gravis ?  [ gravis, grave; gravis ]  [ grava, gravum ]
                                      [ gravēs, gravia; gravium ]  [ gravior, gravius; graviōris ]
Geef de stamtijden van    vidēre ?    [ vīdī, vīsum ]  [ viduī, viditum ]
                                      [ vidēvī, vidētum ]  [ vīsī, vīsum ]
```

- **Zelfstandige naamwoorden** — de uitgang van het juiste antwoord bepaalt de tegenkandidaten: enkelvoud `-ae / -ī / -is / -ūs` (en `-ēī` pas als vierde keuze), meervoud `-ārum / -ōrum / -ium / -um`. De eigen uitgang valt weg.
  Bij een **stamverandering** (`lītus → lītoris`, `ōrdō → ōrdinis`) krijgt hoogstens één afleider de nominatiefstam (`lītī`, `ōrdae`); anders zou de stamwissel zelf het antwoord verklappen, terwijl de rest op de genitiefstam blijft staan.
  Het geslachtsachtervoegsel (`, m.` / `, v. mv.`) staat bij élke optie, nooit alleen bij het juiste antwoord.
- **Bijvoeglijke naamwoorden** — het juiste antwoord verraadt het paradigma, dus de afleiders zetten dezelfde stam in een ánder paradigma dat hij kent: `bona, bonum` ↔ `bonis, bone; bonis` ↔ `bonae, bona` ↔ `bonum, bona` (omgekeerde volgorde) ↔ `bona, bonum; bonīus` (type `nūllus`) ↔ `bonēs, bona; bonium` (meervoud) ↔ `bonior, bonius; boniōris` (vergrotende trap).
  Waar de stam van de nominatief verschilt (`sacer → sacra`, `atrōx → atrōcis`) staat er altijd één afleider bij die die wissel *niet* maakt: `sacera, sacerum`, `atrōx, atrōx; atrōxis`.
- **Werkwoorden** — de onregelmatige perfectumstam ís de leerstof, dus de afleiders regulariseren precies dat: de stamtijden zoals ze eruit zouden zien als het werkwoord braaf zijn vervoeging volgde (`vidēre → viduī, viditum`, `vidēvī, vidētum`), plus de ene stamtijd gevormd uit de andere (`vīsī, vīsum`, `vīdī, vīditum`). Deponentia variëren op het participium (`secūtus sum → sequītus sum`, `sequtus sum`), werkwoorden zonder supinum houden de `-` (`ārsī, - → ārduī, -`).
- Een afleider moet als Latijn kúnnen klinken: een medeklinkergroep of een dubbele letter die niet in het woord zelf voorkomt (`movsī`, `expellsī`, `horttus`) wordt verworpen — wat hij nooit voor een echte vorm houdt, is geen afleider.
- Een afleider is nooit gelijk aan het juiste antwoord, ook niet in een andere aanvaarde spelling of zonder macrons.
- Wat niet te ontleden valt, valt terug op de gewone afleiderselectie hieronder: 19 van de 755 verbuigbare woorden, onder meer `vīs` (geen gen.), `rēs pūblica`, `alter`, `ūnus`, `duo`, `trēs`, `meus`/`tuus`/`suus` (stam te kort), `esse`, `velle`, `īre`, `accidere`.

- **Afleiderselectie** in alle andere gevallen, in deze prioriteit:
  1. Woorden met een **gelijkaardige vorm** (kleine Levenshtein-afstand op het lemma zonder macrons): `amīcus`/`inimīcus`, `pater`/`patria`, `mors`/`mōs`, `lībertās`/`lībertus`;
  2. Woorden uit **dezelfde sectie** (die leert hij samen, dus die verwart hij);
  3. Bij `L2V`: vormen van **dezelfde `soort`** met een gelijkaardige uitgang — een genitief mag nooit als afleider bij een werkwoord staan;
  4. Willekeurig uit het actieve pakket, aangevuld uit de volledige lijst als het pakket te klein is.
- Afleiders mogen nooit **dezelfde** vertaling of vorm hebben als het juiste antwoord (dubbels als `slecht` bij 42 en 235 komen voor).

### 7.3 Typevraag

```
Wat betekent  amīcus ?

   [ ________________ ]     ↵ Enter
```

- Autofocus, Enter bevestigt. `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`, `autocomplete="off"`.
- Leeg antwoord kan niet bevestigd worden.
- Discrete knop **"Ik weet het niet"** → telt als fout, toont het antwoord.

### 7.4 Antwoordbeoordeling bij typen

Normalisatie vóór vergelijking (soepele modus, de standaard):

1. Trim; meerdere spaties → één.
2. **Macrons weg**: `ā ē ī ō ū` → `a e i o u`. Hij mag ze typen, hij moet niet.
3. Overige diakrieten weg (`é` → `e`), naar kleine letters.
4. Spatie na komma genormaliseerd; `;` telt als `,`; een `?` in de vertaling hoeft niet getypt.
5. Vergelijk met alle aanvaarde antwoorden (`ta` voor `L2N`, `a` voor `L2V`).

**Bij `L2N` (vertaling):**
- Het lidwoord is **optioneel**: `vriend` en `de vriend` zijn beide juist.
- Haakjestoeslicht en labels horen niet bij het antwoord: `forum (romeins marktplein)` is
  volstaan met `forum`, en bij `(z.) wie?, wat?` is `wie` al juist.
- Elk deel van een opsomming is apart juist: bij `deze, dit` volstaat `deze`.
- Bij meerdere betekenissen (`de plaats; de gelegenheid`) is **één correcte betekenis genoeg**. De feedback toont dan wel de volledige vertaling, met de melding *"Ook juist: de gelegenheid."*
- Betekenissen zijn een **verzameling, geen rij**: geeft hij er meerdere, dan maakt de volgorde niet uit (`verzorgen, zorgen voor` = `zorgen voor, verzorgen`). Elk deel dat hij geeft moet wel kloppen en elk deel mag maar één keer voorkomen — een verkeerde betekenis erbij is fout.

**Bij `L2V` (vorm):**
- Zowel de gedrukte (`~a, ~um`) als de uitgeschreven vorm (`bona, bonum`) is juist.
- De geslachtsaanduiding is optioneel: `ducis` en `ducis, m.` zijn beide juist.

**Tikfouten.** Een tikfout is een motorische misser, geen kennisfout: ze mag een reeks
niet breken. Ze telt daarom **als juist**, met alleen een kleine XP-korting en de juiste
spelling in de feedback. Herkenning:

- Afstand volgens **Damerau-Levenshtein**, zodat een verwisseling van twee buren
  (`amcii` voor `amici`) één fout kost en geen twee.
- De tolerantie schaalt met de lengte van het aanvaarde antwoord: **< 4 tekens nul**,
  **4–9 tekens één**, **≥ 10 tekens twee**. Korte antwoorden krijgen dus geen marge.
- Wat hij typte mag **geen geldig antwoord van een ander woord** zijn — dat is verwarring,
  geen tikfout, en blijft fout.
- Bij `L2V` moet de **uitgang** kloppen: alleen een fout in de stam telt als tikfout. Een
  dubbele letter of een verwisseling van twee buren mag overal (die leveren nooit een
  geldige andere vorm op); een substitutie of een ontbrekende letter in de laatste twee
  tekens niet — `amicō` voor `amicī` blijft "bijna".
- Bij meerdere betekenissen geldt dit **per deel**: één tikfout in één deel maakt het
  geheel een tikfout, niet fout.

**Uitkomsten:**

| Uitkomst | Voorwaarde | Gevolg |
|---|---|---|
| **Juist** | Genormaliseerd gelijk aan een aanvaard antwoord, of dezelfde betekenissen in een andere volgorde | Box +1, volle XP (20 getypt) |
| **Tikfout** | Binnen de tolerantie hierboven | **Als juist**: box +1, combo +1, typ-streak +1, telt in de accuratesse en behoudt de "Vlekkeloos"-bonus. XP 16 i.p.v. 20. *"✓ Juist — tikfoutje: je schreef* amicsu*. Je schrijft het als* amīcī*."* |
| **Bijna** | Enkel nog bij `L2V`: dicht bij een aanvaarde vorm, maar de uitgang klopt niet | Box blijft, halve XP, combo blijft staan (groeit niet) |
| **Fout** | Al de rest, inclusief een geldig antwoord van een ánder woord | Box → 1, 0 XP, combo → 0 |

In **strenge** modus: alleen exacte match na trim en macron-verwijdering; geen tikfouten, geen "bijna", geen optioneel lidwoord, en de volgorde van de betekenissen ligt vast.

> Macrons worden **nooit** vereist. Ze staan wel altijd in de weergave, want hij moet ze kunnen lezen, maar ze op een gewoon toetsenbord typen is onwerkbaar.

### 7.4a De vraag verkeerd gelezen — één gratis herkansing

Komt alleen voor bij **typvragen**. Is het getypte antwoord fout voor de gevraagde
richting, maar **exact juist voor de andere richting van hetzelfde woord** — de genitief
getypt terwijl de betekenis gevraagd werd, of de vertaling terwijl de vorm gevraagd werd —
dan is dat geen kennisfout maar een leesfout.

- Er wordt **niets** geteld: geen box-verandering, geen combo-breuk, geen typ-streak, geen
  XP, geen accuraatheid, geen tempo-index (§4.4), en de vraagteller van de ronde blijft staan.
- In beeld komt een neutrale kaart (blauw, niet rood): *"↻ Lees de vraag nog eens — dat is
  de genitief van dit woord, er wordt naar de betekenis gevraagd. Je schreef "…". Deze beurt
  telt niet mee — probeer het opnieuw."*
- Het invoerveld wordt leeggemaakt, de cursor staat er weer in, en de antwoordklok van §4.4
  begint opnieuw te lopen.
- **Eén keer per vraagbeurt.** Wie daarna nog een fout antwoord geeft, heeft gewoon fout —
  anders wordt het een gratis hint.
- Woorden zonder tweede vorm (`soort = geen`) hebben maar één richting en dus nooit een
  herkansing.

> Waarom: bij het leren viel op dat een deel van de fouten geen kennisfouten waren maar
> leesfouten — het juiste antwoord op de verkeerde vraag. Dat afstraffen leert niets en
> breekt wel een combo van tien.

### 7.5 Feedback per vraag

- **Juist:** groene flits, vinkje, kort geluidje, opstijgend XP-getal, combo pulseert. Automatisch door na **600 ms**.
- **Bijna:** amberkleurig met de correctieboodschap, blijft **1600 ms** of tot een klik.
- **Fout:** rode flits, fout antwoord doorstreept, **juiste antwoord groot en duidelijk**, plus de volledige woordkaart (woord + vorm + vertaling + caput). Blijft staan tot hij op "Volgende" klikt of Enter/spatie drukt.

---

## 8. Dataopslag

### 8.1 Sleutel

`localStorage`, één sleutel: **`verba.save.v1`**.

### 8.2 Schema

```jsonc
{
  "app": "verba",                      // app-marker: een backup van een andere app (FLUO
                                      // gebruikt ook version 1) wordt bij het laden geweigerd
  "version": 1,
  "createdAt": "2026-09-10T18:00:00.000Z",
  "settings": {
    "toetsdatum": "2026-09-24",       // of null
    "geluid": true,
    "animaties": true,
    "rondelengte": 15,
    "strengheid": "soepel",           // "soepel" | "streng"
    "typAandeel": "gemiddeld",        // "weinig" | "gemiddeld" | "veel" (§4.6)
    "tempo": "auto",                  // "auto" | "rustig" | "normaal" | "snel" (§4.4)
    "pakket": ["1.0", "1.1", "1.2"]   // sectiesleutels; leeg = niets geselecteerd
  },
  "profiel": {
    "xp": 4820, "level": 9, "streak": 5,
    "laatsteActieveDag": "2026-09-10",
    "streakGeschiedenis": ["2026-09-08", "2026-09-09"],
    "besteCombo": 17, "blitzRecord": 23,
    "tempo": 0.62,                    // tempo-index T uit §4.4, 0..1; start 0.5
    "totaalJuist": 412, "totaalFout": 88,
    "vormJuist": 130, "vormFout": 40,
    "totaalRondes": 34, "totaleTijdMs": 4820000
  },
  "items": {
    // sleutel = "<nr>:<richting>"
    "2:L2N": { "box": 4, "juist": 7, "fout": 1, "laatstGezien": "...", "vragenSindsdien": 0 },
    "2:L2V": { "box": 2, "juist": 3, "fout": 2, "laatstGezien": "...", "vragenSindsdien": 0 }
    // items in box 0 mogen ontbreken
  },
  "badges":   { "primus-gradus": "2026-09-01T19:12:00.000Z" },
  "tesserae": { "lupa": "2026-09-01T19:12:00.000Z" },
  "secties":  { "1.0/3": { "veroverd": true, "besteScore": 22, "pogingen": 2 } },
  "examen":   { "gehaald": false, "besteScore": 54 }
}
```

### 8.3 Backup (verplicht)

- **"Backup opslaan"** → downloadt `verba-backup-JJJJ-MM-DD.json` via `Blob` + `URL.createObjectURL` + `<a download>`. Werkt over `file://`.
- **"Backup laden"** → `<input type="file">`, `FileReader`, valideert `version` **én** de `app`-marker, bevestiging vóór overschrijven. Onverwacht getypeerde velden worden genegeerd in plaats van geparset — een kapotte backup mag de app nooit in een crash-lus zetten.
- Toon in de instellingen: *"Je voortgang zit in deze browser op deze pc. Werk je op een andere computer? Sla dan eerst een backup op en zet die daar terug."*

### 8.4 Robuustheid

- Elke `localStorage`-actie in `try/catch`. Faalt het: doordraaien op geheugen + één discrete waarschuwingsbalk.
- Corrupte JSON → veilig terugvallen op een leeg profiel, zonder crash.
- Wegschrijven na elke beantwoorde vraag én bij het einde van een ronde.
- Onbekende woordnummers in een geladen save (bv. na een correctie in de woordenlijst) worden stil genegeerd, niet als crash.

### 8.5 Synchronisatie (alleen de online build)

Het schema van §8.2 blijft ongewijzigd — dezelfde save, hetzelfde `localStorage`, dezelfde backup. De online build stuurt die staat daarnaast naar de server en voegt hem daar samen met wat er van andere toestellen komt. De volledige regels staan in §13.5; wat hier telt:

- De save blijft **lokaal de bron** tijdens het leren. Er wordt nooit op de server gewacht om een vraag te kunnen beantwoorden.
- Synchroniseren gebeurt **per ronde**, niet per vraag: bij het einde van een ronde, bij het verbergen van de pagina (`visibilitychange`) en bij het opstarten.
- Bij een conflict tussen twee toestellen geldt **samenvoegen, nooit overschrijven** (§13.5). Een blob die de andere wint is verboden: dat wist een avond studeren.
- De save krijgt in de online build twee extra velden, die de offline build negeert en die een backup ongemoeid laat: `rev` (het revisienummer dat de server bijhoudt) en `synced` (tijdstip van de laatste geslaagde sync).

---

## 9. Vormgeving, toon en toegankelijkheid

### 9.1 Toon

Nederlands, informeel maar niet kinderachtig. Kort, droog, af en toe een knipoog. *"Vlekkeloos."* · *"Die zat er bijna."* · *"Nog 4 en sectie 1.2 is van jou."* · *"Je streak is opnieuw begonnen."*

### 9.2 Visueel

- **Donker thema** als basis, thema "Romeins mozaïek bij nacht": een warme, diepe steenkleur
  (`#0E0D14`) met daarover drie zachte radiale wassingen (terracotta, purper, goud) die
  meescrollen noch verspringen (`background-attachment: fixed`). Nooit een vlakke zwarte vlakte.
- Accentkleuren ontleend aan Romeinse materialen: terracotta `#E2664A`, wijnrood `#C04A5C`,
  olijf `#8FAE55`, oker `#E0AA46`, steenblauw `#5B89AE`, purper `#8D5AA6`, brons `#C07F3C` —
  **één per caput**, zodat het mozaïek per caput leesbaar is. **Goud** `#FFD76A` voor beheersing.
- De caputkleur is ook het **accent van de vraag** (`--acc`): het label boven het woord en
  het lijntje eronder kleuren mee, zodat hij ziet uit welk hoofdstuk de vraag komt.
- Oppervlakken zijn **gelaagd**, niet vlak: elke kaart heeft een verticaal verloop, een
  1px-rand en een lichte binnenrand bovenaan (`inset 0 1px 0 rgba(255,255,255,.055)`).
  Knoppen en tegels komen bij hover 2-3 px omhoog met een zachte slagschaduw.
- **Goud is bijzonder.** Gouden cellen, de XP-balk, streakbolletjes en behaalde badges
  krijgen een radiaal verloop met een lichtpunt linksboven en een subtiele gloed. Alles
  wat goud is, is verdiend — gebruik het nergens anders voor.
- Grote getallen (score, statistiek) staan in een goud- of wit-verloop met
  `-webkit-background-clip:text`, en altijd `font-variant-numeric: tabular-nums`.
- De **vraag domineert**: het Latijnse woord staat op 3,1 rem (2,15 rem op gsm), optisch
  gecentreerd tussen voortgangsbalk en opties, met veel lucht eromheen.
- Koppen krijgen een klein gouden ruitje (`h2`) of een goud-naar-terracotta streepje (`h1`)
  als ornament. Geen zware kaders, geen skeuomorfe marmertexturen.

### 9.2.1 Romeinse ornamentlaag

Het thema is niet alleen kleur; het zit in vaste, herbruikbare motieven:

| Motief | Waar | Hoe |
|---|---|---|
| **Meander** (Griekse sleutel) | onder de header, tussen de secties van het thuisscherm, in de modals | een SVG-tegel als **data-URI** in CSS (`--meander`); geen bestand, geen netwerk |
| **Romeins cijfer in een medaillon** (`.rom`) | caputs in de pakketselector, het mozaïek en Verover | rond medaillon met de caputkleur als rand en gloed |
| **Lauwerkrans** (`laurier()`) | rond elk badge-icoon en groot bij een level-up | in JS opgebouwde SVG: twee symmetrische takken van 8 blaadjes, open aan de top |
| **Zuilen** | flankeren de introductiekaart | CSS-verlopen met cannelure-strepen, verborgen onder 700 px |
| **Mozaïekvloer-textuur** | grote vlakken (mozaïek, kaarten, pakket) | twee `repeating-linear-gradient`en op ~2 % dekking |
| **Caput-badges** | Badgescherm | het Romeinse cijfer in de caputkleur i.p.v. voor alle zeven hetzelfde icoon |

### 9.5 Beweging

De app mag nooit als een dood formulier aanvoelen, maar beweging is **kort en betekenisdragend**;
niets mag de leerling laten wachten.

| Moment | Beweging |
|---|---|
| Nieuw scherm | opkomen met 8 px verschuiving, 320 ms |
| Nieuwe vraag | het woord komt op uit een lichte blur (420 ms); label, meta en accentlijn volgen gestaffeld |
| Antwoordopties | verschijnen na elkaar, 55 ms uit elkaar |
| Juist | groene rimpeling die uitdijt vanaf de gekozen optie |
| Fout | het invoerveld of de foute optie schudt (380 ms) |
| Woord wordt goud | die cel in het mozaïek draait één keer om met een gouden flits |
| Mozaïek opbouwen | cellen vallen gestaffeld in (7 ms per cel, gedeksel op 90) |
| XP erbij | een glans loopt één keer over de XP-balk |
| Combo | vlammetje dat ademt; boven ×2 pulseert de hele chip |
| Blitz onder 10 s | de klok wordt rood en tikt |
| Level-up | lauwerkrans schaalt in met het Romeinse cijfer, stralenkrans draait, confetti |
| Nieuwe tessera | het steentje komt draaiend op en zweeft; confetti bij episch en legendarisch |
| Primaire knop | trage glansveeg elke 4,5 s, zodat het scherm nooit helemaal stilstaat |

**Twee uitknoppen, en de systeemvoorkeur wint.** De instelling *Animaties* zet `html.geenanim`
en daarmee alles stil. Los daarvan zet `@media (prefers-reduced-motion: reduce)` élke animatie-
en overgangsduur op 1 ms. In JS beslist één functie, `magBewegen()`, of confetti, flitsen,
zwevende XP en schudden mogen — die kijkt naar **beide**.
- Groot, strak, veel witruimte. De vraag is het duidelijkste element op het scherm.
- Het **Latijnse woord** wordt altijd in een serif-stack gezet (`Georgia, 'Times New Roman', serif`) en de Nederlandse tekst in de systeem-sans. Dat scheidt de twee talen visueel — belangrijk bij een vertaaltoets. Geen webfonts.
- Macrons moeten leesbaar groot zijn; het woord staat in de vraag op minstens 2 rem.
- Vloeiende maar korte animaties (150–300 ms).

### 9.3 Toetsenbord

| Toets | Actie |
|---|---|
| `1`–`4` | Meerkeuze-optie kiezen |
| `Enter` | Bevestigen / door naar volgende |
| `Spatie` | Door naar volgende (bij feedback) |
| `Esc` | Ronde afbreken (met bevestiging) |
| `←` `→` | Bladeren in de flashcard-weergave |

Zichtbare focus-indicator op alles wat focusbaar is.

### 9.4 Toegankelijkheid

- Contrast minstens WCAG AA.
- Kleur is nooit de enige informatiedrager: juist/fout hebben ook een icoon en tekst.
- `prefers-reduced-motion: reduce` schakelt niet-essentiële animaties uit.
- `aria-live`-regio voor feedback na een antwoord.
- Alle knoppen zijn echte `<button>`-elementen met een toegankelijke naam.

---

## 10. Op te leveren

```
latijn-studietool/
├── woordenlijst.md              ← bron van waarheid (1051 woorden)
├── latijn.json                  ← afgeleide data
├── maak-data.py                 ← woordenlijst.md  → latijn.json
├── bouw.py                      ← sjabloon.html + latijn.json → beide builds
├── sjabloon.html                ← de app zonder data
├── tesserae/                    ← de 20 pixelfiguren
│   ├── rasters.py               ← bron van waarheid voor de sprites
│   ├── contactblad.py           ← rendert ze naast elkaar naar PNG — kijk ernaar
│   └── injecteer.py             ← schrijft ze in sjabloon.html
├── FUNCTIONELE-SPECIFICATIE.md  ← dit document
├── changelog.md
├── test/                        ← smoketests (Playwright) + de servertests, zie test/LEESMIJ.txt
│   ├── samenvoegen-test.php     ← elke regel van §13.5 apart
│   ├── grenzen-test.php         ← elke grens van §13.6 apart
│   ├── api-test.js              ← de API van begin tot eind, tegen de echte server
│   └── smoke-10-online-sync.js  ← twee browsers, twee rondes, één account
├── verba/                       ← de offline build
│   ├── index.html               ← de volledige app, dubbelklikbaar
│   └── LEESMIJ.txt
├── verba-online/                ← de online build (hoofdstuk 13)
│   └── index.html
├── server/                      ← de API, PHP 8.4 (hoofdstuk 13)
│   ├── index.php                ← één ingang, routeert /verba/api/v1/…
│   ├── db.php · auth.php · sync.php · logboek.php · beheer.php
│   ├── samenvoegen.php          ← de samenvoegregels van §13.5 (zuiver rekenwerk)
│   ├── grenzen.php              ← de plausibiliteitsgrenzen van §13.6
│   ├── woorden.php              ← gegenereerd door bouw.py; alleen met token op te vragen
│   ├── schema.sql               ← de tabellen van §13.3
│   ├── config.voorbeeld.php     ← lege velden; wordt config.php op de server
│   └── beheer/index.html        ← de beheerpagina (klassen, joincodes, leerlingen, logboek)
├── OUDERBRIEF.md                ← sjabloon dat met de joincode meegaat (§13.8)
└── ONLINE-PLAN.md               ← verantwoording + meetrapport van de hosting
```

`server/config.php` (de echte inloggegevens van de database) staat in `.gitignore` en wordt **nooit** ingecheckt: deze repo staat publiek op GitHub.

---

## 11. Aanvaardingscriteria

1. `verba/index.html` opent met een dubbelklik vanaf een USB-stick, zonder server, zonder internet, en werkt volledig. Dit criterium gaat vóór op alles in hoofdstuk 13: een online functie die de offline build breekt, wordt niet gebouwd.
2. De **offline build** doet **nul** netwerkrequests. (De downloadknop van §6.8 is de enige uitzondering: die haalt op klik het eigen bestand op, en bestaat alleen in de webversie.)
3. Exact de **1051** woorden uit `woordenlijst.md` komen voor, met hun nummer, woord, vorm, vertaling, caput en sectie.
4. Er zijn **1806 leeritems**: 1051 × `L2N` + 755 × `L2V`. Een woord met `soort = geen` krijgt nooit een vormvraag.
5. Het leerpakket kan per caput en per sectie gekozen worden; de leermotor blijft binnen die selectie; van pakket wisselen verliest geen voortgang.
6. Een nieuw item verloopt aantoonbaar via introductiekaart → meerkeuze → typen naarmate de box stijgt.
6a. Over een reeks rondes op de standaardinstelling wordt **minstens de helft** van de vragen getypt (§4.6); "weinig" levert aantoonbaar minder typvragen dan "veel".
6b. Binnen één ronde komt hetzelfde woord **hoogstens twee keer** aan bod, en tussen twee beurten van hetzelfde woord zitten minstens twee andere woorden (§4.5).
7. `L2V` van een woord wordt pas geïntroduceerd wanneer `L2N` box ≥ 2 heeft.
8. Een fout antwoord zet het item terug naar box 1 en toont het juiste antwoord tot de gebruiker doorklikt.
9. Macrons zijn nooit verplicht bij het typen; `amici` is juist voor `amīcī`.
10. Bij een meervoudige vertaling volstaat één betekenis, en het lidwoord is optioneel.
11. Bij een vormvraag is zowel `~a, ~um` als `bona, bonum` juist, en is de geslachtsaanduiding optioneel.
12. Een tikfout (soepele modus) telt als juist: box +1, combo en typ-streak lopen door, XP iets lager. Een andere naamvalsuitgang blijft "bijna", een geldig antwoord van een ander woord blijft fout.
12a. De volgorde van meerdere betekenissen maakt niet uit; een verkeerde betekenis erbij blijft fout.
13. Het mozaïek kleurt zichtbaar mee met de voortgang, van grijs over caputkleur naar goud, en dimt wat buiten het pakket valt.
14. XP, levels, combo, dagstreak en de 20 badges uit §5.5 werken.
14a. De combo loopt door van de ene ronde naar de volgende en overleeft het afsluiten; alleen een fout antwoord zet hem op 0 (§5.2).
15. De 20 tesserae uit §5.7 komen vrij bij hun voorwaarde, blijven bewaard en zitten in de backup.
16. Alle 59 veroveringstoetsen kunnen veroverd worden; geen enkele toets telt meer dan
    25 vragen; bij 59/59 ontgrendelt het examen.
17. De voortgang overleeft het sluiten en heropenen van de browser.
18. Backup opslaan en laden werkt over `file://` en herstelt de voortgang volledig.
19. Een ingestelde toetsdatum toont een aftelling en een dagdoel binnen het actieve pakket.
20. Bruikbaar op 360 px breed zonder horizontale pagina-scroll; het mozaïek scrollt binnen zijn eigen container.
21. Volledig bedienbaar met het toetsenbord volgens §9.3.
22. Geen JavaScript-fouten in de console tijdens normaal gebruik.
23. Alle zichtbare tekst staat in het Nederlands; alleen de Latijnse woorden zelf zijn Latijn.
24. De ornamentlaag van §9.2.1 is aanwezig op elk scherm waar de tabel het voorschrijft, en
    gebruikt geen enkel extern bestand.
25. De 20 tesserae zijn leesbaar op 16×16: elk steentje is herkenbaar als het ding dat het
    voorstelt, beoordeeld op een contactblad.
26. `prefers-reduced-motion: reduce` legt alle beweging stil, ook de animaties die niet via
    de instelling lopen; de instelling *Animaties uit* doet dat eveneens, onafhankelijk.
27. Het volledige mozaïek van 1051 cellen rendert in minder dan 50 ms.
28. Na één Blitz over een vers leerpakket is elk aangeraakte woord gekleurd in het mozaïek,
    zowel de juist als de fout beantwoorde.
29. De sterformule van §5.4 voldoet aan de drie eigenschappen daar: goud alleen bij alle
    richtingen op 5, 0 alleen bij alle richtingen op 0, en monotoon.
30. Het adaptieve tempo van §4.4 werkt beide kanten op en blijft binnen zijn grenzen: een
    reeks snelle juiste antwoorden brengt het plafond naar 14 en het venster naar 6, een
    reeks foute of trage antwoorden naar 5 en 4, en `T` verlaat nooit het bereik 0–1. Een
    vaste tempokeuze negeert `T`; op `auto` is het plafond exact `afronden(5 + 9·T)`.
31. De herkansing van §7.4a laat álle tellers ongemoeid: na een antwoord in de verkeerde
    richting zijn box, combo, typ-streak, XP, accuraatheid, tempo-index en de vraagteller
    van de ronde onveranderd, en dezelfde vraag staat opnieuw op het scherm. De tweede
    fout telt wel gewoon.

**Online modus (hoofdstuk 13).** Deze criteria gelden voor `verba-online/index.html` en de server; falen ze, dan raakt dat de offline build niet.

32. `bouw.py` levert beide builds uit hetzelfde `sjabloon.html`, in één run.
33. `verba/index.html` bevat nergens `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket` of een `http(s)://`-URL naar een eigen server. Een test faalt als de synccode ooit in de offline build lekt.
34. De online build werkt **volledig** zonder netwerk: een ronde spelen, XP verdienen, badges halen en opslaan blijft werken met de server onbereikbaar; de openstaande wijzigingen gaan alsnog weg zodra er weer verbinding is. Er is geen scherm dat op de server wacht.
35. Aanmelden met een geldige joincode, een vrije naam en een PIN van 4 cijfers maakt een account; dezelfde joincode + naam + PIN geeft op een tweede toestel dezelfde voortgang.
36. Zonder geldige joincode is de app niet bruikbaar en zijn de woorden niet op te vragen — ook niet rechtstreeks via de API, en ook niet uit de HTML van de online build zelf (§13.2a). `verba-online/index.html` bevat geen enkel woord uit `latijn.json`; `bouw.py` weigert te bouwen als dat toch zo is.
37. **Samenvoegen wist niets.** Twee toestellen die elk offline een ronde spelen en daarna allebei syncen, leveren een staat waarin beide rondes zitten: elke tabelregel uit §13.5 wordt apart getest, met de nadruk op de gevallen die bij overschrijven data zouden verliezen.
38. Elke grens uit §13.6 weigert wat erbuiten valt, en laat daarbij een leesbare regel met de reden na in het logboek.
39. Het logboek van §13.7 bevat voor elke speler elke actie uit de lijst daar, in leesbaar Nederlands, filterbaar per klas en per leerling, en te downloaden als platte tekst. Een logboek dat niet kan wegschrijven blokkeert de sync niet.
40. Geen enkel antwoord van de API begint met `<?php`, en de API stuurt altijd `Cache-Control: no-store`.
41. Meerdere klassen bestaan naast elkaar zonder elkaar te zien: een leerling haalt nooit gegevens van een andere klas op, en dezelfde naam mag in twee klassen bestaan.
42. Zodra de app draait, is het aanmeldscherm niet zichtbaar — ook niet als een stijlregel het `hidden`-attribuut zou overschrijven (§13.8b). Smoke-10 controleert dit.
43. De beheerpagina toont nooit gegevens zonder geldige beheersleutel, voert namen en logregels nooit als HTML uit, en toont bij een gekozen klas alleen die klas (§13.8c). Smoke-11 controleert dit.

---

## 12. Openstaande punten (bewust opengelaten)

- **De superscript ³** die in de scans bij veel woorden staat, is niet overgenomen: de betekenis is niet bekend. Blijkt later dat het bv. "kernwoordenschat" markeert, dan volstaat het om er in `maak-data.py` een veld van te maken en er in §4.2 een extra pakketfilter op te zetten.
- **NL → Latijn** is bewust **niet** geïmplementeerd (de leerling moet herkennen en de vormleer kennen, niet produceren). De itemsleutel `<nr>:<richting>` laat toe om er later een derde richting `N2L` naast te zetten zonder de save te breken.
- **Flavourteksten en pixelrasters** van de tesserae (§5.7) zijn vrije invulling, zolang ze kort en droog zijn.
- **Geluidsontwerp**: met de Web Audio API gegenereerd, niet uit bestanden.

---

## 13. Online modus

Alles in dit hoofdstuk geldt **uitsluitend** voor de online build (`verba-online/index.html`) en de bijbehorende server. De offline build van hoofdstuk 1 t/m 12 verandert er niet door. De verantwoording, de afgewogen alternatieven en de metingen op de echte hosting staan in `ONLINE-PLAN.md`.

### 13.0 Waarom, en wat niet

Eén leerling leert op meerdere toestellen en begint daar telkens opnieuw; daarnaast mogen zijn klasgenoten mee. Dat vraagt een centrale plaats voor de voortgang, en dus accounts.

Vier uitgangspunten, in deze volgorde bindend:

1. **De offline app blijft bestaan en blijft ongewijzigd werken.** Dat is de reden dat dit project bestaat en de terugvalweg als de server stuk is.
2. **Offline-first, ook online.** Lokaal opslaan blijft primair; de server komt erbovenop. Geen netwerk = de app van hoofdstuk 1 t/m 12, met een discrete melding.
3. **Zo weinig mogelijk persoonsgegevens.** Het gaat over minderjarigen: geen e-mail, geen echte naam verplicht, geen externe identiteitsprovider, geen telemetrie.
4. **Eén bron.** De woorden en de leermotor staan op één plaats; er komt geen tweede codebase.

Uitdrukkelijk **niet** gebouwd: een leerkrachtoverzicht van individuele voortgang, en een logboek dat de leerling zelf kan inkijken (§13.7).

### 13.1 Hosting

De API draait op de bestaande hosting van steeman.be, **same-origin** onder `https://www.steeman.be/verba/api/v1/…`: PHP 8.4 (`fpm-fcgi`), MariaDB 10.11, `utf8mb4`. Op 13 september 2026 geverifieerd op de echte hosting, inclusief `argon2id`, en dat de edge-cache `/verba/api/*` niet cachet (`ONLINE-PLAN.md` §3).

- Elk API-antwoord stuurt `Cache-Control: no-store`.
- De PHP-versie wordt **alleen via het beheerpaneel van de hoster** gewijzigd, nooit met een `AddHandler` in een `.htaccess`: dat schakelt de PHP-uitvoering uit en de server geeft dan de **broncode** van het bestand terug — met het databasewachtwoord erin. Na elke serverwijziging wordt §11.40 opnieuw gecontroleerd.
- De FTP-root ís de docroot: er is geen map boven de website. `config.php` staat daarom in `.gitignore`, de databasegebruiker heeft rechten op enkel zijn eigen schema, en er staat nooit een geheim in de repo.
- De database staat **8 gelijktijdige verbindingen** toe. Dus: geen persistente verbindingen, pas verbinden als een verzoek de database echt nodig heeft, meteen loslaten. Loopt het toch vol, dan antwoordt de API `503` met `Retry-After` en zet de client zijn wijziging terug in de wachtrij.

### 13.2 Accounts: klascode + naam + PIN

Geen e-mail, geen OAuth, geen wachtwoordherstel per mail.

1. De beheerder maakt een **klas** aan en krijgt een **joincode** (8 tekens, niet te raden, in te trekken). **Meerdere klassen bestaan naast elkaar**, elk met eigen leerlingen, eigen joincode en een eigen gezamenlijk doel.
2. De leerling geeft de joincode, kiest een **naam of bijnaam** — uniek **binnen zijn klas**, twee klassen mogen elk hun eigen "Lotte" hebben — en een **PIN van 4 cijfers**.
3. De server geeft een **token** terug (willekeurig, ondoorzichtig, alleen als hash bewaard) dat in `localStorage` blijft. Op dat toestel is inloggen daarna niet meer nodig.
4. Tweede toestel: **joincode + naam + PIN** → hetzelfde account. De joincode hoort dus ook bij het inloggen: hij bepaalt in welke klas naar die naam gezocht wordt.
5. PIN vergeten → de beheerder reset hem. Er is geen zelfbediening, want daarvoor zouden er e-mailadressen van kinderen nodig zijn.
6. Een leerling zit in **één** klas. Verplaatsen is een beheeractie en komt in het logboek.

Een PIN van 4 cijfers is zwak; dat is bewust aanvaard. De tegenmaatregelen staan in §13.6. Het ergste geval is dat een klasgenoot aan andermans Latijnscore zit — er zijn geen gegevens die kunnen uitlekken, want die worden niet verzameld.

**Zonder geldige joincode is er geen toegang tot de app**, ook niet tot de woorden (§13.8). De online build draagt `noindex`.

**Migratie.** Wie al lokaal voortgang heeft, krijgt bij de eerste aanmelding de vraag *"Je hebt hier al voortgang staan. Overzetten naar je account?"* Bij ja wordt de bestaande save als eerste wijziging verstuurd. Er gaat niets verloren.

### 13.2a De online build bevat de woordenlijst niet

De offline build heeft de 1051 woorden inline staan; dat is de hele bedoeling van een
bestand op een USB-stick. Voor de online build kan dat niet: wie de URL kent, zou de
woordenlijst dan kunnen binnenhalen zonder ooit een klascode te hebben gezien — en dat is
precies wat §13.8 verbiedt.

Daarom bouwt `bouw.py` de online build **zonder woorddata**:

1. De pagina bevat de app, de vormgeving en de tesserae, maar geen enkel woord.
2. Zonder woorden start de app niet op: er verschijnt alleen het aanmeldscherm.
3. Na een geslaagde aanmelding haalt de app `/woorden` op met haar token, zet de lijst in
   `localStorage` en **herlaadt de pagina**. Daarna start ze synchroon op, precies zoals
   de offline build, en werkt ze ook zonder verbinding verder.
4. Afmelden wist de woordenlijst weer van dat toestel.

Op de server staan de woorden in een **`.php`-bestand**, niet als `.json`: een `.json` in
de docroot is rechtstreeks op te vragen, een `.php` wordt uitgevoerd en geeft bij een
directe aanvraag niets prijs. `server/woorden.php` wordt gegenereerd door `bouw.py`, uit
dezelfde `latijn.json` als de app (§2.2) — de woorden blijven dus op één plaats staan.

### 13.3 Gegevens op de server

| Tabel | Inhoud |
|---|---|
| `klassen` | id, naam, joincode-hash, actief |
| `leerlingen` | id, klas, naam, pin-hash (`argon2id`), aangemaakt, laatste sync, `rev` |
| `staat` | leerling, de save-JSON van §8.2, `rev` |
| `sessies` | token-hash, leerling, aangemaakt, laatst gezien |
| `gebeurtenissen` | append-only logboek van elke actie van elke speler (§13.7) |

Eén rij per leerling voor de staat. Bij volledige voortgang is die ~200 KB (1806 items × ~115 byte), gzip ~30 KB; er is geen reden de items over rijen te spreiden.

### 13.4 API (v1)

JSON over HTTPS, token in `Authorization: Bearer …`, `POST` tenzij anders vermeld.

| Endpoint | Doel |
|---|---|
| `/aanmelden` | joincode + naam + PIN → account aanmaken, token terug |
| `/inloggen` | joincode + naam + PIN → token terug |
| `/woorden` (GET) | de 1051 woorden — **alleen met een geldig token** (§13.2a) |
| `/staat` (GET) | de volledige samengevoegde staat + `rev` |
| `/sync` | `{basisRev, wijziging}` → samengevoegde staat, of enkel een bevestiging |
| `/klas` (GET) | geaggregeerde cijfers van **de eigen klas**, voor het gezamenlijke doel — nooit van een andere klas, nooit per leerling |
| `/beheer/…` | alleen met de beheersleutel (nooit met een leerlingtoken): |
| `/beheer/klas` | nieuwe klas + joincode (die code staat nergens opgeslagen, alleen de hash) |
| `/beheer/klassen` · `/beheer/leerlingen` | overzicht |
| `/beheer/hernoem` · `/beheer/code` · `/beheer/intrekken` | klas hernoemen, joincode zetten (leeg = willekeurig) of intrekken |
| `/beheer/pin` · `/beheer/verplaats` · `/beheer/wissen` · `/beheer/klas-wissen` | PIN resetten (meldt alle toestellen af), leerling verplaatsen, account of klas echt verwijderen |
| `/beheer/logboek` | het logboek (§13.7), `formaat=tekst` geeft de download |

### 13.5 Samenvoegen — de regels

De client stuurt de **wijziging sinds zijn laatste sync**. De server voegt samen per veld. **Laatste-schrijver-wint over de hele save is verboden.**

| Veld | Regel |
|---|---|
| `items["<nr>:<richting>"]` | per item: de kant met de nieuwste `laatstGezien` bepaalt `box`, `vragenSindsdien` en `mcSinds`; `juist` en `fout` nemen het **maximum** |
| `profiel.xp`, `besteCombo`, `blitzRecord`, `totaalJuist`, `totaalFout`, `vormJuist`, `vormFout`, `totaalRondes`, `totaleTijdMs` | **maximum** (monotoon stijgende tellers) |
| `profiel.streakGeschiedenis` | vereniging van de dagen; `streak` en `laatsteActieveDag` worden daaruit **herberekend**, niet overgenomen |
| `profiel.tempo` | van de kant met de nieuwste activiteit |
| `badges`, `tesserae` | vereniging; bij dubbel wint de **vroegste** tijdstempel |
| `secties` | per sectie: `veroverd` is een OR, `besteScore` en `pogingen` het maximum |
| `examen` | `gehaald` is een OR, `besteScore` het maximum |
| `settings` | laatste schrijver wint |

De server verhoogt `rev` en stuurt de samengevoegde staat terug als de client achterliep; de client vervangt zijn lokale staat dan integraal. Na het samenvoegen is de server de waarheid.

Klokken van toestellen lopen uit elkaar: tijdstempels van de client worden geklemd op "niet in de toekomst" en dienen alleen om twee kanten te ordenen, nooit om iets te berekenen dat ertoe doet.

### 13.6 Vals spelen en misbruik

De leermotor draait in de browser, dus **elke score is een bewering van de client**. Dat serverzijdig dichttimmeren zou de Leitner-motor, de antwoordbeoordeling en de XP-berekening op de server vragen, met een verzoek per vraag en zonder offline spelen — een ander project. Gekozen houding: **de client blijft baas, de server maakt vals spelen zichtbaar en onschadelijk.**

- **De eerste sync van een account is een migratie, geen groei.** Wie maanden offline leerde, brengt in één keer een volle save mee; die aan een groei-per-uur meten zou juist de bestaande gebruiker buitensluiten. Vorm, sleutels, boxen en tijdstempels worden wél gecontroleerd, en de import komt met omvang in het logboek.
- **Grenzen per sync**: ten hoogste ~300 beantwoorde vragen en een begrensde XP-groei per uur, `box` binnen 0–5, geen tijdstempel in de toekomst, payload ≤ 512 KB, ten hoogste 1806 itemsleutels, elke sleutel tegen `^\d+:(L2N|L2V)$`. Wat erbuiten valt wordt **geweigerd**, niet stil afgekapt, en belandt met reden in het logboek.
- **Snelheidslimieten**: joincode-pogingen per IP, inlogpogingen per naam met oplopende vertraging, één sync per ~10 s per account. Een teller die op *raden* staat (joincode, PIN, beheersleutel) wordt bij een geslaagde poging **gewist**: de limiet remt het raden af, niet het gebruik. Anders legt een beheerpagina die wat vaker ververst zichzelf plat — dat gebeurde tijdens het bouwen.
- **Het gezamenlijke doel wordt per persoon begrensd**, zodat één opgeblazen account het niet alleen kan uitspelen of verpesten.
- Verder: HTTPS-only, PIN met `password_hash` (`argon2id`, zonder het algoritme vast te pinnen), tokens alleen als hash bewaard, **alle** velden serverzijdig gevalideerd, geen SQL uit stringplakwerk, en servertekst wordt in de app nooit als HTML gerenderd.

### 13.7 Logboek

Van **elke speler en elke actie** blijft een spoor dat leesbaar is zonder databasekennis. Elke rij in `gebeurtenissen` is gestructureerd (tijd, klas, leerling, type, cijfers) **én** draagt een kant-en-klare Nederlandse zin.

```
2026-09-14 19:02  robbe   account aangemaakt in klas "Caput 7"
2026-09-14 19:20  robbe   ronde afgerond — 15 vragen, 13 juist, +120 XP, 4 woorden een box hoger
2026-09-14 19:21  robbe   badge verdiend: primus-gradus
2026-09-14 19:22  robbe   gesynct vanaf toestel B — 15 items samengevoegd, staat nu rev 42
2026-09-15 08:40  lotte   sync geweigerd — 4200 XP in 3 minuten, boven de grens (§13.6)
2026-09-16 17:55  beheer  PIN gereset voor lotte
```

- **Wat**: account aangemaakt of verwijderd · inloggen op een nieuw toestel · elke sync (omvang, samengevoegde items, nieuwe `rev`) · geweigerde sync mét reden · ronde en blitz afgerond · sectie veroverd · examen · badge of tessera verdiend · elke beheeractie.
- **Wat niet**: PIN's, tokens, antwoordinhoud. Het IP alleen als hash.
- **Granulariteit: per ronde en per gebeurtenis, nooit per vraag.** Per vraag zou duizenden onleesbare regels per week opleveren én neerkomen op bijhouden welke woorden andermans kind fout had. Per klas aan te zetten als het ooit nodig blijkt; standaard uit.
- **Wie het ziet: alleen de beheerder.** Niet de leerlingen, ook niet hun eigen regels: wie ziet welke grens hem betrapte, leert eronder blijven. De ouders worden wel ingelicht dát het logboek bestaat (§13.8).
- **Waar**: op de beheerpagina, nieuwste eerst, filterbaar per klas, per leerling en per dag, met een knop **logboek downloaden** die platte tekst geeft — één regel per gebeurtenis.
- **Bewaartermijn**: 12 maanden (één schooljaar), daarna automatisch gewist. Een verwijderd account neemt zijn logregels mee.
- Het logboek mag de app **nooit** ophouden: faalt het wegschrijven, dan gaat de sync door en wordt de logfout apart gemeld.

### 13.8 Privacy, minderjarigen en de woordenlijst

1. **Wat bewaard wordt**: een bijnaam, een PIN-hash, de leervoortgang, en het logboek van §13.7 met een IP-hash. Meer niet. Dat logboek is het gevoeligste wat het systeem bijhoudt: daarom per ronde en niet per vraag, 12 maanden, en uitdrukkelijk vermeld in de tekst voor de ouders.
2. In **Instellingen** staat, uitklapbaar, **"Wat bewaart VERBA?"** in gewone taal, met een contactadres en de belofte dat een account op vraag meteen verwijderd wordt — één knop op de beheerpagina, die de rijen echt wist.
3. **De woordenlijst.** `woordenlijst.md` is overgetypt uit een schoolboek en verantwoord als persoonlijk studiegebruik. Een openbare website die hem aan een klas serveert is een ruimere verspreiding. Daarom staat de online app **achter de joincode** — geen anonieme toegang tot de woorden — en op `noindex`. Zo blijft het "leerlingen met hetzelfde boek die samen studeren" en geen publicatie. Dit is een **voorwaarde**, geen optie.
4. Ouders van klasgenoten krijgen samen met de joincode één alinea die hetzelfde uitlegt.

### 13.8a Wat er op de webserver staat

| Pad | Wat |
|---|---|
| `/verba/` | de **online build** — het aanmeldscherm, `noindex`, geen woorddata |
| `/verba/verba-offline.html` | de offline build, waar de downloadknop naar wijst |
| `/verba/api/v1/` | de API; `config.php` en `woorden.php` staan hier ook, maar geven bij een directe aanvraag niets prijs |
| `/verba-test/` | dezelfde online build als staging, waar `smoke-10` tegen draait |

### 13.8c Beheerpagina

Op `/verba/beheer/` (`noindex`, geen link vanuit de app). Eén bestand, vraagt de
beheersleutel en houdt die alleen in dat tabblad; alle gegevens komen van dezelfde API en
elk verzoek draagt de sleutel als header.

- **Klassen**: aanmaken (de joincode komt één keer in beeld, met de waarschuwing dat hij
  daarna alleen te vervangen is), hernoemen, nieuwe code, klas wissen.
- **Leerlingen**: per klas, met PIN-reset (alle toestellen worden afgemeld) en verwijderen.
- **Logboek**: filter per klas en per dag, plus download als platte tekst.

Twee regels die uit het bouwen volgen en die blijven gelden:

1. **Alles wat van de server komt, wordt als tekst getoond, nooit als HTML.** Namen en
   logregels zijn door leerlingen ingevuld.
2. **Elk paneel heeft zijn eigen volgnummer voor lopende verzoeken.** Zonder dat tekende een
   trager, ouder antwoord over een nieuwere selectie heen — en dan staat er een ongefilterde
   lijst onder een gekozen klas. Tijdens het bouwen trof een knop daardoor de verkeerde
   leerling; alleen daarom is het hier een harde regel en geen detail.

### 13.8b Diagnose op het aanmeldscherm

Een online app faalt op plaatsen waar de bouwer niet bij kan: een andere browser, een
andere machine, een cache die iets ouds bewaart. Drie dingen maken dat op afstand
bespreekbaar, en ze horen te blijven staan:

1. **Bouwstempel.** Het aanmeldscherm toont `bouw DD-MM UU:MM`, gezet door `bouw.py`.
   Zonder dat weet niemand of de bezoeker de nieuwe pagina ziet of een oude uit de cache
   van de hosting — de eerste vraag bij elke melding.
2. **Zelftest** ("Werkt het niet? Klik hier"): zet in zeven regels op het scherm welke
   bouw, welk adres, welke browser, of `localStorage` werkt, of de woordenlijst er staat,
   of er een account is, en of de server antwoordt (met de HTTP-status als dat niet lukt).
   Bedoeld om voor te lezen, zonder devtools.
3. **JavaScript-fouten komen op het scherm**, in het foutvak van het aanmeldscherm. Een
   stille fout is op afstand niet te onderscheiden van een dode knop.

Bindingen op dat scherm lopen via **één klikafhandelaar op het omhulsel**, niet via losse
`addEventListener`-regels per knop: valt één element weg, dan sleurt dat de andere knoppen
niet mee.

Harde regel die hieruit volgt: **het aanmeldscherm mag nooit zichtbaar zijn terwijl de app
draait.** Een eigen `display`-regel wint van het `hidden`-attribuut, en dan staat er een
dood formulier over een werkende app — zichtbaar voor de gebruiker, onzichtbaar in elke
test die alleen naar de server kijkt. Aanvaardingscriterium 42.

### 13.9 Fasering

| Fase | Inhoud |
|---|---|
| 0 | ✔ Hosting geverifieerd (PHP 8.4, MariaDB, cache), 13 september 2026 |
| 1 | ✔ **klaar (13 september 2026)** — server, accounts, staat, sync, logboek, de online build, migratie van de bestaande save |
| 2 | ✔ **klaar (13 september 2026)** — beheerpagina op `/verba/beheer/` (§13.8c), joincodes, PIN-reset, klas hernoemen/wissen, logboek met filter en download, privacytekst in de app, `OUDERBRIEF.md`, `noindex` |
| 3 | Het gezamenlijke doel — per klas; het klasmozaïek ("samen 1051") is de voorzet. Vorm nog te kiezen (§14) |

Niets van fase 3 wordt gebouwd voor fase 1 en 2 stabiel draaien.
