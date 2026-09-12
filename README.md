# VERBA — Latijnse woordenschat

Een offline studietool voor de Latijnse woordenlijst van Caput 1 t/m 7 (1051 woorden).
Eén enkel HTML-bestand, `verba/index.html`: kopieer het naar een USB-stick, dubbelklik,
klaar. Geen installatie, geen server, geen internet — en nul netwerkrequests.

**Draait online op <https://www.steeman.be/verba/>** — met een knop in Instellingen ⚙ om
het bestand zelf te downloaden. Achtergrond en ontwerpkeuzes staan in
[deze blogpost](https://www.steeman.be/posts/verba-an-offline-latin-vocabulary-trainer/).

## Wat het doet

- **Verder leren** — rondes van 10/15/20 vragen uit een Leitner-motor met zes boxen,
  afwisselend meerkeuze en zelf typen.
- **Zwakke plekken** — een ronde die vooraf de zwakste woorden van het actieve pakket kiest.
- **Ontdek** — vrij bladeren, zoeken en flashcards, zonder scoring.
- **Blitz** — 60 seconden, zoveel mogelijk juiste antwoorden.
- **Verover** — per sectie alles typen tot je ze veroverd hebt; 59 toetsen ontgrendelen het examen.
- **Collectie** — een mozaïek van alle 1051 woorden dat langzaam goud kleurt.
- XP, levels, combo's, dagstreak, 20 badges en 20 tesserae.
- Antwoordbeoordeling die macrons nooit verplicht, meerdere betekenissen in gelijk welke
  volgorde aanvaardt en een tikfout als juist rekent (met de juiste spelling in de
  feedback) — behalve wanneer het een geldig antwoord van een ánder woord is, of wanneer
  bij een vormvraag de uitgang niet klopt.
- Voortgang in `localStorage`, met backup opslaan/laden over `file://`.

## Repo-inhoud

| Bestand | Wat |
|---|---|
| `FUNCTIONELE-SPECIFICATIE.md` | de bindende specificatie; alles wat de app doet staat hier |
| `woordenlijst.md` | de woordenlijst als bron, overgetypt uit scans en gecontroleerd tegen het register |
| `maak-data.py` | `woordenlijst.md` → `latijn.json` (incl. de aanvaarde antwoordvarianten) |
| `sjabloon.html` | de app zelf, met een `/*__DATA__*/`-placeholder |
| `bouw.py` | `sjabloon.html` + `latijn.json` → `verba/index.html` |
| `verba/index.html` | het gebouwde resultaat: dit bestand gaat op de USB-stick |
| `test/` | smoketests (headless Chromium via Playwright) |
| `tesserae/` | de pixelrasters van de verzamelsteentjes |
| `changelog.md` | wat er wanneer veranderd is, en waarom |

## Bouwen

```bash
python3 maak-data.py     # woordenlijst.md -> latijn.json
python3 bouw.py          # sjabloon.html + latijn.json -> verba/index.html
```

## Testen

Playwright is nodig (`npm install playwright`); de scripts wijzen naar een chromium die
al op de machine stond — pas `executablePath` aan als die er niet meer is.

```bash
for t in test/smoke-*.js; do node "$t" || break; done
```

Groen = exit 0. De belangrijkste test is de invariant in smoke-1 en smoke-3: voor alle
1806 leeritems moet het antwoord dat de app zelf toont ook door de app aanvaard worden,
met en zonder macrons, in soepele en in strenge modus.

## Herkomst van de woordenlijst

`woordenlijst.md` is overgetypt uit de woordenlijst achteraan een schoolboek, voor
persoonlijk studiegebruik. De verantwoording en de conventies staan bovenaan dat bestand.
