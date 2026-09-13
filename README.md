# VERBA — Latijnse woordenschat

Een studietool voor de Latijnse woordenlijst van Caput 1 t/m 7 (1051 woorden), in **twee
builds uit dezelfde bron**:

- **offline** — `verba/index.html`, één enkel bestand: kopieer het naar een USB-stick,
  dubbelklik, klaar. Geen installatie, geen server, geen internet, nul netwerkrequests.
  Dit blijft het hoofdding, en een online functie die dit breekt wordt niet gebouwd.
- **online** — `verba-online/index.html` plus een kleine PHP/MySQL-API: één account per
  leerling, voortgang die op al zijn toestellen gelijk loopt, en een klas die samen leert.
  Werkt zonder verbinding gewoon door en synchroniseert later alsnog.

**Draait online op <https://www.steeman.be/verba/>** — dat is sinds 13 september 2026 de
**online build**: je hebt er een klascode voor nodig. De offline versie blijft er staan als
`verba-offline.html`, met een knop in Instellingen ⚙ om ze te downloaden. Achtergrond en ontwerpkeuzes staan in
[deze blogpost](https://www.steeman.be/posts/verba-an-offline-latin-vocabulary-trainer/).

## Wat het doet

- **Verder leren** — rondes van 10/15/20 vragen uit een Leitner-motor met zes boxen,
  afwisselend meerkeuze en zelf typen.
- **Zwakke plekken** — een ronde die vooraf de zwakste woorden van het actieve pakket kiest.
- **Ontdek** — vrij bladeren, zoeken en flashcards, zonder scoring.
- **Blitz** — 60 seconden, zoveel mogelijk juiste antwoorden.
- **Verover** — per sectie alles typen tot je ze veroverd hebt; 59 toetsen ontgrendelen het examen.
- **Collectie** — twintig Romeinse mozaïeksteentjes die je één voor één vrijspeelt.
- **Het mozaïek** op het beginscherm — alle 1051 woorden als één cel per woord, dat
  langzaam goud kleurt naarmate je ze beheerst.
- XP, levels, combo's, dagstreak, 20 badges en 20 tesserae.
- **Adaptief leertempo**: hoe juist én hoe snel je antwoordt bepaalt hoeveel nieuwe woorden
  er tegelijk in behandeling zijn (5 tot 14, standaard automatisch) en hoe ver twee beurten
  van hetzelfde woord uit elkaar liggen. Minder nieuw materiaal betekent vanzelf meer
  herhaling. Vast te zetten op Rustig/Normaal/Snel in de instellingen (§4.4).
- **Eén gratis herkansing bij een misgelezen vraag**: typ je de genitief terwijl de
  betekenis gevraagd wordt (of omgekeerd), dan telt die beurt niet — geen box, combo,
  streak of XP — en komt dezelfde vraag opnieuw (§7.4a).
- Antwoordbeoordeling die macrons nooit verplicht, meerdere betekenissen in gelijk welke
  volgorde aanvaardt en een tikfout als juist rekent (met de juiste spelling in de
  feedback) — behalve wanneer het een geldig antwoord van een ánder woord is, of wanneer
  bij een vormvraag de uitgang niet klopt.
- Meerkeuze bij een vormvraag varieert op de **uitgang**, niet op de stam: de vier opties
  zijn vormen van hetzelfde woord (`amīcī / amīcae / amīcis / amīcūs`), zodat de juiste
  stam herkennen niet meer volstaat.
- Voortgang in `localStorage`, met backup opslaan/laden over `file://`.
- **Het klasmozaïek** (online): zeven Romeinse mozaïeken van 6144 steentjes, één per caput —
  Cave canem, Amor op een dolfijn, gladiatoren, Medusa, het skelet met de wijnkruiken, een
  Nijlscène en het Alexandermozaïek. Elk woord dat iemand in de klas gouden krijgt, legt er
  verspreid steentjes bij; samen alle woorden van een caput = het mozaïek compleet. Wie alle
  zeven legt, krijgt de wolvin met Romulus en Remus.
- **Online**: aanmelden met een klascode, een naam en een PIN van 4 cijfers — geen
  e-mailadres, geen echte naam. Voortgang van twee toestellen wordt **samengevoegd**, nooit
  overschreven: wie 's avonds op de tablet verder leert, verliest zijn ochtend op de laptop
  niet. Van elke speler en elke actie houdt de server een leesbaar logboek bij.

Werkt de online versie ergens niet, begin dan bij het **bouwstempel** onderaan het
aanmeldscherm (zie je de nieuwe pagina of een oude uit de cache?) en bij de knop
**"Werkt het niet? Klik hier"**: die zet opslag, adres, account en serverstatus in zeven
regels op het scherm, zonder devtools (§13.8b).

## Repo-inhoud

| Bestand | Wat |
|---|---|
| `FUNCTIONELE-SPECIFICATIE.md` | de bindende specificatie; alles wat de app doet staat hier |
| `woordenlijst.md` | de woordenlijst als bron, overgetypt uit scans en gecontroleerd tegen het register |
| `maak-data.py` | `woordenlijst.md` → `latijn.json` (incl. de aanvaarde antwoordvarianten) |
| `sjabloon.html` | de app zelf, met een `/*__DATA__*/`-placeholder |
| `bouw.py` | `sjabloon.html` + `latijn.json` → beide builds + `server/woorden.php` |
| `verba/index.html` | het gebouwde resultaat: dit bestand gaat op de USB-stick |
| `verba-online/index.html` | de online build — zonder woorddata, die komt na het aanmelden |
| `server/` | de API (PHP 8.4 + MariaDB): accounts, samenvoegen, grenzen, logboek |
| `server/beheer/` | de beheerpagina: klassen, joincodes, PIN-resets, logboek |
| `OUDERBRIEF.md` | sjabloon dat met de joincode meegaat naar de ouders |
| `ONLINE-PLAN.md` | waarom de online modus is zoals ze is, en het meetrapport van de hosting |
| `test/` | smoketests (headless Chromium via Playwright) + de servertests |
| `tesserae/` | de pixelrasters van de verzamelsteentjes |
| `mozaieken/` | de acht klasmozaïeken: rasters, schetsgereedschap, contactblad, injectie |
| `changelog.md` | wat er wanneer veranderd is, en waarom |

## Bouwen

```bash
python3 maak-data.py     # woordenlijst.md -> latijn.json
python3 bouw.py          # -> verba/index.html, verba-online/index.html, server/woorden.php
```

De synccode staat in `sjabloon.html` tussen `/*__ONLINE_BEGIN__*/` en `/*__ONLINE_EINDE__*/`
en wordt bij de offline build **uit het bestand geknipt** — `bouw.py` weigert te bouwen als
er daarna toch nog een `fetch(` in staat.

## Testen

Playwright is nodig (`npm install playwright`); de scripts wijzen naar een chromium die
al op de machine stond — pas `executablePath` aan als die er niet meer is.

```bash
for t in test/smoke-*.js; do node "$t" || break; done
```

Negen suites, samen 110 checks; groen = exit 0. Daarnaast voor de online modus
`php test/samenvoegen-test.php` en `php test/grenzen-test.php` (geen server nodig), en met
een beheersleutel `node test/api-test.js` en `node test/smoke-10-online-sync.js` tegen de
echte server — zie `test/LEESMIJ.txt`. De belangrijkste test is de invariant in
smoke-1 en smoke-3: voor alle 1806 leeritems moet het antwoord dat de app zelf toont ook
door de app aanvaard worden, met en zonder macrons, in soepele en in strenge modus.
Smoke-8 legt het adaptieve tempo vast (grenswaarden, lengtecorrectie bij typen, een echte
ronde door de UI) en smoke-9 de herkansing bij een misgelezen vraag (alle tellers vóór en
ná vergeleken).

## Herkomst van de woordenlijst

`woordenlijst.md` is overgetypt uit de woordenlijst achteraan een schoolboek, voor
persoonlijk studiegebruik. De verantwoording en de conventies staan bovenaan dat bestand.

## Licentie

© 2026 Robbe en David Steeman. De app, de specificatie, de bouwscripts en de tests staan
onder [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — zie
`LICENSE`. De woordenlijst zelf komt uit een schoolboek en valt daar niet onder; die
rechten blijven bij de rechthebbende.
