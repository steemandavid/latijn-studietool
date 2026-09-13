/* Smoke 12 — het klasmozaïek in de browser (§13.10, fase 3).
 *
 *   VERBA_BEHEER=<beheersleutel> node test/smoke-12-klasmozaiek.js
 *
 * Maakt een wegwerpklas met twee leerlingen, laat ze woorden gouden krijgen, en
 * controleert wat het scherm daarvan toont. Ruimt achteraf alles op.
 */
const {chromium} = require("playwright");
const lokaal = require("./lokaal");
// Standaard tegen de lokale testserver (zie lokaal.js): die serveert de gebouwde pagina
// en geeft alleen de API door, zodat de bot-detectie van de hosting niet meetest.
let URL = process.env.VERBA_URL || null;
const API    = "https://www.steeman.be/verba/api/v1/index.php?r=";
const BEHEER = process.env.VERBA_BEHEER;
if (!BEHEER) { console.error("zet VERBA_BEHEER=<beheersleutel>"); process.exit(2); }
const EXE = "/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const UA  = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
          + "Chrome/141.0.0.0 Safari/537.36";

let geslaagd = 0, gefaald = 0;
function check(wat, gekregen, verwacht) {
  if (JSON.stringify(gekregen) === JSON.stringify(verwacht)) { geslaagd++; console.log(`  ok   ${wat}`); return; }
  gefaald++;
  console.error(`  FOUT ${wat}\n       verwacht: ${JSON.stringify(verwacht)}\n       gekregen: ${JSON.stringify(gekregen)}`);
}
const beheer = (pad, body) => fetch(API + pad, {
  method: body ? "POST" : "GET",
  headers: {"Content-Type": "application/json", "X-Beheer-Sleutel": BEHEER},
  body: body ? JSON.stringify(body) : undefined}).then(r => r.json());

async function meldAan(pagina, joincode, naam, pin, nieuw) {
  const resp = await pagina.goto(URL + "?v=" + Date.now(), {waitUntil: "domcontentloaded"});
  if (resp.status() === 403) throw new Error("de hosting blokkeert deze browser (DDoS-bescherming)");
  await pagina.waitForSelector("#aanmeldScherm:not([hidden])", {timeout: 30000});
  if (!nieuw) await pagina.click("#btnWissel");
  await pagina.fill("#inJoincode", joincode);
  await pagina.fill("#inNaam", naam);
  await pagina.fill("#inPin", pin);
  await pagina.click("#btnAanmeld");
  await pagina.waitForSelector("html[data-verba-sync='klaar']", {timeout: 40000});
}

/** Zet woorden rechtstreeks op goud (box 5 in alle richtingen) en synchroniseert. */
async function maakGoud(pagina, nrs) {
  await pagina.evaluate((nrs) => {
    const nu = new Date().toISOString();
    for (const nr of nrs) {
      for (const richting of ["L2N", "L2V"]) {
        S.items[`${nr}:${richting}`] =
          {box: 5, juist: 9, fout: 0, laatstGezien: nu, vragenSindsdien: 0, mcSinds: 0};
      }
    }
    S.profiel.xp += 50; S.profiel.totaalJuist += nrs.length;
    bewaar();
  }, nrs);
  await pagina.evaluate(() => syncNu());
  await pagina.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch({executablePath: EXE});
  const bediening = URL ? null : await lokaal.start();
  if (bediening) URL = bediening.url;
  let klas = null;
  try {
    klas = await beheer("beheer/klas", {naam: "TEST mozaiek"});
    if (!klas.joincode) throw new Error("geen klas: " + JSON.stringify(klas));

    /* ---- 1. leeg mozaïek ---- */
    const eenCtx = await browser.newContext({userAgent: UA});
    const een = await eenCtx.newPage();
    await meldAan(een, klas.joincode, "robbe", "1234", true);
    await een.click('[data-ga="opus"]');
    await een.waitForSelector("#opusRaster .opuskaart", {timeout: 20000});
    check("1a er staan acht panelen (zeven caputs + het slot)",
          await een.locator("#opusRaster .opuskaart").count(), 8);
    check("1b alles staat op nul",
          await een.locator("#opusRaster .kop .sub").first().textContent(), "0 %");
    check("1c het slotpaneel vertelt wat het ontgrendelt",
          /Komt vrij als alle zeven/.test(await een.locator(".opuskaart").last().textContent()), true);
    check("1d een leeg mozaïek legt geen enkel steentje",
          await een.evaluate(() => {
            const c = document.querySelector("#opusRaster canvas");
            const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
            let voeg = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i] === 0x44 && d[i+1] === 0x40) voeg++;
            return voeg === c.width * c.height;
          }), true);

    /* ---- 2. gouden woorden leggen steentjes ---- */
    await maakGoud(een, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await een.click("#scr-opus [data-terug]");          // eerst terug: de tegel staat thuis
    await een.click('[data-ga="opus"]');
    await een.waitForFunction(() => KLASSTAND && KLASSTAND.totaal.klaar === 10, null, {timeout: 20000});
    await een.evaluate(() => renderMozaiek());
    const tekst1 = await een.locator("#opusRaster .opuskaart").first().textContent();
    check("2a caput 1 toont de stand", /10 van de 259 woorden gouden/.test(tekst1), true);
    check("2b en hoeveel steentjes een woord legt", /elk woord legt 23 steentjes/.test(tekst1), true);
    check("2c en het eigen aandeel", /Jij deed er 10/.test(tekst1), true);
    check("2d er liggen nu echt steentjes",
          await een.evaluate(() => {
            const c = document.querySelector("#opusRaster canvas");
            const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
            let gekleurd = 0;
            for (let i = 0; i < d.length; i += 4) if (!(d[i] === 0x44 && d[i+1] === 0x40)) gekleurd++;
            return gekleurd > 1000;
          }), true);

    /* ---- 3. de steentjes liggen VERSPREID, niet in een blok (§13.10.3) ---- */
    // Het echte bewijs dat er geen blok ontstaat, is het aantal BUREN per steentje:
    // een aaneengesloten vlek zit rond 3,5, verspreide steentjes ver daaronder.
    const spreiding = await een.evaluate(() => {
      const orde = legVolgorde(MOZAIEKEN[0].id).slice(0, Math.floor(6144 * 10 / 259));
      const vakken = new Set(orde.map(([x, y]) => `${x >> 4}:${y >> 4}`));
      const gelegd = new Set(orde.map(([x, y]) => x + "," + y));
      let buren = 0;
      for (const [x, y] of orde) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]])
        if (gelegd.has((x + dx) + "," + (y + dy))) buren++;
      return {vakken: vakken.size, buren: buren / orde.length};
    });
    check("3a de eerste steentjes raken het halve vlak al", spreiding.vakken >= 10, true);
    check("3b en vormen geen aaneengesloten vlek", spreiding.buren < 1.5, true);

    /* ---- 4. een klasgenoot draagt bij, zonder elkaars aandeel te zien ---- */
    const tweeCtx = await browser.newContext({userAgent: UA});
    const twee = await tweeCtx.newPage();
    await meldAan(twee, klas.joincode, "lotte", "4321", true);
    await maakGoud(twee, [1, 2, 3, 300, 301]);          // 1-3 had robbe al
    await twee.click('[data-ga="opus"]');
    await twee.waitForFunction(() => KLASSTAND && KLASSTAND.totaal.klaar === 12, null, {timeout: 20000});
    const stand = await twee.evaluate(() => KLASSTAND.totaal);
    check("4a de klas staat op twaalf woorden", stand.klaar, 12);
    check("4b lotte's eigen aandeel is er twee", stand.mijn, 2);
    check("4c de kop noemt de klas en het eigen aandeel",
          /2 leerlingen/.test(await twee.textContent("#opusSub")), true);
    check("4d nergens staat wie de andere woorden deed",
          /robbe/i.test(await twee.textContent("#opusRaster")), false);

    /* ---- 5. het mozaïek overleeft een herlaadbeurt ---- */
    await twee.reload({waitUntil: "domcontentloaded"});
    await twee.waitForSelector("html[data-verba-sync='klaar']", {timeout: 40000});
    await twee.click('[data-ga="opus"]');
    await twee.waitForFunction(() => KLASSTAND && KLASSTAND.totaal.klaar === 12, null, {timeout: 20000});
    check("5a na herladen staat de stand er weer", await twee.evaluate(() => KLASSTAND.totaal.klaar), 12);

    /* ---- 6. mislukt ophalen: uitleg en een knop, geen eeuwig "even geduld" ---- */
    // Dit is wat een gebruiker echt overkwam: de hosting blokkeerde juist dit ene verzoek
    // en het scherm bleef "Even geduld…" tonen, voor altijd, zonder uitleg.
    if (!bediening) throw new Error("deze stap vraagt de lokale testserver");
    bediening.blokkeer("klas");
    // Wachten tot er GEEN aanroep meer loopt: een die al onderweg was, vulde de stand
    // anders meteen weer en de nieuwe werd door de vergrendeling overgeslagen.
    await twee.waitForFunction(() => !klasBezig, null, {timeout: 20000});
    await twee.evaluate(() => { KLASSTAND = null; klasFout = null; renderMozaiek(); haalKlas(); });
    await twee.waitForSelector(".melding-klas", {timeout: 15000});
    check("6a de panelen blijven staan", await twee.locator("#opusRaster .opuskaart").count(), 8);
    await twee.waitForTimeout(11000);            // twee stille herpogingen
    const melding = await twee.textContent(".melding-klas");
    check("6b de melding noemt de echte oorzaak", /DDoS|403/.test(melding), true);
    check("6c en er staat een knop om het opnieuw te proberen",
          await twee.locator(".melding-klas button").count(), 1);
    bediening.laatDoor("klas");
    await twee.click(".melding-klas button");
    await twee.waitForFunction(() => KLASSTAND !== null, null, {timeout: 20000});
    check("6d opnieuw proberen herstelt de stand", await twee.evaluate(() => KLASSTAND.totaal.klaar), 12);
    check("6e en de melding verdwijnt", await twee.locator(".melding-klas").count(), 0);

    /* ---- 7. zonder verbinding blijft het scherm bruikbaar ---- */
    await tweeCtx.setOffline(true);
    await twee.click("#scr-opus [data-terug]");
    await twee.click('[data-ga="opus"]');
    await twee.waitForTimeout(1000);
    check("7a het scherm blijft staan zonder netwerk",
          await twee.locator("#opusRaster .opuskaart").count(), 8);
    await tweeCtx.setOffline(false);
  } catch (e) {
    gefaald++;
    console.error("ONVERWACHTE FOUT:", e.message ? e.message.slice(0, 300) : e);
  } finally {
    await browser.close();
    if (bediening) bediening.server.close();
    if (klas && klas.klas) {
      const {leerlingen = []} = await beheer(`beheer/leerlingen&klas=${klas.klas}`).catch(() => ({}));
      for (const l of leerlingen) await beheer("beheer/wissen", {leerling: l.id});
      await beheer("beheer/klas-wissen", {klas: klas.klas});
    }
    console.log(`\n${geslaagd} geslaagd, ${gefaald} gefaald`);
    process.exit(gefaald === 0 ? 0 : 1);
  }
})();
