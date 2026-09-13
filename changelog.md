# Changelog — latijn-studietool (VERBA)

## 2026-09-13 — Online modus, fase 1: accounts, centrale voortgang, logboek

### Doel
Robbe leert op meerdere toestellen en begon telkens opnieuw; daarnaast moeten zijn
klasgenoten erop kunnen. Dat vraagt een centrale plaats voor de voortgang — en dus het
einde van "één bestand, geen server". Het offline bestand blijft wel bestaan: het is de
reden dat dit project er is, en de terugvalweg als de hosting ooit stopt.

Beslist vooraf (zie `ONLINE-PLAN.md`, met de afgewogen alternatieven): LWS-hosting met
PHP + MySQL, aanmelden met een klascode, de client blijft baas over zijn eigen score en
de server maakt vals spelen alleen zichtbaar, en van elke speler blijft een leesbaar
logboek bij. Specificatie op **v1.5** met een nieuw hoofdstuk 13 en tien extra
aanvaardingscriteria (32–41).

### 1. Twee builds uit één sjabloon (§2.2, criterium 32/33)
- `bouw.py` levert nu `verba/index.html` (offline, ongewijzigd) én `verba-online/index.html`.
- De synccode staat tussen `/*__ONLINE_BEGIN__*/`-markers en wordt bij de offline build
  **fysiek uitgeknipt**, niet uitgeschakeld met een vlag. `bouw.py` weigert te bouwen als
  er daarna nog een `fetch(`, `XMLHttpRequest` of `WebSocket` in het offline bestand staat.
  "Nul netwerkrequests" is zo een eigenschap van het bestand, niet van een `if`.

### 2. De online build draagt de woordenlijst niet (§13.2a, criterium 36)
Tijdens het bouwen bleek dat de woorden in de HTML zitten: wie de URL kende, had de hele
lijst, klascode of niet — precies wat §13.8 verbiedt. Daarom bevat de online build geen
enkel woord. Na het aanmelden haalt de app ze op bij `/woorden` (token vereist), zet ze in
`localStorage` en herlaadt de pagina; daarna start ze synchroon op zoals offline en werkt
ze ook zonder verbinding. Op de server staan ze in `woorden.php`, niet in een `.json`: een
`.json` in de docroot is rechtstreeks op te vragen.

### 3. Accounts: klascode + naam + PIN (§13.2)
Geen e-mail, geen OAuth, geen herstel per mail. Meerdere klassen naast elkaar; een naam is
uniek *binnen* een klas, dus twee klassen mogen elk hun eigen "Lotte" hebben. De joincode
hoort ook bij het inloggen: hij bepaalt in welke klas er gezocht wordt. PIN met `argon2id`,
tokens alleen als hash bewaard.

### 4. Samenvoegen, nooit overschrijven (§13.5, criterium 37)
Het onderdeel dat stil data vernietigt als het fout is, dus als eerste gebouwd en als enige
met een mutatietest: zes bewust kapotte versies van de samenvoegcode (laatste schrijver
wint, badges met de laatste tijdstempel, client wint altijd, streak overgenomen, geen klem
op toekomstige tijd, hele staat overschrijven) worden alle zes door de testen betrapt.
Tellers nemen het maximum, `laatstGezien` bepaalt welke kant de box zet, badges houden hun
vroegste tijdstempel, de dagstreak wordt herberekend uit de vereniging van de dagen.

### 5. Logboek (§13.7, criterium 39)
Elke rij in `gebeurtenissen` draagt een kant-en-klare Nederlandse zin, zodat het logboek
leesbaar is zonder databasekennis, met filter per klas/leerling/dag en een download als
platte tekst. De zinnen worden op de **server** samengesteld uit een vaste lijst: stuurde
het toestel ze mee, dan schrijft een leerling zijn eigen logboek vol. Per ronde en per
gebeurtenis, nooit per vraag — anders houd je bij welke woorden andermans kind fout had.

### Vier fouten die de tests eruit haalden
1. **De eerste sync werd geweigerd.** Wie al maanden offline leerde, brengt in één keer een
   volle save mee; de XP-grens per uur zag dat als geknoei. De eerste sync is nu een
   migratie: vorm en sleutels worden gecontroleerd, groei niet.
2. **Een vers tweede toestel werd geweigerd** — de regel "tellers mogen niet dalen" sloeg
   aan op een toestel dat legitiem op nul staat. Die regel geldt nu alleen nog voor een
   toestel dat de huidige serverstaat gezien heeft (`basisRev == rev`).
3. **Elke sync stuurde alle 1806 items** (~200 KB), want de app maakt voor elk item een
   lege rij aan. Lege items gaan niet meer mee; een ronde is nu één item groot.
4. **De snelheidslimiet telde geslaagde pogingen mee**, waardoor de beheerpagina zichzelf
   platlegde. Een teller die op raden staat, wordt bij succes gewist.

### Ook opgemerkt
- Deze hosting toont PHP-fouten aan de bezoeker: een onopgevangen uitzondering liet pad,
  stack trace en regelnummer zien. `display_errors` staat nu uit, fouten gaan naar het
  serverlogboek en de bezoeker krijgt één zin.
- De PHP-versie werd van 7.3.33 (end-of-life) naar 8.4.25 gezet, waarmee `argon2id`
  beschikbaar is. Nooit via een `AddHandler` in `.htaccess`: dat schakelt PHP uit en de
  server geeft dan de **broncode** terug, inclusief het databasewachtwoord.
- `server/config.php` staat in `.gitignore`; de FTP-root is de docroot, dus er is geen map
  boven de website om geheimen in te leggen.

### Tests
110 bestaande checks blijven groen. Nieuw: 42 checks op de samenvoegregels, 24 op de
grenzen, 49 op de API van begin tot eind, en 22 in smoke-10 — twee echte browsers die elk
een ronde spelen, samenkomen zonder verlies, en doorwerken met de server afgekoppeld.

### Omgeschakeld: /verba/ is de online build (later dezelfde dag)
- `https://www.steeman.be/verba/` toont nu het aanmeldscherm; de offline build staat naast
  de app als `verba-offline.html` en dat is waar de downloadknop naar wijst. Zonder die
  verhuizing zou de knop de online build uitdelen — een bestand zónder woorden, precies het
  tegenovergestelde van wat hij belooft.
- Meegenomen omdat het omschakelen ze zichtbaar maakt: `noindex` op de online build, en de
  uitklapbare tekst **"Wat bewaart VERBA?"** in de instellingen, waar het aanmeldscherm al
  naar verwees.
- Nieuw endpoint `beheer/code` om een eigen joincode te zetten; die van Robbe is **3LAT**,
  de vorige werkt niet meer. Een korte code geeft makkelijker door en is makkelijker te
  raden — de limiet op joincode-pogingen per IP (§13.6) is wat hem beschermt.
- **Derde vondst in de grenzen:** "leeg account" mag niet betekenen "er is nog nooit
  gesynct", maar "er staat nog niets". Eén aanmelding vanaf een toestel zónder voortgang
  schreef anders een lege staat weg, waarna de échte save van datzelfde kind als
  onmogelijke groei geweigerd werd.

### Meteen daarna: "Aanmelden reageert niet"
Robbe kreeg zijn account niet open. De knop réágeerde wel — de API gaf netjes 409 en de
melding *"die naam is in deze klas al bezet — kies een andere"* stond op het scherm — maar
dat was het verkeerde advies: zijn account was vooraf aangemaakt, dus zijn weg was
"Ik heb hier al een account". Een val die door dat vooraf aanmaken zelf ontstond.

- Bestaat de naam al in die klas, dan probeert de app nu **zelf inloggen** met dezelfde
  gegevens. Lukt dat, dan is hij gewoon binnen; klopt de PIN niet, dan zegt de melding wat
  er aan de hand is en staat de knop al op *Inloggen*.
- Een foutmelding die je over het hoofd ziet, bestaat niet: de melding staat nu in een
  omkaderd vlak in plaats van als los rood regeltje.
- `beheer/logboek` gaf de opgeslagen `cijfers` niet terug — ze werden wél bewaard maar
  nergens getoond. Nu wel, zodat achter elke sync te zien is hoeveel leeritems en XP er ná
  het samenvoegen op de server staan.
- `smoke-2` verwachtte nog dat de downloadknop naar `index.html` wijst; dat is sinds de
  omschakeling `verba-offline.html`.

Onderweg meteen een bewijs uit de praktijk: nadat Robbe zijn 44 leeritems en 9937 XP had
gemigreerd, logde een testbrowser zónder voortgang op hetzelfde account in en synchroniseerde.
Bij "laatste schrijver wint" was zijn voortgang op dat moment weg geweest; het samenvoegen
hield alles staan (44 leeritems, 9937 XP, 4 badges, 6 tesserae, ongewijzigd).

### De bug die een avond kostte: een aanmeldscherm over een werkende app
Op drie browsers en twee machines reageerde geen enkele link op het aanmeldscherm — geen
foutmelding, geen beweging. Ondertussen liet het serverlogboek vrolijk geslaagde logins en
syncs zien. Beide waren waar:

```css
.aanmeld{ ... display:flex; ... }     /* wint van het hidden-attribuut */
```

`hidden` is maar een stijlregel van de browser zelf; een eigen `display:flex` overschrijft
hem. Het aanmeldscherm bleef dus **over de draaiende app hangen**. De app werkte, de
gebruiker keek naar een formulier dat niet meer bediend werd — want bij een ingelogde app
draait de aanmeldcode helemaal niet, dus zaten er ook geen klikafhandelaars op die knoppen.
Geen fout om te melden, dus ook geen foutmelding.

- Fix: `.aanmeld[hidden]{display:none !important}` ná die regel, plus bij het opstarten
  expliciet `hidden = true` en `style.display = "none"` — twee sloten.
- Regressietest `2c2` in smoke-10: zodra de app draait, is het aanmeldscherm weg.

**Les voor de volgende keer:** "ik zie het scherm maar niets werkt" wijst op een scherm dat
getekend wordt zonder dat de bijbehorende code loopt. Daar beginnen, niet bij het netwerk.
Er zijn onderweg drie dingen gebouwd die bleven staan omdat ze hoe dan ook nuttig zijn als
er klasgenoten bij komen: een **bouwstempel** op het aanmeldscherm (zie je de nieuwe pagina
of een oude uit de cache?), een **zelftest**-knop die opslag, adres, account en server in
zeven regels samenvat, en **JavaScript-fouten die op het scherm komen** in plaats van in een
console die niemand openzet. Bindingen gaan nu ook via één afhandelaar op het omhulsel, zodat
één stuk element niet de rest van de knoppen meesleurt.

Onderweg nog opgemerkt: de DDoS-bescherming van de hosting stuurt een headless browser met
403 weg ("LWS Protection DDoS"). Dat lijkt op een stukke app en is er geen — smoke-10 draait
nu met een gewone user-agent en herkent die 403 expliciet.

### Ook nog toegevoegd
- `beheer/hernoem` (een klas een andere naam geven) en `beheer/code` zonder code meesturen
  levert een willekeurige joincode. Robbe's klas heet nu **3LAT** met een willekeurige code.

### Documentatie
- Specificatie op **v1.5**: nieuw hoofdstuk 13 (online modus) met §13.2a (de online build
  zonder woorddata), §13.8a (wat er op de webserver staat) en §13.8b (bouwstempel,
  zelftest, fouten op het scherm, en de harde regel dat het aanmeldscherm nooit over de
  draaiende app mag staan). Aanvaardingscriteria 32 t/m 42.
- De beheer-endpoints staan nu stuk voor stuk in §13.4, niet meer als één regel `/beheer/…`.
- `README.md`: twee builds, de online URL achter een klascode, `verba-offline.html`, en
  waar je begint als het ergens niet werkt. `test/LEESMIJ.txt`: de servertests, de
  beheersleutel als omgevingsvariabele, en de DDoS-val van de hosting.
- `ONLINE-PLAN.md` blijft staan als verantwoording en meetrapport (de afgewogen
  alternatieven + fase 0 op de echte hosting); de spec is wat bindt.

### Fase 2 — de klas kan erop (zelfde sessie, na de commit van fase 1)
- **Beheerpagina** op `/verba/beheer/` (§13.8c): klassen aanmaken/hernoemen/wissen, een
  nieuwe joincode zetten, leerlingen per klas met PIN-reset en verwijderen, en het logboek
  met filter per klas en per dag plus download. Eén bestand, `noindex`, geen link vanuit de
  app; de beheersleutel blijft in het tabblad.
- **`OUDERBRIEF.md`**: het sjabloon dat met de joincode meegaat — wat we wel en niet
  bijhouden, dat het logboek bestaat, dat de school er niet bij betrokken is, en hoe je het
  account laat wissen.
- **Twee fouten die het bouwen opleverde**, allebei met een regel in de spec:
  1. *Namen en logregels worden nooit als HTML uitgevoerd* — ze zijn door leerlingen
     ingevuld (criterium 43, smoke-11 controleert het met een naam vol opmaak).
  2. *Elk paneel heeft zijn eigen volgnummer voor lopende verzoeken.* Een trager, ouder
     antwoord tekende over een nieuwere selectie heen, waardoor er een **ongefilterde**
     lijst onder een gekozen klas stond. Daardoor trof een PIN-reset tijdens het testen de
     verkeerde leerling — Robbe's eigen account. Meteen hersteld (PIN terug op de oude
     waarde, geverifieerd), maar dit is precies hoe zoiets in het echt misgaat. Sindsdien:
     per paneel een eigen teller, de gekozen klas staat boven de lijst, en smoke-11 klikt
     op naam in plaats van op rijvolgorde.
- Nieuwe smoke-11 (17 checks): slot dicht zonder sleutel, klas aanmaken met zichtbare code,
  PIN-reset die echt werkt, logboek van déze klas, geen HTML-uitvoering, en klas wissen.

### Fase 3 — Opus musivum, het klasmozaïek (zelfde dag)
Zeven Romeinse mozaïeken van **96 × 64 = 6144 steentjes**, één per caput, plus een
slotpaneel. Elk woord dat de klas gouden krijgt legt er een hoopje steentjes bij —
verspreid over het vlak, nooit in blokken — en een mozaïek is af wanneer álle woorden van
dat caput door iemand beheerst zijn. Ontworpen in overleg (§13.10): verschillende woorden
in plaats van een optelsom, solo afmaken mag, en je ziet alleen je eigen aandeel.

| Caput | Tafereel |
|---|---|
| 1 · Geluk | Cave canem, de waakhond van Pompeii |
| 2 · Liefde | Amor op een dolfijn |
| 3 · Helden | Gladiatoren, met hun namen erboven |
| 4 · Magie | Medusa |
| 5 · Dood | Het skelet met de wijnkruiken |
| 6 · Afrika | Nijlscène met krokodil en nijlpaard |
| 7 · Alexander | Het Alexandermozaïek |
| alle zeven af | De wolvin met Romulus en Remus |

- **Tekenpijplijn** in `mozaieken/`: de rand (meanderband) wordt gegenereerd, alleen het
  middenstuk is tekenwerk — precies zoals een Romeins mozaïek een fijne *emblema* in een
  grover veld zette. `schets.py` tekent met vormen en bevriest het raster in `rasters.py`
  (de bron van waarheid), `contactblad.py` toont elk paneel compleet én halverwege,
  `injecteer.py` schrijft ze in het sjabloon.
- **Server**: één tabel `klaswoorden(klas, woord, wie, wanneer)` — wie een woord als eerste
  gouden krijgt legt de steentjes, daarna telt het niet nog eens. `server/woordmeta.php`
  (gegenereerd) zegt bij welk caput een woord hoort en hoeveel richtingen het heeft, zodat
  een sync geen 275 KB woorddata hoeft te parsen. Daglimiet van 40 woorden per leerling.
- **Scherm**: acht canvaspanelen met 1 tessera voegruimte tussen de steentjes; de
  legvolgorde komt uit een vast zaad per mozaïek, dus dezelfde stand geeft overal hetzelfde
  beeld zonder dat er iets voor verstuurd wordt.

### Wat het tekenen leerde
- Met de hand 40 × 24 tekens intypen gaf een berg waar een hond hoorde te staan. Vandaar
  het schetsgereedschap — en vandaar dat de korrel naar 96 × 64 ging: op de kleine korrel
  paste geen enkel detail dat een dier herkenbaar maakt.
- Twee maten bepaalden de hele hond: de buiklijn en de grondlijn. Zonder daglicht daartussen
  leest hij als een zwijn, hoeveel detail er verder ook in zit.
- Figuren hebben een **donkere contour** nodig; zonder die lijn lopen huid, zand en brons in
  elkaar over en staan er twee beige vlekken in het zand (de gladiatoren, eerste poging).
- De lege voeg moest van zwart naar middengrijs: tegen zwart verdween een zwart onderwerp
  volledig en zag je de eerste weken alleen losse lichte stipjes.

### Twee testfouten die geen appfouten waren
1. In `api-test.js` gebruikten de "gouden" items dezelfde tijdstempel als eerdere stappen;
   bij gelijke stand wint de serverkant (§13.5), dus bleven twee woorden op hun oude box.
   Dat leek een telfout in het mozaïek en was er geen.
2. De spreidingscheck was te streng: bij 4 % raken de steentjes 12 van de 24 vakken, niet 20.
   De juiste maat is het aantal **buren** per steentje (0,63 tegen ~3,5 voor een vlek); die
   meting staat nu in smoke-12 en in criterium 45.

Ook nieuw: `test/lokaal.js`, een testserver die de gebouwde pagina van schijf serveert en
alleen de API doorgeeft. De DDoS-bescherming van de hosting stuurde de testbrowser met 403
weg — dat is geen fout in de app, maar het legde de tests wel plat.

### Tests
9 offline suites (110 checks) ongewijzigd groen, 42 samenvoegen, 25 grenzen, 62 API,
17 beheerpagina, 16 klasmozaïek — samen 272 checks.

### Nog niet gedaan
Nijlpaard en de tweeling onder de wolvin zijn de zwakste tekeningen; die mogen nog een
ronde. Een leerling kan zijn eigen PIN nog altijd niet wijzigen; dat blijft een beheeractie.

## 2026-09-12 (i) — Adaptief leertempo + gratis herkansing bij een misgelezen vraag

### Doel
Twee vragen uit het gebruik:
1. snelle leerders zitten vast in herhalingen van woorden die ze al kennen, trage leerders
   krijgen te veel nieuw materiaal tegelijk;
2. een deel van de fouten zijn leesfouten — de genitief typen terwijl de betekenis
   gevraagd wordt — en die kosten combo, streak en box zonder dat er iets geleerd is.

### 1. Adaptief tempo (§4.4 herschreven, nieuw aanvaardingscriterium 30)
- Elk antwoord in de leermodus levert een **vlotheidsscore** 0–1: fout = 0, bijna = 0,35,
  juist = 1 bij snel en 0,5 bij traag (lineair ertussen), tikfout = juist × 0,9.
- Grenzen per vraagvorm: meerkeuze 4 s / 10 s; typen `3 s + 0,22 s per teken` en
  2,2× dat als traaggrens — zonder die lengtecorrectie geldt elke lange vertaling als traag.
  Boven 60 s is het een pauze, niet traagheid.
- **Tempo-index T** = voortschrijdend gemiddelde (`α = 0,15`, ruwweg de laatste twaalf
  antwoorden), start 0,5, staat in het profiel en overleeft het afsluiten.
- T stuurt twee dingen: het **plafond op items in de lucht** (`afronden(5 + 9·T)`, geklemd
  op 5…14, was vast 10) en het **herhalingsvenster** (4, 5 of 6 woorden, was vast 5). Meer
  herhaling volgt vanzelf: komt er minder nieuw bij, dan vult `kiesVraag()` de ronde met
  due- en onderhoudsvragen.
- Instelling **Leertempo**: Automatisch (standaard) of vast op Rustig (5) / Normaal (10) /
  Snel (14). Bij een vaste keuze blijft het venster 5 en loopt T wel door, zodat
  terugzetten op automatisch meteen een zinnig getal heeft.
- Zichtbaar gemaakt: de instelling toont de huidige stand ("nu 10 woorden tegelijk") en
  Statistieken heeft er een tegel bij. Een onzichtbaar mechanisme dat het gedrag van de app
  verandert is verwarrend.

### 2. Misgelezen vraag = één gratis herkansing (nieuw §7.4a, criterium 31)
Is een getypt antwoord fout voor de gevraagde richting maar **exact juist voor de andere
richting van hetzelfde woord**, dan is het een leesfout. Er wordt niets geteld — geen box,
combo, typ-streak, XP, accuraatheid, tempo-index of vraagteller — en dezelfde vraag komt
opnieuw, met een lege invoer en een blauwe kaart: *"↻ Lees de vraag nog eens — dat is de
genitief van dit woord, er wordt naar de betekenis gevraagd."* Eén keer per vraagbeurt; de
tweede fout telt gewoon. Alleen bij typvragen, en alleen bij woorden met twee richtingen.

### Verificatie
Twee nieuwe suites: **smoke-8** (13 checks: grenswaarden van T, de lengtecorrectie bij
typen, vaste keuzes die T negeren, minder introducties bij "rustig" dan bij "snel", en een
echte ronde door de UI die T omhoog en weer omlaag beweegt) en **smoke-9** (8 checks:
herkenning in beide richtingen, onzin/leeg/eenrichtingswoorden vallen af, en een end-to-end
rit die alle tellers vóór en ná vergelijkt). Totaal nu **110 checks over negen suites**,
alles groen, nul pageerrors.

### Notitie
Eén bug onderweg: `blitzVraag()` gebruikte de constante `VENSTER`, die een functie werd —
Blitz gooide een `ReferenceError` tot dat meeging. Smoke-1 ving dat meteen.

### 3. Documentatie, blogpost en publicatie (zelfde sessie)
- `README.md`: adaptief tempo en de herkansing toegevoegd aan "Wat het doet"; de
  testsectie noemt nu negen suites / 110 checks met smoke-8 en smoke-9. Ook een oude fout
  rechtgezet: "Collectie" werd daar beschreven als *"een mozaïek van alle 1051 woorden dat
  langzaam goud kleurt"* — dat is het mozaïek op het beginscherm; Collectie zijn de twintig
  tesserae. Beide staan er nu apart in. (Die README-regel was de bron van de tooltiptekst
  uit entry (h), vandaar dezelfde verwarring daar.)
- `verba/LEESMIJ.txt` (gaat mee op de stick): twee alinea's in gewone taal over het
  meebewegende tempo en over de gratis herkansing bij een misgelezen vraag.
- `test/LEESMIJ.txt`: smoke-8 en smoke-9 beschreven, "alle zeven" → "alle negen".
- **Blogpost** `verba-an-offline-latin-vocabulary-trainer.md` op steeman.be: twee nieuwe
  secties — *Letting the pace find the learner* (waarom een vast plafond van tien voor
  niemand klopt, de vlotheidsscore met zijn drempels, de tabel traag/midden/vlot, en dat de
  extra herhaling vanzelf uit het bestaande algoritme volgt) en *The right answer to the
  wrong question*. Cijfers bijgewerkt: spec 50 → 56 KB, 25 → 31 aanvaardingscriteria,
  zeven suites/89 asserts → negen/110.
- Eerder in dezelfde sessie: alle vijf de screenshots in die blogpost opnieuw genomen met
  de panorama-achtergrond (smoke-3, daarna 1280×900 JPG + 760×534 thumbs, mobiel 360×760),
  en de op steeman.be gepubliceerde `verba/index.html` liep nog achter op de repo — die is
  meteen mee bijgewerkt.
- Alles via Hugo + curl-FTP gepubliceerd en live geverifieerd (HTTP 200, bestandsgroottes
  van de nieuwe versies, geen stale edge-cache).

## 2026-09-12 (h) — Uitleg bij de tegels, "accuraatheid", en een vraagkop die je niet mist

### Doel
Drie kleine dingen uit het gebruik: onduidelijk wat een tegel doet, een term die niet
lekker lag, en — het echte probleem — vormvragen die als betekenisvragen beantwoord
werden omdat de vraagzin niet gelezen werd.

### Uitgevoerd
- **`title`-uitleg (§6.0)** op alle klikbare ingangen van het thuisscherm: Verder leren,
  Zwakke plekken, het mozaïek, Verover, Blitz, Ontdek, Badges, Collectie en Statistieken.
  Teksten voor Badges/Collectie/Statistieken zelf geformuleerd in dezelfde toon.
- **"accuratesse" → "accuraatheid"** in het statistiekenscherm, de spec (§6.7) en de
  codecommentaar.
- **Vraagkop als badge (§7.1.1)**: de vraagsoort staat nu in een pil met eigen kleur per
  richting — blauw "Wat BETEKENT" tegenover goud "Geef de GENITIEF van" — met het
  kernwoord vet, in hoofdletters en onderstreept. Was: 0,78 rem kleinkapitaal in de
  caputkleur, dus wisselend van kleur per caput en makkelijk over te slaan. De badge
  gebruikt bewust *niet* de caput-accentkleur, anders verdwijnt het onderscheid tussen de
  twee richtingen weer.

- **Iconen in de vraagkop**: eerst emoji (💬/🔤), maar die passen niet bij het Romeinse
  thema — vervangen door inline SVG in de lijnstijl van de app: een **volumen**
  (papyrusrol met golvende randen en twee tekstregels) voor de betekenis en een
  **Romeinse zuil** (kapiteel, drie schachten, basement — familie van de tempel-favicon)
  voor de vorm. `stroke:currentColor`, dus ze nemen automatisch de badgekleur over.

### Verificatie
Alle zeven smoketests groen (89/89), nul pageerrors. Iconen op 4× ingezoomd beoordeeld
(twee tussenversies verworpen: een notitieblok en iets dat op een sleutel leek). Aparte controle: de negen
title-teksten staan op de juiste elementen, beide vraagkoppen renderen als één regel
("💬 Wat BETEKENT" / "🔤 Geef de GENITIEF van") en het woord "accuratesse" komt nergens
meer in de app voor.

## 2026-09-12 (g) — Colofon in de app + licentie op het project

### Doel
Auteurschap, licentie en bron zichtbaar maken in de app zelf, en het project van een
echte licentie voorzien (de repo had er geen).

### Uitgevoerd
- **Colofon** (`sjabloon.html`, nieuw `<footer class="colofon">` onder `</main>`, dus
  onder álle schermen): `© 2026 Robbe en David Steeman · CC BY-NC-SA 4.0 · broncode op
  GitHub`. Kleine gedempte letters (`--tx3`, 12 px) boven een scheidingslijn; links
  krijgen goudkleur bij hover. Op <720 px vallen de scheidingstekens weg en staat elk
  deel op een eigen regel.
- **Spec §6.0** uitgebreid met de colofon-regel (de spec loopt voorop, zoals afgesproken).
- **`LICENSE`** toegevoegd: CC BY-NC-SA 4.0 (volledige legal code) met een Nederlandse
  kop die vastlegt dat de licentie op de tool slaat en niet op de woordenlijst uit het
  schoolboek. `README.md` heeft een Licentie-sectie.

### Verificatie
Alle zeven smoketests groen (89/89). Aparte controle op 1280×900 en 360×760: colofon
zichtbaar en leesbaar, geen horizontale scroll (`scrollWidth == clientWidth`), beide
links correct, en **nul externe requests** — de `<a href>`'s doen niets uit zichzelf,
dus de offline/single-file-eis (§2) blijft intact.

## 2026-09-12 (f) — Romeins panorama als paginabrede achtergrond (AI-gegenereerd, ligne claire)

### Doel
De wens uit entry (e) — een gedempte Romeinse stadsscène in Tintin-stijl (ligne
claire) — opnieuw uitgevoerd, nu met een AI-gegenereerde afbeelding in plaats van
een handgetekende SVG, en als achtergrond *achter* de hele pagina in plaats van
een band bovenaan die de inhoud wegduwt.

### Aanpak
- **Afbeelding:** gratis generatie via Neural.love (ligne claire-model): Romeins
  stadspanorama bij dag, Colosseum rechts, tempels/aquaduct/terracotta daken en
  cipressen links, rustige lucht bovenin. Watermark (linksonder) eruit gesneden
  (onderste 104 px), 2× ge-upscaled naar 2048 px, JPEG q80 — 370 kB, base64
  ingebed zodat de single-file/offline-eis voor USB intact blijft.
  `index.html` groeit daardoor van ±420 naar 897 kB.
- **Plaatsing:** `.rome` zit direct onder `<body>` (niet meer in `#scr-home`),
  `position:fixed;inset:0;z-index:-1` — een echte achtergrond achter *alle*
  schermen, ook tijdens vragen en op de statspagina. Geen `padding-top` meer:
  titel en inhoud beginnen gewoon bovenaan.
- **Leesbaarheid:** dekking 38 % (mobiel 34 %) plus een donkere scrim van boven
  naar beneden (`rgba(14,13,20,.42)→.78`) die de tekening zacht in het donkere
  thema laat oplossen. `filter:saturate(.85) brightness(.9)` dempt de kleuren
  verder; de terracotta/okertinten sluiten aan bij het goud/oranje van de app.
- **Mobiel (<720px):** `background-position:72% 70%` zoomt in op het Colosseum,
  zodat het sterkste element overblijft waar de linkerhelft op 390 px tot
  dakenpakken verdampt.

### Verificatie
Beeldanalyse van Playwright-screenshots (1440×900 en 390×844): titel en tekst
overal leesbaar, geen watermark zichtbaar, Colosseum herkenbaar op beide
formaaten. Alle zeven smoketests groen (89/89 checks), waaronder de
nul-netwerkrequests-check (de afbeelding is ingebed, geen extern bestand).
`test/shots/*` vernieuwd door smoke-3.

### Favicon (openstaand verzoek uit entry (e))
Uitgevoerd in dezelfde release: een inline SVG-data-URI (1 kB, geen bestand,
geen netwerkrequest) van een Romeinse tempelgevel — gulden fronton en basement,
vier crèmekleurige kolommen, afgeronde tegel in de donkere paginakleur.

### Gepubliceerd
Commit `4c532da` (sjabloon, build, changelog, screenshots) naar GitHub
gepusht; `verba/index.html` (919 kB) via curl-FTP naar `steeman.be` geüpload
en live geverifieerd: HTTP 200, panorama-markup én favicon-link aanwezig op
https://www.steeman.be/verba/. De afbeelding is een gratis Neural.love-
generatie met weggesneden watermark — wil dat ooit niet meer, dan is een
betaalde schone regeneratie een base64-swap + `bouw.py`, geen codewijziging.

## 2026-09-12 (e) — Romeins panorama op het beginscherm (ligne claire)

> **Teruggedraaid (zelfde dag):** het panorama is na twee herzieningen (vol panorama →
> Colosseum-dominante scène) toch verwijderd — het voldeed niet. SVG en CSS zijn
> volledig uit `sjabloon.html` weggehaald; deze entry dient alleen als archivedaad.
> De kale versie is als `0b275a4` gecommit, naar GitHub gepusht en opnieuw
> gepubliceerd op https://www.steeman.be/verba/ (website-repo `f1bd6f0`, FTP-upload,
> live geverifieerd: HTTP 200, geen panorama-markup).
>
> **Openstaand verzoek:** de favicon vervangen door een Romeinse tempelgevel met
> kolommen (later in de sessie gevraagd, nog niet uitgevoerd).

### Doel
Een gedempte achtergrondtekening van een Romeinse scène op het beginscherm, in
Tintin-stijl (ligne claire), zonder de leesbaarheid te storen.

### Oplossing
Een handgetekende inline SVG in `sjabloon.html` (geen externe bestanden, dus de
single-file/offline-eis voor USB blijft intact): een **oorlogstrireem** (romp met
ram, vierkant zeil aan de ra, pennant, geharkte riemen, stuurriem, krulsteven)
op de voorgrond links, een **maan** met halo en vogels in het midden, en het
**Colosseum** rechts (drie arcade-verdiepingen, gebroken ruïnekroon, binnenmuur,
gezamenlijke plint) met cipressen en paraplu dennen. Het water verloopt onderin
naar de paginakleur zodat de band zacht in de app overgaat.

- Stijl: uniforme lijndikte (2,5 eenheden), platte vlakken, gedempte kleuren uit
  het eigen nachtpalet (steen, terracotta, goud) op 60 % dekking (mobiel 55 %).
- Plaatsing: de band krijgt een eigen zone bovenaan (`--romeH:clamp(230px,30vw,400px)`,
  full-bleed via `left/right:calc(50% - 50vw)`); titel en knoppen beginnen eronder
  (`#scr-home.on{padding-top:calc(var(--romeH) - 14px)}`), zodat geen tekst met de
  tekening concurreert. Eerste poging was een vrij zwevende achtergrond, maar toen
  viel het schip weg achter de Leerpakket-kaart.
- Mobiel (<720px): het hele panorama van 1600 eenheden is op 390 px onleesbaar,
  dus `transform:scale(1.9)` op de svg zoomt in op schip + maan + begin Colosseum;
  `.rome{overflow:hidden}` voorkomt horizontale scroll (de 360px-check in smoke-1
  ving dit).
- Gewijzigd: `sjabloon.html` (CSS-blok + SVG in `#scr-home`), daarna
  `python3 bouw.py` voor `verba/index.html`; `test/shots/*` vernieuwd door smoke-3.

### Verificatie
De tekening is iteratief bijgeslepen via screenshots + beeldanalyse (ram vast aan
de romp, ra en mast zichtbaar, riemen geharkt tot de waterlijn, boot "in" het water
door kabbellijnen tegen de kiel, bomen vrij van het Colosseum, unificerende plint).
Alle zeven smoketests groen (85/85 checks), waaronder responsive en
nul-netwerkrequests.

### Notities
- De SVG gebruikt `<use href="#boog">` voor de arcade-bogen (één symbool, 24×).
- `package.json` (playwright-afhankelijkheid voor de smoketests) is nieuw in de
  repo-root; `node_modules/` en `package-lock.json` staan in `.gitignore`.

## 2026-09-12 (d) — Meerkeuze bij vormvragen: variëren op de uitgang, niet op de stam (§7.2)

### Probleem
Bij een vormvraag kwamen de drie afleiders van *andere* woorden. Bij `lītus` stond er dan
maar één optie met de stam `lītor-` tussen drie vreemde stammen (`amīcī`, `fāmae`, `ducis`)
— te raden zonder de uitgang te kennen. Hetzelfde gold voor de overige vormen van een
adjectief en voor de stamtijden van een werkwoord.

### Oplossing
Drie bouwers (`genAfleiders`, `adjAfleiders`, `wwAfleiders`) maken de afleiders uit het
gevraagde woord zelf; `afleiderTeksten()` kiest de juiste en valt terug op de oude
selectie wanneer een woord niet te ontleden valt.

- **Zelfstandige naamwoorden** — dezelfde stam, een andere genitiefuitgang: enkelvoud
  `-ae / -ī / -is / -ūs` (met `-ēī` pas als vierde keuze, de vijfde declinatie is te
  zeldzaam), meervoud `-ārum / -ōrum / -ium / -um`. Bij een stamverandering
  (`lītus → lītoris`) krijgt **één** afleider de nominatiefstam (`lītī`): anders verklapt
  de stamwissel het antwoord, en met vier keer dezelfde stam zou hij die gratis krijgen.
  Het geslachtsachtervoegsel (`, m.`, `, v. mv.`) gaat mee naar élke optie.
- **Bijvoeglijke naamwoorden** — zeven paradigma's herkend aan het juiste antwoord
  (`bona, bonum`, `gravis, grave; gravis`, `atrōx, atrōx; atrōcis`, `nūlla, nūllum; nūllīus`,
  `multae, multa`, `omnēs, omnia; omnium`, `māior, māius; māiōris`); de afleiders zetten
  dezelfde stam in een ander paradigma. Waar de stam wisselt (`sacer → sacra`,
  `atrōx → atrōcis`) staat er altijd één afleider bij die die wissel niet maakt.
- **Werkwoorden** — de afleiders regulariseren de stamtijden volgens de vervoeging van de
  infinitief (`vidēre → viduī, viditum`) en vormen de ene stamtijd uit de andere
  (`vīsī, vīsum`, `vīdī, vīditum`). Deponentia variëren op het participium, werkwoorden
  zonder supinum houden hun `-`.
- **Geloofwaardigheidsfilter**: een kandidaat met een medeklinkergroep of een dubbele
  letter die niet in het woord zelf voorkomt (`movsī`, `expellsī`, `horttus`) valt af —
  alleen `ii` mag altijd (`fīliī`, `glōriī`). Zonder dat filter stonden er opties tussen
  die niemand voor Latijn aanziet, en dat is óók een gratis hint.
- Een afleider is nooit gelijk aan het juiste antwoord, ook niet in een andere aanvaarde
  spelling of zonder macrons.
- Terugval op de oude afleiderselectie voor **19 van de 755** verbuigbare woorden: `vīs`,
  `rēs pūblica`, `alter`, `plērīque`, `ūnus`, `duo`, `trēs`, `alius`, `meus`/`tuus`/`suus`/`reus`
  (stam te kort voor een geloofwaardig paradigma), `esse`, `velle`, `mālle`, `nōlle`, `īre`,
  `accidere`, `contingere`.
- Beide oproepplaatsen (leerronde en blitz) gaan via `afleiderTeksten(w, r, n)`.

### Tests
Alle zeven smoketests groen (`npm install playwright` was op deze pc opnieuw nodig; de
`node_modules/` staat in `.gitignore`). Extra gecontroleerd in de browser op
`verba/index.html`: 4530 trekkingen over alle 755 verbuigbare woorden, telkens vier opties,
**nul** afleiders die gelijk zijn aan het juiste antwoord of aan een aanvaarde spelling
ervan, nul JS-fouten.

### Gepubliceerd
`verba/index.html` (421 KB) en `verba/LEESMIJ.txt` gekopieerd naar
`website-steeman.be/static/verba/`, `hugo --gc --minify`, en per curl over FTP geüpload
naar `/verba/` (lftp-mirror niet nodig voor twee bestanden). Geverifieerd op
<https://www.steeman.be/verba/>: HTTP 200, byte-identiek aan het gebouwde bestand, en in
headless Chromium **nul JS-fouten, nul externe requests**; de afleiders komen daar
morfologisch binnen (`sequī → sequītus sum / sequātus sum / sequtus sum`).

### Documentatie
- `FUNCTIONELE-SPECIFICATIE.md` §7.2 herschreven: de morfologische afleiderselectie per
  woordsoort staat nu vóór de oude (algemene) prioriteitslijst, met het
  geloofwaardigheidsfilter en de lijst terugvalwoorden.
- `README.md`: bullet over meerkeuze die op de uitgang varieert.
- `verba/LEESMIJ.txt`: uitleg voor de leerling dat de vier keuzes bij een vormvraag op
  elkaar lijken (ook live gezet).

## 2026-09-12 (c) — Downloadknop + gepubliceerd op steeman.be/verba

### Gepubliceerd
De app staat online op <https://www.steeman.be/verba/> als static asset van de Hugo-site
(`static/verba/index.html` in `website-steeman.be`). Geverifieerd op de live URL met
headless Chromium: 1051 woorden, ronde speelbaar, **nul externe requests, nul fouten**.
De bijbehorende blogpost staat op
<https://www.steeman.be/posts/verba-an-offline-latin-vocabulary-trainer/>.

### Downloadknop (§6.8)
Instellingen ⚙ → **App downloaden**: een gewone `<a href="index.html" download="verba.html">`
naar het eigen bestand, zodat de webversie een kopie voor op de USB-stick kan afleveren.

- Het blok is `hidden` en wordt in `toonDownload()` alleen getoond wanneer
  `location.protocol !== "file:"` — draait de app al van schijf, dan valt er niets te halen.
- Geen achtergrondverkeer: er gebeurt alleen iets als hij klikt. Criterium 2 (nul
  netwerkrequests) is daarop genuanceerd in de spec.
- `.knop` kreeg `display:inline-block`, `text-decoration:none` en `color:inherit`, zodat een
  link er hetzelfde uitziet als een knop (anders stond er een blauwe browserlink).

### Tests
- `test/smoke-2` heeft er twee checks bij: het downloadblok is verborgen over `file://`,
  en de knop wijst naar `index.html` met `download="verba.html"`. Alle suites: **89 checks**.
- Handmatig geverifieerd op de live site: het gedownloade `verba.html` is byte-identiek aan
  `verba/index.html`, draait vanaf schijf en verbergt daar zijn eigen downloadknop.

### Documentatie
`FUNCTIONELE-SPECIFICATIE.md` §6.8 en criterium 2, `verba/LEESMIJ.txt` (stap 0 voor wie van
de webversie komt), `test/shots/7-instellingen.png` vernieuwd.

## 2026-09-12 (b) — Tikfouten tellen als juist, volgorde van betekenissen vrij

### Aanleiding
Twee klachten na het gebruik van de vorige ronde aanpassingen: een tikfout gaf "bijna",
wat frustreert en de reeks stilzet; en wie twee juiste betekenissen in de andere volgorde
typt, kreeg "fout" (`zorgen voor, verzorgen` ↔ `verzorgen, zorgen voor`).

### Wat er mis was
- **"Bijna" was een straf met korting.** De combo brak niet, maar groeide ook niet
  (multiplier bevroor), de typ-streak stond stil, de box schoof niet op naar goud, het
  antwoord telde in géén van beide accuratesse-tellers, en de "Vlekkeloos"-bonus (+50) en
  de bijbehorende rondebadge waren weg omdat die `Q.bijna === 0` eisen.
- **De herkenning was te smal.** `lev()` brak af bij een lengteverschil > 1 en eiste
  afstand exact 1 op antwoorden van ≥ 5 tekens. Een verwisseling (`amicsu`) is in gewone
  Levenshtein afstand 2 en werd dus gewoon **fout**, net als elke tikfout in een kort woord.
- **Betekenissen werden als een rij vergeleken**, niet als een verzameling: alleen de
  gedrukte volgorde stond in `ta`.

### Wat er veranderd is (§7.4)
1. **Nieuwe uitkomst `tikfout`, die als juist telt**: box +1, combo +1, typ-streak +1,
   telt in de accuratesse, behoudt "Vlekkeloos" en is in Verover/examen geen misser.
   Alleen de XP is 16 i.p.v. 20, en de feedback toont de juiste spelling
   ("✓ Juist — tikfoutje: je schreef …").
2. **Damerau-Levenshtein** (`damLev`): een verwisseling van twee buren kost één fout.
   Tolerantie schaalt met de lengte: < 4 tekens 0, 4–9 tekens 1, ≥ 10 tekens 2.
3. **Twee grenzen** houden het eerlijk:
   - `antwIndex()` — een geïndexeerde verzameling van álle antwoorden uit de woordenlijst.
     Is wat hij typte een geldig antwoord van een **ander** woord, dan is het verwarring
     en blijft het fout (`de vijand` voor `de vriend`).
   - Bij `L2V` moet de **uitgang** kloppen (`staart() >= 2`), want de uitgang ís de
     leerstof. Uitzonderingen die nooit een geldige andere vorm opleveren en dus overal
     mogen: een dubbele letter (`ontdubbel`) en een verwisseling van twee buren
     (`isVerwisseling`). `amicō` voor `amicī` blijft daardoor "bijna".
4. **Betekenissen zijn een verzameling**: bij `L2N` wordt het antwoord op `", "` gesplitst
   en deel voor deel vergeleken met alle aanvaarde delen. Volgorde vrij, één betekenis
   volstaat nog altijd, elk deel moet kloppen en mag maar één keer voorkomen. Bij `L2V`
   blijft de vorm één geheel (anders zou `bonum` alleen volstaan voor `bona, bonum`).
5. **"Bijna" bestaat nog** maar alleen nog voor uitgangsfouten bij vormvragen, met het
   oude gevolg (halve XP, box blijft). Het rondeoverzicht toont nu "tikfoutjes" en meldt
   eventuele bijna-antwoorden apart.

### Voorbeelden (uit smoke-7)
| invoer | woord/richting | uitkomst |
|---|---|---|
| `de vrind`, `de vriedn` | 2 amīcus · L2N | tikfout |
| `de vijand` | 2 amīcus · L2N | fout (antwoord van een ander woord) |
| `amcii`, `amicii` | 2 amīcus · L2V | tikfout (stam) |
| `amico` | 2 amīcus · L2V | bijna (uitgang) |
| `zorgen voor, verzorgen` | 263 cūrāre · L2N | juist |
| `zorgen voor, verzrogen` | 263 cūrāre · L2N | tikfout |
| `verzorgen, de vriend` | 263 cūrāre · L2N | fout |

### Tests
- Nieuw: `test/smoke-7-tikfouten.js` (16 checks), met een **kruiscontrole** over 185 897
  woordparen: geen enkel antwoord van een ander woord glipt door als tikfout. Speelt ook
  een echte ronde met een tikfout erin en controleert dat combo en typ-streak doorlopen.
- `test/smoke-2` aangepast: de check "typfout = bijna" is nu "typfout = tikfout".
- Alle suites groen: 37 + 13 + 4 + 3 + 5 + 9 + 16 = 87 checks.

### Documentatie bijgewerkt
| Bestand | Wat |
|---|---|
| `FUNCTIONELE-SPECIFICATIE.md` | §7.4 herschreven (tikfout-herkenning, de vier uitkomsten, betekenissen als verzameling), criteria 12 en 12a |
| `README.md` | de regel over antwoordbeoordeling |
| `verba/LEESMIJ.txt` | uitleg voor de gebruiker: een tikfoutje telt als juist, volgorde van betekenissen maakt niet uit |
| `test/LEESMIJ.txt` | wat smoke-7 bewaakt, inclusief de kruiscontrole |
| `test/shots/8-tikfout.png` | screenshot van de nieuwe feedbackkaart |

### Aandachtspunt
Een tikfout laat het item **wel** naar de volgende box gaan en telt in Verover/examen als
juist. Dat is bewust (hij kent het woord), maar het betekent dat een sectie veroverd kan
worden met een tikfout erin. Wie dat niet wil, zet Strengheid op "streng": daar bestaat
geen tikfout en ligt ook de volgorde van de betekenissen vast.

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
