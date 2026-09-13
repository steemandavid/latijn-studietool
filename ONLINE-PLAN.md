# Plan — VERBA online: centrale voortgang, klasgenoten, samen leren

**Status: verwerkt.** Goedgekeurd op 13 september 2026 en opgenomen in
`FUNCTIONELE-SPECIFICATIE.md` v1.5 — hoofdstuk 13 ("Online modus") plus de wijzigingen
uit hoofdstuk 11 hieronder. **De spec is vanaf nu bindend; dit document niet meer.**

Het blijft wel staan, want het bevat wat niet in een specificatie thuishoort: de
afgewogen alternatieven (hosting, identiteit, vals spelen), de redenen waarom ze het
niet geworden zijn, en het meetrapport van fase 0 op de echte hosting (§3).

Aanleiding: Robbe leert op meerdere toestellen en begint daar telkens opnieuw. Daarnaast
willen we de app openstellen voor zijn klasgenoten, met later een gezamenlijk doel.

---

## 1. Uitgangspunten (niet onderhandelbaar)

1. **De offline app blijft bestaan en blijft ongewijzigd werken.** `verba/index.html` op
   een USB-stick, dubbelklikken, nul netwerkrequests. Dat is de reden dat dit project
   bestaat en het is de terugvalweg als de server stuk is, de hosting stopt of het
   internet wegvalt vlak voor de toets.
2. **Offline-first, ook online.** De online build schrijft nét als vandaag naar
   `localStorage` en synchroniseert daar bovenop. Geen netwerk = de app van vandaag,
   met een discrete melding. Nooit een laadscherm dat op de server wacht.
3. **Zo weinig mogelijk persoonsgegevens.** Het gaat over minderjarigen. Geen e-mail,
   geen echte namen verplicht, geen externe identiteitsprovider, geen telemetrie,
   geen analytics, geen cookies van derden.
4. **Eén bron voor de app.** De 1051 woorden en de leermotor staan op één plaats
   (`sjabloon.html`); er komt geen tweede, uiteenlopende codebase bij.

---

## 2. Architectuur: twee builds uit één sjabloon

`bouw.py` levert vanaf nu twee artefacten:

```
sjabloon.html + latijn.json ──(bouw.py)──┬──▶ verba/index.html         offline, ONLINE=false
                                         └──▶ verba-online/index.html  web,     ONLINE=true
```

In `sjabloon.html` komt één vlag, die `bouw.py` invult zoals hij nu `/*__DATA__*/` invult:

```js
const ONLINE = /*__ONLINE__*/false;
```

Alle synccode staat achter `if(ONLINE)`. In de offline build wordt het blok door
`bouw.py` bovendien **fysiek uit het bestand geknipt** (tussen twee markers), zodat de
belofte "nul netwerkrequests" een controleerbaar feit blijft en niet van een runtime-vlag
afhangt. Een test bewaakt dat (hoofdstuk 12).

De online build wordt geüpload naar `https://www.steeman.be/verba/` zoals vandaag; de
downloadknop in de instellingen (die er al is) geeft de offline build.

**Let op bij deploy:** de edge-cache voor steeman.be serveert na een upload nog even de
vorige HTML. De online build krijgt daarom een versienummer in de bestandsnaam van het
API-pad (`/verba/api/v1/…`) en de deploy wordt geverifieerd met een cache-bust
(`?v=$RANDOM`), niet op de kale URL.

---

## 3. Hosting — LWS gedeelde hosting, PHP + MySQL (gekozen)

De API komt op de hosting die je al hebt, onder `https://www.steeman.be/verba/api/v1/…`.

- **Same-origin**: geen CORS, geen tweede domein, geen extra account of factuur.
- Deploy via de bestaande FTP-werkwijze naast de rest van steeman.be.
- De gegevens blijven bij je eigen hoster; backup = een `mysqldump` die je zelf trekt en
  bij de rest van je backups zet.

**Fase 0 verifieert twee dingen vóór er iets gebouwd wordt** (zie §13):

1. Bevat het LWS-abonnement PHP en MySQL, en welke PHP-versie?
2. Laat de edge-cache (Anubis) `/verba/api/*` **ongecached** door? Zo niet, dan serveert
   hij het sync-antwoord van de ene leerling aan de andere. Dat is een harde blokkering,
   geen detail — het moet aantoonbaar `x-cache-status: MISS` of `BYPASS` geven, met
   `Cache-Control: no-store` vanuit PHP en zo nodig een uitzonderingsregel bij de hoster.

### Resultaat fase 0 (gemeten 2026-09-13, probe geüpload en weer verwijderd)

| Vraag | Antwoord |
|---|---|
| PHP aanwezig? | **Ja — 7.3.33, `fpm-fcgi`**; op 2026-09-13 in het paneel opgezet naar **8.4.25** en hertest |
| MySQL-driver? | **Ja — `pdo_mysql` én `mysqli`** |
| Wachtwoord-hashing | na de upgrade: **`argon2id` ja** (hashen én `password_verify` op de server getest), `bcrypt` ja, `sodium` ja |
| Overige extensies | `mbstring`, `json`, `openssl`, `hash`, `curl` aanwezig |
| Schrijfrechten in de map | ja |
| Database | **MariaDB 10.11.18**, aangemaakt en getest op 2026-09-13: verbinding over `127.0.0.1`, `utf8mb4`, tabel maken/schrijven/lezen/droppen, transacties, `JSON_EXTRACT`. Macrons gaan ongeschonden heen en terug (`amīcus`, `róbbe-ā-ē-ī`). |
| Rechten van de DB-gebruiker | volledige rechten op **enkel het eigen schema** (`steem1482777.*`), `USAGE` daarbuiten — precies wat §8 vraagt |
| Verbindingslimiet | **`MAX_USER_CONNECTIONS 8`** — zie de gevolgen hieronder |
| Cache op `/verba/api/*` | **Geen probleem.** Zes opeenvolgende aanroepen gaven zes verschillende antwoorden, telkens `x-cache-status: MISS`, geen `Age`. Ook `POST` wordt niet gecached. `Cache-Control: no-store` vanuit PHP wordt netjes doorgegeven. |

Beide blokkerende vragen zijn dus positief beantwoord: **variant A gaat door.**

Drie dingen die uit die meting volgen en die het plan bijsturen:

1. **PHP staat op 8.4.25** (was 7.3.33, end-of-life sinds december 2021). De PIN wordt
   dus gehasht met **`argon2id`** — op de server zelf getest: hashen én `password_verify`
   werken. `sodium` is nu ook beschikbaar. De API-code gebruikt `password_hash`
   zonder algoritme vast te pinnen, zodat een latere PHP-upgrade niets breekt.
2. **Zet de PHP-versie nooit via `AddHandler` in een `.htaccess`** — altijd via het
   LWS-paneel, zoals bij deze upgrade. Tijdens de test deed een `AddHandler`-regel de
   PHP-uitvoering uitvallen, waarna de server de **broncode van het bestand als platte
   tekst teruggaf**. Op een echt API-bestand betekent die
   configuratiefout: databasewachtwoord publiek leesbaar. Dus: PHP-versie alleen via het
   beheerpaneel wijzigen, en daarna meteen controleren dat `<?php` niet in de HTTP-body
   opduikt. Er komt een test op (hoofdstuk 12).
3. **De FTP-root ís de docroot** — er is geen map "boven de website" om geheimen in te
   leggen. Gevolg voor hoofdstuk 8: de databasegebruiker krijgt alleen rechten op zijn
   eigen schema, de inloggegevens staan in één `config.php` die verder niets doet, en na
   elke wijziging aan de serverconfiguratie wordt punt 2 opnieuw gecontroleerd.

**Fase 0 is daarmee volledig afgerond.** PHP, cache én database zijn geverifieerd op de
echte hosting; fase 1 kan starten.

Twee dingen die uit de databasemeting volgen:

4. **Acht gelijktijdige databaseverbindingen, niet meer** (`MAX_USER_CONNECTIONS 8`).
   Voor een klas van 25 die 's avonds tegelijk leert is dat krap als een verbinding lang
   openblijft. Dus: geen persistente verbindingen (`PDO::ATTR_PERSISTENT` uit), pas
   verbinden wanneer een verzoek de database echt nodig heeft, meteen loslaten, en de
   sync zo houden als hij is — één korte call per ronde, niet per vraag (hoofdstuk 5).
   Loopt de limiet toch vol, dan geeft de API `503` met een `Retry-After`; de client heeft
   daar al een wachtrij voor en de leerling merkt er niets van.
5. **De inloggegevens van de database staan in `config.php` op de server en gaan nooit
   in git.** Deze repo staat op GitHub; `config.php` komt in `.gitignore` en er komt een
   `config.voorbeeld.php` met lege velden in de plaats. Het wachtwoord uit het
   LWS-paneel hoort dus niet thuis in dit plan, in de spec, of in een changelog.

Struikelt fase 0 alsnog over een van die twee, dan is **Cloudflare Workers + D1** de terugval:
gratis laag, echte SQL, deploys uit git, maar een nieuw account en een API op een ander
origin (CORS). De rest van dit plan verandert daar niet door; alleen hoofdstuk 5 en 6
worden dan anders ingevuld.

Niet weerhouden: zelf hosten thuis (klasgenoten op het gezinsnetwerk, uptime, dynamische
DNS) en Supabase/Firebase (een derde partij die gegevens van andermans kinderen bewaart,
in strijd met uitgangspunt 3).

---

## 4. Identiteit en accounts

**Gekozen model: klascode + naam + PIN.** Geen e-mail, geen wachtwoordherstel per mail,
geen OAuth.

1. Jij maakt een klas aan en krijgt een **joincode** (bv. `CAPUT-7`, 8 tekens, niet te
   raden, in te trekken). **Er kunnen meerdere klassen naast elkaar bestaan** — elk met
   een eigen joincode, eigen leerlingen en een eigen gezamenlijk doel. Robbe's klas is
   gewoon de eerste; een volgend schooljaar of een tweede groep is dan geen verbouwing.
2. Een leerling opent `https://www.steeman.be/verba/`, geeft de joincode, kiest een
   **naam of bijnaam** (uniek **binnen zijn klas** — twee klassen mogen elk hun eigen
   "Lotte" hebben) en een **PIN van 4 cijfers**.
3. De server geeft een **token** terug (ondoorzichtig, willekeurig, lang geldig) dat in
   `localStorage` blijft staan. Op dat toestel is inloggen daarna niet meer nodig.
4. Tweede toestel: dezelfde joincode + naam + PIN → hetzelfde account → dezelfde
   voortgang. De joincode hoort dus bij het inloggen, niet alleen bij het aanmelden:
   hij bepaalt in welke klas er naar die naam gezocht wordt.
5. PIN vergeten: jij reset hem op de beheerpagina. Er is geen zelfbedieningsherstel,
   want daarvoor zou je e-mailadressen van kinderen nodig hebben.

Bewust aanvaard: een PIN van 4 cijfers is zwak. De maatregelen ertegen zijn snelheids-
limieten en vertraging na foute pogingen (§8); het ergste scenario is dat een klasgenoot
aan andermans Latijnscore zit, niet dat er gegevens uitlekken die er niet zijn.

Een leerling zit in **één** klas. Verhuizen naar een andere klas is een beheeractie
(en belandt in het logboek), geen knop voor de leerling.

**Zonder geldige joincode is er geen toegang tot de app** — ook niet tot de woorden.
Dat is geen luxe maar een voorwaarde (§10.2). De online build krijgt `noindex`.

**Migratie:** wie al lokaal voortgang heeft, krijgt bij de eerste login de vraag
*"Je hebt hier al voortgang staan. Overzetten naar je account?"* De bestaande
`localStorage`-save wordt dan als eerste delta geüpload. Robbe verliest dus niets.

---

## 5. API (v1)

Alles JSON over HTTPS, `POST` tenzij anders vermeld, token in `Authorization: Bearer …`.

| Endpoint | Doel |
|---|---|
| `/aanmelden` | joincode + naam + PIN → account aanmaken, token terug |
| `/inloggen` | naam + PIN (+ joincode) → token terug |
| `/staat` (GET) | volledige samengevoegde staat + `rev` |
| `/sync` | `{basisRev, delta}` → samengevoegde staat of enkel een bevestiging |
| `/klas` (GET) | geaggregeerde cijfers van **de eigen klas** van de beller, voor het gezamenlijke doel (fase 3) — nooit die van een andere klas, en nooit per leerling |
| `/beheer/…` | klassen aanmaken, joincodes intrekken, PIN-reset, leerling verplaatsen of verwijderen (aparte beheersleutel — alleen jij) |
| `/beheer/logboek` (GET) | het leesbare logboek, filterbaar en als platte tekst te downloaden (hoofdstuk 9) |

Synchroniseren gebeurt **per ronde, niet per vraag**: aan het einde van een ronde, bij
het sluiten van de app (`visibilitychange`) en bij het opstarten. Faalt het, dan blijft
de delta in de wachtrij staan en probeert hij het later opnieuw. De leerling merkt er
niets van behalve een klein statusicoontje.

---

## 6. Datamodel op de server

| Tabel | Inhoud |
|---|---|
| `klassen` | id, naam, joincode-hash, actief |
| `leerlingen` | id, klas, naam, pin-hash (argon2/bcrypt), aangemaakt, laatste sync, rev |
| `staat` | leerling, de samengevoegde save-JSON (zelfde schema als §8.2 van de spec), rev |
| `sessies` | token-hash, leerling, aangemaakt, laatst gezien |
| `gebeurtenissen` | append-only logboek van **elke actie van elke speler**, met een leesbare zin per rij (hoofdstuk 9) |

De save is bij volledige voortgang ~200 KB (1806 items × ~115 bytes); gzip maakt daar
~30 KB van. Eén rij per leerling volstaat ruimschoots; er is geen reden om de items over
tabelrijen te spreiden.

---

## 7. Synchronisatie en samenvoegregels

Dit is het onderdeel dat het makkelijkst stilzwijgend fout gaat, en het krijgt daarom
eigen aanvaardingscriteria en een eigen test. **Laatste-schrijver-wint op de hele blob is
verboden**: wie 's avonds op de tablet leert nadat de laptop gesynct heeft, zou zijn dag
kwijtspelen — precies het probleem dat we komen oplossen.

De client stuurt een **delta sinds de laatste sync**, de server voegt samen per veld:

| Veld | Regel |
|---|---|
| `items["<nr>:<richting>"]` | per item: de kant met de nieuwste `laatstGezien` bepaalt `box`, `vragenSindsdien` en `mcSinds`; `juist` en `fout` nemen het **maximum** van beide kanten |
| `profiel.xp`, `besteCombo`, `blitzRecord`, `totaal*`, `vorm*`, `totaalRondes`, `totaleTijdMs` | **maximum** (monotoon stijgende tellers) |
| `profiel.streakGeschiedenis` | vereniging van de dagen; `streak` en `laatsteActieveDag` worden daaruit herberekend, niet overgenomen |
| `profiel.tempo` | van de kant met de nieuwste activiteit |
| `badges`, `tesserae` | vereniging; bij dubbel wint de **vroegste** tijdstempel (je hebt hem toen verdiend) |
| `secties` | per sectie: `veroverd` is een OR, `besteScore` en `pogingen` het maximum |
| `examen` | `gehaald` is een OR, `besteScore` het maximum |
| `settings` | laatste schrijver wint (onschuldig, en de leerling verwacht dit) |

De server verhoogt `rev` en stuurt de samengevoegde staat terug als de client achterliep.
De client vervangt zijn lokale staat integraal door het antwoord van de server — de
server is na het samenvoegen de waarheid.

Klokken van toestellen lopen uit elkaar; tijdstempels van de client worden daarom
geklemd op "niet in de toekomst" en enkel gebruikt om twee kanten te ordenen, nooit om
iets te berekenen dat er echt toe doet.

---

## 8. Beveiliging en misbruik

De leermotor draait in de browser, dus **elke score is een bewering van de client**. Wie
devtools opent, kan zich 50 000 XP toekennen. Dat serverzijdig dichttimmeren betekent de
Leitner-motor, de antwoordbeoordeling en de XP-berekening op de server herbouwen, met een
request per vraag en zonder offline spelen — een ander en veel groter project. Gekozen
houding: **de client blijft baas, de server maakt vals spelen zichtbaar en onschadelijk.**

- **Plausibiliteitsgrenzen** per sync: maximaal ~300 beantwoorde vragen en een
  begrensde XP-groei per uur, `box` in 0..5, geen tijdstempels in de toekomst, payload
  ≤ 512 KB, ten hoogste 1806 itemsleutels, elke sleutel tegen het patroon
  `^\d+:(L2N|L2V)$`. Wat er buiten valt wordt geweigerd, niet stil afgekapt.
- **Snelheidslimieten**: joincode-pogingen per IP, loginpogingen per naam met oplopende
  vertraging, en één sync per ~10 s per account.
- **Logboek**: elke actie landt in `gebeurtenissen` en is in gewoon Nederlands te lezen
  op de beheerpagina, zodat een onwaarschijnlijke sprong opvalt zonder dat je de database
  moet uitpluizen (hoofdstuk 9). Een geweigerde sync wordt gelogd mét de reden.
- **Het gezamenlijke doel wordt per persoon begrensd** (fase 3), zodat één opgeblazen
  account het doel niet in zijn eentje kan uitspelen of verpesten.
- Verder het gewone werk: HTTPS-only, PIN gehasht met `argon2id` waar beschikbaar, anders `bcrypt` (cost 12) — zie §3, tokens
  willekeurig en enkel als hash bewaard, **alle** velden serverzijdig gevalideerd,
  geen SQL-string-samenstelling, en de app rendert servertekst nooit als HTML.

---

## 9. Logboek — leesbaar, volledig, bewaard

Eis: van **elke speler en elke actie** blijft een spoor dat je zonder databasekennis kan
lezen. Het logboek is tegelijk het antwoord op "wie doet wat" (§8, vals spelen) en op
"wat is hier gebeurd" als er ooit iets misloopt.

Eén bron, twee lagen: elke rij in `gebeurtenissen` is gestructureerd (tijd, leerling,
type, cijfers) **én** draagt een kant-en-klare Nederlandse zin. Filteren en tellen gebeurt
op de kolommen, lezen op de zin.

```
2026-09-14 19:02  robbe   account aangemaakt in klas "Caput 7"
2026-09-14 19:20  robbe   ronde afgerond — 15 vragen, 13 juist, +120 XP, 4 woorden een box hoger
2026-09-14 19:21  robbe   badge verdiend: primus-gradus
2026-09-14 19:22  robbe   gesynct vanaf toestel B — 15 items samengevoegd, staat nu rev 42
2026-09-15 08:03  lotte   ingelogd op een nieuw toestel
2026-09-15 08:40  lotte   sync geweigerd — 4200 XP in 3 minuten, boven de grens (§8)
2026-09-16 17:55  beheer  PIN gereset voor lotte
```

**Wat gelogd wordt:** account aangemaakt of gewist · inloggen op een nieuw toestel ·
elke sync (omvang, aantal samengevoegde items, nieuwe rev) · geweigerde sync mét reden ·
ronde en blitz afgerond (vragen, juist, XP) · sectie veroverd · examen · badge of tessera
verdiend · elke beheeractie (PIN-reset, account gewist, joincode ingetrokken).

**Wat níét:** PIN's, tokens, en het IP alleen als hash. Geen antwoordinhoud (zie hierna).

**Granulariteit: per ronde en per gebeurtenis, niet per vraag.** Per vraag zou voor 25
leerlingen duizenden regels per week opleveren waarin niemand nog iets ziet, en het zou
neerkomen op bijhouden welke woorden andermans kind fout had — meer gegevens dan dit
project nodig heeft. Per-vraag-logging blijft technisch mogelijk en is per klas aan te
zetten als je het ooit didactisch nodig hebt; standaard staat het uit.

**Wie het ziet: alleen jij.** Het logboek staat op de beheerpagina en is niet zichtbaar
voor de leerlingen — ook niet hun eigen regels. Reden: het logboek bestaat om vals spelen
en storingen op te sporen, en een leerling die precies ziet welke grens hem betrapte,
weet ook hoe hij er net onder blijft. De privacytekst voor de ouders zegt wel met zoveel
woorden dát er zo'n logboek is en wat erin staat (hoofdstuk 10).

**Waar te zien:** op de beheerpagina, met een filter per klas en nieuwste eerst, te filteren per leerling en per dag,
met een knop **"logboek downloaden"** die platte tekst geeft — één regel per gebeurtenis,
precies zoals hierboven. Zo is het logboek ook leesbaar als de app er niet meer is.

**Bewaartermijn:** 12 maanden (één schooljaar), daarna automatisch verwijderd. Wie zijn
account laat wissen, verliest ook zijn logregels.

**Het logboek mag de app nooit ophouden:** faalt het wegschrijven, dan gaat de sync toch
door en wordt de logfout apart gemeld. Een logboek dat de app kan blokkeren is erger dan
een gat in het logboek.

---

## 10. Privacy, minderjarigen en de woordenlijst

1. **Wat we bewaren:** een bijnaam, een PIN-hash, leervoortgang, en een logboek van de
   acties van elke speler (hoofdstuk 9) met een IP-hash. Meer niet. Dat logboek is meteen
   het gevoeligste wat het systeem bijhoudt — het is daarom beperkt tot rondes en
   gebeurtenissen (nooit per vraag), het wordt na 12 maanden gewist, en het wordt met
   zoveel woorden vermeld in de tekst voor de ouders, niet stilzwijgend bijgehouden. Er komt een korte pagina *"Wat bewaart VERBA?"* die dat in gewone
   taal zegt, met jouw contactadres en de belofte dat een account op vraag meteen
   verwijderd wordt (één knop op de beheerpagina, die de rijen echt wist).
2. **De woordenlijst.** `woordenlijst.md` is overgetypt uit een schoolboek en verantwoord
   als persoonlijk studiegebruik. Een openbare website die hem aan een klas serveert is
   een merkbaar ruimere verspreiding. Daarom staat de online app **achter de joincode**
   (geen anonieme toegang tot de woorden) en op `noindex`. Zo blijft het "leerlingen met
   hetzelfde boek die samen studeren" en niet "een publicatie". Dit is een voorwaarde
   van het plan, geen optie.
3. Ouders van klasgenoten krijgen bij de joincode één alinea die hetzelfde uitlegt.

---

## 11. Gevolgen voor de bestaande specificatie

| Paragraaf | Wijziging |
|---|---|
| §1.1 "Wat de app niet doet" | "geen accounts, geen server" wordt: geldt voor de **offline build**; de online build heeft accounts en sync (hoofdstuk 13) |
| §2 Technische randvoorwaarden | de tabel wordt per build gelezen; nul netwerkrequests blijft hard voor de offline build |
| §2.1 Opslag | `localStorage` blijft de primaire opslag in **beide** builds; online komt de server erbovenop |
| §2.2 Bouwproces | tweede artefact `verba-online/index.html`, plus de `/*__ONLINE__*/`-vlag |
| §6.8 Instellingen | nieuw: accountblok (wie ben ik, sync-status, uitloggen, voortgang overzetten) |
| §8 Dataopslag | nieuw §8.5: synchronisatie en samenvoegregels (hoofdstuk 7 hierboven) |
| §10 Op te leveren | server, beheerpagina, privacytekst, tweede build |
| §11 Aanvaardingscriteria | nieuwe criteria voor sync, merge, offline-degradatie en de netwerkvrije offline build |
| nieuw hoofdstuk 13 | "Online modus": hoofdstukken 4 t/m 10 hierboven |

De backup-export/import van §8.3 **blijft** — het is de ontsnappingsroute als de hosting
ooit stopt.

---

## 12. Tests

Bovenop de negen bestaande smoketests:

- **smoke-10-sync**: twee browsercontexten als hetzelfde account, elk een ronde offline,
  daarna allebei syncen — beide rondes moeten in de samengevoegde staat zitten. Plus:
  server onbereikbaar → app blijft volledig werken, delta blijft in de wachtrij en gaat
  alsnog door bij herstel.
- **merge-eenheidstest** (serverzijdig, zonder browser): elke regel uit de tabel in
  hoofdstuk 7 apart, inclusief de gevallen die vandaag stil data zouden wissen.
- **grens-test**: elke plausibiliteitsgrens uit hoofdstuk 8 wordt geweigerd, **en** laat
  een leesbare logregel met de reden achter.
- **logboek-test**: een ronde, een sync, een badge en een PIN-reset leveren elk hun zin op;
  de download geeft platte tekst; een logboek dat niet wegschrijft blokkeert de sync niet.
- **broncode-test**: `/verba/api/v1/…` geeft nooit een body die met `<?php` begint — de
  regressietest op de fout uit §3.
- **offline-build-invariant**: `verba/index.html` bevat geen `fetch`, `XMLHttpRequest`,
  `navigator.sendBeacon` of `http`-URL. Dit is de test die de belofte van dit project
  bewaakt; hij moet falen als de synccode ooit in de verkeerde build lekt.

---

## 13. Fasering

| Fase | Inhoud | Klaar wanneer |
|---|---|---|
| **0** | ✔ ~~LWS verifiëren: PHP/MySQL aanwezig, en `/verba/api/*` ongecached~~ **klaar, 2026-09-13** (§3): cache OK, PHP naar 8.4.25 met `argon2id`. database aangemaakt en getest | **klaar** |
| **1** | Server + accounts + staat + sync + logboek; online build; migratie van Robbe's bestaande save; smoke-10 en de merge-tests | Robbe leert op laptop én tablet verder zonder iets te verliezen |
| **2** | Klasgenoten: joincodes, beheerpagina (mét logboekweergave en download), PIN-reset, snelheidslimieten, privacytekst, `noindex` | de klas kan erop, en jij kan een account resetten of wissen en zien wat iedereen doet |
| **3** | Gezamenlijk doel (apart te ontwerpen; het klasmozaïek "samen 1051" is de voorzet) | later te beslissen |

Fase 1 is de enige die Robbe's probleem oplost; fase 2 is wat er nodig is vóór er een
ander kind op mag. Niets van fase 3 wordt gebouwd voor 1 en 2 stabiel draaien.

---

## 14. Openstaande punten

- ~~**Vorm van het gezamenlijke doel**~~ — beslist op 13 september 2026: zeven Romeinse
  mozaïeken, één per caput, samen te leggen door de klas. Uitgewerkt in §13.10 van de
  specificatie; dit bestand is daarmee helemaal verwerkt.

Beslist op 2026-09-13, hier bewaard omdat de redenering nuttig blijft:

- **Meerdere klassen?** Ja. Het datamodel en de joincode voorzien er meerdere; de leerling
  ziet alleen zijn eigen klas (§4, §5).
- **Zien leerlingen hun eigen logboek?** Nee. Het logboek is er voor toezicht op vals
  spelen en storingen; wie de grenzen ziet, leert eronder blijven (hoofdstuk 9). De
  ouders worden wel ingelicht dát het bestaat (hoofdstuk 10).
- **Een leerkrachtoverzicht ("wie zit waar")?** Nee — bewust niet gebouwd. Dit is een
  studietool voor een groep vrienden, geen volgsysteem van de school. Wat een klas samen
  presteert is zichtbaar via het gezamenlijke doel; individuele voortgang van andermans
  kind is dat niet.
